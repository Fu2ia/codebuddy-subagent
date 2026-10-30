'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync,spawn}=require('node:child_process');
const root=fs.mkdtempSync(path.join((process.env.CODEBUDDY_TEST_TMPDIR || require('node:os').tmpdir()),'codebuddy-advanced-'));
const runner=path.resolve(__dirname,'../scripts/task.cjs');
const schemaTools=require('../scripts/task-features.cjs');
const mock=path.join(root,'mock.cjs');
fs.writeFileSync(mock,`
const fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),prompt=args.includes('--')?args.at(-1):fs.readFileSync(0,'utf8');
const valueAfter=flag=>args[args.indexOf(flag)+1];
const session=valueAfter(args.includes('--resume')?'--resume':'--session-id');
fs.appendFileSync(path.join(process.cwd(),'invocations.jsonl'),JSON.stringify({args,prompt})+'\\n');
const mode=prompt.match(/^mock:([a-z-]+)/)?.[1]||'json';
let value={value:7};
if(prompt.includes('<task-input>'))value={tag:JSON.parse(prompt.split('<task-input>\\n')[1].split('\\n</task-input>')[0]).tag};
if(mode==='bad-schema')value={value:'wrong'};
if(mode==='regex')value='a'.repeat(30)+'!';
let result=mode==='invalid-json'?'a JSON-looking but invalid report':JSON.stringify(value);
function finish(){
 const file=prompt.match(/Write your final report to: (.*)/)?.[1];
 if(file)fs.writeFileSync(file,result);
 const response={type:'result',subtype:'success',is_error:false,result,session_id:session,providerData:{model:valueAfter('--model'),requestModelId:valueAfter('--model')}};
 if(mode==='structured'){response.structured_output=value;response.result='';}
 if(mode==='wrong-session')response.session_id='wrong-session';
 console.log(JSON.stringify(response));
}
if(mode==='slow')setTimeout(finish,700);else finish();
`);
const settingsHome=path.join(root,'settings');fs.mkdirSync(settingsHome);fs.writeFileSync(path.join(settingsHome,'profile.json'),JSON.stringify({owner:'codex-codebuddy-subagent/v1',revision:1,enabled:true,cli:null,preferences:{model:'fixture-model',delegation:'explicit'}}));
const env={...process.env,CODEBUDDY_SUBAGENT_HOME:settingsHome,CODEBUDDY_API_KEY:'',CODEBUDDY_CLI:mock,CODEBUDDY_AUTH_TOKEN:'test-only'};
const okVerify=[process.execPath,'-e','process.exit(0)'];
function card(id,extras={}){
 const t={id,root,prompt:'mock:json',result_file:`reports/${id}.json`,verify:okVerify,timeout_s:30,...extras};
 const file=path.join(root,id+'.json');fs.writeFileSync(file,JSON.stringify(t));return{t,file};
}
function call(action,file){const p=spawnSync(process.execPath,[runner,action,file],{env,encoding:'utf8',timeout:15000,windowsHide:true});assert.ifError(p.error);return{code:p.status,state:JSON.parse(p.stdout)};}
function run(id,extras={},action='run'){const c=card(id,extras);return call(action,c.file);}
function lastInvocation(){return JSON.parse(fs.readFileSync(path.join(root,'invocations.jsonl'),'utf8').trim().split(/\r?\n/).at(-1));}
function state(id){return JSON.parse(fs.readFileSync(path.join(root,'.handoff/jobs',id,'state.json'),'utf8'));}
const objectSchema={type:'object',properties:{value:{type:'integer',minimum:0}},required:['value'],additionalProperties:false};
const checks=[];
async function check(name,fn){try{await fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}}
(async()=>{
 await check('read-only parent saves final response with restrictive CLI flags',()=>{
  const r=run('readonly',{task_type:'investigation'});assert.equal(r.code,0);assert.equal(r.state.mode,'read_only');assert.equal(r.state.result_source,'parent-final-response');
  assert.deepEqual(JSON.parse(fs.readFileSync(r.state.result_file,'utf8')),{value:7});
  const a=lastInvocation().args;assert.equal(a[a.indexOf('--permission-mode')+1],'plan');assert.equal(a[a.indexOf('--tools')+1],'Read,Grep,Glob');assert(a.includes('--strict-mcp-config'));assert(a.includes('mcp__*'));assert(a.includes('Write'));assert(!a.includes('-y'));
 });
 await check('read-only cannot grant shell permission',()=>assert.equal(run('bad-readonly',{mode:'read_only',allowed_tools:['PowerShell']}).code,2));
 await check('edit profile remains compatible with agent-written report',()=>{const r=run('edit');assert.equal(r.code,0);assert.equal(r.state.mode,'edit');assert.equal(r.state.result_source,'agent-file');});
 await check('input file travels over stdin with exact UTF-8 data',()=>{
  const input=JSON.stringify({tag:'中文-tag',padding:'A'.repeat(40000)});fs.writeFileSync(path.join(root,'input.json'),input);
  const r=run('stdin',{task_type:'extraction',input_file:'input.json'});assert.equal(r.code,0);assert.equal(r.state.input_transport,'stdin');assert.equal(r.state.input.bytes,Buffer.byteLength(input));assert.equal(JSON.parse(fs.readFileSync(r.state.result_file,'utf8')).tag,'中文-tag');
  const invocation=lastInvocation();assert(!invocation.args.includes('--'));assert(!invocation.args.some(arg=>arg.includes('A'.repeat(1000))));assert(invocation.prompt.includes(input));
 });
 await check('large prompt also avoids command-line argument limits',()=>{const r=run('large-prompt',{task_type:'review',prompt:'mock:json\n'+'x'.repeat(13000)});assert.equal(r.code,0);assert.equal(r.state.input_transport,'stdin');});
 await check('oversized input fails before dispatch',()=>{fs.writeFileSync(path.join(root,'large.txt'),'a'.repeat(1048577));assert.equal(run('large-input',{input_file:'large.txt'}).code,2);});
 await check('input outside root is rejected',()=>assert.equal(run('outside-input',{input_file:'../not-authorized.txt'}).code,2));
 await check('binary or invalid UTF-8 input is rejected',()=>{fs.writeFileSync(path.join(root,'binary'),Buffer.from([255,0]));assert.equal(run('binary-input',{input_file:'binary'}).code,2);});
 await check('schema success is independently recorded',()=>{const r=run('schema',{task_type:'extraction',output_schema:objectSchema});assert.equal(r.code,0);assert.equal(r.state.schema_validated,true);});
 await check('schema mismatch prevents business verifier from running',()=>{
  const marker=path.join(root,'verifier-was-run');const r=run('schema-bad',{task_type:'extraction',prompt:'mock:bad-schema',output_schema:objectSchema,verify:[process.execPath,'-e','require("fs").writeFileSync(process.argv[1],"ran")',marker]});assert.equal(r.code,1);assert.match(r.state.detail,/schema mismatch/);assert(!fs.existsSync(marker));
 });
 await check('invalid JSON is rejected under a schema',()=>assert.equal(run('schema-json',{task_type:'extraction',prompt:'mock:invalid-json',output_schema:objectSchema}).code,1));
 await check('pathological schema pattern is bounded and releases session lock',()=>{
  const started=Date.now();const r=run('schema-timeout',{task_type:'extraction',prompt:'mock:regex',output_schema:{type:'string',pattern:'^(a+)+$'}});assert.equal(r.code,1);assert.equal(r.state.schema_timed_out,true);assert(Date.now()-started<12000);assert(!fs.existsSync(path.join(root,'.handoff/jobs/schema-timeout/session.lock')));
 });
 await check('unsupported schema keywords fail before dispatch',()=>assert.equal(run('schema-unsupported',{output_schema:{$ref:'#/defs/value'}}).code,2));
 await check('structured_output is supported when CLI provides it',()=>{const r=run('structured',{mode:'read_only',prompt:'mock:structured',output_schema:objectSchema});assert.equal(r.code,0);assert.equal(r.state.schema_validated,true);});
 await check('schema subset checks Unicode, nesting and combinations',()=>{
  const s={type:'object',properties:{name:{type:'string',minLength:1,maxLength:1},rows:{type:'array',items:{type:'integer'},uniqueItems:true,minItems:1},choice:{oneOf:[{const:'yes'},{type:'number',minimum:2}]}},required:['name','rows','choice'],additionalProperties:false};schemaTools.validateSchemaDefinition(s);schemaTools.validateOutput({name:'😀',rows:[1,2],choice:3},s);assert.throws(()=>schemaTools.validateOutput({name:'xy',rows:[1,1],choice:false},s));
 });
 const first=run('chain-first',{task_type:'investigation',scope:'Read-only investigation of the synthetic fixture.',timeout_s:30});assert.equal(first.code,0);
 await check('resume reuses exact session but creates a new report and attempt',()=>{
  const r=run('chain-second',{resume_from:'chain-first',timeout_s:1800},'resume');assert.equal(r.code,0);assert.equal(r.state.attempt,2);assert.equal(r.state.cli_session_id,first.state.cli_session_id);assert.equal(r.state.total_timeout_s,30);assert(r.state.timeout_s<30);assert(r.state.chain_cli_elapsed_ms>first.state.chain_cli_elapsed_ms);assert.equal(r.state.mode,'read_only');assert.notEqual(r.state.result_file,first.state.result_file);const a=lastInvocation().args;assert(a.includes('--resume'));assert(!a.includes('--session-id'));assert(!a.includes('--resume-create-missing'));
 });
 await check('stale parent cannot branch or reset cumulative budget',()=>assert.equal(run('stale',{resume_from:'chain-first'},'resume').code,2));
 await check('resume cannot escalate read-only to edit',()=>assert.equal(run('escalate',{resume_from:'chain-second',mode:'edit'},'resume').code,2));
 await check('resume cannot replace original task scope',()=>assert.equal(run('scope-change',{resume_from:'chain-second',scope:'new wider scope'},'resume').code,2));
 await check('resume cannot change model silently',()=>assert.equal(run('model-change',{resume_from:'chain-second',model:'another-model'},'resume').code,2));
 await check('resume cannot reuse an existing report',()=>assert.equal(run('stale-report',{resume_from:'chain-second',result_file:'reports/chain-second.json'},'resume').code,2));
 await check('session lock blocks duplicate active continuation',()=>{
  const lock=path.join(root,'.handoff/jobs/chain-first/session.lock');fs.writeFileSync(lock,'synthetic active lock');try{assert.equal(run('locked',{resume_from:'chain-second'},'resume').code,2);}finally{fs.unlinkSync(lock);}
 });
 await check('exhausted session budget cannot be reset by a new card',()=>{
  const r=run('tiny-budget',{task_type:'investigation',scope:'Tiny test',timeout_s:1});assert.equal(r.code,0);assert.equal(run('tiny-resume',{resume_from:'tiny-budget',timeout_s:1800},'resume').code,2);
 });
 await check('active parent is rejected rather than restarted',()=>{
  const file=path.join(root,'.handoff/jobs/chain-second/state.json'),original=fs.readFileSync(file,'utf8');const s=JSON.parse(original);s.status='running';fs.writeFileSync(file,JSON.stringify(s));try{assert.equal(run('active',{resume_from:'chain-second'},'resume').code,2);}finally{fs.writeFileSync(file,original);}
 });
 await check('resume requires an explicit scoped source task',()=>{const r=run('unscoped',{mode:'read_only'});assert.equal(r.code,0);assert.equal(run('unscoped-resume',{resume_from:'unscoped'},'resume').code,2);});
 await check('actual concurrent continuation is rejected while one process runs',async()=>{
  const next=card('concurrent-first',{resume_from:'chain-second',prompt:'mock:slow'});const proc=spawn(process.execPath,[runner,'resume',next.file],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';proc.stdout.on('data',chunk=>output+=chunk);const done=new Promise((resolve,reject)=>{proc.once('error',reject);proc.once('close',code=>resolve(code));});
  const deadline=Date.now()+4000;while(!fs.existsSync(path.join(root,'.handoff/jobs/concurrent-first/state.json'))&&proc.exitCode===null&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(proc.exitCode,null);assert.equal(state('concurrent-first').status,'running');assert.equal(run('concurrent-second',{resume_from:'chain-second'},'resume').code,2);assert.equal(await done,0,output);
 });
 const report={passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks,fixture_root:root};fs.writeFileSync(path.join(root,'new-feature-test-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
