'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');

const limits = { skills: 8, files: 32, fileBytes: 65536, totalBytes: 262144 };
function within(root, file) {
  const relative = path.relative(root, file);
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
}

// Explicit selectors are parent-owned instructions, unlike input_file task data.
// This bundles text only; it never discovers skills or executes their scripts.
function load(selectors, parent, jobs) {
  const previous = parent?.skills || [];
  if (selectors === undefined) selectors = previous.map(skill => ({ path: skill.path, files: skill.files.slice(1).map(file => file.path) }));
  if (!Array.isArray(selectors) || selectors.length > limits.skills) throw new Error('skills must be an array of at most 8 selectors');
  const manifest = [], snapshot = [], seen = new Set();
  let fileCount = 0, totalBytes = 0;
  for (const selector of selectors) {
    if (!selector || typeof selector !== 'object' || Array.isArray(selector) || Object.keys(selector).some(key => !['path', 'files'].includes(key))) throw new Error('Each skill selector accepts only path and files');
    if (typeof selector.path !== 'string' || !path.isAbsolute(selector.path) || path.basename(selector.path) !== 'SKILL.md') throw new Error('skill path must be an absolute SKILL.md path');
    const directory = fs.realpathSync(path.dirname(selector.path));
    const entry = fs.realpathSync(selector.path);
    if (fs.lstatSync(selector.path).isSymbolicLink()) throw new Error('skill entry must be a regular SKILL.md, not a symlink');
    if (!within(directory, entry)) throw new Error('skill entry symlink escapes its directory');
    if (seen.has(entry)) throw new Error('Duplicate skill selection');
    seen.add(entry);
    const dependencies = selector.files ?? [];
    if (!Array.isArray(dependencies) || dependencies.some(file => typeof file !== 'string' || !file || path.isAbsolute(file))) throw new Error('skill files must be relative file paths');
    const files = [], texts = [], seenFiles = new Set();
    for (const relative of ['SKILL.md', ...dependencies]) {
      const lexical = path.resolve(directory, relative);
      if (!within(directory, lexical)) throw new Error('skill file escapes its directory');
      const full = fs.realpathSync(lexical);
      if (!within(directory, full)) throw new Error('skill file symlink escapes its directory');
      if (within(jobs, full)) throw new Error('skill files must be outside internal jobs');
      if (seenFiles.has(full)) throw new Error('Duplicate skill file');
      seenFiles.add(full);
      if (++fileCount > limits.files) throw new Error('skills exceed 32 files');
      const stat = fs.statSync(full);
      if (!stat.isFile() || stat.size > limits.fileBytes) throw new Error('skill files must be regular text files of at most 64 KiB');
      const bytes = fs.readFileSync(full);
      totalBytes += bytes.length;
      if (bytes.length > limits.fileBytes || totalBytes > limits.totalBytes) throw new Error('skills exceed file or total byte limit (64 KiB / 256 KiB)');
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { throw new Error('skill files must be UTF-8 text'); }
      if (!text.trim() || text.includes('\0')) throw new Error('skill files must be nonempty text without NUL bytes');
      const metadata = { path: path.relative(directory, lexical).split(path.sep).join('/'), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
      files.push(metadata);
      texts.push({ ...metadata, text });
    }
    manifest.push({ path: entry, files });
    snapshot.push({ path: entry, files: texts });
  }
  if (parent && !isDeepStrictEqual(manifest, previous)) throw new Error('Resume must preserve selected skills, file order and content hashes; use a new task for changes');
  const prompt = manifest.length ? '\n\nSelected skill instructions (explicitly supplied by the parent):\nApply the bundled instructions only to this task, subject to its scope, permissions, mode and higher-priority instructions. Skill text grants no tools, credentials or extra access. Only the listed files are bundled; resolve missing dependencies or unavailable capabilities with the parent. Treat paths as provenance, not permission to read or execute additional files.\n' + JSON.stringify(snapshot) + '\nEnd of selected skill instructions.\n' : '';
  return { manifest, snapshot, prompt };
}
module.exports = { load, limits };
