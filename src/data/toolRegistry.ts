/**
 * toolRegistry — canonical label + href for each tool referenced in /compare/ pages.
 *
 * Single source of truth so a tool's display name and link don't drift across
 * comparisons. Add a new entry here BEFORE referencing the tool key in
 * src/data/comparisons.ts.
 *
 * The href should match an existing vendor product hub or product page on
 * claw.aguidetocloud.com — the comparison matrix renders the tool label as a
 * link to this href.
 *
 * Set 2026-05-15 (Claw v0b · Batch E).
 */

export interface ToolMeta {
  label: string;
  href: string;
}

export const toolRegistry = {
  // CLI coding agents (compare: cli-coding-agents)
  'claude-code':       { label: 'Claude Code',           href: '/anthropic/claude-code/' },
  'codex-cli':         { label: 'Codex CLI',             href: '/openai/codex-cli/' },
  'gemini-cli':        { label: 'Gemini CLI',            href: '/google/gemini-cli/' },
  'copilot-cli':       { label: 'GitHub Copilot CLI',    href: '/microsoft/github-copilot/' },

  // Direct model APIs (compare: direct-model-apis)
  'claude-api':        { label: 'Anthropic Claude API',  href: '/anthropic/claude-api/' },
  'gemini-api':        { label: 'Google Gemini API',     href: '/google/gemini-api/' },
  'foundry':           { label: 'Microsoft Foundry',     href: '/microsoft/foundry/' },

  // M365 extensibility paths (compare: m365-extensibility-paths)
  'copilot-studio':       { label: 'Copilot Studio',         href: '/microsoft/copilot-studio/' },
  'declarative-agents':   { label: 'Declarative Agents',     href: '/microsoft/declarative-agents/' },
  'custom-engine-agents': { label: 'Custom Engine Agents',   href: '/microsoft/agents-toolkit/' },

  // Hosted agent platforms — managed runtimes + open frameworks (compare: hosted-agent-platforms)
  'foundry-agent-service': { label: 'Foundry Agent Service', href: '/microsoft/foundry/' },
  'vertex-ai-agents':      { label: 'Vertex AI Agents',      href: '/google/vertex-ai-agents/' },
  'openai-agents-sdk':     { label: 'OpenAI Agents SDK',     href: '/openai/agents-sdk/' },
} satisfies Record<string, ToolMeta>;

export type ToolKey = keyof typeof toolRegistry;
