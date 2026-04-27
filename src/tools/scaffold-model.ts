import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  generateComponentModel,
  generateComponentDefinition,
  generateComponentFilter,
} from '../knowledge/block-templates.js';
import { FIELD_TYPES, FIELD_COLLAPSE_RULES } from '../knowledge/eds-conventions.js';

// Accept both UE canonical names (text/textarea) and legacy aliases
// (text-input/text-area). Generators normalize under the hood.
const FIELD_TYPE_ENUM = z.enum([
  'text', 'textarea',
  'text-input', 'text-area', // legacy aliases
  'richtext', 'reference', 'aem-content',
  'select', 'multiselect', 'boolean', 'number',
  'date-input', 'container', 'tab',
]);

const FieldSchema = z.object({
  name: z.string().describe('Field name in camelCase — use prefixes for collapse: image + imageAlt → <img src alt>'),
  type: FIELD_TYPE_ENUM.describe('Field component type (UE canonical: text, textarea, richtext, reference, aem-content, select, multiselect, boolean, number)'),
  label: z.string().describe('Editor-visible field label'),
  required: z.boolean().optional().default(false),
});

const ItemSchema = z.object({
  id: z.string().describe('Child item id in kebab-case (e.g. "card", "tab", "slide")'),
  title: z.string().optional().describe('Human-readable item title (defaults to Title Case of id)'),
  fields: z.array(FieldSchema).describe('Item fields for the authoring panel'),
});

export function registerScaffoldModel(server: McpServer) {
  server.tool(
    'scaffold_model',
    `Generate Universal Editor component model files for an EDS block (aligned with aem-boilerplate-xwalk). Emits entries for component-models.json, component-definition.json, and component-filters.json. Supports container blocks with nested item children (e.g. cards→card, tabs→tab).`,
    {
      blockName: z.string().describe('Block name in kebab-case (e.g. "hero", "product-card")'),
      title: z.string().optional().describe('Human-readable block title for the editor'),
      group: z.string().optional().describe('Component-definition group title (default: "Blocks")'),
      fields: z.array(FieldSchema).describe('Block-level fields. Use an empty array for pure container blocks.'),
      items: z.array(ItemSchema).optional().describe('Nested item types (makes this a UE container block). Each item becomes a `.../block/v1/block/item` entry.'),
      allowedChildren: z.array(z.string()).optional().describe('(Leaf blocks only) component IDs allowed as children. Ignored when `items` is provided.'),
    },
    {
      title: 'Scaffold UE Component Model',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ blockName, title, group, fields, items, allowedChildren }) => {
      try {
        const isContainer = Array.isArray(items) && items.length > 0;

        // ── component-models.json entries ────────────────────────
        const modelEntries: string[] = [generateComponentModel(blockName, fields)];
        if (isContainer) {
          for (const item of items!) {
            modelEntries.push(generateComponentModel(item.id, item.fields));
          }
        }

        // ── component-definition.json entries ───────────────────
        const defEntries: string[] = [
          generateComponentDefinition(blockName, {
            title,
            group,
            model: fields.length > 0 ? blockName : null,
            filter: isContainer ? blockName : undefined,
          }),
        ];
        if (isContainer) {
          for (const item of items!) {
            defEntries.push(
              generateComponentDefinition(item.id, {
                title: item.title,
                group,
                model: item.id,
                isItem: true,
              }),
            );
          }
        }

        // ── component-filters.json entries ──────────────────────
        const filterEntries: string[] = [];
        if (isContainer) {
          filterEntries.push(
            generateComponentFilter(blockName, items!.map((i) => i.id)),
          );
        } else if (allowedChildren && allowedChildren.length > 0) {
          filterEntries.push(generateComponentFilter(blockName, allowedChildren));
        }

        // ── Field-collapse hints ────────────────────────────────
        const collapseHints: string[] = [];
        const allFieldNames = [
          ...fields.map((f) => f.name),
          ...(items?.flatMap((i) => i.fields.map((f) => f.name)) ?? []),
        ];
        if (allFieldNames.includes('image') && allFieldNames.includes('imageAlt')) {
          collapseHints.push('image + imageAlt → <picture><img src="…" alt="…"></picture>');
        }
        if (allFieldNames.includes('link') && allFieldNames.includes('linkText')) {
          collapseHints.push('link + linkText → <a href="…">linkText</a>');
        }
        if (allFieldNames.includes('title') && allFieldNames.includes('titleType')) {
          collapseHints.push('title + titleType → <hN>title</hN>');
        }
        const hasClasses = fields.some((f) => f.name === 'classes' && f.type === 'multiselect');

        const notes: string[] = [];
        if (collapseHints.length > 0) {
          notes.push(`**Field collapse detected:**\n${collapseHints.map((h) => `- ${h}`).join('\n')}`);
        }
        if (!hasClasses && !isContainer) {
          notes.push(
            '**Tip:** add a `multiselect` field named `classes` (with grouped options) to let authors toggle CSS variants on the block (e.g. "dark", "wide"). This is the aem-boilerplate-xwalk convention.',
          );
        }
        if (isContainer) {
          notes.push(
            `**Container block detected** (${items!.length} item type${items!.length > 1 ? 's' : ''}). ` +
              `The block template declares \`filter: "${blockName}"\`. Item entries use ` +
              `\`resourceType: core/franklin/components/block/v1/block/item\`.`,
          );
        }

        const typeTable = FIELD_TYPES
          .map((f) => `- \`${f.component}\` (${f.valueType}): ${f.description}`)
          .join('\n');

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `✅ Generated Universal Editor model for **${blockName}**` +
                (isContainer ? ` (container with ${items!.length} item type${items!.length > 1 ? 's' : ''})` : '') +
                `\n\n` +
                `**Add to \`component-models.json\`** (merge into top-level array):\n` +
                `\`\`\`json\n[\n${modelEntries.join(',\n')}\n]\n\`\`\`\n\n` +
                `**Add to \`component-definition.json\`** (merge into \`groups[title="${group ?? 'Blocks'}"].components\`):\n` +
                `\`\`\`json\n[\n${defEntries.join(',\n')}\n]\n\`\`\`\n\n` +
                (filterEntries.length > 0
                  ? `**Add to \`component-filters.json\`** (merge into top-level array). Also remember to add \`"${blockName}"\` to the existing \`section\` filter:\n` +
                    `\`\`\`json\n[\n${filterEntries.join(',\n')}\n]\n\`\`\`\n\n`
                  : `**\`component-filters.json\`:** no changes required for this leaf block, but add \`"${blockName}"\` to the existing \`section\` filter so authors can add it.\n\n`) +
                (notes.length > 0 ? `${notes.join('\n\n')}\n\n` : '') +
                `**Available field types:**\n${typeTable}\n\n` +
                FIELD_COLLAPSE_RULES,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Model generation failed: ${(error as Error).message}` }],
        };
      }
    },
  );
}
