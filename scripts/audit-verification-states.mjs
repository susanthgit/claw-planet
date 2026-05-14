#!/usr/bin/env node
/**
 * audit-verification-states.mjs — verify every applicable content entry
 * declares a verification state in its frontmatter.
 *
 * Applies to: setups, plugins, use-cases.
 * Optional for: connections, gotchas, compares, explainers, faq.
 *
 * Exit codes:
 *   0 — every applicable entry has a state
 *   1 — at least one entry missing a state
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_ROOT = path.join(ROOT, 'src', 'content');

const REQUIRED_DIRS = ['setups', 'plugins', 'use-cases'];
// Updated to the v0b multi-vendor vocabulary (2026-05-14).
// Legacy values (sourced-only / tested-by-sush / tested-by-contributor) were
// migrated by scripts/migrate-frontmatter-multivendor.mjs.
const VALID_STATES = ['planned', 'sourced', 'tried', 'verified', 'disputed'];

async function walk(dir) {
  const out = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isFile() && (full.endsWith('.mdx') || full.endsWith('.md'))) out.push(full);
    }
  } catch { /* skip */ }
  return out;
}

function extractFrontmatter(src) {
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const lines = match[1].split(/\r?\n/);
  const fm = {};
  for (const line of lines) {
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):\s*(.+?)\s*$/);
    if (m) fm[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return fm;
}

const issues = [];

for (const dirName of REQUIRED_DIRS) {
  const dir = path.join(CONTENT_ROOT, dirName);
  const files = await walk(dir);
  for (const f of files) {
    const src = await fs.readFile(f, 'utf8');
    const fm = extractFrontmatter(src);
    const rel = path.relative(ROOT, f).replaceAll('\\', '/');
    if (!fm) {
      issues.push({ file: rel, problem: 'no frontmatter' });
      continue;
    }
    if (!fm.verificationState) {
      issues.push({ file: rel, problem: 'missing verificationState field' });
      continue;
    }
    if (!VALID_STATES.includes(fm.verificationState)) {
      issues.push({ file: rel, problem: `invalid state "${fm.verificationState}" — must be one of ${VALID_STATES.join(', ')}` });
    }
  }
}

if (issues.length === 0) {
  console.log('audit-verification-states: every applicable entry has a valid state. ✓');
  process.exit(0);
}

console.error(`❌ audit-verification-states FAILED: ${issues.length} issue(s)`);
for (const i of issues) {
  console.error(`   ${i.file}  →  ${i.problem}`);
}
console.error('');
console.error(`Valid states: ${VALID_STATES.join(', ')}`);
process.exit(1);
