'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = fs.mkdtempSync(path.join((process.env.CODEBUDDY_TEST_TMPDIR || require('node:os').tmpdir()), 'codebuddy-management-'));
const script = process.env.MANAGE_SCRIPT || path.resolve(__dirname, '../scripts/manage.cjs');
const home = path.join(root, 'managed');
const cli = path.join(root, 'mock.cjs');
fs.writeFileSync(cli, `const fs=require('node:fs');const a=process.argv.slice(2);if(a.includes('--version')){console.log('fixture 9.8.7');process.exit(0)};console.log(JSON.stringify({type:'result',subtype:'success',is_error:false,result:JSON.stringify({answer:42}),session_id:a[a.indexOf(a.includes('--resume')?'--resume':'--session-id')+1],providerData:{model:a[a.indexOf('--model')+1],requestModelId:a[a.indexOf('--model')+1]}}));`);
const env = { ...process.env, CODEBUDDY_API_KEY: 'public-test-key-never-print', CODEBUDDY_AUTH_TOKEN: '', CODEBUDDY_CLI: '' };
let count = 0; const skipped = [];
function call(action, opts = [], expected = 0, extraEnv = {}) {
  const r = spawnSync(process.execPath, [script, action, '--home', home, ...opts], { env: { ...env, ...extraEnv }, encoding: 'utf8', timeout: 25000 });
  assert.equal(r.error, undefined); assert.equal(r.status, expected, r.stdout + r.stderr);
  assert(!r.stdout.includes(env.CODEBUDDY_API_KEY)); count++;
  return JSON.parse(r.stdout);
}
const profile = () => JSON.parse(fs.readFileSync(path.join(home, 'profile.json')));
// Diagnostics must not mutate home, imply live auth, or dump arbitrary CLI text.
let s = call('doctor', [], 0, { CODEBUDDY_CLI: cli });
assert.equal(s.authentication, 'not_live_verified'); assert.equal(s.profile, 'not_configured');
assert.equal(s.credential_source, 'environment_api_key'); assert(!fs.existsSync(home));
call('setup', ['--cli', cli, '--model', 'fixture-model']); assert(profile().enabled);
const before = fs.readFileSync(path.join(home, 'profile.json'), 'utf8');
s = call('disable'); assert.equal(fs.readFileSync(path.join(home, 'backups', s.backup), 'utf8'), before.trimEnd());
assert(!profile().enabled);
call('run', ['--card', path.join(root, 'nothing.json')], 2);
call('repair'); assert(!profile().enabled);
call('rollback', ['--backup', s.backup]); assert(profile().enabled);
s = call('doctor'); assert.equal(s.cli_source, 'profile'); assert.equal(s.cli_version, '9.8.7');
s = call('doctor', [], 0, { CODEBUDDY_CLI: cli, CODEBUDDY_AUTH_TOKEN: 'public-test-token' });
assert.equal(s.credential_source, 'environment_api_key_and_auth_token'); assert.equal(s.cli_source, 'environment');
fs.writeFileSync(path.join(home, 'operation.lock'), 'fixture');
const locked = fs.readFileSync(path.join(home, 'profile.json'), 'utf8');
call('disable', [], 2); assert.equal(fs.readFileSync(path.join(home, 'profile.json'), 'utf8'), locked);
fs.unlinkSync(path.join(home, 'operation.lock'));
call('enable');
const card = path.join(root, 'card.json');
const result = path.join(root, 'answer.json');
fs.writeFileSync(card, JSON.stringify({id:'managed-probe',root,scope:'Synthetic management test only',task_type:'investigation',prompt:'Return JSON {"answer":42}',result_file:result,timeout_s:20,max_turns:3,
  output_schema:{type:'object',properties:{answer:{const:42}},required:['answer'],additionalProperties:false},
  verify:[process.execPath,'-e',`const fs=require('node:fs');if(JSON.parse(fs.readFileSync(process.argv[1])).answer!==42)process.exit(1)`,result]}));
