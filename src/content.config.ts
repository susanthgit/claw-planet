import { defineCollection, z } from 'astro:content';

const verificationState = z.enum([
  'tested-by-sush',
  'tested-by-contributor',
  'sourced-only',
  'planned',
]);

const lifecycle = z.enum(['draft', 'review', 'published', 'archived']);

const baseFrontmatter = z.object({
  title: z.string(),
  section: z.string(),
  sectionNumber: z.string(),
  description: z.string(),
  status: lifecycle.default('draft'),
  verificationState: verificationState.default('planned'),
  verificationNote: z.string().optional(),
  lastReviewedAt: z.string(),
  lastTestedAt: z.string().optional(),
  noindex: z.boolean().default(false),
  countable: z.boolean().default(true),
  sushReviewNeeded: z.boolean().default(false),
  sources: z.array(z.string()).optional(),
  seeAlso: z.array(z.string()).optional(),
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
