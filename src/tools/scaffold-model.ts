import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  generateBlockJsonFile,
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

const OptionSchema = z.object({
  name: z.string().describe('Option label shown to the author'),
  value: z.string().describe('Option value stored in content'),
});

const OptionOrGroupSchema = z.union([
  OptionSchema,
  z.object({
    name: z.string().describe('Group heading shown above its children (e.g. "Behavior", "SEO & Schema")'),
    children: z.array(OptionSchema).describe('Options nested under this group'),
  }),
]);

const FieldSchema = z.object({
  name: z.string().describe('Field name in camelCase — use prefixes for collapse: image + imageAlt → <img src alt>'),
  type: FIELD_TYPE_ENUM.describe('Field component type (UE canonical: text, textarea, richtext, reference, aem-content, select, multiselect, boolean, number)'),
  label: z.string().describe('Editor-visible field label'),
  required: z.boolean().optional().default(false),
  defaultValue: z.string().optional().describe('Default value shown in the UE property panel'),
  description: z.string().optional().describe('Authoring help text shown under the field in the UE property panel'),
  options: z.array(OptionOrGroupSchema).optional().describe('Required for `select`/`multiselect` fields — flat `{name, value}` entries, or grouped `{name, children:[...]}` headings (e.g. "Behavior" vs "SEO & Schema")'),
});

const ItemSchema = z.object({
  id: z.string().describe('Child item id in kebab-case (e.g. "card", "tab", "slide")'),
  title: z.string().optional().describe('Human-readable item title (defaults to Title Case of id)'),
  fields: z.array(FieldSchema).describe('Item fields for the authoring panel'),
});

