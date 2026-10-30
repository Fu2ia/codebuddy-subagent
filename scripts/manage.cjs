#!/usr/bin/env node
'use strict';
// Owns only its profile. Never edits CodeBuddy settings, credentials or agent registration.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const config = require('./config.cjs');
const { OWNER, fail, plainPath, read, cliPath } = config;
const required = ['task.cjs', 'task-features.cjs', 'task-chain.cjs', 'validate-result.cjs', 'config.cjs', 'configure.cjs'];
const preferenceFlags = {'--model':'model','--delegation':'delegation','--timeout-s':'timeout_s','--max-turns':'max_turns',
  '--command-target-s':'command_target_s','--shell-default-ms':'shell_default_ms','--shell-max-ms':'shell_max_ms',
  '--auth-mode':'auth_mode','--credential-dir':'credential_dir','--region':'region','--language':'language'};
function authSource(env) {
  if (env.CODEBUDDY_API_KEY && env.CODEBUDDY_AUTH_TOKEN) return 'environment_api_key_and_auth_token';
  if (env.CODEBUDDY_API_KEY) return 'environment_api_key';
  if (env.CODEBUDDY_AUTH_TOKEN) return 'environment_auth_token';
  const dir = env.CODEBUDDY_CRED_DIR || path.join(env.LOCALAPPDATA || '', 'CodeBuddyExtension/Data/Public/auth');
  return fs.existsSync(path.join(dir, 'Tencent-Cloud.coding-copilot.info')) ? 'extension_file_candidate_unvalidated' : 'none_detected';
}
function atomic(file, value) {
  const tmp = file + '.' + crypto.randomUUID() + '.tmp';
  try { fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); fs.renameSync(tmp, file); }
  finally { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); }
}
function parse(args) {
  const action = args.shift(); const opts = {};
  while (args.length) {
    const key = args.shift();
    if (!['--home', '--cli', '--backup', '--root', '--id', '--card', ...Object.keys(preferenceFlags)].includes(key) || !args.length || Object.hasOwn(opts,key)) fail('Invalid or duplicate option');
    opts[key] = args.shift();
  }
  const allowed = {
    doctor: ['--root', '--id'], status: ['--root', '--id'], setup: ['--cli', ...Object.keys(preferenceFlags)], repair: ['--cli', ...Object.keys(preferenceFlags)],
    enable: [], disable: [], uninstall: [], rollback: ['--backup'], run: ['--card'], resume: ['--card']
  };
  if (!allowed[action] || Object.keys(opts).some(k => k !== '--home' && !allowed[action].includes(k))) fail('Unsupported command or option');
  if (opts['--home'] && !path.isAbsolute(opts['--home'])) fail('--home must be absolute');
  const home = opts['--home'] || config.home();
  return { action, opts, home };
}
async function main() {
  const { action, opts, home } = parse(process.argv.slice(2));
  plainPath(home);
  const file = path.join(home, 'profile.json');
  let profile = read(file);
  const env = config.environment(profile);
  env.CODEBUDDY_SUBAGENT_HOME = home;
  const preferences = config.preferences(profile?.preferences);
  if (action === 'doctor' || action === 'status') {
    const components = Object.fromEntries(required.map(n => [n, fs.existsSync(path.join(__dirname, n))]));
    let cli = null, version = null, cliStatus = 'missing';
    try {
      cli = cliPath(env);
      const v = spawnSync(process.execPath, [cli, '--version'], { env, encoding: 'utf8', timeout: 5000, maxBuffer: 65536, windowsHide: true });
      // Report only a bounded version token, never arbitrary CLI output.
      version = v.status === 0 ? v.stdout?.match(/\b\d+\.\d+\.\d+(?:-[\w.-]+)?\b/)?.[0] || null : null;
      cliStatus = version ? 'version_verified' : 'version_unverified';
    } catch { cliStatus = 'unavailable'; }
    let evidence = null;
    if (opts['--root'] || opts['--id']) {
      if (!path.isAbsolute(opts['--root'] || '') || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(opts['--id'] || '')) fail('Evidence requires absolute --root and valid --id');
      const stateFile = path.join(opts['--root'], '.handoff/jobs', opts['--id'], 'state.json');
      plainPath(stateFile);
      if (fs.statSync(stateFile).size > 1048576) fail('Oversize task state');
      const s = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      evidence = { kind: 'historical_local_task_record', id: opts['--id'], status: s.status,
        finished_at: s.finished_at || null, requested_model: s.requested_model || null,
        reported_models: s.reported_models || [], request_model_ids: s.request_model_ids || [],
        verify_exit: s.verify_exit ?? null, schema_validated: s.schema_validated ?? null,
        accepted: s.status === 'done' && s.exit_code === 0 && s.verify_exit === 0 };
    }
    const healthy = Object.values(components).every(Boolean) && cliStatus === 'version_verified';
    console.log(JSON.stringify({ status: healthy ? 'static_checks_passed' : 'static_checks_incomplete', profile: profile ? (profile.enabled ? 'enabled' : 'disabled') : 'not_configured',
      home, components, cli, cli_status: cliStatus, cli_version: version,
      cli_source: process.env.CODEBUDDY_CLI ? 'environment' : profile?.cli ? 'profile' : 'path',
      credential_source: authSource(env), authentication: 'not_live_verified',
      default_model: preferences.model, preferences, installation_complete: !!preferences.model,
      extension_fallback_enabled: preferences.auth_mode === 'environment_or_extension', historical_evidence: evidence,
      native_role_registration: 'not_provided' }, null, 2));
    process.exitCode = healthy ? 0 : 1; return;
  }
  if (action === 'run' || action === 'resume') {
    if (!profile?.enabled) fail('Managed entry disabled or not configured');
    if (!path.isAbsolute(opts['--card'] || '')) fail('--card must be absolute');
    const child = spawn(process.execPath, [path.join(__dirname, 'task.cjs'), action, opts['--card']], { env, stdio: 'inherit', windowsHide: true });
    await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', code => { process.exitCode = code ?? 1; resolve(); }); });
    return;
  }
  fs.mkdirSync(home, { recursive: true }); plainPath(home);
  const lock = path.join(home, 'operation.lock');
  let fd;
  try { fd = fs.openSync(lock, 'wx', 0o600); } catch (e) { if (e.code === 'EEXIST') fail('operation_in_progress; inspect stale lock manually'); throw e; }
  try {
    // Reload under the lock. Preserve any unknown/malformed configuration.
    profile = read(file);
    let next;
    if (action === 'setup' || action === 'repair') {
      let cli = profile?.cli ?? null;
      if (Object.hasOwn(opts,'--cli')) {
        if (opts['--cli'] === '') cli = null;
        else {
          if (!path.isAbsolute(opts['--cli'])) fail('--cli must be absolute');
          cli = cliPath({ ...process.env, CODEBUDDY_CLI: opts['--cli'] });
        }
      }
      const p = config.preferences(profile?.preferences);
      for (const [flag,key] of Object.entries(preferenceFlags)) if (Object.hasOwn(opts,flag)) {
        p[key] = typeof config.defaults[key] === 'number' ? Number(opts[flag]) : opts[flag] === '' ? null : opts[flag];
      }
      const validated = config.preferences(p);
      if (!validated.model) fail('Choose a model with configure.cjs or --model; no personal model is bundled');
      next = { owner: OWNER, revision: (profile?.revision || 0) + 1, enabled: profile?.enabled ?? true, cli, preferences: validated };
    } else {
      if (action === 'rollback') {
        if (!/^[0-9a-f-]{36}\.json$/.test(opts['--backup'] || '')) fail('Explicit backup filename required');
        const previous = read(path.join(home, 'backups', opts['--backup']));
        if (!previous) fail('Backup missing');
        next = { ...previous, revision: (profile?.revision || previous.revision) + 1 };
      } else {
        if (!profile) fail('No owned profile configured');
        next = { ...profile, revision: profile.revision + 1, enabled: action === 'enable' ? true : action === 'disable' ? false : profile.enabled };
      }
    }
    let backup = null;
    if (profile) {
      const dir = path.join(home, 'backups'); plainPath(dir); fs.mkdirSync(dir, { recursive: true });
      backup = crypto.randomUUID() + '.json';
      fs.writeFileSync(path.join(dir, backup), JSON.stringify(profile, null, 2), { flag: 'wx', mode: 0o600 });
    }
    if (action === 'uninstall') fs.unlinkSync(file); else atomic(file, next);
    console.log(JSON.stringify({ status: action === 'uninstall' ? 'uninstalled' : 'configured', enabled: action === 'uninstall' ? null : next.enabled, home, backup, credentials_modified: false }));
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}
main().catch(e => { console.log(JSON.stringify({ status: 'error', detail: e.safeDiagnostic ? e.message : 'Management I/O or subprocess failure; check paths and permissions. Existing backups are retained.' })); process.exitCode = 2; });
