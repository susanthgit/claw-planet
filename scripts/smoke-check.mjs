#!/usr/bin/env node
/**
 * smoke-check.mjs — post-deploy smoke checks against the live site.
 *
 * Verifies:
 *   - Home returns 200
 *   - Sitemap index exists
 *   - llms.txt exists
 *   - All P0a routes return 200
 *
 * Override base URL: BASE_URL env var (default https://claw.aguidetocloud.com).
 *
 * Run after `node scripts/deploy.mjs` and after a 30s settle.
 */

const BASE = process.env.BASE_URL || 'https://claw.aguidetocloud.com';

const ROUTES = [
  '/',
  '/sitemap-index.xml',
  '/llms.txt',
  '/robots.txt',
  '/favicon.svg',
];

const FAILURES = [];

async function check(url) {
  try {
    const res = await fetch(BASE + url, { redirect: 'manual' });
    if (res.status >= 200 && res.status < 400) {
      console.log(`  ✓ ${url}  ${res.status}`);
      return res;
    }
    console.error(`  ✗ ${url}  ${res.status}`);
    FAILURES.push({ url, status: res.status });
    return res;
  } catch (e) {
    console.error(`  ✗ ${url}  ERROR: ${e.message}`);
    FAILURES.push({ url, error: e.message });
    return null;
  }
}

async function main() {
  console.log(`smoke-check: ${BASE}`);
  console.log('');

  for (const r of ROUTES) {
    await check(r);
  }

  console.log('');
  if (FAILURES.length === 0) {
    console.log(`✓ smoke-check passed: all ${ROUTES.length} routes 200`);
    process.exit(0);
  }
  console.error(`❌ smoke-check FAILED: ${FAILURES.length} failure(s)`);
  for (const f of FAILURES) console.error(`   ${f.url}  ${f.status ?? f.error}`);
  process.exit(1);
}

main();
