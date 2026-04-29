import { z } from 'zod';
import { generateBlockJS, generateBlockCSS, generateBlockReadme, generateTestHtml, generateSampleContent, generateBlockJsonFile, } from '../knowledge/block-templates.js';
import { BLOCK_PATTERNS } from '../knowledge/eds-conventions.js';
const BLOCK_NAME_REGEX = /^[a-z][a-z0-9-]*$/;
export function registerScaffoldBlock(server) {
    server.tool('scaffold_block', `Generate the canonical 3-file Universal Editor block structure: \`<name>.js\` + \`<name>.css\` + \`_<name>.json\` (combined definitions + models + filters). On an EDS Commerce Storefront project, use \`scaffold_commerce_block\` instead so the dropin mount is wired correctly. Run \`detect_project_type\` first if you're unsure. README/test.html/sample-content are also returned as **dev-only** helpers (do NOT commit them to the block folder — they break the UE block contract). All output follows EDS conventions: vanilla ES6+, no dependencies, CSS scoped to the block class, mobile-first responsive design.`, {
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
            .array(z.object({
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
        }))
            .optional()
            .describe('Fields for component-models.json (Universal Editor authoring)'),
    }, {
        title: 'Scaffold EDS Block',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ blockName, description, variant, layout, hasMedia, interactive, fields }) => {
        try {
            // Check if a known pattern exists
            const pattern = BLOCK_PATTERNS[blockName];
            const effectiveFields = fields || pattern?.fields?.map((f) => ({
                name: f.name,
                type: f.type,
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
            // Universal Editor canonical convention (aem-boilerplate-xwalk):
            // every block ships ONE combined config at blocks/<name>/_<name>.json
            // bundling definitions + models + filters. Emit it whenever we have
            // a field list — either from the caller or from a known pattern.
            const blockJson = effectiveFields
                ? generateBlockJsonFile(blockName, effectiveFields.map((f) => ({
                    name: f.name,
                    type: f.type,
                    label: f.label,
                })))
                : null;
            // Canonical UE block contract is 3 files: _<name>.json + <name>.css + <name>.js.
            // README.md, test.html, and sample-content.md are dev-only helpers and
            // are NOT committed to a UE block folder. We still surface them in the
            // tool output so the agent / human can copy them into a side-channel
            // (docs/, .dev/, or a PR description) if useful.
            const canonical = [
                { path: `blocks/${blockName}/${blockName}.js`, content: js },
                { path: `blocks/${blockName}/${blockName}.css`, content: css },
            ];
            if (blockJson) {
                canonical.push({ path: `blocks/${blockName}/_${blockName}.json`, content: blockJson });
            }
            const devOnly = [
                { path: `blocks/${blockName}/README.md (dev-only — do NOT commit to blocks/)`, content: readme },
                { path: `blocks/${blockName}/test.html (dev-only — do NOT commit to blocks/)`, content: testHtml },
                { path: `blocks/${blockName}/sample-content.md (dev-only — do NOT commit to blocks/)`, content: sampleContent },
            ];
            const renderSection = (file) => `### ${file.path}\n\`\`\`${getExtLang(file.path)}\n${file.content}\n\`\`\``;
            const canonicalOut = canonical.map(renderSection).join('\n\n');
            const devOnlyOut = devOnly.map(renderSection).join('\n\n');
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ Scaffolded EDS block: **${blockName}**\n\n` +
                            `**Universal Editor canonical convention:** a UE block folder contains exactly ` +
                            `**3 files** — \`<name>.js\`, \`<name>.css\`, and \`_<name>.json\` (the combined ` +
                            `definitions + models + filters). The project build aggregates every block's ` +
                            `\`_<name>.json\` into the project-root \`component-definitions.json\`, ` +
                            `\`component-models.json\`, and \`component-filters.json\` — never hand-edit those.\n\n` +
                            `## Canonical block files (copy these into \`blocks/${blockName}/\`)\n\n` +
                            `${canonicalOut}\n\n` +
                            (blockJson
                                ? ''
                                : `> No \`fields\` were provided so \`_${blockName}.json\` was NOT emitted. ` +
                                    `Re-run with a field list, or call \`scaffold_model\` separately to produce it.\n\n`) +
                            `## Dev-only helpers (do NOT commit to \`blocks/${blockName}/\`)\n\n` +
                            `These are useful for local preview and PR descriptions but are not part of ` +
                            `the UE block contract. Keep them in \`docs/\`, \`.dev/\`, or your PR body — never ` +
                            `inside the block folder, or the build / linter will flag them.\n\n` +
                            `${devOnlyOut}\n\n` +
                            `**Next steps:**\n` +
                            `1. Create the canonical files above under \`blocks/${blockName}/\`.\n` +
                            `2. Add \`"${blockName}"\` to the existing \`section\` filter in \`component-filters.json\` so authors can drop it into a section.\n` +
                            `3. Run the project build (\`npm run build:json\` in aem-boilerplate-xwalk) to aggregate \`_${blockName}.json\` into the root config files.\n` +
                            `4. \`aem up\` and add the block to a test page — verify in Universal Editor.\n` +
                            `5. Run \`validate_block\` to check against EDS standards.\n` +
                            (blockJson
                                ? ''
                                : `6. Call \`scaffold_model\` to generate \`_${blockName}.json\` with the right fields ` +
                                    `(use \`items: [...]\` for container blocks like cards / tabs / accordion).\n`),
                    },
                ],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Scaffold failed: ${error.message}` }],
            };
        }
    });
}
function getExtLang(path) {
    if (path.endsWith('.js'))
        return 'javascript';
    if (path.endsWith('.css'))
        return 'css';
    if (path.endsWith('.json'))
        return 'json';
    if (path.endsWith('.md'))
        return 'markdown';
    if (path.endsWith('.html'))
        return 'html';
    return '';
}
//# sourceMappingURL=scaffold-block.js.map