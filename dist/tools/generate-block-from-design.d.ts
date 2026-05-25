import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * generate_block_from_design
 *
 * Multimodal block generation: accepts any combination of
 *  - text description
 *  - image (local path or URL of a design/screenshot)
 *  - Figma file URL (+ optional node id / personal access token)
 *
 * Enhancements (May 2026):
 *  - Pattern classifier in vision prompt → selects the correct JS/CSS archetype
 *  - Pattern-based scaffold: hero / cards / accordion / carousel / columns / tabs
 *  - CSS uses fluid typography (clamp()), aspect-ratio, background media patterns
 *  - JSON model auto-injects `classes` multiselect (variants) + DA editor hints
 *  - `naming` param: 'flat' (default, Vitamix/Ingredion style) or 'bem' (Volvo style)
 */
export declare function registerGenerateBlockFromDesign(server: McpServer): void;
