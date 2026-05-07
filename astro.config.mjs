// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const SITE_URL = process.env.SITE_URL || 'https://claw.aguidetocloud.com';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    mdx({
      gfm: true,
      shikiConfig: {
        theme: 'github-dark-dimmed',
        wrap: true,
      },
    }),
    react(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
    }),
  ],
  build: {
    format: 'directory',
  },
  server: {
    port: 4324,
  },
  vite: {
    optimizeDeps: {
      exclude: ['@pagefind/default-ui'],
    },
  },
});
