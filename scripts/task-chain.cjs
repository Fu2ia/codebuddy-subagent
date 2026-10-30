'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');
const idPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function saveJson(file, value) { fs.writeFileSync(file + '.tmp', JSON.stringify(value, null, 2)); fs.renameSync(file + '.tmp', file); }
function loadParent(jobs, id) {
  if (!idPattern.test(id || '')) throw new Error('resume_from requires a valid task ID');
  const parent = readJson(path.join(jobs, id, 'state.json'));
  if (!['done', 'failed'].includes(parent.status)) throw new Error('Cannot resume an active task');
  if (!idPattern.test(parent.chain_id || '') || !parent.cli_session_id || !parent.scope) throw new Error('Parent has no resumable session/scope metadata');
  if (parent.termination_unconfirmed) throw new Error('Confirm stopped processes before resuming');
  return parent;
}
function acquire({ jobs, task, parent, profile, model, result, timeout }) {
  const chainId = parent?.chain_id || task.id;
  const chainDir = path.join(jobs, chainId);
  if (!parent) fs.mkdirSync(chainDir); // Fresh job ID: exclusive creation.
  const lock = path.join(chainDir, 'session.lock');
  let descriptor;
  try { descriptor = fs.openSync(lock, 'wx'); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('Session is locked; inspect its running task before retrying'); throw error; }
  fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, task_id: task.id, started_at: new Date().toISOString() }));
  const release = () => { fs.closeSync(descriptor); fs.unlinkSync(lock); };
  try {
    const ledgerFile = path.join(chainDir, 'chain.json');
    const ledger = parent ? readJson(ledgerFile) : { chain_id: chainId, latest_task_id: task.id, budget_ms: timeout * 1000, used_ms: 0 };
    if (parent) {
      if (ledger.latest_task_id !== task.resume_from) throw new Error('resume_from is stale; continue the latest attempt');
      if (profile.mode !== parent.mode || model !== parent.requested_model || !isDeepStrictEqual([...profile.allowed_tools].sort(), [...(parent.allowed_tools || [])].sort())) throw new Error('Resume must preserve mode, model and allowed_tools');
      if (task.scope !== undefined && task.scope !== parent.scope) throw new Error('Resume cannot replace the original scope');
      if (result === parent.result_file) throw new Error('Resume requires a fresh result_file');
    }
    const remaining = Math.floor((ledger.budget_ms - ledger.used_ms) / 1000);
    if (remaining < 1) throw new Error('Session CLI time budget exhausted; resume cannot reset it');
    if (parent) fs.mkdirSync(path.join(jobs, task.id));
    return {
      chain_id: chainId, attempt: parent ? parent.attempt + 1 : 1,
      scope: parent?.scope || task.scope || null,
      timeout_s: Math.min(timeout, remaining), total_timeout_s: ledger.budget_ms / 1000,
      cli_session_id: parent?.cli_session_id || `handoff-${task.id}`,
      start() { ledger.latest_task_id = task.id; saveJson(ledgerFile, ledger); },
      charge(milliseconds) { ledger.used_ms += milliseconds; saveJson(ledgerFile, ledger); return { chain_cli_elapsed_ms: ledger.used_ms, remaining_cli_budget_s: Math.max(0, Math.floor((ledger.budget_ms - ledger.used_ms) / 1000)) }; },
      release
    };
  } catch (error) { release(); throw error; }
}
module.exports = { loadParent, acquire, saveJson };
