#!/usr/bin/env node
/**
 * smoke-check.mjs — post-deploy smoke checks against the live site.
 *
 * Verifies:
 *   - Foundation routes return 200 (home, sitemap, llms.txt, robots, favicon,
 *     vendor hubs)
 *   - A representative sample of OpenClaw /openclaw/* routes return 200
 *   - Legacy OpenClaw URLs return 301 to the correct /openclaw/* target
 *     (Cloudflare Pages _redirects rule coverage — Batch 0b URL migration)
 *
 * Override base URL: BASE_URL env var (default https://claw.aguidetocloud.com).
 * For local validation against `astro preview`: BASE_URL=http://localhost:4324
 *
 * Run after `node scripts/deploy.mjs` and after a 30s settle.
 *
 * IMPORTANT: when validating locally with `astro preview`, the expect301
 * checks will FAIL because Cloudflare Pages serves _redirects, not Astro.
 * Pass --skip-redirects to focus on expect200 only.
 */

const BASE = process.env.BASE_URL || 'https://claw.aguidetocloud.com';
const SKIP_REDIRECTS = process.argv.includes('--skip-redirects');

// 200 OK — must respond with a successful page
const EXPECT_200 = [
  // Foundation
  '/',
  '/sitemap-index.xml',
  '/llms.txt',
  '/robots.txt',
  '/favicon.svg',
  '/about/',
  '/methodology/',
  '/colophon/',
  // Vendor hubs
  '/openclaw/',
  '/anthropic/',
  '/openai/',
  '/google/',
  '/microsoft/',
  '/compare/',
  '/updates/',
  // OpenClaw section indexes
  '/openclaw/overview/',
  '/openclaw/setup/',
  '/openclaw/connections/',
  '/openclaw/plugins/',
  '/openclaw/use-cases/',
  '/openclaw/security/',
  '/openclaw/resources/',
  '/openclaw/faq/',
  // OpenClaw nested compare table
  '/openclaw/setup/compare/',
  // Representative OpenClaw entry pages (one per content collection)
  '/openclaw/overview/what-is-openclaw/',
  '/openclaw/setup/laptop/',
  '/openclaw/connections/channels/',
  '/openclaw/plugins/filesystem-mcp/',
  '/openclaw/use-cases/hello-world-laptop/',
  '/openclaw/security/self-hosting-checklist/',
];

// 301 redirects — legacy root-level OpenClaw URLs (Batch 0b migration).
// Each entry: [old path, expected new Location]
const EXPECT_301 = [
  ['/overview/',                       '/openclaw/overview/'],
  ['/overview/what-is-openclaw/',      '/openclaw/overview/what-is-openclaw/'],
  ['/setup/',                          '/openclaw/setup/'],
  ['/setup/laptop/',                   '/openclaw/setup/laptop/'],
  ['/setup/compare/',                  '/openclaw/setup/compare/'],
  ['/connections/',                    '/openclaw/connections/'],
  ['/connections/channels/',           '/openclaw/connections/channels/'],
  ['/plugins/',                        '/openclaw/plugins/'],
  ['/plugins/filesystem-mcp/',         '/openclaw/plugins/filesystem-mcp/'],
  ['/use-cases/',                      '/openclaw/use-cases/'],
  ['/use-cases/hello-world-laptop/',   '/openclaw/use-cases/hello-world-laptop/'],
  ['/security/',                       '/openclaw/security/'],
  ['/security/self-hosting-checklist/', '/openclaw/security/self-hosting-checklist/'],
  ['/resources/',                      '/openclaw/resources/'],
  ['/faq/',                            '/openclaw/faq/'],
];

const FAILURES = [];

function normalizeLocation(loc) {
  if (!loc) return '';
  // Strip scheme + host if present (Cloudflare may return absolute or relative)
  try {
    const u = new URL(loc, BASE);
    return u.pathname;
  } catch {
    return loc;
  }
}

async function check200(url) {
  try {
    const res = await fetch(BASE + url, { redirect: 'manual' });
    if (res.status >= 200 && res.status < 300) {
      console.log(`  ✓ 200  ${url}`);
      return;
    }
    console.error(`  ✗      ${url}  (got ${res.status}, expected 200)`);
    FAILURES.push({ kind: '200', url, status: res.status });
  } catch (e) {
    console.error(`  ✗      ${url}  ERROR: ${e.message}`);
    FAILURES.push({ kind: '200', url, error: e.message });
  }
}

async function check301(oldUrl, expectedNewPath) {
  try {
    const res = await fetch(BASE + oldUrl, { redirect: 'manual' });
    if (res.status !== 301) {
      console.error(`  ✗      ${oldUrl}  (got ${res.status}, expected 301)`);
      FAILURES.push({ kind: '301', url: oldUrl, status: res.status });
      return;
    }
    const loc = normalizeLocation(res.headers.get('location'));
    if (loc !== expectedNewPath) {
      console.error(`  ✗      ${oldUrl}  (301 to "${loc}", expected "${expectedNewPath}")`);
      FAILURES.push({ kind: '301-target', url: oldUrl, got: loc, expected: expectedNewPath });
      return;
    }
    console.log(`  ✓ 301  ${oldUrl}  →  ${loc}`);
  } catch (e) {
    console.error(`  ✗      ${oldUrl}  ERROR: ${e.message}`);
    FAILURES.push({ kind: '301', url: oldUrl, error: e.message });
  }
}

async function main() {
  console.log(`smoke-check: ${BASE}`);
  if (SKIP_REDIRECTS) console.log('smoke-check: --skip-redirects (expect301 checks disabled)');
  console.log('');

  console.log(`-- expect 200 (${EXPECT_200.length} route${EXPECT_200.length === 1 ? '' : 's'}) --`);
  for (const r of EXPECT_200) await check200(r);

  if (!SKIP_REDIRECTS) {
    console.log('');
    console.log(`-- expect 301 (${EXPECT_301.length} legacy URL${EXPECT_301.length === 1 ? '' : 's'}) --`);
    for (const [oldUrl, expectedNew] of EXPECT_301) await check301(oldUrl, expectedNew);
  }

  console.log('');
  const totalChecks = EXPECT_200.length + (SKIP_REDIRECTS ? 0 : EXPECT_301.length);
  if (FAILURES.length === 0) {
    console.log(`✓ smoke-check passed: all ${totalChecks} routes behaved as expected`);
    process.exit(0);
  }
  console.error(`❌ smoke-check FAILED: ${FAILURES.length} failure(s) of ${totalChecks} check(s)`);
  for (const f of FAILURES) {
    const detail = f.error
      ? `ERROR ${f.error}`
      : f.kind === '301-target'
      ? `got ${f.got}, expected ${f.expected}`
      : `status ${f.status}`;
    console.error(`   [${f.kind}] ${f.url}  ${detail}`);
  }
  process.exit(1);
}

main();
