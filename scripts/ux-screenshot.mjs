/**
 * UX screenshot runner — captures every public route on Claw Planet in
 * light + dark mode at 3 viewports (mobile 390 / tablet 820 / desktop 1440).
 *
 * Saves PNGs to:  ../screenshots/<route-slug>__<theme>__<width>.png
 *
 * Run:  node scripts/ux-screenshot.mjs [base-url]
 *   default base-url: https://claw.aguidetocloud.com
 *
 * Theme is set by injecting localStorage.cp-theme before navigation, so the
 * pre-paint script in BaseLayout.astro picks it up on first paint (no flash).
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'screenshots');

const BASE = process.argv[2] || 'https://claw.aguidetocloud.com';

const ROUTES = [
  '/',
  '/openclaw/overview/',
  '/openclaw/overview/what-is-openclaw/',
  '/openclaw/overview/concepts/',
  '/openclaw/overview/architecture/',
  '/openclaw/overview/honest-drawbacks/',
  '/openclaw/setup/',
  '/openclaw/setup/hardware-matrix/',
  '/openclaw/setup/laptop/',
  '/openclaw/setup/linux-server/',
  '/openclaw/setup/azure/',
  '/openclaw/setup/raspberry-pi/',
  '/openclaw/setup/docker/',
  '/openclaw/connections/',
  '/openclaw/connections/index-patterns/',
  '/openclaw/connections/channels/',
  '/openclaw/connections/tools/',
  '/openclaw/connections/models/',
  '/openclaw/connections/memory/',
  '/openclaw/plugins/',
  '/openclaw/plugins/filesystem-mcp/',
  '/openclaw/use-cases/',
  '/openclaw/use-cases/hello-world-laptop/',
  '/openclaw/use-cases/slack-real-work/',
  '/openclaw/use-cases/pi-home-agent/',
  '/openclaw/use-cases/whatsapp-faq/',
  '/openclaw/use-cases/rag-personal-docs/',
  '/openclaw/security/',
  '/openclaw/security/self-hosting-checklist/',
  '/openclaw/security/plugin-trust-signals/',
  '/openclaw/security/practical-patterns/',
  '/openclaw/security/what-not-to-build/',
  '/compare/',
  '/compare/openclaw-vs-mcp-stacks/',
  '/updates/',
  '/openclaw/resources/',
  '/openclaw/faq/',
  '/methodology/',
  '/colophon/',
  '/this-page-does-not-exist',
];

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
];

const THEMES = ['light', 'dark'];

function routeSlug(route) {
  if (route === '/') return 'home';
  return route.replace(/^\/|\/$/g, '').replace(/\//g, '__');
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`base: ${BASE}`);
  console.log(`output: ${OUT_DIR}`);
  console.log(`routes: ${ROUTES.length} · themes: ${THEMES.length} · viewports: ${VIEWPORTS.length}`);
  console.log(`total shots: ${ROUTES.length * THEMES.length * VIEWPORTS.length}`);

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      // Seed localStorage so the pre-paint script reads the right theme
      await ctx.addInitScript((t) => {
        try { localStorage.setItem('cp-theme', t); } catch (e) {}
      }, theme);
      for (const route of ROUTES) {
        const url = BASE.replace(/\/$/, '') + route;
        const slug = routeSlug(route);
        const file = path.join(OUT_DIR, `${slug}__${theme}__${vp.name}.png`);
        try {
          const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
          // Allow late-paint stuff (font swap, etc.)
          await page.waitForTimeout(500);
          await page.screenshot({ path: file, fullPage: true });
          const status = resp ? resp.status() : '???';
          console.log(`  ${status}  ${theme}/${vp.name}  ${route}`);
        } catch (err) {
          console.log(`  ERR  ${theme}/${vp.name}  ${route}  ::  ${err.message}`);
        }
      }
      await ctx.close();
    }
  }

  await browser.close();
  console.log('done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
