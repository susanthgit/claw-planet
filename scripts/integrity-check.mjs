#!/usr/bin/env node
/**
 * integrity-check.mjs — CI gate runner.
 *
 * Wraps audit-claims.mjs to assert ZERO broken internal links AND coverage
 * counts match catalog reality.
 *
 * Exit codes:
 *   0 — pass
 *   1 — fail (broken links or coverage mismatch)
 *   2 — bad invocation
 *
 * Override: INTEGRITY_LINK_THRESHOLD env var (default 0). Emergency only.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THRESHOLD = Number(process.env.INTEGRITY_LINK_THRESHOLD ?? 0);

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'], cwd: ROOT, ...opts });
    let out = '';
    p.stdout.on('data', d => { out += d.toString(); });
    p.on('close', code => resolve({ code, out }));
    p.on('error', reject);
  });
}

const { code, out } = await run(process.execPath, ['scripts/audit-claims.mjs']);
process.stdout.write(out);

const m = out.match(/Broken internal links:\s*(\d+)/);
if (!m) {
  console.error('integrity-check: could not parse "Broken internal links:" from audit output');
  process.exit(2);
}
const broken = Number(m[1]);

const covMatch = out.match(/Coverage mismatches:\s*(\d+)/);
const mismatches = covMatch ? Number(covMatch[1]) : 0;

console.log('');
console.log(`integrity-check: broken internal links = ${broken} (threshold: ${THRESHOLD})`);
console.log(`integrity-check: coverage mismatches = ${mismatches} (threshold: 0)`);

let failed = false;

if (broken > THRESHOLD) {
  console.error(`❌ integrity-check FAILED: ${broken} broken internal link(s) > threshold ${THRESHOLD}`);
  console.error('   Emergency override: set INTEGRITY_LINK_THRESHOLD env var (document why).');
  failed = true;
}

if (mismatches > 0) {
  console.error(`❌ integrity-check FAILED: ${mismatches} coverage count(s) do not match catalog reality.`);
  console.error('   Update src/data/coverage.json to reflect actual entry counts.');
  failed = true;
}

if (code !== 0 && !failed) {
  console.error(`integrity-check: audit-claims.mjs exited with code ${code}`);
  process.exit(2);
}

if (failed) process.exit(1);

console.log('✓ integrity-check passed');
process.exit(0);
