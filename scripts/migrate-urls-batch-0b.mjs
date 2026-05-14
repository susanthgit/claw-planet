#!/usr/bin/env node
/**
 * migrate-urls-batch-0b.mjs — Claw v0b Batch 0b URL migration.
 *
 * Rewrites internal links to the 8 OpenClaw legacy URL prefixes
 *   /overview/ /setup/ /connections/ /plugins/ /use-cases/ /security/ /resources/ /faq/
 * into their new vendor-prefixed forms
 *   /openclaw/overview/ ... /openclaw/faq/
 *
 * What stays at root: /compare/ and /updates/ (vendor-agnostic tabs), and the
 * 5 vendor hubs themselves (/openclaw/ /anthropic/ /openai/ /google/ /microsoft/).
 *
 * Regex strategy: the lookbehind (?<![\w]) prevents three classes of false positive:
 *   - Double-prefixing — `/openclaw/setup/` won't match because the char before /setup/
 *     is `w` which is a word char
 *   - Source-file references like `src/pages/setup/...` (the `s` in `pages` is \w)
 *   - External URLs like `docs.openclaw.ai/setup/` (the `i` is \w)
 *
 * Scans:  src/**\/*.{astro,mdx,ts,tsx,js,mjs} + scripts/*.mjs + public/llms.txt
 * Skips:  this script itself, node_modules, dist, .astro, .git, screenshots, tests
 *
 * Usage:
 *   node scripts/migrate-urls-batch-0b.mjs            (dry-run — prints diff)
 *   node scripts/migrate-urls-batch-0b.mjs --apply    (writes files)
 *
 * Idempotent: running again after --apply is a no-op (new URLs already have
 * /openclaw/ prefix, which fails the lookbehind).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');

const RE = /(?<![\w])\/(overview|setup|connections|plugins|use-cases|security|resources|faq)\//g;

const SCAN_ROOTS = [
  { dir: 'src', exts: ['.astro', '.mdx', '.md', '.ts', '.tsx', '.js', '.mjs'] },
  { dir: 'scripts', exts: ['.mjs', '.js', '.ts'] },
];
const EXTRA_FILES = [
  'public/llms.txt',
];
const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.astro', '.git', 'screenshots', '.cache', '.wrangler',
]);
const SELF = path.relative(ROOT, fileURLToPath(import.meta.url)).split(path.sep).join('/');

async function walk(dir, exts, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, exts, out);
    } else if (e.isFile() && exts.some(x => e.name.endsWith(x))) {
      out.push(full);
    }
  }
  return out;
}

function diffPreview(before, after, filePath) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const len = Math.max(beforeLines.length, afterLines.length);
  const out = [];
  for (let i = 0; i < len; i++) {
    const b = beforeLines[i] ?? '';
    const a = afterLines[i] ?? '';
    if (b !== a) {
      out.push(`  ${String(i + 1).padStart(4, ' ')} - ${b}`);
      out.push(`  ${String(i + 1).padStart(4, ' ')} + ${a}`);
    }
  }
  return out.join('\n');
}

async function main() {
  const targets = [];
  for (const { dir, exts } of SCAN_ROOTS) {
    const abs = path.join(ROOT, dir);
    const files = await walk(abs, exts);
    targets.push(...files);
  }
  for (const rel of EXTRA_FILES) {
    const abs = path.join(ROOT, rel);
    try { await fs.access(abs); targets.push(abs); } catch { /* skip */ }
  }

  let changedFiles = 0;
  let totalReplacements = 0;
  const summaryByFile = [];

  for (const file of targets) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (rel === SELF) continue;
    const content = await fs.readFile(file, 'utf8');
    const matches = content.match(RE);
    if (!matches || matches.length === 0) continue;
    const updated = content.replace(RE, '/openclaw/$1/');
    if (updated === content) continue;
    changedFiles++;
    totalReplacements += matches.length;
    summaryByFile.push({ rel, count: matches.length, diff: diffPreview(content, updated, rel) });
    if (APPLY) {
      await fs.writeFile(file, updated, 'utf8');
    }
  }

  console.log(`migrate-urls-batch-0b: scanned ${targets.length} files`);
  console.log(`migrate-urls-batch-0b: ${changedFiles} file(s) would change · ${totalReplacements} total replacement(s)`);
  console.log('');

  // Per-file count summary
  for (const s of summaryByFile) {
    console.log(`  ${s.rel}  (${s.count} replacement${s.count === 1 ? '' : 's'})`);
  }
  console.log('');

  // Detailed diff (only when not applying, to keep apply runs quiet)
  if (!APPLY && summaryByFile.length > 0) {
    console.log('===== DIFF =====');
    for (const s of summaryByFile) {
      console.log('');
      console.log(`--- ${s.rel}`);
      console.log(s.diff);
    }
    console.log('');
  }

  if (APPLY) {
    console.log('✓ Applied. Re-run with no flags to confirm idempotence (should report 0 changes).');
  } else {
    console.log('Dry-run. Re-run with --apply to write changes.');
  }
}

main().catch(e => {
  console.error('migrate-urls-batch-0b error:', e);
  process.exit(1);
});
