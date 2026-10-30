'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = fs.mkdtempSync(path.join((process.env.CODEBUDDY_TEST_TMPDIR || require('node:os').tmpdir()), 'codebuddy-regression-'));
const runner = path.resolve(__dirname, '../scripts/task.cjs');
const mock = path.join(root, 'mock.cjs');
fs.writeFileSync(mock, `
const fs=require('node:fs');
const p=process.argv.at(-1), mode=p.split('\\n')[0];
const model=process.argv[process.argv.indexOf('--model')+1];
const result=p.match(/Write your final report to: (.*)/)[1];
if(mode==='no-result') {console.log(JSON.stringify({is_error:false,result:'done'}));process.exit();}
fs.mkdirSync(require('node:path').dirname(result),{recursive:true});
fs.writeFileSync(result,'artifact');
if(mode==='empty-object') console.log('{}');
else if(mode==='auth-nonzero') {console.log(JSON.stringify({type:'result',subtype:'error',is_error:true,error:{code:'AUTHENTICATION_REQUIRED'},result:'Authentication required'}));process.exitCode=1;}
else if(mode==='maxturns-token') {console.log(JSON.stringify({type:'result',subtype:'error_max_turns',is_error:true,result:'Invalid token in src/config.js'}));}
else if(mode==='stderr-failure') {console.error('Error: expected 401 Unauthorized but got 200');console.log('{}');process.exitCode=1;}
else if(mode==='maxturns') {console.error('Max turns (6) exceeded');}
else if(mode==='stderr-success') {console.error('task discusses unauthorized');console.log(JSON.stringify({type:'result',subtype:'success',is_error:false,result:'done'}));}
else if(mode==='cancelled') console.log(JSON.stringify({type:'result',subtype:'cancelled',is_error:false,result:'stopped'}));
else if(mode==='history-auth') console.log(JSON.stringify([{type:'message',content:'explain unauthorized, Authentication required, token expired errors'},{type:'result',subtype:'success',is_error:false,result:'done'}]));
else if(mode==='prompt-check') {fs.writeFileSync(result,p);console.log(JSON.stringify({type:'result',subtype:'success',is_error:false,result:'done'}));}
else console.log(JSON.stringify({type:'result',subtype:'success',is_error:false,result:'done',providerData:{model,requestModelId:model,requestModelName:model}}));
`);
const settingsHome=path.join(root,'settings');fs.mkdirSync(settingsHome);fs.writeFileSync(path.join(settingsHome,'profile.json'),JSON.stringify({owner:'codex-codebuddy-subagent/v1',revision:1,enabled:true,cli:null,preferences:{model:'fixture-model',delegation:'explicit'}}));
const env = {...process.env,CODEBUDDY_SUBAGENT_HOME:settingsHome,CODEBUDDY_API_KEY:'',CODEBUDDY_CLI:mock,CODEBUDDY_AUTH_TOKEN:'test-not-secret'};
function run(id, mode, extras={}) {
 const card=path.join(root,id+'.json');
 fs.writeFileSync(card,JSON.stringify({id,root,prompt:mode,result_file:`results/${id}.md`,timeout_s:10,verify:[process.execPath,'-e','process.exit(0)'],...extras}));
 const p=spawnSync(process.execPath,[runner,'run',card],{env,encoding:'utf8',timeout:15000,windowsHide:true});
 assert.ifError(p.error); return {code:p.status,data:JSON.parse(p.stdout)};
}
const checks=[];
function check(name,fn) {try {fn();checks.push({name,pass:true});}catch(e){checks.push(e.skip?{name,skipped:true,reason:e.message}:{name,pass:false,error:e.message});}}
check('successful transcript may discuss authentication errors',()=>assert.equal(run('auth-history','history-auth').code,0));
check('empty object is not a successful CLI response',()=>assert.equal(run('empty','empty-object').code,1));
check('cancelled result is not a successful task',()=>assert.equal(run('cancelled','cancelled').code,1));
check('every prompt describes actual shell timeout and operational budget',()=>{
 const r=run('prompt','prompt-check');assert.equal(r.code,0);
 const p=fs.readFileSync(path.join(root,'results/prompt.md'),'utf8');
 assert.match(p,/reference default is 120000 ms/);assert.match(p,/maximum is 600000 ms/);assert.match(p,/240 seconds/);
 assert.doesNotMatch(p,/Each CodeBuddy shell command has a 300 seconds/);
});
check('existing internal jobs directory cannot be a result',()=>{
 const r=run('internal','success',{result_file:'.handoff/jobs'});assert.equal(r.code,2);
});
check('missing result fails even when verifier exits zero',()=>assert.equal(run('missing','no-result').code,1));
check('verifier runs without shell interpolation',()=>assert.equal(run('literal','success',{verify:[process.execPath,'-e','process.exit(process.argv[1]==="literal;$(not-a-command)"?0:1)','literal;$(not-a-command)']}).code,0));
check('nonzero structured authentication error is categorized',()=>assert.equal(run('auth-nonzero','auth-nonzero').code,3));
check('model failure text is not authentication evidence',()=>assert.equal(run('maxturns-token','maxturns-token').code,1));
check('failed project stderr is not authentication evidence',()=>assert.equal(run('stderr-failure','stderr-failure').code,1));
check('max-turns exit zero and empty stdout is diagnosed as failure',()=>{
 const r=run('maxturns','maxturns');assert.equal(r.code,1);assert.equal(r.data.cli_failure_reason,'max_turns_exceeded');
});
check('successful stderr mentioning auth is not failure',()=>assert.equal(run('stderr-success','stderr-success').code,0));
check('missing verifier is an environment error',()=>{
 const r=run('verifier-missing','success',{verify:[path.join(root,'no-such-verifier.exe')]});
 assert.equal(r.code,2);assert.equal(r.data.verify_spawn_error,'ENOENT');
});
check('relative status root is rejected',()=>{
 const p=spawnSync(process.execPath,[runner,'status','.','absent'],{env,encoding:'utf8',windowsHide:true});assert.equal(p.status,2);
});
check('missing status root is an environment error',()=>{
 const p=spawnSync(process.execPath,[runner,'status',path.join(root,'absent-root'),'absent'],{env,encoding:'utf8',windowsHide:true});assert.equal(p.status,2);
});
check('shell launcher is rejected by doctor',()=>{
 const launcher=path.join(root,'bad.cmd');fs.writeFileSync(launcher,'@echo off');
 const p=spawnSync(process.execPath,[runner,'doctor'],{env:{...env,CODEBUDDY_CLI:launcher},encoding:'utf8',windowsHide:true});assert.equal(p.status,2);
});
check('default model is explicit and response metadata is recorded',()=>{
 const r=run('default-model','success');assert.equal(r.code,0);assert.equal(r.data.requested_model,'fixture-model');assert.equal(r.data.model_source,'user-preference');assert.deepEqual(r.data.reported_models,['fixture-model']);assert.deepEqual(r.data.request_model_ids,['fixture-model']);
});
check('task model override is passed to CLI without global changes',()=>{
 const r=run('other-model','success',{model:'mock-other-model'});assert.equal(r.code,0);assert.equal(r.data.requested_model,'mock-other-model');assert.equal(r.data.model_source,'task-card');assert.deepEqual(r.data.reported_models,['mock-other-model']);
});
check('invalid model type is rejected',()=>assert.equal(run('bad-model','success',{model:3}).code,2));
check('invalid allowed_tools type is rejected',()=>assert.equal(run('bad-allow','success',{allowed_tools:'PowerShell'}).code,2));
check('jobs alias cannot receive result',()=>{
 const alias=path.join(root,'jobs-alias');fs.symlinkSync(path.join(root,'.handoff/jobs'),alias,'junction');
 assert.equal(run('alias','success',{result_file:'jobs-alias/alias.md'}).code,2);
});
check('jobs directory cannot escape via junction',()=>{
 const isolated=fs.mkdtempSync(path.join(root,'junction-root-'));
 fs.mkdirSync(path.join(isolated,'.handoff'));
 fs.symlinkSync(root,path.join(isolated,'.handoff/jobs'),'junction');
 assert.equal(run('outside-jobs','success',{root:isolated}).code,2);
});
check('result directory cannot escape via junction',()=>{
 const isolated=fs.mkdtempSync(path.join(root,'result-root-'));
 fs.symlinkSync(root,path.join(isolated,'results'),'junction');
 assert.equal(run('outside-result','success',{root:isolated}).code,2);
});
check('dangling file symlink is rejected before launch',()=>{
 const link=path.join(root,'results/dangling.md');
 try {fs.symlinkSync(path.join(root,'never-created-report.md'),link,'file');}
 catch(e){if(e.code==='EPERM') {const skip=new Error('Windows account lacks file symlink privilege; dangling directory junction is tested separately');skip.skip=true;throw skip;}throw e;}
 assert.equal(run('dangling','success',{result_file:'results/dangling.md'}).code,2);
});
check('dangling directory junction is rejected before launch',()=>{
 const link=path.join(root,'results/dangling-dir');
 fs.symlinkSync(path.join(root,'never-created-directory'),link,'junction');
 assert.equal(run('dangling-dir','success',{result_file:'results/dangling-dir/report.md'}).code,2);
});
const report={passed:checks.filter(c=>c.pass).length,skipped:checks.filter(c=>c.skipped).length,checks,fixture_root:root};
fs.writeFileSync(path.join(root,'regression-test-result.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
process.exitCode=checks.some(c=>c.pass===false)?1:0;
