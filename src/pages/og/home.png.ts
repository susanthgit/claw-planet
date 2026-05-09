/**
 * /og/home.png — Open Graph image for the home page + the default fallback.
 *
 * Title and description now mirror the home banner's plain-English framing:
 * lead with what OpenClaw IS (a personal AI assistant on your own machine)
 * and what Claw Planet's verification contract guarantees.
 */
import type { APIRoute } from 'astro';
import { renderOgPng } from '@utils/og-render';

export const GET: APIRoute = async () => {
  const png = await renderOgPng({
    title: 'OpenClaw, plainly.',
    sectionLabel: 'home',
    description: 'A study reference for the OpenClaw agent runtime. Concepts · install paths · plugins · security · honest comparisons. Every entry declares whether we ran it ourselves or only sourced it from docs.',
    variant: 'home',
  });
  return new Response(png, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
    },
  });
};