/**
 * /og/home.png — Open Graph image for the home page + the default fallback.
 */
import type { APIRoute } from 'astro';
import { renderOgPng } from '@utils/og-render';

export const GET: APIRoute = async () => {
  const png = await renderOgPng({
    title: 'A plain-English study reference for OpenClaw.',
    sectionLabel: 'home',
    description: 'Concepts, setup paths, connections, plugins, security gotchas, comparisons. Independent guide by Sush — sourced where we have not run it ourselves yet.',
    variant: 'home',
  });
  return new Response(png, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
    },
  });
};