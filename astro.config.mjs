// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

const SITE_URL = process.env.SITE_URL || 'https://claw.aguidetocloud.com';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'always',
  markdown: {
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: { className: ['heading-anchor'], ariaLabel: 'Link to this heading' },
          content: { type: 'text', value: '#' },
        },
      ],
    ],
  },
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
