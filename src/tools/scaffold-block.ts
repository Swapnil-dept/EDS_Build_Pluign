import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  generateBlockJS,
  generateBlockCSS,
  generateBlockReadme,
  generateTestHtml,
  generateSampleContent,
} from '../knowledge/block-templates.js';
import { BLOCK_PATTERNS } from '../knowledge/eds-conventions.js';

const BLOCK_NAME_REGEX = /^[a-z][a-z0-9-]*$/;

export function registerScaffoldBlock(server: McpServer) {
  server.tool(
    'scaffold_block',
    `Generate a complete AEM EDS block file structure. PRECONDITION: prefer this on a vanilla EDS project. On an EDS Commerce Storefront project, use \`scaffold_commerce_block\` instead so the dropin mount + slots + UE config are wired correctly. Run \`detect_project_type\` first if you're unsure. Creates block.js (with decorate function), block.css (scoped styles), README.md, test.html, and sample-content.md. All files follow EDS conventions: vanilla ES6+, no dependencies, CSS scoped to block class, mobile-first responsive design.`,
    {
      blockName: z
        .string()
        .regex(BLOCK_NAME_REGEX, 'Must be lowercase, hyphenated (e.g. "hero", "product-card")')
        .describe('Block name in kebab-case'),
      description: z.string().optional().describe('What this block does — used in README and code comments'),
      variant: z.string().optional().describe('Block variant name (e.g. "dark", "wide", "centered")'),
      layout: z
        .enum(['grid', 'flex', 'stack'])
        .default('stack')
        .describe('CSS layout strategy: grid (card layouts), flex (side-by-side), stack (vertical)'),
      hasMedia: z
        .boolean()
        .default(false)
        .describe('Whether the block has an image/video column'),
      interactive: z
        .boolean()
        .default(false)
        .describe('Whether the block needs event handlers (accordion, tabs, carousel, etc.)'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name (camelCase)'),
            type: z
              .enum([
                'text', 'textarea',
                'text-input', 'text-area', // legacy aliases
                'richtext', 'reference',
                'aem-content', 'select', 'multiselect', 'boolean', 'number',
              ])
              .describe('Field component type for Universal Editor (canonical: text, textarea, richtext, reference, aem-content, select, multiselect, boolean, number)'),
            label: z.string().describe('Human-readable field label'),
          })
        )
        .optional()
        .describe('Fields for component-models.json (Universal Editor authoring)'),
    },
    {
      title: 'Scaffold EDS Block',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ blockName, description, variant, layout, hasMedia, interactive, fields }) => {
      try {
        // Check if a known pattern exists
        const pattern = BLOCK_PATTERNS[blockName];
        const effectiveFields = fields || pattern?.fields?.map((f) => ({
          name: f.name,
          type: f.type as any,
          label: f.label,
        }));

        const js = generateBlockJS(blockName, {
          variant,
          interactive,
          hasMedia,
          description: description || pattern?.description,
        });

        const css = generateBlockCSS(blockName, {
          variant,
          hasMedia,
          layout,
        });

        const readme = generateBlockReadme(blockName, description || pattern?.description, variant, effectiveFields);

        const sampleContent = effectiveFields
          ? generateSampleContent(blockName, effectiveFields, variant)
          : generateSampleContent(blockName, [
              { name: 'content', type: 'richtext', label: 'Content' },
            ], variant);

        const testHtml = generateTestHtml(blockName, sampleContent);

        const files = [
          { path: `blocks/${blockName}/${blockName}.js`, content: js },
          { path: `blocks/${blockName}/${blockName}.css`, content: css },
          { path: `blocks/${blockName}/README.md`, content: readme },
          { path: `blocks/${blockName}/test.html`, content: testHtml },
          { path: `blocks/${blockName}/sample-content.md`, content: sampleContent },
        ];

        const output = files
          .map((f) => `### ${f.path}\n\`\`\`${getExtLang(f.path)}\n${f.content}\n\`\`\``)
          .join('\n\n');

        return {
          content: [
            {
              type: 'text' as const,
              text: `✅ Scaffolded EDS block: **${blockName}** — ${files.length} files\n\n` +
                `Create these files in your project root:\n\n${output}\n\n` +
                `**Next steps:**\n` +
                `1. Copy files to your project's blocks/${blockName}/ folder\n` +
                `2. Open test.html in a browser to verify the block renders\n` +
                `3. Run \`aem up\` and add the block table to a test page\n` +
                `4. Call \`scaffold_model\` to generate the Universal Editor JSON files (component-models / component-definition / component-filters) — use \`items: [...]\` for container blocks like cards / tabs / accordion\n` +
                `5. Use \`validate_block\` to check for common issues`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Scaffold failed: ${(error as Error).message}` }],
        };
      }
    }
  );
}

function getExtLang(path: string): string {
  if (path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.html')) return 'html';
  return '';
}
