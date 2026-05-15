import { defineCollection, z } from 'astro:content';

// Multi-vendor verification vocabulary (v0b expansion, 2026-05-14).
// Old values (sourced-only, tested-by-sush, tested-by-contributor) were
// migrated to the new vocabulary by scripts/migrate-frontmatter-multivendor.mjs.
const verificationState = z.enum([
  'planned',    // stub, not in nav
  'sourced',    // researched from public docs, not personally run yet
  'tried',      // Sush or a contributor ran it on real hardware
  'verified',   // tried + considered correct
  'disputed',   // a reader has raised a correctness issue
]);

const lifecycle = z.enum(['draft', 'review', 'published', 'archived']);

const vendor = z.enum([
  'openclaw',
  'anthropic',
  'openai',
  'google',
  'microsoft',
  'cross-vendor',  // Batch E (2026-05-15) — for compare pages that span multiple vendors.
  // Phase 2 (later): meta, mistral, xai, perplexity
]);

const platform = z.enum(['macos', 'windows', 'linux', 'browser', 'mixed']);
const accountTier = z.enum(['free', 'pro', 'team', 'enterprise']);

// Structured test context — captured on `tried` / `verified` entries to record
// the exact environment a claim was validated against. Different versions /
// platforms / account tiers of the same vendor tool can behave differently.
const verificationContext = z.object({
  tool: z.string().optional(),
  version: z.string().optional(),
  platform: platform.optional(),
  accountTier: accountTier.optional(),
  testedBy: z.enum(['sush', 'contributor']).optional(),
  testedAt: z.string().optional(),
  notes: z.string().optional(),
});

const baseFrontmatter = z.object({
  title: z.string(),
  section: z.string(),
  sectionNumber: z.string(),
  description: z.string(),
  status: lifecycle.default('draft'),
  verificationState: verificationState.default('planned'),
  verificationNote: z.string().optional(),
  verificationContext: verificationContext.optional(),
  lastReviewedAt: z.string(),
  lastTestedAt: z.string().optional(),
  noindex: z.boolean().default(false),
  countable: z.boolean().default(true),
  sushReviewNeeded: z.boolean().default(false),
  sources: z.array(z.string()).optional(),
  seeAlso: z.array(z.string()).optional(),
  // Multi-vendor fields (v0b expansion). vendor defaults to 'openclaw' so
  // existing OpenClaw entries don't need explicit tagging (the migration
  // script tags them anyway for clarity).
  vendor: vendor.default('openclaw'),
  product: z.string().optional(),
});

const setups = defineCollection({
  type: 'content',
  schema: baseFrontmatter.extend({
    environment: z.enum(['laptop', 'linux-server', 'azure', 'raspberry-pi', 'docker', 'kubernetes', 'nas', 'other']),
    runtimeVersion: z.string().optional(),
    hardware: z.string().optional(),
    os: z.string().optional(),
    estimatedTimeMinutes: z.number().optional(),
  }),
});

const connections = defineCollection({
  type: 'content',
  schema: baseFrontmatter.extend({
    category: z.enum(['channels', 'tools', 'models', 'memory', 'external']),
  }),
});

const plugins = defineCollection({
  type: 'content',
  schema: baseFrontmatter.extend({
    canonicalRef: z.string(),
    pluginVersion: z.string().optional(),
    licence: z.string().optional(),
    category: z.string(),
    checked: z.array(z.string()).default([]),
    notChecked: z.array(z.string()).default([]),
    riskProfile: z.string().optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    maintainerHealth: z.string().optional(),
    stars: z.number().optional(),
    installs: z.string().optional(),
    disputeUrl: z.string().optional(),
  }),
});

const useCases = defineCollection({
  type: 'content',
  schema: baseFrontmatter.extend({
    estimatedTimeMinutes: z.number().optional(),
    pairsWith: z.array(z.string()).optional(),
    measuredCost: z.string().optional(),
    measuredLatency: z.string().optional(),
  }),
});

const gotchas = defineCollection({
  type: 'content',
  schema: baseFrontmatter,
});

const compares = defineCollection({
  type: 'content',
  schema: baseFrontmatter.extend({
    against: z.string(),
    depth: z.enum(['deep', 'sourced']).default('sourced'),
  }),
});

const explainers = defineCollection({
  type: 'content',
  schema: baseFrontmatter,
});

const faq = defineCollection({
  type: 'content',
  schema: baseFrontmatter.extend({
    question: z.string(),
  }),
});

export const collections = {
  setups,
  connections,
  plugins,
  'use-cases': useCases,
  gotchas,
  compares,
  explainers,
  faq,
};
