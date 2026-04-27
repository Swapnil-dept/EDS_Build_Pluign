import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * Register MCP Prompts — pre-built templates for common EDS development tasks.
 * These appear as slash commands in IDEs (e.g., /mcp.eds.new-block).
 *
 * All prompts target the Universal Editor boilerplate
 * (https://github.com/adobe-rnd/aem-boilerplate-xwalk). Each block ships a
 * single combined config file at `blocks/<name>/_<name>.json` containing
 * `definitions` + `models` + `filters` together; these are aggregated into
 * the project-root `component-definitions.json` / `component-models.json` /
 * `component-filters.json` at build/deploy time. The in-repo
 * `blocks/tabs-card` and `blocks/carousel` samples are the canonical
 * references for container blocks (block → item pattern).
 */
export declare function registerPrompts(server: McpServer): void;
