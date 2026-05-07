#!/usr/bin/env node
/**
 * audit-claims.mjs — verify hero/coverage claims match real content.
 *
 * Reads src/data/coverage.json (single source of truth for hero counts)
 * and compares to actual content collection sizes.
 *
 * Also walks built dist/ for internal links and reports broken ones.
 *
 * Output is parsed by integrity-check.mjs to gate CI.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COVERAGE_PATH = path.join(ROOT, 'src', 'data', 'coverage.json');
const CONTENT_ROOT = path.join(ROOT, 'src', 'content');
const DIST = path.join(ROOT, 'dist');

const COVERAGE_TO_DIR = {
  setup: 'setups',
  connections: 'connections',
  plugins: 'plugins',
  useCases: 'use-cases',
  gotchas: 'gotchas',
  compares: 'compares',
  faq: 'faq',
};

async function countMdx(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let n = 0;
    for (const e of entries) {
      if (e.isFile() && (e.name.endsWith('.mdx') || e.name.endsWith('.md'))) n++;
    }
    return n;
  } catch {
    return 0;
  }
}

async function walk(dir, exts) {
  let out = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) out = out.concat(await walk(full, exts));
      else if (exts.some(ext => full.endsWith(ext))) out.push(full);
    }
  } catch { /* skip */ }
  return out;
}

async function checkInternalLinks() {
  const htmlFiles = await walk(DIST, ['.html']);
  if (htmlFiles.length === 0) return { broken: [], total: 0 };

  // Build set of actual paths from the dist tree
  const builtPaths = new Set();
  for (const f of htmlFiles) {
    const rel = path.relative(DIST, f).split(path.sep).join('/');
    let urlPath = '/' + rel;
    if (urlPath.endsWith('/index.html')) urlPath = urlPath.slice(0, -'index.html'.length);
    builtPaths.add(urlPath);
    if (!urlPath.endsWith('/')) builtPaths.add(urlPath + '/');
  }
  // Also include public/ assets
  const publicAssets = await walk(path.join(ROOT, 'public'), ['.txt', '.svg', '.png', '.jpg', '.xml', '.json', '.ico']);
  for (const f of publicAssets) {
    const rel = path.relative(path.join(ROOT, 'public'), f).split(path.sep).join('/');
    builtPaths.add('/' + rel);
  }
  // Astro generates sitemap-index.xml etc.
  for (const f of await walk(DIST, ['.xml', '.txt', '.svg', '.png', '.json', '.ico', '.css', '.js', '.mjs', '.woff', '.woff2'])) {
    const rel = path.relative(DIST, f).split(path.sep).join('/');
    builtPaths.add('/' + rel);
  }

  const broken = [];
  let totalLinks = 0;

  // Regex to extract href values
  const hrefRe = /href="([^"]+)"/g;

  for (const f of htmlFiles) {
    const html = await fs.readFile(f, 'utf8');
    const fileRel = path.relative(DIST, f).split(path.sep).join('/');
    let m;
    while ((m = hrefRe.exec(html)) !== null) {
      const href = m[1];
      // Skip externals, anchors, mailto, etc.
      if (!href.startsWith('/')) continue;
      if (href.startsWith('//')) continue;  // protocol-relative
      totalLinks++;
      // Strip query/hash
      const cleanPath = href.split('?')[0].split('#')[0];
      if (!cleanPath || cleanPath === '/') continue;
      // Normalize trailing slash
      const candidates = [cleanPath, cleanPath + '/', cleanPath.replace(/\/$/, '')];
      const found = candidates.some(c => builtPaths.has(c));
      if (!found) {
        broken.push({ file: fileRel, href: cleanPath });
      }
    }
  }

  return { broken, total: totalLinks };
}

async function main() {
  console.log('audit-claims: checking coverage counts and internal links');
  console.log('');

  // 1. Coverage counts
  let cov;
  try {
    cov = JSON.parse(await fs.readFile(COVERAGE_PATH, 'utf8'));
  } catch (e) {
    console.error(`  ✗ Could not read ${COVERAGE_PATH}: ${e.message}`);
    process.exit(2);
  }

  const mismatches = [];
  for (const [key, sec] of Object.entries(cov.sections || {})) {
    const dirName = COVERAGE_TO_DIR[key];
    if (!dirName) continue;
    const actual = await countMdx(path.join(CONTENT_ROOT, dirName));
    const claimed = sec.current ?? 0;
    if (actual !== claimed) {
      mismatches.push({ key, claimed, actual });
      console.log(`  ✗ ${key}: coverage.json says ${claimed}, found ${actual} in src/content/${dirName}/`);
    } else {
      console.log(`  ✓ ${key}: ${actual} entries (matches coverage.json)`);
    }
  }

  // 2. Broken internal links (only if dist/ exists)
  console.log('');
  let linkResult = { broken: [], total: 0 };
  try {
    await fs.access(DIST);
    linkResult = await checkInternalLinks();
    console.log(`  Scanned ${linkResult.total} internal links across built HTML`);
    if (linkResult.broken.length > 0) {
      console.log(`  Sample broken (first 10):`);
      for (const b of linkResult.broken.slice(0, 10)) {
        console.log(`    ${b.file}  →  ${b.href}`);
      }
    }
  } catch {
    console.log('  (dist/ not built — skipping link audit)');
  }

  console.log('');
  console.log(`Coverage mismatches: ${mismatches.length}`);
  console.log(`Broken internal links: ${linkResult.broken.length}`);

  if (mismatches.length > 0) process.exit(1);
  process.exit(0);
}

main().catch((e) => {
  console.error(`audit-claims error: ${e.message}`);
  process.exit(2);
});