s = call('run', ['--card', card]); assert.equal(s.status, 'done'); assert.equal(s.verify_exit, 0);
s = call('doctor', ['--root', root, '--id', 'managed-probe']); assert(s.historical_evidence.accepted);
assert.deepEqual(s.historical_evidence.reported_models, ['fixture-model']);
const follow = {...JSON.parse(fs.readFileSync(card)),id:'managed-follow',resume_from:'managed-probe',result_file:path.join(root,'follow.json')};
follow.verify=[process.execPath,'-e','process.exit(0)'];
const followCard=path.join(root,'follow-card.json');fs.writeFileSync(followCard,JSON.stringify(follow));
s=call('resume',['--card',followCard]);assert.equal(s.status,'done');
const badCard={...follow,id:'managed-failed',resume_from:undefined,result_file:path.join(root,'failed.json'),verify:[process.execPath,'-e','process.exit(7)']};
const badCardFile=path.join(root,'failed-card.json');fs.writeFileSync(badCardFile,JSON.stringify(badCard));
s=call('run',['--card',badCardFile],1);assert.equal(s.verify_exit,7);assert.equal(s.status,'failed');
call('doctor', ['--root', root], 2);
// Verify uninstall never removes neighboring settings/disabled files or retained backups.
fs.writeFileSync(path.join(home, 'settings.json'), '{"unrelated":true}');
s = call('uninstall'); assert(!fs.existsSync(path.join(home, 'profile.json')));
assert.equal(fs.readFileSync(path.join(home, 'settings.json'), 'utf8'), '{"unrelated":true}');
assert(fs.existsSync(path.join(home, 'backups', s.backup)));
call('rollback', ['--backup', s.backup]); assert(profile().enabled);
call('rollback', ['--backup', '../settings.json'], 2);
call('setup', ['--cli', path.join(root, 'launcher.cmd')], 2);
call('setup', ['--cli', 'relative.js'], 2);
call('setup', ['--unknown', 'secret'], 2);
const good = fs.readFileSync(path.join(home, 'profile.json'), 'utf8');
for (const bad of ['{"owner":"someone-else"}', '{broken', JSON.stringify({...profile(),apiKey:'public-should-never-be-accepted'})]) {
  fs.writeFileSync(path.join(home, 'profile.json'), bad);
  call('repair', [], 2); assert.equal(fs.readFileSync(path.join(home, 'profile.json'), 'utf8'), bad);
  call('uninstall', [], 2); assert.equal(fs.readFileSync(path.join(home, 'profile.json'), 'utf8'), bad);
}
fs.writeFileSync(path.join(home, 'profile.json'), good);
// A backup failure must leave the current profile intact and release the lock.
fs.renameSync(path.join(home,'backups'),path.join(home,'saved-backups'));
fs.writeFileSync(path.join(home,'backups'),'block directory creation');
call('disable',[],2);assert.equal(fs.readFileSync(path.join(home,'profile.json'),'utf8'),good);
assert(!fs.existsSync(path.join(home,'operation.lock')));
fs.unlinkSync(path.join(home,'backups'));fs.renameSync(path.join(home,'saved-backups'),path.join(home,'backups'));
const alias = path.join(root, 'alias');
try {
  fs.symlinkSync(home, alias, process.platform === 'win32' ? 'junction' : 'dir');
  const r = spawnSync(process.execPath, [script, 'disable', '--home', alias], {env,encoding:'utf8'});
  assert.equal(r.status, 2); assert.equal(fs.readFileSync(path.join(home,'profile.json'),'utf8'),good); count++;
} catch(e) { if(e.code!=='EPERM')throw e; skipped.push('junction creation denied by environment'); }
const noisy = path.join(root, 'noisy.cjs');
fs.writeFileSync(noisy, 'console.log(process.env.CODEBUDDY_API_KEY);console.log("9.8.6")');
s = call('doctor', [], 0, { CODEBUDDY_CLI: noisy }); assert.equal(s.cli_version, '9.8.6');
const slow = path.join(root, 'slow.cjs'); fs.writeFileSync(slow, 'setTimeout(()=>{},20000)');
const start = Date.now(); s = call('doctor', [], 1, {CODEBUDDY_CLI:slow});
assert.equal(s.cli_status,'version_unverified'); assert(Date.now()-start<10000);
const out = {passed:count,skipped,root,script,real_credentials_used:false,real_cli_invoked:false};
console.log(JSON.stringify(out));
