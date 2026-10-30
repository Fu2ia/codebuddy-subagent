'use strict';
const fs = require('node:fs');
const path = require('node:path');
const OWNER = 'codex-codebuddy-subagent/v1';
const defaults = Object.freeze({ model: null, delegation: 'explicit', timeout_s: 600, max_turns: 80,
  command_target_s: 240, shell_default_ms: 120000, shell_max_ms: 600000,
  auth_mode: 'environment', credential_dir: null, region: null, language: 'auto' });
function fail(message) { const e = new Error(message); e.safeDiagnostic = true; throw e; }
function home(env = process.env) {
  if (env.CODEBUDDY_SUBAGENT_HOME) {
    if (!path.isAbsolute(env.CODEBUDDY_SUBAGENT_HOME)) fail('CODEBUDDY_SUBAGENT_HOME must be absolute');
    return env.CODEBUDDY_SUBAGENT_HOME;
  }
  return path.resolve(__dirname, '../.local');
}
function plainPath(target) {
  for (let p = path.resolve(target); ; p = path.dirname(p)) {
    try { if (fs.lstatSync(p).isSymbolicLink()) fail('Symlink/junction in management path'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (path.dirname(p) === p) break;
  }
}
function preferences(p = {}) {
  if (!p || typeof p !== 'object' || Array.isArray(p) || Object.keys(p).some(k => !Object.hasOwn(defaults, k))) fail('Unknown preference field');
  const v = { ...defaults, ...p };
  if (!(v.model === null || (typeof v.model === 'string' && /^[\w./:-]{1,128}$/.test(v.model)))) fail('Invalid model ID');
  if (!['auto', 'explicit'].includes(v.delegation)) fail('delegation must be auto or explicit');
  for (const [key, min, max] of [['timeout_s',1,1800],['max_turns',1,200],['command_target_s',1,1800],['shell_default_ms',1,3600000],['shell_max_ms',1,3600000]]) {
    if (!Number.isInteger(v[key]) || v[key] < min || v[key] > max) fail('Preference budget out of range');
  }
  if (v.shell_default_ms > v.shell_max_ms) fail('Shell default exceeds maximum');
  if (!['environment','environment_or_extension'].includes(v.auth_mode)) fail('Invalid auth mode');
  if (!(v.credential_dir === null || typeof v.credential_dir === 'string' && path.isAbsolute(v.credential_dir))) fail('credential_dir must be absolute');
  if (!(v.region === null || typeof v.region === 'string' && /^[a-z0-9-]{1,32}$/i.test(v.region))) fail('Invalid region');
  if (typeof v.language !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/i.test(v.language)) fail('Invalid language code');
  return v;
}
function read(file) {
  plainPath(file);
  if (!fs.existsSync(file)) return null;
  if (!fs.statSync(file).isFile() || fs.statSync(file).size > 16384) fail('Invalid profile file');
  let v; try { v = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { fail('Malformed profile; preserve it for manual recovery'); }
  const keys = ['owner','revision','enabled','cli','preferences'];
  if (!v || v.owner !== OWNER || Object.keys(v).some(k => !keys.includes(k)) ||
      !Number.isSafeInteger(v.revision) || v.revision < 1 || typeof v.enabled !== 'boolean' ||
      !(v.cli === null || typeof v.cli === 'string' && path.isAbsolute(v.cli))) fail('Foreign or invalid profile; refusing to overwrite');
  preferences(v.preferences);
  return v;
}
function load(env = process.env) { return read(path.join(home(env), 'profile.json')); }
function environment(profile, env = process.env) {
  const result = { ...env }, p = preferences(profile?.preferences);
  if (!result.CODEBUDDY_CLI && profile?.cli) result.CODEBUDDY_CLI = profile.cli;
  if (!result.CODEBUDDY_CRED_DIR && p.credential_dir) result.CODEBUDDY_CRED_DIR = p.credential_dir;
  if (!result.CODEBUDDY_REGION && p.region) result.CODEBUDDY_REGION = p.region;
  return result;
}
function cliPath(env = process.env) {
  if (env.CODEBUDDY_CLI) {
    const p = fs.realpathSync(env.CODEBUDDY_CLI);
    if (!fs.statSync(p).isFile() || /\.(cmd|bat|ps1|exe)$/i.test(p)) fail('CLI must be the JavaScript entry');
    return p;
  }
  for (const dir of (env.PATH || '').split(path.delimiter)) {
    // npm launchers may be in a prefix/bin directory on POSIX.
    for (const rel of ['node_modules/@tencent-ai/codebuddy-code/bin/codebuddy','../lib/node_modules/@tencent-ai/codebuddy-code/bin/codebuddy']) {
      const p = path.join(dir, rel); if (fs.existsSync(p) && fs.statSync(p).isFile()) return fs.realpathSync(p);
    }
  }
  fail('CodeBuddy JS entry not found; configure CLI or set CODEBUDDY_CLI');
}
module.exports = { OWNER, defaults, fail, home, plainPath, preferences, read, load, environment, cliPath };
