import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * generate_block_from_design
 *
 * Multimodal block generation: accepts any combination of
 *  - text description
 *  - image (local path or URL of a design/screenshot)
 *  - Figma file URL (+ optional node id / personal access token)
 *
 * The tool itself does NOT call an LLM or Figma. It composes:
 *  1. Adobe's Content-Driven-Development workflow (condensed)
 *  2. A vision-analysis prompt for the IDE LLM to extract structure
 *     from the provided image(s) / Figma frames
 *  3. A Figma-fetch recipe (only emitted when a figmaUrl is provided)
 *  4. Scaffold output identical to scaffold_block so the LLM has a
 *     concrete starting point to edit.
 *
 * This keeps the server LLM-agnostic and MCP-pure while giving the
 * IDE model everything it needs to turn a design into an EDS block.
 */
export declare function registerGenerateBlockFromDesign(server: McpServer): void;
