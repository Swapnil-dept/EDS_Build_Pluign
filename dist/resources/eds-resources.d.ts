import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * Register MCP Resources — static knowledge the IDE's LLM can reference.
 *
 * COMMUNITY TIER: Resources expose only public EDS knowledge
 * from aem.live documentation. Premium knowledge (BLOCK_HTML_CONTRACT,
 * DECORATE_TEMPLATE, FIELD_COLLAPSE_RULES, PERFORMANCE_RULES,
 * CONFIG_TEMPLATES, REPOLESS_GUIDE, BLOCK_PATTERNS) is NOT exposed
 * via resources — it stays behind premium tools.
 */
export declare function registerResources(server: McpServer): void;
