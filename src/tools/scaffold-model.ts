import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  generateComponentModel,
  generateComponentDefinition,
  generateComponentFilter,
} from '../knowledge/block-templates.js';
import { FIELD_TYPES, FIELD_COLLAPSE_RULES } from '../knowledge/eds-conventions.js';

export function registerScaffoldModel(server: McpServer) {
  server.tool(
    'scaffold_model',
    `Generate Universal Editor component model files for an EDS block. Creates entries for component-models.json (field definitions), component-definitions.json (block registration), and component-filters.json (allowed children). These files go in your project root and enable authoring in AEM Universal Editor.`,
    {
      blockName: z.string().describe('Block name in kebab-case (e.g. "hero", "product-card")'),
      title: z.string().optional().describe('Human-readable block title for the editor'),
      group: z.string().optional().describe('Block group/category for editor UI organization'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name in camelCase — use prefixes for collapse: image + imageAlt → <img src alt>'),
            type: z
              .enum([
                'text-input', 'text-area', 'richtext', 'reference',
                'aem-content', 'select', 'multiselect', 'boolean',
                'number', 'date-input', 'container', 'tab',
              ])
              .describe('Field component type'),
            label: z.string().describe('Editor-visible field label'),
            required: z.boolean().optional().default(false),
          })
        )
        .describe('Block fields for the authoring interface'),
      allowedChildren: z
        .array(z.string())
        .optional()
        .describe('Component IDs allowed as children (for container blocks)'),
    },
    {
      title: 'Scaffold UE Component Model',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ blockName, title, group, fields, allowedChildren }) => {
      try {
        const model = generateComponentModel(blockName, fields);
        const definition = generateComponentDefinition(blockName, title, group);
        const filter = generateComponentFilter(blockName, allowedChildren);

        // Detect field collapse patterns
        const collapseHints: string[] = [];
        const fieldNames = fields.map((f) => f.name);
        if (fieldNames.includes('image') && fieldNames.includes('imageAlt')) {
          collapseHints.push('image + imageAlt → will collapse into <picture><img src="..." alt="..."></picture>');
        }
        if (fieldNames.includes('link') && fieldNames.includes('linkText')) {
          collapseHints.push('link + linkText → will collapse into <a href="...">text</a>');
        }

        const collapseNote = collapseHints.length > 0
          ? `\n\n**Field collapse detected:**\n${collapseHints.map((h) => `- ${h}`).join('\n')}\n\n${FIELD_COLLAPSE_RULES}`
          : '';

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `✅ Generated Universal Editor model for **${blockName}**\n\n` +
                `**Add to component-models.json** (merge into existing array):\n\`\`\`json\n${model}\n\`\`\`\n\n` +
                `**Add to component-definitions.json** (merge into existing array):\n\`\`\`json\n${definition}\n\`\`\`\n\n` +
                `**Add to component-filters.json** (merge into existing array):\n\`\`\`json\n${filter}\n\`\`\`\n\n` +
                `**Available field types:**\n${FIELD_TYPES.map((f) => `- \`${f.component}\` (${f.valueType}): ${f.description}`).join('\n')}` +
                collapseNote,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Model generation failed: ${(error as Error).message}` }],
        };
      }
    }
  );
}
