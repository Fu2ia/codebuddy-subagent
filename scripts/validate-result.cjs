'use strict';
const fs = require('node:fs');
const { validateOutput } = require('./task-features.cjs');
try {
  let value;
  try { value = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, '')); }
  catch { throw new Error('Result is not pure JSON required by output_schema'); }
  const schema = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  validateOutput(value, schema);
  console.log(JSON.stringify({ valid: true }));
} catch (error) {
  console.log(JSON.stringify({ valid: false, error: error.message }));
  process.exitCode = 1;
}
