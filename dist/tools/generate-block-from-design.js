import { z } from 'zod';
import { generateBlockJS, generateBlockCSS, generateBlockReadme, generateTestHtml, generateSampleContent, generateBlockJsonFile, } from '../knowledge/block-templates.js';
import { CDD_WORKFLOW, ANALYZE_AND_PLAN_TEMPLATE, CONTENT_MODEL_RULES, BUILDING_BLOCKS_PATTERNS, UE_COMPONENT_MODEL_RULES, CODE_REVIEW_CHECKLIST, TESTING_MATRIX, } from '../knowledge/adobe-skills.js';
const BLOCK_NAME_REGEX = /^[a-z][a-z0-9-]*$/;
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
export function registerGenerateBlockFromDesign(server) {
    server.tool('generate_block_from_design', `Generate a pixel-perfect AEM EDS block from any combination of text description, image/screenshot, and/or Figma URL.

Applies Adobe's Content-Driven-Development workflow and emits:
- Pattern-matched JS scaffold (hero | cards | accordion | carousel | columns | tabs | custom)
- Pattern-matched CSS with fluid typography (clamp()), aspect-ratio, mobile-first breakpoints
- UE component-model JSON with auto-injected classes multiselect + DA editor hints
- Vision-analysis prompt that classifies the design into an archetype before generating code`, {
        blockName: z
            .string()
            .regex(BLOCK_NAME_REGEX, 'Must be lowercase, hyphenated (e.g. "hero", "product-card")')
            .describe('Block name in kebab-case'),
        text: z
            .string()
            .optional()
            .describe('Natural-language description of the block (what it does, content fields, behavior)'),
        imageRefs: z
            .array(z.string())
            .optional()
            .describe('Local file paths or URLs of design screenshots/mockups. The IDE LLM will analyze these with vision.'),
        figmaUrl: z
            .string()
            .url()
            .optional()
            .describe('Figma file or frame URL (e.g. https://www.figma.com/file/<key>/...?node-id=123%3A456)'),
        figmaToken: z
            .string()
            .optional()
            .describe('Optional Figma Personal Access Token (only used to build the fetch recipe; never sent anywhere by this server)'),
        pattern: z
            .enum(['hero', 'cards', 'accordion', 'carousel', 'columns', 'tabs', 'custom'])
            .optional()
            .describe('Block archetype that selects the JS+CSS template. ' +
            'If omitted the vision prompt will classify the design automatically. ' +
            'hero=full-width media+text, cards=repeating grid, accordion=expandable Q&A, ' +
            'carousel=scrolling slides, columns=side-by-side, tabs=switchable panels, custom=unique layout.'),
        variant: z.string().optional().describe('Primary CSS variant name (e.g. "dark", "wide")'),
        naming: z
            .enum(['flat', 'bem'])
            .default('flat')
            .describe('CSS class naming convention. ' +
            'flat = .block-element (Vitamix/Ingredion style, default). ' +
            'bem  = .block__element--modifier (Volvo Trucks style).'),
        layout: z.enum(['grid', 'flex', 'stack']).default('stack').describe('Layout for custom pattern only'),
        hasMedia: z.boolean().default(false).describe('Block contains image/video media'),
        interactive: z.boolean().default(false).describe('Block has click/hover interactivity (custom pattern only)'),
    }, {
        title: 'Generate EDS block from design (text / image / Figma)',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ blockName, text, imageRefs, figmaUrl, figmaToken, pattern, variant, naming, layout, hasMedia, interactive, }) => {
        if (!text && !imageRefs?.length && !figmaUrl) {
            return {
                isError: true,
                content: [
                    {
                        type: 'text',
                        text: 'Provide at least one input: `text`, `imageRefs`, or `figmaUrl`.',
                    },
                ],
            };
        }
        const figma = figmaUrl ? parseFigmaUrl(figmaUrl) : null;
        const resolvedPattern = pattern;
        // ── 1. Vision / design-analysis prompt ───────────────────────
        const visionPrompt = buildVisionPrompt({
            blockName,
            text,
            imageRefs,
            figma,
            patternHint: resolvedPattern,
            naming,
        });
        // ── 2. Figma fetch recipe ─────────────────────────────────────
        const figmaRecipe = figma ? buildFigmaRecipe(figma, figmaToken) : null;
        // ── 3. Pattern-based scaffold ─────────────────────────────────
        const js = generateBlockJS(blockName, {
            pattern: resolvedPattern,
            variant,
            naming,
            interactive,
            hasMedia: hasMedia || Boolean(imageRefs?.length),
            description: text,
        });
        const css = generateBlockCSS(blockName, {
            pattern: resolvedPattern,
            variant,
            naming,
            hasMedia,
            layout,
        });
        // Starter UE model JSON — caller will refine fields after analysis
        const starterFields = buildStarterFields(resolvedPattern, hasMedia);
        const jsonFile = generateBlockJsonFile(blockName, starterFields, {
            pattern: resolvedPattern,
            daRows: pattern === 'accordion' || pattern === 'carousel' ? 3 : 1,
            daColumns: pattern === 'accordion' || pattern === 'columns' || pattern === 'cards' ? 2 : 1,
        });
        const readme = generateBlockReadme(blockName, text, variant, undefined);
        const sampleContent = generateSampleContent(blockName, starterFields.filter((f) => !['classes'].includes(f.name)), variant);
        const testHtml = generateTestHtml(blockName, sampleContent);
        const files = [
            { path: `blocks/${blockName}/${blockName}.js`, content: js, lang: 'javascript' },
            { path: `blocks/${blockName}/${blockName}.css`, content: css, lang: 'css' },
            { path: `blocks/${blockName}/_${blockName}.json`, content: jsonFile, lang: 'json' },
            { path: `blocks/${blockName}/README.md`, content: readme, lang: 'markdown' },
            { path: `blocks/${blockName}/test.html`, content: testHtml, lang: 'html' },
            { path: `blocks/${blockName}/sample-content.md`, content: sampleContent, lang: 'markdown' },
        ];
        const filesBlock = files
            .map((f) => `### ${f.path}\n\`\`\`${f.lang}\n${f.content}\n\`\`\``)
            .join('\n\n');
        // ── 4. Compose output ────────────────────────────────────────
        const sections = [];
        const patternLabel = resolvedPattern
            ? `**Pattern:** \`${resolvedPattern}\` · `
            : '**Pattern:** _auto-classify from design_ · ';
        sections.push(`# generate_block_from_design → **${blockName}**`);
        const inputSummary = [
            text ? `text (${text.length} chars)` : null,
            imageRefs?.length ? `${imageRefs.length} image ref(s)` : null,
            figma ? `Figma: ${figma.fileKey}${figma.nodeId ? ` @ node ${figma.nodeId}` : ''}` : null,
        ]
            .filter(Boolean)
            .join(' · ');
        sections.push(`${patternLabel}**Naming:** \`${naming}\` · **Inputs:** ${inputSummary}`);
        sections.push(`---\n## Step 0 — Content-Driven Development workflow\n\n${CDD_WORKFLOW}`);
        sections.push(`---\n## Step 1 — Analyze the design (LLM vision action)\n\n` +
            `Execute the vision prompt below against the design inputs. ` +
            `${resolvedPattern ? `Pattern is pre-classified as \`${resolvedPattern}\` — verify this matches the design.` : 'The prompt will **classify the pattern first** before producing code.'}\n\n` +
            `<details><summary>Vision analysis prompt</summary>\n\n\`\`\`text\n${visionPrompt}\n\`\`\`\n</details>\n\n` +
            `<details><summary>Acceptance-criteria template</summary>\n\n\`\`\`markdown\n${ANALYZE_AND_PLAN_TEMPLATE}\n\`\`\`\n</details>`);
        if (figmaRecipe) {
            sections.push(`---\n## Step 1b — Fetch Figma data\n\n${figmaRecipe}`);
        }
        sections.push(`---\n## Step 2 — Design the content model\n\n` +
            `${CONTENT_MODEL_RULES}\n\n` +
            `Output a table like:\n\n` +
            `| ${blockName}${variant ? ` (${variant})` : ''} |\n|---|\n| <content cell 1> |\n| <content cell 2> |\n`);
        sections.push(`---\n## Step 3 — Implementation patterns\n\n${BUILDING_BLOCKS_PATTERNS}`);
        sections.push(`---\n## Step 4 — Pattern-matched scaffold\n\n` +
            `These files are pre-generated using the **\`${resolvedPattern ?? 'custom'}\`** archetype and **\`${naming}\`** naming convention ` +
            `derived from production repos (Vitamix, Ingredion, Volvo Trucks).\n\n` +
            `**Edit them to match your analysis from Step 1** — all DOM selectors, class names, and tokens should stay consistent.\n\n${filesBlock}`);
        sections.push(`---\n## Step 5 — Refine the Universal Editor model\n\n${UE_COMPONENT_MODEL_RULES}\n\nThe starter \`_${blockName}.json\` above already includes:\n- A \`classes\` multiselect (variants) with pattern-appropriate defaults\n- \`plugins.da\` row/column hints for Document Authoring\n\nCall \`scaffold_model\` to regenerate with your final field list.`);
        sections.push(`---\n## Step 6 — Test across viewports\n\n${TESTING_MATRIX}`);
        sections.push(`---\n## Step 7 — Self-review before commit\n\n${CODE_REVIEW_CHECKLIST}`);
        sections.push(`---\n## Next tool calls\n` +
            `1. Call \`validate_block\` with the final JS/CSS.\n` +
            `2. Call \`check_performance\` to confirm the 100 KB pre-LCP budget.\n` +
            `3. If the block has authored fields, call \`scaffold_model\` with the derived field list.`);
        return { content: [{ type: 'text', text: sections.join('\n\n') }] };
    });
}
// ─── Helpers ────────────────────────────────────────────────────
/** Starter model fields by pattern — refined by the LLM after vision analysis. */
function buildStarterFields(pattern, hasMedia = false) {
    switch (pattern) {
        case 'hero':
            return [
                { name: 'image', type: 'reference', label: 'Background Image', required: false },
                { name: 'imageAlt', type: 'text', label: 'Background Image Alt', required: false },
                { name: 'title', type: 'richtext', label: 'Headline', required: true },
                { name: 'text', type: 'textarea', label: 'Body text', required: false },
                { name: 'link', type: 'aem-content', label: 'CTA URL', required: false },
                { name: 'linkText', type: 'text', label: 'CTA Label', required: false },
            ];
        case 'cards':
            return [
                { name: 'image', type: 'reference', label: 'Card Image', required: false },
                { name: 'imageAlt', type: 'text', label: 'Card Image Alt', required: false },
                { name: 'title', type: 'text', label: 'Card Title', required: true },
                { name: 'text', type: 'richtext', label: 'Card Body', required: false },
                { name: 'link', type: 'aem-content', label: 'Card Link', required: false },
                { name: 'linkText', type: 'text', label: 'Link Label', required: false },
            ];
        case 'accordion':
            return [
                { name: 'title', type: 'text', label: 'Accordion Label', required: true },
                { name: 'body', type: 'richtext', label: 'Accordion Content', required: false },
            ];
        case 'carousel':
            return [
                { name: 'image', type: 'reference', label: 'Slide Image', required: false },
                { name: 'imageAlt', type: 'text', label: 'Image Alt', required: false },
                { name: 'title', type: 'richtext', label: 'Slide Title', required: false },
                { name: 'text', type: 'textarea', label: 'Slide Body', required: false },
                { name: 'link', type: 'aem-content', label: 'Slide Link', required: false },
                { name: 'linkText', type: 'text', label: 'Link Label', required: false },
            ];
        case 'columns':
            return [
                { name: 'image', type: 'reference', label: 'Column Image', required: false },
                { name: 'imageAlt', type: 'text', label: 'Image Alt', required: false },
                { name: 'title', type: 'richtext', label: 'Column Title', required: false },
                { name: 'text', type: 'richtext', label: 'Column Body', required: false },
                { name: 'link', type: 'aem-content', label: 'CTA URL', required: false },
                { name: 'linkText', type: 'text', label: 'CTA Label', required: false },
            ];
        case 'tabs':
            return [
                { name: 'title', type: 'text', label: 'Tab Label', required: true },
                { name: 'body', type: 'richtext', label: 'Tab Content', required: false },
            ];
        default:
            return hasMedia
                ? [
                    { name: 'image', type: 'reference', label: 'Image', required: false },
                    { name: 'imageAlt', type: 'text', label: 'Image Alt', required: false },
                    { name: 'title', type: 'richtext', label: 'Title', required: false },
                    { name: 'text', type: 'textarea', label: 'Body', required: false },
                ]
                : [
                    { name: 'title', type: 'richtext', label: 'Title', required: false },
                    { name: 'text', type: 'textarea', label: 'Body', required: false },
                ];
    }
}
function buildVisionPrompt(args) {
    const { blockName, text, imageRefs, figma, patternHint, naming } = args;
    const lines = [];
    lines.push(`You are analyzing a design to implement an AEM Edge Delivery Services block called "${blockName}".`);
    lines.push(`CSS naming convention: **${naming}** (${naming === 'bem' ? '.block__element--modifier' : '.block-element'}).`);
    lines.push('');
    lines.push('## Design inputs');
    if (text)
        lines.push(`- Description: ${text}`);
    if (imageRefs?.length) {
        lines.push('- Images to analyze (load each with vision):');
        imageRefs.forEach((r) => lines.push(`    • ${r}`));
    }
    if (figma) {
        lines.push(`- Figma file key: ${figma.fileKey}${figma.nodeId ? ` (node ${figma.nodeId})` : ''}`);
        lines.push('  → Fetch via Figma API (see recipe) and treat the exported PNG + node JSON as design input.');
    }
    lines.push('');
    // ── Pattern classification ──────────────────────────────────
    if (patternHint) {
        lines.push(`## Pattern (pre-classified as \`${patternHint}\`)`);
        lines.push(`The caller has pre-classified this block as **${patternHint}**. Verify this is correct and note any deviations.`);
    }
    else {
        lines.push('## Step A — Classify the block pattern (REQUIRED FIRST)');
        lines.push('Before any other analysis, classify this design into **exactly one** of the following archetypes:');
        lines.push('');
        lines.push('| Pattern | Description | Choose when |');
        lines.push('|---|---|---|');
        lines.push('| `hero` | Full-width media (image/video) + overlay text + CTA | Main banner, landing hero, campaign header |');
        lines.push('| `cards` | Repeating grid of structurally identical items | Product cards, article teasers, team members |');
        lines.push('| `accordion` | Expandable/collapsible Q&A or content sections | FAQ, feature list, nested details |');
        lines.push('| `carousel` | Horizontal scrolling slides with nav | Image gallery, testimonials, featured content |');
        lines.push('| `columns` | Side-by-side content panels (alternating or fixed) | Split promo, feature highlight |');
        lines.push('| `tabs` | Switchable content panels via tab navigation | Product variants, multi-section content |');
        lines.push('| `custom` | Unique layout that doesn\'t fit the above | Complex interactive widgets, custom forms |');
        lines.push('');
        lines.push('**Output:** `Pattern: <chosen>` on its own line before continuing.');
        lines.push('');
        lines.push('This classification directly controls which JS+CSS template is used.');
    }
    lines.push('');
    // ── Design analysis sections ────────────────────────────────
    lines.push('## Step B — Full design analysis');
    lines.push('Produce these sections **in order**:');
    lines.push('');
    lines.push('### 1. Structure');
    lines.push('List content sequences top-to-bottom: heading level, paragraph, image, CTA, card grid, icon, badge, etc.');
    lines.push('');
    lines.push('### 2. Authoring shape');
    lines.push('Leaf block OR container+items (like `blocks/tabs-card`). If container, name item type(s) and max nesting depth.');
    lines.push('');
    lines.push('### 3. Authoring fields');
    lines.push('Table with columns: **Field name** (camelCase) | **UE component** | **Required** | **Example value**.');
    lines.push('- Use shared prefixes: `image`+`imageAlt`, `link`+`linkText`+`linkTitle`+`linkType`, `title`+`titleType`');
    lines.push('- Always include `classes` (multiselect) for CSS variants');
    lines.push('');
    lines.push('### 4. Responsive behavior');
    lines.push('Mobile (<600px) → Tablet (600–899px) → Desktop (≥900px). Note breakpoint-specific layout changes.');
    lines.push('');
    lines.push('### 5. Interactivity');
    lines.push('Hover, focus, click-to-expand, carousel rotation, lazy-load. Write "none" if static.');
    lines.push('');
    lines.push('### 6. Design tokens → CSS custom properties');
    lines.push('Extract exact values and map to existing `var(--*)` where possible:');
    lines.push('- Colors → `var(--link-color)`, `var(--background-color)`, `var(--text-color)`, etc.');
    lines.push('- Typography → `var(--heading-font-family)`, `var(--body-font-family)`; sizes as `clamp(min, vw, max)`');
    lines.push('- Spacing → `clamp(1rem, 3vw, 2rem)` patterns');
    lines.push('- Shadows, borders, border-radius, gradients');
    lines.push('');
    lines.push('### 7. Acceptance criteria');
    lines.push('Fill in the Adobe analyze-and-plan template (functional, edge cases, responsive, author experience, DoD).');
    lines.push('');
    // ── Code generation constraints ─────────────────────────────
    lines.push('## Step C — Generate code');
    lines.push('');
    lines.push('Based on the analysis, emit pixel-perfect implementations:');
    lines.push('');
    lines.push('**`block.js` constraints:**');
    lines.push('- Vanilla ES6+ modules, no frameworks, no build step');
    lines.push('- `export default function decorate(block)` — reuse platform-delivered `<picture>`, `<a>`, `<h1>`–`<h6>` nodes');
    lines.push('- Scope all queries to `block.querySelector` / `block.querySelectorAll` — never `document.querySelector`');
    lines.push('- Import `createOptimizedPicture` from `../../scripts/aem.js` for all img optimisation');
    lines.push('- Use `IntersectionObserver` for heavy third-party libs; never put them in `head.html`');
    lines.push(`- Use **${naming}** class naming: ${naming === 'bem' ? '`.block__element--modifier`' : '`.block-element`'}`);
    lines.push('');
    lines.push('**`block.css` constraints:**');
    lines.push('- Scope every rule to `.block-name` (no bare element selectors)');
    lines.push('- Mobile-first; standard breakpoints `(width >= 600px)`, `(width >= 900px)`, `(width >= 1200px)`');
    lines.push('- Use `clamp()` for fluid font sizes and spacing');
    lines.push('- Use `aspect-ratio` for media cells instead of padding-hack');
    lines.push('- Map all colors/fonts to `var(--*)` custom properties from `styles/styles.css`');
    lines.push('- No `!important`, no preprocessors, no CSS frameworks');
    lines.push('- Pre-LCP aggregate payload < 100 KB');
    lines.push('');
    lines.push('**`_block.json` model:**');
    lines.push('- Include `classes` multiselect with variant options derived from the design');
    lines.push('- Include `plugins.da` row/column hints for Document Authoring editor');
    lines.push('- Use `domPath: true` fields for xwalk/UE direct DOM binding where needed');
    lines.push('');
    lines.push('Return in order: analysis → `block.js` → `block.css` → `_block.json` field list.');
    return lines.join('\n');
}
function parseFigmaUrl(url) {
    try {
        const u = new URL(url);
        // Supported forms: figma.com/file/<key>/... and figma.com/design/<key>/...
        const m = u.pathname.match(/\/(?:file|design|proto)\/([a-zA-Z0-9]+)/);
        if (!m)
            return null;
        const fileKey = m[1];
        const nodeId = u.searchParams.get('node-id') ?? undefined;
        return { fileKey, nodeId: nodeId ? decodeURIComponent(nodeId) : undefined };
    }
    catch {
        return null;
    }
}
function buildFigmaRecipe(ref, token) {
    const tokenLine = token
        ? `export FIGMA_TOKEN="${maskToken(token)}"   # provided token (masked in output)`
        : `export FIGMA_TOKEN="<your Figma Personal Access Token>"   # https://www.figma.com/developers/api#access-tokens`;
    const imagesQuery = ref.nodeId ? `?ids=${encodeURIComponent(ref.nodeId)}&format=png&scale=2` : '?format=png&scale=2';
    return [
        'Run these commands (shell) to pull the node JSON + a PNG render, then feed both into the vision analysis above:',
        '',
        '```bash',
        tokenLine,
        `FILE_KEY="${ref.fileKey}"`,
        ref.nodeId ? `NODE_ID="${ref.nodeId}"` : '# (no node id supplied — the whole file will be fetched)',
        '',
        '# 1. Node metadata (frames, auto-layout, text styles, colors)',
        `curl -sS -H "X-Figma-Token: $FIGMA_TOKEN" \\`,
        `  "https://api.figma.com/v1/files/$FILE_KEY/nodes?ids=$NODE_ID" \\`,
        `  -o figma-node.json`,
        '',
        '# 2. PNG export (2x) for vision analysis',
        `curl -sS -H "X-Figma-Token: $FIGMA_TOKEN" \\`,
        `  "https://api.figma.com/v1/images/$FILE_KEY${imagesQuery}" \\`,
        `  | jq -r '.images[]' | head -1 | xargs curl -sSL -o figma-frame.png`,
        '```',
        '',
        '**Then attach `figma-frame.png` to this chat** and re-run the analysis — the vision prompt will treat it as another entry in `imageRefs`.',
        '',
        '> Security: this server never stores or transmits your Figma token; the recipe runs locally in your terminal.',
    ].join('\n');
}
function maskToken(t) {
    if (t.length <= 8)
        return '***';
    return `${t.slice(0, 4)}…${t.slice(-4)}`;
}
//# sourceMappingURL=generate-block-from-design.js.map