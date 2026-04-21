import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * Register MCP Prompts — pre-built templates for common EDS development tasks.
 * These appear as slash commands in IDEs (e.g., /mcp.eds.new-block).
 */
export declare function registerPrompts(server: McpServer): void;
