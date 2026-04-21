import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HARD_CONSTRAINTS } from '../knowledge/eds-conventions.js';

/**
 * Register MCP Prompts — pre-built templates for common EDS development tasks.
 * These appear as slash commands in IDEs (e.g., /mcp.eds.new-block).
 */
export function registerPrompts(server: McpServer) {
  // ─── New Block Prompt ───────────────────────────────────
  server.prompt(
    'new-block',
    'Step-by-step guide for creating a new EDS block from scratch',
    {
      blockName: z.string().describe('Block name in kebab-case (e.g. "product-card")'),
      description: z.string().describe('What this block should do and look like'),
    },
    ({ blockName, description }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Create an AEM EDS block named "${blockName}" that ${description}.\n\n` +
              `Requirements:\n` +
              `- Use vanilla JS and export default function decorate(block)\n` +
              `- Scope CSS to .${blockName}\n` +
              `- No npm/framework imports\n` +
              `- Mobile-first styles\n\n` +
              `Return only these files:\n` +
              `1. blocks/${blockName}/${blockName}.js\n` +
              `2. blocks/${blockName}/${blockName}.css\n` +
              `3. README.md`,
          },
        },
      ],
    })
  );

  // ─── Fix Block Prompt ───────────────────────────────────
  server.prompt(
    'fix-block',
    'Diagnose and fix issues with an existing EDS block',
    {
      blockName: z.string().describe('Block name'),
      issue: z.string().describe('What is going wrong (e.g. "styles leak to other blocks", "Lighthouse dropped to 85")'),
    },
    ({ blockName, issue }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Fix this EDS block issue for "${blockName}": ${issue}\n\n` +
              `Check only core EDS rules:\n` +
              `${HARD_CONSTRAINTS.slice(0, 6).map((c) => `- ${c}`).join('\n')}\n\n` +
              `Return:\n` +
              `1. Root cause\n` +
              `2. Corrected code\n` +
              `3. Short explanation`,
          },
        },
      ],
    })
  );

  // ─── Design-to-Block Prompt (text / image / Figma) ──────
  server.prompt(
    'design-to-block',
    'Turn a text description, a design screenshot, and/or a Figma URL into an EDS block using Adobe\'s Content-Driven-Development workflow',
    {
      blockName: z.string().describe('Block name in kebab-case (e.g. "hero", "product-card")'),
      text: z.string().optional().describe('What the block should do / look like'),
      imageRefs: z.string().optional().describe('Comma-separated image paths or URLs of the design'),
      figmaUrl: z.string().optional().describe('Figma file or frame URL'),
    },
    ({ blockName, text, imageRefs, figmaUrl }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Build an AEM EDS block named "${blockName}" from the following design inputs:\n\n` +
              (text ? `**Description:** ${text}\n` : '') +
              (imageRefs ? `**Images:** ${imageRefs}\n` : '') +
              (figmaUrl ? `**Figma:** ${figmaUrl}\n` : '') +
              `\n` +
              `Steps to follow (Adobe CDD workflow):\n` +
              `1. Call the \`generate_block_from_design\` tool with the same inputs to get the workflow outline, vision-analysis prompt, Figma-fetch recipe (if any), and a baseline scaffold.\n` +
              `2. Execute the vision-analysis prompt against the provided image(s) / Figma export — produce structure, fields, variants, responsive behavior, interactivity, design tokens, and acceptance criteria.\n` +
              `3. Edit the baseline scaffold (\`blocks/${blockName}/${blockName}.js\`, \`.css\`) to match the analysis; reuse platform \`<picture>\`/\`<a>\` nodes; keep everything scoped to \`main .${blockName}\`.\n` +
              `4. If the block has authored fields, call \`scaffold_model\` with the derived field list.\n` +
              `5. Call \`validate_block\` and \`check_performance\`; fix any findings.\n` +
              `6. Self-review against the code-review checklist before opening a PR.\n\n` +
              `Hard constraints:\n` +
              `${HARD_CONSTRAINTS.slice(0, 8).map((c) => `- ${c}`).join('\n')}\n`,
          },
        },
      ],
    }),
  );

  // NOTE: migrate-to-eds and review-block prompts are available
  // in the premium tier only.
}