export function registerScaffoldModel(server: McpServer) {
  server.registerTool(
    'scaffold_model',
    {
      description: `Generate Universal Editor component model files for an EDS block (aligned with aem-boilerplate-xwalk). Emits entries for component-models.json, component-definition.json, and component-filters.json. Supports container blocks with nested item children (e.g. cards→card, tabs→tab).`,
      inputSchema: {
      blockName: z.string().describe('Block name in kebab-case (e.g. "hero", "product-card")'),
      title: z.string().optional().describe('Human-readable block title for the editor'),
      group: z.string().optional().describe('Component-definition group title (default: "Blocks")'),
      fields: z.array(FieldSchema).describe('Block-level fields. Use an empty array for pure container blocks.'),
      items: z.array(ItemSchema).optional().describe('Nested item types (makes this a UE container block). Each item becomes a `.../block/v1/block/item` entry.'),
      allowedChildren: z.array(z.string()).optional().describe('(Leaf blocks only) component IDs allowed as children. Ignored when `items` is provided.'),
      baseBlock: z.string().optional().describe('Family grouping only (e.g. "cards" for cards-price/cards-plan/...) — does not change the generated JSON, just annotates the response for DA Library / component-definition-group registration.'),
      blockVariant: z.string().optional().describe('Human-readable variant label within `baseBlock` (e.g. "price"). Only meaningful when `baseBlock` is set.'),
      authoringTarget: z
        .enum(['xwalk', 'da'])
        .optional()
        .default('xwalk')
        .describe('Authoring model. "xwalk" (default) = Universal Editor, generates the model. "da" = Document Authoring — this tool returns early with guidance instead of generating a UE model, since DA has no dialogs/JSON.'),
    },
      annotations: {
      title: 'Scaffold UE Component Model',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    },
    async ({ blockName, title, group, fields, items, allowedChildren, baseBlock, blockVariant, authoringTarget }) => {
      try {
        if (authoringTarget === 'da') {
          return {
            content: [
              {
                type: 'text' as const,
                text:
                  `ℹ️ **${blockName}** targets Document Authoring (DA) — no Universal Editor model generated.\n\n` +
                  `DA blocks have no dialogs/JSON at all. Instead, document the table contract in the block's \`README.md\` ` +
                  `(scaffold it via \`scaffold_block\` with \`authoringTarget: "da"\`) — list each row/column the import parser ` +
                  `and authors must produce, in order, with any type-prefixed value conventions (e.g. \`toggle:\`, \`select:\`).\n\n` +
                  (baseBlock && baseBlock !== blockName
                    ? `**Family grouping:** register this block under the \`${baseBlock}\` family${blockVariant ? ` as "${blockVariant}"` : ''} in the DA Library.\n\n`
                    : '') +
                  `Re-run with \`authoringTarget: "xwalk"\` (or omit it) if this block should actually target Universal Editor instead.`,
              },
            ],
          };
        }
        const isContainer = Array.isArray(items) && items.length > 0;

        // ── Combined block-scoped UE config (canonical) ─────────
        const blockJson = generateBlockJsonFile(blockName, fields, {
          title,
          group,
          items,
          allowedChildren,
        });

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
        const missingBlockOptions = fields
          .filter((f) => (f.type === 'select' || f.type === 'multiselect') && f.name !== 'classes' && !f.options?.length)
          .map((f) => f.name);
        if (missingBlockOptions.length > 0) {
          notes.push(
            `**Missing options:** block field${missingBlockOptions.length > 1 ? 's' : ''} ${missingBlockOptions.map((n) => `\`${n}\``).join(', ')} ` +
              `${missingBlockOptions.length > 1 ? 'are' : 'is'} a select/multiselect with no \`options\` — authors will see an empty dropdown. Pass \`options: [{name, value}, ...]\` (or grouped \`{name, children:[...]}\`).`,
          );
        }
        if (isContainer) {
          notes.push(
            `**Container block detected** (${items!.length} item type${items!.length > 1 ? 's' : ''}). ` +
              `The block template declares \`filter: "${blockName}"\`. Item entries use ` +
              `\`resourceType: core/franklin/components/block/v1/block/item\`.`,
          );
          const missingOptions = items!
            .flatMap((i) => i.fields)
            .filter((f) => (f.type === 'select' || f.type === 'multiselect') && !f.options?.length)
            .map((f) => f.name);
          if (missingOptions.length > 0) {
            notes.push(
              `**Missing options:** item field${missingOptions.length > 1 ? 's' : ''} ${missingOptions.map((n) => `\`${n}\``).join(', ')} ` +
                `${missingOptions.length > 1 ? 'are' : 'is'} a select/multiselect with no \`options\` — authors will see an empty dropdown. Pass \`options: [{name, value}, ...]\` (or grouped \`{name, children:[...]}\`).`,
            );
          }
          notes.push(
            `**Column-collapse convention:** if item rows should render as table columns in the parent's authoring row (e.g. accordion title | content), prefix each item field name with \`col1_\`, \`col2_\`, … per column (e.g. \`col1_title\`, \`col1_titleType\`, \`col1_content\`) — the EDS Block Forge column convention.`,
          );
        }
        if (baseBlock && baseBlock !== blockName) {
          notes.push(
            `**Family grouping:** this block belongs to the \`${baseBlock}\` family${blockVariant ? ` as the "${blockVariant}" variant` : ''}. Its model is still fully standalone — group it with its siblings in the component-definition \`group\` and DA Library, not in this JSON.`,
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
                `**Canonical UE convention:** every block ships **ONE** combined config at ` +
                `\`blocks/${blockName}/_${blockName}.json\` containing \`definitions\` + \`models\` + ` +
                `\`filters\`. The project build aggregates these into the root ` +
                `\`component-definitions.json\` / \`component-models.json\` / \`component-filters.json\` ` +
                `— do not hand-edit the root files.\n\n` +
                `### \`blocks/${blockName}/_${blockName}.json\`\n` +
                `\`\`\`json\n${blockJson}\`\`\`\n\n` +
                (notes.length > 0 ? `${notes.join('\n\n')}\n\n` : '') +
                `**Don't forget:** add \`"${blockName}"\` to the existing \`section\` filter in ` +
                `\`component-filters.json\` so authors can drop the block into a section.\n\n` +
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
