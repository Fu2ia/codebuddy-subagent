#!/usr/bin/env node
'use strict';
const fs = require('node:fs'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const config = require('./config.cjs');
async function main() {
  const args = process.argv.slice(2), opts = {};
  while (args.length) {
    const key = args.shift();
    if (!['--home','--answers'].includes(key) || !args.length || Object.hasOwn(opts,key)) config.fail('Use --home <absolute directory> or --answers <JSON file>');
    opts[key] = args.shift();
  }
  const home = opts['--home'] || config.home();
  if (!path.isAbsolute(home)) config.fail('--home must be absolute');
  const previous = config.read(path.join(home,'profile.json'));
  const current = config.preferences(previous?.preferences);
  let answers;
  if (opts['--answers']) {
    if (fs.statSync(opts['--answers']).size > 16384) config.fail('Answers file too large');
    answers = JSON.parse(fs.readFileSync(opts['--answers'],'utf8').replace(/^\uFEFF/,''));
    if (!answers || typeof answers !== 'object' || Array.isArray(answers) || Object.keys(answers).some(k => k !== 'cli' && !Object.hasOwn(config.defaults,k))) config.fail('Unknown installation answer; never provide credentials');
  } else {
    if (!process.stdin.isTTY || !process.stdout.isTTY) config.fail('Interactive installation requires a terminal; use --answers or manage.cjs setup flags after collecting user choices');
    const rl = require('node:readline/promises').createInterface({input:process.stdin,output:process.stdout});
    try {
      console.log('Configure this skill only. Do not enter API keys or tokens. Press Enter to keep a displayed value.');
      let detected = previous?.cli || '';
      if (!detected) { try { detected = config.cliPath(); } catch {} }
      const questions = [
        ['model','CodeBuddy model ID (required)',current.model || ''],
        ['delegation','Delegation: auto or explicit',current.delegation],
        ['cli','Absolute CodeBuddy JS entry (empty = PATH detection)',detected],
        ['timeout_s','Default whole CLI budget, seconds (1..1800)',current.timeout_s],
        ['max_turns','Default model turns (1..200)',current.max_turns],
        ['command_target_s','Ordinary command target, seconds',current.command_target_s],
        ['shell_default_ms','Reference shell default timeout, milliseconds; verify against your CLI',current.shell_default_ms],
        ['shell_max_ms','Reference shell maximum timeout, milliseconds',current.shell_max_ms],
        ['auth_mode','Credential source: environment or environment_or_extension',current.auth_mode],
        ['credential_dir','Optional extension credential directory (no secret values)',current.credential_dir || ''],
        ['region','Optional CodeBuddy region; empty = inherit environment',current.region || ''],
        ['language','Response language code, or auto',current.language]
      ];
      answers = {};
      for (const [key,label,value] of questions) {
        const reply = await rl.question(`${label}${value !== '' ? ' ['+value+']' : ''}: `);
        answers[key] = reply.trim() || value;
      }
    } finally { rl.close(); }
  }
  const flags = {model:'--model',delegation:'--delegation',timeout_s:'--timeout-s',max_turns:'--max-turns',
    command_target_s:'--command-target-s',shell_default_ms:'--shell-default-ms',shell_max_ms:'--shell-max-ms',
    auth_mode:'--auth-mode',credential_dir:'--credential-dir',region:'--region',language:'--language'};
  const cli = Object.hasOwn(answers,'cli') ? answers.cli : previous?.cli || null;
  if (!(cli === null || typeof cli === 'string')) config.fail('CLI answer must be a path string');
  const p = {...current};
  for (const key of Object.keys(config.defaults)) if (Object.hasOwn(answers,key)) {
    p[key] = typeof config.defaults[key] === 'number' ? Number(answers[key]) : answers[key] === '' ? null : answers[key];
  }
  config.preferences(p);
  if (!p.model) config.fail('Choose a model ID; none is bundled');
  const cmd = [path.join(__dirname,'manage.cjs'),'setup','--home',home];
  if (cli || Object.hasOwn(answers,'cli')) cmd.push('--cli',cli || '');
  for (const [key,flag] of Object.entries(flags)) cmd.push(flag,p[key] === null ? '' : String(p[key]));
  const r = spawnSync(process.execPath,cmd,{stdio:'inherit',windowsHide:true,timeout:15000});
  process.exitCode = r.status ?? 2;
}
main().catch(e=>{console.log(JSON.stringify({status:'error',detail:e.safeDiagnostic?e.message:'Installation failed; inspect answers file and permissions. No credential values are accepted.'}));process.exitCode=2});
