/**
 * toolRegistry — canonical label + href for each tool referenced in /compare/ pages.
 *
 * Single source of truth so a tool's display name and link don't drift across
 * comparisons. Add a new entry here BEFORE referencing the tool key in
 * src/data/comparisons.ts.
 *
 * The href should normally match an existing vendor product hub or product page
 * on claw.aguidetocloud.com — the comparison matrix renders the tool label as a
 * link to this href. **External canonical-doc URLs are allowed only when Claw
 * has no product page yet** (e.g. third-party clients outside our 5-vendor
 * universe, or surfaces queued for a future content session). When a Claw page
 * later lands, swap the external URL for the internal path.
 *
 * Set 2026-05-15 (Claw v0b · Batch E).
 * Updated 2026-05-17 (Session 14 · external-href exception clarified).
 * Updated 2026-05-17 (Session 15 · VS Code promoted to internal Claw page).
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

  // MCP hosts / clients (compare: mcp-clients)
  // External hrefs are intentional for clients without Claw product pages yet —
  // Claude Desktop and the GHC cloud agent are queued S16+ candidates;
  // Cursor is third-party (outside our 5-vendor universe), external is honest.
  // VS Code promoted to internal Claw page in Session 15 (17 May 2026).
  'claude-desktop':    { label: 'Claude Desktop',         href: 'https://www.claude.com/download' },
  'vs-code':           { label: 'VS Code (Copilot)',      href: '/microsoft/vs-code/overview/' },
  'cursor':            { label: 'Cursor',                 href: 'https://docs.cursor.com/context/model-context-protocol' },
  'ghc-cloud-agent':   { label: 'GHC Cloud Agent',        href: 'https://docs.github.com/en/copilot/how-tos/agents/copilot-coding-agent/extending-copilot-coding-agent-with-mcp' },
} satisfies Record<string, ToolMeta>;

export type ToolKey = keyof typeof toolRegistry;
