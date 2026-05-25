import { z } from 'zod';
import { generateBlockJS, generateBlockCSS, generateBlockReadme, generateTestHtml, generateSampleContent, generateBlockJsonFile, } from '../knowledge/block-templates.js';
import { BLOCK_PATTERNS } from '../knowledge/eds-conventions.js';
const BLOCK_NAME_REGEX = /^[a-z][a-z0-9-]*$/;
function checkVariantStep(params) {
    if (params.variantOf || params.confirmedNewBlock)
        return null;
    return {
        missing: ['variantCheck'],
        questions: [
            '**Variant check** — Before creating a new block, confirm that it is genuinely new:\n' +
                '   1. Call `lookup_block("<blockName>")` to check if the project already has a similar block.\n' +
                '   2. Scan the `blocks/` directory for existing block folders.\n' +
                '   3. Ask the user: _"Could this be achieved as a CSS variant (a class modifier) of an existing block instead?"_\n\n' +
                '   → If YES (it is a variant): re-call `scaffold_block` with `variantOf: "<parent-block-name>"`.\n' +
                '   → If NO (genuinely new): re-call `scaffold_block` with `confirmedNewBlock: true`.',
        ],
    };
}
function checkClarification(params) {
    const missing = [];
    const questions = [];
    if (!params.description) {
        missing.push('description');
        questions.push('**Purpose** — What does this block do? (one sentence, used in README and code comments)');
    }
    if (!params.pattern) {
        missing.push('pattern');
        questions.push('**Pattern** — Which archetype best describes this block?\n' +
            '   - `hero` — full-width media + text overlay + CTA\n' +
            '   - `cards` — repeating grid of identical items\n' +
            '   - `accordion` — expandable / collapsible Q&A sections\n' +
            '   - `carousel` — horizontally scrolling slides\n' +
            '   - `columns` — side-by-side content panels\n' +
            '   - `tabs` — switchable panels via tab navigation\n' +
            '   - `custom` — unique layout that doesn\'t fit the above');
    }
    if (!params.fields || params.fields.length === 0) {
        missing.push('fields');
        questions.push('**Authoring fields** — List every field the author needs to fill in.\n' +
            '   For each field: `name` (camelCase) + `label` + `type`\n' +
            '   Types: `text` / `textarea` / `richtext` / `reference` (image) / `aem-content` (link) / `select` / `multiselect` / `boolean` / `number`\n' +
            '   Example: `title` (text), `body` (richtext), `image` (reference), `link` (aem-content), `linkText` (text)');
    }
    return { missing, questions };
}
function generateVariantCSS(parentBlock, variantName, naming) {
    const sel = naming === 'bem'
        ? `.${parentBlock}.${variantName}`
        : `.${parentBlock}.${variantName}`;
    return `/**
 * ${variantName} variant — CSS-only override of the \`${parentBlock}\` block.
 *
 * Author this in the document by adding the word "${variantName}" to the
 * Block Style dropdown (the \`classes\` multiselect in Universal Editor).
 * No new JS file is needed — the parent block's \`${parentBlock}.js\` handles
 * all behaviour. Only visual overrides go here.
 */

/* ─── ${variantName} variant overrides ──────────────────────── */
${sel} {
  /* TODO: add visual overrides specific to the ${variantName} variant */
}

${sel} :is(h1, h2, h3) {
  /* TODO: heading colour / size adjustments */
}

${sel} img {
  /* TODO: image treatment (e.g. border-radius, filter) */
}

@media (min-width: 600px) {
  ${sel} {
    /* TODO: tablet overrides */
  }
}

@media (min-width: 900px) {
  ${sel} {
    /* TODO: desktop overrides */
  }
}
`;
}
export function registerScaffoldBlock(server) {
    server.tool('scaffold_block', `Generate the canonical 3-file Universal Editor block structure: \`<name>.js\` + \`<name>.css\` + \`_<name>.json\`.

⚠️  PRECONDITION — call \`clarify_task(intent: "new-block")\` + \`component_interview(projectType: "eds")\` FIRST and collect the user's answers one question per turn. This tool WILL BLOCK at two gates:

**Gate 1 — Variant check (fires if neither \`variantOf\` nor \`confirmedNewBlock\` is set):**
Before any new block is scaffolded, verify it is genuinely new:
- Call \`lookup_block("<blockName>")\` to check existing patterns.
- Scan the \`blocks/\` directory for existing block folders.
- Ask the user if the desired look/behaviour could be a CSS class modifier of an existing block.
→ If variant: pass \`variantOf: "<parent>"\` — only a CSS override stub is emitted (no new JS or JSON).
→ If genuinely new: pass \`confirmedNewBlock: true\` to proceed.

**Gate 2 — Clarification check (fires if \`description\`, \`pattern\`, or \`fields\` are missing):**
Required from the user before scaffolding:
1. \`description\` — what the block does (from the user, not invented)
2. \`pattern\` — hero | cards | accordion | carousel | columns | tabs | custom
3. \`fields\` — every authoring field the user named (never auto-add)

On a Commerce Storefront project use \`scaffold_commerce_block\` instead.
Run \`detect_project_type\` first if you are unsure of the project type.`, {
        blockName: z
            .string()
            .regex(BLOCK_NAME_REGEX, 'Must be lowercase, hyphenated (e.g. "hero", "product-card")')
            .describe('Block name in kebab-case'),
        variantOf: z
            .string()
            .optional()
            .describe('If this is a CSS-only variant of an existing block, pass the parent block name here (e.g. "hero"). Emits only a CSS override stub — no new JS or JSON. The parent\'s JS handles all behaviour.'),
        confirmedNewBlock: z
            .boolean()
            .optional()
            .describe('Set to true after you have run lookup_block + scanned blocks/ and confirmed this is NOT a variant of any existing block. Gate 1 fires if neither this nor variantOf is set.'),
        description: z
            .string()
            .optional()
            .describe('What this block does — collected from the user via clarify_task. REQUIRED (gate fires if missing).'),
        pattern: z
            .enum(['hero', 'cards', 'accordion', 'carousel', 'columns', 'tabs', 'custom'])
            .optional()
            .describe('Block archetype — collected from the user via clarify_task. Drives JS+CSS template. REQUIRED (gate fires if missing).'),
        naming: z
            .enum(['flat', 'bem'])
            .default('flat')
            .describe('CSS class naming: flat = .block-element (default). bem = .block__element--modifier.'),
        variant: z.string().optional().describe('Primary CSS variant name (e.g. "dark", "wide") — from the user\'s variants answer.'),
        layout: z
            .enum(['grid', 'flex', 'stack'])
            .default('stack')
            .describe('CSS layout (custom pattern only): grid (card grids), flex (side-by-side), stack (vertical).'),
        hasMedia: z.boolean().default(false).describe('Block has an image/video column — from the user\'s hasMedia answer.'),
        interactive: z.boolean().default(false).describe('Block needs JS event handlers — from the user\'s interactive answer.'),
        aboveFold: z
            .boolean()
            .default(false)
            .describe('Block is in the first viewport (LCP-critical). Sets eager/fetchpriority on first image.'),
        fields: z
            .array(z.object({
            name: z.string().describe('Field name (camelCase)'),
            type: z
                .enum([
                'text', 'textarea',
                'text-input', 'text-area',
                'richtext', 'reference',
                'aem-content', 'select', 'multiselect', 'boolean', 'number',
            ])
                .describe('UE field type'),
            label: z.string().describe('Human-readable field label'),
        }))
            .optional()
            .describe('Authoring fields — ONLY what the user named. REQUIRED (gate fires if empty).'),
        items: z
            .array(z.object({
            id: z.string().describe('Item type id (kebab-case, e.g. "card")'),
            title: z.string().optional().describe('Item editor label'),
            fields: z
                .array(z.object({
                name: z.string(),
                type: z.enum(['text', 'textarea', 'richtext', 'reference', 'aem-content', 'select', 'multiselect', 'boolean', 'number']),
                label: z.string(),
            }))
                .describe('Fields for this item type'),
        }))
            .optional()
            .describe('Container blocks only (cards/tabs/carousel/accordion): child item types with their own fields.'),
    }, {
        title: 'Scaffold EDS Block',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ blockName, variantOf, confirmedNewBlock, description, pattern, naming, variant, layout, hasMedia, interactive, aboveFold, fields, items }) => {
        try {
            // ── Gate 1: Variant check ─────────────────────────────────
            const variantGate = checkVariantStep({ variantOf, confirmedNewBlock });
            if (variantGate) {
                const q = variantGate.questions[0].replace(/<blockName>/g, blockName);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `## ⛔ Variant check required before scaffolding \`${blockName}\`\n\n` +
                                q,
                        },
                    ],
                };
            }
            // ── Variant shortcut: CSS-only override ───────────────────
            if (variantOf) {
                const variantCSS = generateVariantCSS(variantOf, variant || blockName, naming ?? 'flat');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `## ✅ CSS variant scaffold: \`${blockName}\` → parent: \`${variantOf}\`\n\n` +
                                `This is a **CSS-only variant** — no new JS file or \`_${blockName}.json\` is needed. ` +
                                `The parent block \`${variantOf}.js\` handles all behaviour.\n\n` +
                                `**How it works for authors:**\n` +
                                `1. Author uses the existing \`${variantOf}\` block in the document.\n` +
                                `2. In Universal Editor the author picks \`${variant || blockName}\` from the **Styles** (classes) dropdown.\n` +
                                `3. EDS adds the class \`${variant || blockName}\` to the block element — the CSS below takes effect.\n\n` +
                                `**To register the variant in Universal Editor:**\n` +
                                `Open \`blocks/${variantOf}/_${variantOf}.json\` and add \`"${variant || blockName}"\` to the \`classes\` multiselect \`options\` array.\n\n` +
                                `### blocks/${variantOf}/${variantOf}.css (append these overrides)\n` +
                                `\`\`\`css\n${variantCSS}\`\`\`\n\n` +
                                `**Next steps:**\n` +
                                `1. Append the CSS above to \`blocks/${variantOf}/${variantOf}.css\`.\n` +
                                `2. Add \`"${variant || blockName}"\` to the \`classes\` options in \`blocks/${variantOf}/_${variantOf}.json\`.\n` +
                                `3. Run \`aem up\` and test with a \`${variantOf} (${variant || blockName})\` block in a page.\n` +
                                `4. Run \`validate_block\` against \`${variantOf}\` to confirm no regressions.`,
                        },
                    ],
                };
            }
            // ── Gate 2: Clarification check ───────────────────────────
            // ── Gate 2: Clarification check ───────────────────────────
            const gate = checkClarification({ description, pattern, fields });
            if (gate.missing.length > 0) {
                const questionsText = gate.questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `## ⛔ Clarification required before scaffolding \`${blockName}\`\n\n` +
                                `Missing: **${gate.missing.join(', ')}**.\n\n` +
                                `Call \`clarify_task(intent: "new-block")\` and \`component_interview(projectType: "eds")\` ` +
                                `first, then ask the user these questions **one at a time**:\n\n` +
                                `${questionsText}\n\n` +
                                `> Ask one question per turn. Wait for the reply. Call \`scaffold_block\` only once all three are answered.`,
                        },
                    ],
                };
            }
            // ── Resolve pattern & fields ──────────────────────────────
            const knownPattern = BLOCK_PATTERNS[blockName];
            const resolvedPattern = (pattern ?? (knownPattern ? blockName : undefined));
            const effectiveFields = fields ?? knownPattern?.fields?.map((f) => ({
                name: f.name,
                type: f.type,
                label: f.label,
            }));
            // ── Generate files ────────────────────────────────────────
            const js = generateBlockJS(blockName, {
                pattern: resolvedPattern,
                variant,
                naming,
                interactive,
                hasMedia,
                description: description ?? knownPattern?.description,
            });
            const css = generateBlockCSS(blockName, {
                pattern: resolvedPattern,
                variant,
                naming,
                hasMedia,
                layout,
            });
            const readme = generateBlockReadme(blockName, description ?? knownPattern?.description, variant, effectiveFields);
            const sampleContent = effectiveFields
                ? generateSampleContent(blockName, effectiveFields, variant)
                : generateSampleContent(blockName, [{ name: 'content', type: 'richtext', label: 'Content' }], variant);
            const testHtml = generateTestHtml(blockName, sampleContent);
            const blockJson = effectiveFields
                ? generateBlockJsonFile(blockName, effectiveFields.map((f) => ({ name: f.name, type: f.type, label: f.label })), {
                    pattern: resolvedPattern,
                    items: items?.map((item) => ({
                        id: item.id,
                        title: item.title,
                        fields: item.fields.map((f) => ({ name: f.name, type: f.type, label: f.label })),
                    })),
                })
                : null;
            // ── Assemble output ───────────────────────────────────────
            const canonical = [
                { path: `blocks/${blockName}/${blockName}.js`, content: js },
                { path: `blocks/${blockName}/${blockName}.css`, content: css },
            ];
            if (blockJson) {
                canonical.push({ path: `blocks/${blockName}/_${blockName}.json`, content: blockJson });
            }
            // Adobe CDD pattern: test content → drafts/tmp/ (gitignored, throwaway authoring sandbox)
            //                   browser test  → test/tmp/  (gitignored, discard after PR review)
            //                   README        → docs/      (committed, or paste into PR body)
            const devOnly = [
                { path: `test/tmp/${blockName}.test.html`, content: testHtml },
                { path: `drafts/tmp/${blockName}.md`, content: sampleContent },
                { path: `docs/${blockName}/README.md`, content: readme },
            ];
            const renderSection = (file) => `### ${file.path}\n\`\`\`${getExtLang(file.path)}\n${file.content}\n\`\`\``;
            const canonicalOut = canonical.map(renderSection).join('\n\n');
            const devOnlyOut = devOnly.map(renderSection).join('\n\n');
            const patternLabel = resolvedPattern ? ` · pattern: \`${resolvedPattern}\`` : '';
            const namingLabel = naming !== 'flat' ? ` · naming: \`${naming}\`` : '';
            const foldLabel = aboveFold ? ' · ⚡ above-fold (LCP-critical)' : '';
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ Scaffolded EDS block: **${blockName}**${patternLabel}${namingLabel}${foldLabel}\n\n` +
                            `**Universal Editor canonical convention:** a UE block folder contains exactly ` +
                            `**3 files** — \`<name>.js\`, \`<name>.css\`, and \`_<name>.json\`. ` +
                            `The project build aggregates every block's \`_<name>.json\` into the project-root ` +
                            `\`component-definitions.json\`, \`component-models.json\`, and \`component-filters.json\` — never hand-edit those.\n\n` +
                            (aboveFold
                                ? `⚡ **Above-fold / LCP rules applied:** first \`<img>\` has \`loading="eager" fetchpriority="high"\`. ` +
                                    `Total pre-LCP JS + CSS budget = 100 KB. Run \`check_performance\` after editing.\n\n`
                                : '') +
                            `## Canonical block files (copy these into \`blocks/${blockName}/\`)\n\n` +
                            `${canonicalOut}\n\n` +
                            (blockJson
                                ? ''
                                : `> No \`fields\` were provided so \`_${blockName}.json\` was NOT emitted. ` +
                                    `Re-run with a field list, or call \`scaffold_model\` separately.\n\n`) +
                            `## Dev-only helpers — Adobe CDD test paths\n\n` +
                            `**Never commit these inside \`blocks/${blockName}/\`** — they break the UE block contract.\n` +
                            `Follow Adobe's CDD pattern:\n` +
                            `- \`test/tmp/${blockName}.test.html\` — **gitignored** throwaway browser test. Validate DOM + visuals, then delete before PR merge.\n` +
                            `- \`drafts/tmp/${blockName}.md\` — **gitignored** iterative authoring sandbox. Keep until PR review.\n` +
                            `- \`docs/${blockName}/README.md\` — commit to \`docs/\` or paste into the PR description as author documentation.\n\n` +
                            `${devOnlyOut}\n\n` +
                            `**Next steps:**\n` +
                            `1. Create the canonical files under \`blocks/${blockName}/\`.\n` +
                            `2. Add \`"${blockName}"\` to the \`section\` filter in \`component-filters.json\`.\n` +
                            `3. Run \`npm run build:json\` to aggregate \`_${blockName}.json\` into the root config files.\n` +
                            `4. Run \`aem up\` and verify the block in Universal Editor.\n` +
                            `5. Run \`validate_block\` to check against EDS standards.\n` +
                            (aboveFold ? `6. Run \`check_performance\` with \`isAboveFold: true\` to confirm the 100 KB pre-LCP budget.\n` : '') +
                            (blockJson ? '' : `6. Call \`scaffold_model\` to generate \`_${blockName}.json\` with the right fields.\n`),
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