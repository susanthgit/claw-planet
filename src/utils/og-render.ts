/**
 * og-render.ts — shared rendering for Open Graph PNG images.
 *
 * Renders a 1200x630 PNG with:
 *   - Brand mark + "Claw Planet" wordmark top-left
 *   - "§ <number>" big mono number in upper area (claw red)
 *   - Title (large, ink)
 *   - Description (small, ink-mid, optional, truncated)
 *   - Verification badge bottom-right (sourced/tested/planned)
 *   - Hairline border + subtle gridded background
 *
 * Used by /og/[section]/[slug].png.ts (per-entry) and the homepage OG endpoint.
 *
 * Fonts: Inter from @fontsource/inter (loaded as ArrayBuffer).
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let _interBuf: ArrayBuffer | null = null;
let _interBoldBuf: ArrayBuffer | null = null;

async function loadFont(file: string): Promise<ArrayBuffer> {
  const buf = await fs.readFile(file);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

async function getFonts() {
  if (!_interBuf) {
    _interBuf = await loadFont(path.join(ROOT, 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-400-normal.woff'));
  }
  if (!_interBoldBuf) {
    _interBoldBuf = await loadFont(path.join(ROOT, 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-700-normal.woff'));
  }
  return [
    { name: 'Inter', data: _interBuf, weight: 400, style: 'normal' as const },
    { name: 'Inter', data: _interBoldBuf, weight: 700, style: 'normal' as const },
  ];
}

const STATE_COLOURS = {
  'planned':   { bg: '#FFE0E0', fg: '#A82020', border: '#FF4747', label: 'PLANNED' },
  'sourced':   { bg: '#FBE9C8', fg: '#9C5F00', border: '#D69934', label: 'SOURCED' },
  'tried':     { bg: '#F2F5E5', fg: '#5C7038', border: '#8FA64A', label: 'TRIED' },
  'verified':  { bg: '#E0F0DA', fg: '#3F5526', border: '#6B8A3F', label: 'VERIFIED' },
  'disputed':  { bg: '#FFE0E0', fg: '#A82020', border: '#FF4747', label: 'DISPUTED' },
};

export interface OgOpts {
  title: string;
  sectionNumber?: string;
  sectionLabel?: string;
  description?: string;
  verificationState?: keyof typeof STATE_COLOURS;
  variant?: 'entry' | 'home' | 'section';
}

export async function renderOgPng(opts: OgOpts): Promise<Uint8Array> {
  const fonts = await getFonts();
  const { title, sectionNumber, sectionLabel, description, verificationState, variant = 'entry' } = opts;
  const stateMeta = verificationState ? STATE_COLOURS[verificationState] : null;

  const desc = (description ?? '').length > 220
    ? (description ?? '').slice(0, 217) + '…'
    : description;

  const tree = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#FFFCF7',
        padding: '64px 72px',
        position: 'relative',
        fontFamily: 'Inter',
        color: '#1B1A18',
      },
      children: [
        // Subtle grid background — drawn with a sequence of background-image lines using a child div
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              inset: '0',
              backgroundImage:
                'linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              opacity: 0.5,
            },
          },
        },
        // Top row: brand mark + Claw Planet wordmark
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '20px',
              letterSpacing: '-0.01em',
              fontWeight: 700,
              color: '#1B1A18',
              zIndex: 2,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: 'Inter',
                    fontSize: '36px',
                    color: '#1B1A18',
                  },
                  children: [
                    { type: 'span', props: { children: '[' } },
                    { type: 'span', props: { style: { color: '#FF2626' }, children: '*' } },
                    { type: 'span', props: { children: ']' } },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column', gap: '0px' },
                  children: [
                    { type: 'span', props: { style: { fontSize: '24px', fontWeight: 700 }, children: 'Claw Planet' } },
                    { type: 'span', props: { style: { fontSize: '11px', letterSpacing: '0.18em', color: '#8B847B', textTransform: 'uppercase', fontWeight: 500 }, children: 'reference · v0a · first cut' } },
                  ],
                },
              },
            ],
          },
        },
        // Spacer
        { type: 'div', props: { style: { height: '40px' } } },
        // Section number (big mono, claw)
        sectionNumber
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: '36px',
                  color: '#FF2626',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  zIndex: 2,
                  marginBottom: '12px',
                },
                children: `§ ${sectionNumber}`,
              },
            }
          : null,
        // Section label (overview / setup / etc.)
        sectionLabel
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: '14px',
                  color: '#8B847B',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  marginBottom: '16px',
                  zIndex: 2,
                },
                children: sectionLabel,
              },
            }
          : null,
        // Title
        {
          type: 'div',
          props: {
            style: {
              fontSize: variant === 'entry' ? '64px' : '72px',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
              color: '#1B1A18',
              zIndex: 2,
              marginBottom: '24px',
              maxWidth: '92%',
              display: 'block',
            },
            children: title,
          },
        },
        // Description
        desc
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: '24px',
                  color: '#3F3B36',
                  lineHeight: 1.4,
                  maxWidth: '92%',
                  zIndex: 2,
                  display: 'block',
                },
                children: desc,
              },
            }
          : null,
        // Bottom row: domain + verification badge
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: '64px',
              left: '72px',
              right: '72px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 2,
            },
            children: [
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: '18px',
                    color: '#8B847B',
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                  },
                  children: 'claw.aguidetocloud.com',
                },
              },
              stateMeta
                ? {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 18px',
                        background: stateMeta.bg,
                        border: `2px solid ${stateMeta.border}`,
                        borderRadius: '999px',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: stateMeta.fg,
                        letterSpacing: '0.12em',
                      },
                      children: `● ${stateMeta.label}`,
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },
      ].filter(Boolean),
    },
  };

  const svg = await satori(tree as any, {
    width: 1200,
    height: 630,
    fonts,
  });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  const png = resvg.render().asPng();
  return png;
}
