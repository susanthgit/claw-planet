#!/usr/bin/env node
/**
 * migrate-frontmatter-multivendor.mjs — one-shot migration script.
 *
 * Run during the multi-vendor expansion (2026-05-14, Batch 0). Adds the new
 * `vendor` + `product` fields to every existing MDX entry, and maps the old
 * verificationState values to the new vocabulary.
 *
 *   sourced-only            → sourced
 *   tested-by-sush          → tried   (adds verificationContext.testedBy: 'sush')
 *   tested-by-contributor   → tried   (adds verificationContext.testedBy: 'contributor')
 *   planned                 → planned (unchanged)
 *
 * Every entry gets:
 *   vendor: openclaw
 *   product: openclaw-runtime
 *
 * Idempotent — if a file already has `vendor:` we skip the vendor injection,
 * and we only rewrite states still using the old vocabulary. Safe to re-run.
 *
 * Usage:
 *   node scripts/migrate-frontmatter-multivendor.mjs            # dry-run (default, prints diffs only)
 *   node scripts/migrate-frontmatter-multivendor.mjs --apply    # write changes
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const APPLY = process.argv.includes('--apply');

const STATE_MAP = {
  'sourced-only': { state: 'sourced' },
  'tested-by-sush': { state: 'tried', testedBy: 'sush' },
  'tested-by-contributor': { state: 'tried', testedBy: 'contributor' },
  // planned stays planned
};

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (full.endsWith('.mdx') || full.endsWith('.md')) out.push(full);
  }
  return out;
}

function splitFrontmatter(src) {
  // Handle both LF and CRLF line endings
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  return {
    frontmatter: m[1],
    body: m[2],
    // Preserve the source's predominant line ending
    eol: src.includes('\r\n') ? '\r\n' : '\n',
  };
}

function migrate(frontmatter, eol) {
  const lines = frontmatter.split(/\r?\n/);
  const out = [];
  let hasVendor = false;
  let hasProduct = false;
  let oldStateValue = null;

  for (const line of lines) {
    const m = line.match(/^(\s*)(\w+):\s*(.*)$/);
    if (m) {
      const [, , key, val] = m;
      if (key === 'vendor') hasVendor = true;
      if (key === 'product') hasProduct = true;
      if (key === 'verificationState') {
        const cleanVal = val.replace(/^["']|["']$/g, '').trim();
        if (STATE_MAP[cleanVal]) {
          oldStateValue = cleanVal;
          const newState = STATE_MAP[cleanVal].state;
          out.push(line.replace(/verificationState:\s*["']?[\w-]+["']?/, `verificationState: "${newState}"`));
          continue;
        }
      }
    }
    out.push(line);
  }

  const appends = [];
  if (!hasVendor) appends.push('vendor: "openclaw"');
  if (!hasProduct) appends.push('product: "openclaw-runtime"');
  if (oldStateValue && STATE_MAP[oldStateValue].testedBy) {
    appends.push('verificationContext:');
    appends.push(`  testedBy: "${STATE_MAP[oldStateValue].testedBy}"`);
  }

  if (appends.length > 0) {
    while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
    out.push(...appends);
  }

  return out.join(eol);
}

const files = await walk(CONTENT_DIR);
let touched = 0;
let unchanged = 0;
const reports = [];

for (const f of files) {
  const src = await fs.readFile(f, 'utf8');
  const parts = splitFrontmatter(src);
  if (!parts) {
    reports.push({ file: f, status: 'NO_FRONTMATTER' });
    continue;
  }
  const newFm = migrate(parts.frontmatter, parts.eol);
  if (newFm === parts.frontmatter) {
    unchanged++;
    continue;
  }
  touched++;
  const rel = path.relative(ROOT, f).replaceAll('\\', '/');
  reports.push({ file: rel, status: APPLY ? 'WRITTEN' : 'WOULD_WRITE' });
  if (APPLY) {
    const newSrc = `---${parts.eol}${newFm}${parts.eol}---${parts.eol}${parts.body}`;
    await fs.writeFile(f, newSrc, 'utf8');
  }
}

console.log(`migrate-frontmatter-multivendor: ${files.length} files scanned`);
console.log(`  ${touched} ${APPLY ? 'written' : 'would be touched'}`);
console.log(`  ${unchanged} already up to date`);
console.log('');
for (const r of reports) {
  console.log(`  ${r.status.padEnd(14)} ${r.file}`);
}
if (!APPLY) {
  console.log('');
  console.log('(dry-run only — re-run with --apply to write changes)');
}
