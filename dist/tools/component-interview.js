import { z } from 'zod';
const SPECS = {
    eds: {
        scaffoldTool: 'scaffold_block',
        toolNotes: 'For Universal Editor authoring use the canonical UE field types. If the user has a design (Figma / image / screenshot) use `generate_block_from_design` instead — it runs vision analysis, classifies the pattern, and produces a pixel-perfect scaffold. Pair with `scaffold_model` for container blocks that need separate definitions/models/filters JSON.',
        fieldTypes: [
            { type: 'text', use: 'Single-line text', example: '{ "name": "title", "type": "text", "label": "Title" }' },
            { type: 'textarea', use: 'Multi-line plain text', example: '{ "name": "summary", "type": "textarea", "label": "Summary" }' },
            { type: 'richtext', use: 'Formatted prose (bold, italic, links)', example: '{ "name": "body", "type": "richtext", "label": "Body" }' },
            { type: 'reference', use: 'Image / asset picker (DAM)', example: '{ "name": "image", "type": "reference", "label": "Image" }' },
            { type: 'aem-content', use: 'Page or fragment picker (for links / CTAs)', example: '{ "name": "ctaTarget", "type": "aem-content", "label": "CTA target" }' },
            { type: 'select', use: 'Single value from a fixed list (alignment, heading level)', example: '{ "name": "alignment", "type": "select", "label": "Alignment" }' },
            { type: 'multiselect', use: 'Multiple values — use `classes` for CSS variant toggles', example: '{ "name": "classes", "type": "multiselect", "label": "Variants" }' },
            { type: 'boolean', use: 'On / off toggle (autoplay, show caption)', example: '{ "name": "autoplay", "type": "boolean", "label": "Autoplay" }' },
            { type: 'number', use: 'Numeric input (item count, animation delay ms)', example: '{ "name": "itemsPerRow", "type": "number", "label": "Items per row" }' },
        ],
        commonVariants: ['dark', 'light', 'wide', 'centered', 'compact', 'reversed', 'split', '<colour>-bg'],
        featureToggles: [
            { name: 'modelType', question: 'Adobe canonical model type — standalone (single table, one unit) / collection (repeating rows) / configuration (key-value config rows) / auto-blocked (default content transformed by JS)?', default: '(inferred from pattern)' },
            { name: 'pattern', question: 'Block archetype — hero / cards / accordion / carousel / columns / tabs / custom?', default: 'custom' },
            { name: 'hasMedia', question: 'Does the block have an image / video column?', default: 'false' },
            { name: 'interactive', question: 'Does the block need JS event handlers (accordion / tabs / carousel)?', default: 'false' },
            { name: 'layout', question: 'CSS layout (custom pattern only): grid (card grids), flex (side-by-side), stack (vertical)?', default: 'stack' },
            { name: 'container', question: 'Is this a container block with repeating items (e.g. cards → card, tabs → tab)? If yes, provide item type + its fields.', default: 'no' },
            { name: 'aboveFold', question: 'Is this block above the fold (first viewport, LCP-critical)?', default: 'false' },
            { name: 'naming', question: 'CSS class naming: flat (.block-element, default) or BEM (.block__element--modifier)?', default: 'flat' },
            { name: 'thirdParty', question: 'Does the block require any third-party library (map SDK, video player, chart)?', default: 'none' },
            { name: 'hasDesign', question: 'Is there a design to build from? (Figma URL / screenshot / image path)', default: 'none' },
        ],
        questions: [
            { id: 'blockName', question: 'Block name in kebab-case (e.g. `hero`, `promo-card`)?', required: true, hint: 'Lowercase letters, digits, and hyphens only.' },
            { id: 'purpose', question: 'What does this block do? Describe in one sentence — used in README and code comments.', required: false },
            { id: 'modelType', question: 'Which of Adobe’s 4 canonical content model types does this block use?', required: false, hint: 'standalone → single table, one unit (hero, banner, blockquote, promo). collection → repeating row pattern (cards, carousel, accordion, tabs). configuration → key-value config rows, API-driven (blog listing, search, locator). auto-blocked → authors write default content that JS transforms (YouTube embed, tabs from a list). Usually inferred from pattern — ask only when pattern is “custom” or ambiguous.' },
            { id: 'pattern', question: 'Which pattern best describes this block: **hero** (full-width media+text) / **cards** (repeating grid) / **accordion** (expand/collapse) / **carousel** (scrolling slides) / **columns** (side-by-side) / **tabs** (switchable panels) / **custom** (unique layout)?', required: true, hint: 'This selects the JS+CSS archetype template. When unsure, describe the layout and the tool will classify it.' },
            { id: 'fields', question: 'Which authoring fields do you need? For each: name (camelCase) + label + type (see field-type catalog).', required: true, hint: 'List every field. Example: title (text), body (richtext), image (reference), cta (aem-content). Use shared prefixes: image+imageAlt, link+linkText+linkTitle.' },
            { id: 'variants', question: 'Any visual variants as CSS class modifiers? Pick from common list or name your own.', required: false, hint: 'These become options in the auto-generated `classes` multiselect field. Example: dark, wide, centered.' },
            { id: 'container', question: 'Is this a **container block** with repeating children (cards grid, accordion with items, carousel with slides)? If yes: child item type id + its fields.', required: false, hint: 'Example: cards → item id `card`, fields: image, imageAlt, title, description, link, linkText.' },
            { id: 'aboveFold', question: 'Is this block above the fold / LCP-critical? (true / false)', required: false, hint: 'If true: first media must be `loading="eager" fetchpriority="high"`. Total pre-LCP JS+CSS budget = 100 KB.' },
            { id: 'hasMedia', question: 'Does the block have an image or video? (true / false)', required: false },
            { id: 'interactive', question: 'Does the block need JS interactivity? (true / false)', required: false, hint: 'Accordion toggle, carousel prev/next, tab switching, modal open, lazy-load trigger.' },
            { id: 'thirdParty', question: 'Any third-party library required? Name it or skip.', required: false, hint: 'Load via IntersectionObserver inside decorate() — never in head.html.' },
            { id: 'naming', question: 'CSS class naming: **flat** (`.block-element`, default, Vitamix/Ingredion style) or **BEM** (`.block__element--modifier`, Volvo Trucks style)?', required: false },
            { id: 'design', question: 'Do you have a design file? Paste Figma URL, file path, or image URL.', required: false, hint: 'If provided, use `generate_block_from_design` instead of `scaffold_block` — it produces a pixel-perfect scaffold via vision analysis.' },
        ],
        jsonTemplate: `{
  "blockName":   "...",
  "description": "...",
  "pattern":     "custom",      // hero | cards | accordion | carousel | columns | tabs | custom
  "variant":     "...",         // optional primary variant
  "naming":      "flat",        // flat | bem
  "layout":      "stack",       // grid | flex | stack (custom pattern only)
  "hasMedia":    false,
  "interactive": false,
  "aboveFold":   false,
  "fields": [
    { "name": "title",    "type": "text",      "label": "Title" },
    { "name": "body",     "type": "richtext",  "label": "Body" },
    { "name": "image",    "type": "reference", "label": "Image" },
    { "name": "imageAlt", "type": "text",      "label": "Image Alt" },
    { "name": "link",     "type": "aem-content","label": "CTA URL" },
    { "name": "linkText", "type": "text",      "label": "CTA Label" }
  ],
  // For container blocks only:
  "items": [
    {
      "id":     "card",
      "title":  "Card",
      "fields": [
        { "name": "image",    "type": "reference", "label": "Card Image" },
        { "name": "imageAlt", "type": "text",      "label": "Image Alt" },
        { "name": "title",    "type": "text",      "label": "Card Title" },
        { "name": "body",     "type": "richtext",  "label": "Card Body" },
        { "name": "link",     "type": "aem-content","label": "Card Link" },
        { "name": "linkText", "type": "text",      "label": "Link Label" }
      ]
    }
  ]
}`,
    },
    storefront: {
        scaffoldTool: 'scaffold_commerce_block',
        toolNotes: 'For an EDS Commerce Storefront, the block usually mounts a drop-in container — pick from the catalog (`commerce-cart`, `commerce-checkout`, `commerce-product-details`, `commerce-product-list-page`, `commerce-recommendations`, …) or pass a custom name + explicit `dropin` id. After scaffolding, use `customize_dropin_slot` for slot overrides and `style_dropin` for brand styling.',
        fieldTypes: [
            { type: 'text', use: 'Section heading or label', example: '{ "name": "heading", "type": "text", "label": "Section heading" }' },
            { type: 'select', use: 'Variant picker (compact / wide)', example: '{ "name": "variant", "type": "select", "label": "Variant" }' },
            { type: 'boolean', use: 'Feature toggle (show recommendations)', example: '{ "name": "showRecs", "type": "boolean", "label": "Show recommendations" }' },
            { type: 'aem-content', use: 'Page picker (e.g. continue-shopping target)', example: '{ "name": "continueTarget", "type": "aem-content", "label": "Continue shopping target" }' },
        ],
        commonVariants: ['compact', 'wide', 'minimal', 'with-rail'],
        featureToggles: [
            { name: 'dropin', question: 'Which drop-in does this block mount? (cart, checkout, pdp, product-discovery, recommendations, account, auth, wishlist, quick-order, order, payment-services, personalization)', default: 'cart' },
            { name: 'container', question: 'Container override (e.g. MiniCart instead of Cart)? Optional.', default: '(default)' },
            { name: 'slots', question: 'Any slot overrides needed? (e.g. EmptyCart, ProductAttributes, PaymentMethods)', default: 'none' },
        ],
        questions: [
            { id: 'blockName', question: 'Block name in kebab-case (e.g. `commerce-cart`, `commerce-product-details`)?', required: true },
            { id: 'dropin', question: 'Which Adobe Commerce drop-in does it mount? (Required if blockName is not in the catalog.)', required: false, hint: 'See `lookup_dropin` for the catalog.' },
            { id: 'container', question: 'Optional drop-in container override (e.g. `MiniCart`).', required: false },
            { id: 'variant', question: 'Optional CSS variant (compact / wide / etc.).', required: false },
            { id: 'authorFields', question: 'Any author-editable fields above/around the drop-in? (Section heading, intro copy, CTA target.)', required: false, hint: 'These become UE fields on the wrapper block, not on the drop-in itself.' },
            { id: 'slotOverrides', question: 'Any slot overrides needed? List slot name + what should appear there.', required: false, hint: 'After scaffolding, call `customize_dropin_slot` per override.' },
            { id: 'styling', question: 'Brand colours / fonts / radius for the drop-in? (Used to call `style_dropin`.)', required: false },
        ],
        jsonTemplate: `// 1) scaffold_commerce_block
{
  "blockName": "commerce-cart",
  "dropin":    "cart",          // omit if blockName is in the catalog
  "container": "MiniCart",      // optional override
  "variant":   "compact"         // optional
}

// 2) (per slot override) customize_dropin_slot
{ "dropin": "cart", "slot": "EmptyCart", "mode": "replace", "description": "Brand-aligned empty cart" }

// 3) style_dropin
{ "dropin": "cart", "brandPrimary": "#0a66c2", "headingFont": "Inter, sans-serif", "radius": "soft" }`,
    },
    aemaacs: {
        scaffoldTool: 'scaffold_aem_component',
        toolNotes: 'PRECONDITION: project must have an `AGENTS.md` and `.aem-skills-config.yaml` with `configured: true`. Read `project`, `javaPackage`, and `group` from `.aem-skills-config.yaml` — never infer them from the file system. After scaffolding, follow Adobe\'s `create-component` skill checklist (build with `mvn -PautoInstallSinglePackage clean install`, deploy via Cloud Manager).',
        fieldTypes: [
            { type: 'textfield', use: 'Single-line text', example: '{ "name": "title", "type": "textfield", "label": "Title" }' },
            { type: 'textarea', use: 'Multi-line plain text', example: '{ "name": "summary", "type": "textarea", "label": "Summary" }' },
            { type: 'richtext', use: 'Formatted prose with RTE', example: '{ "name": "body", "type": "richtext", "label": "Body" }' },
            { type: 'pathfield', use: 'Page / asset picker (DAM, Sites)', example: '{ "name": "ctaPath", "type": "pathfield", "label": "CTA path" }' },
            { type: 'image', use: 'Inline image (CFM / Image v3)', example: '{ "name": "image", "type": "image", "label": "Image" }' },
            { type: 'fileupload', use: 'Direct file upload', example: '{ "name": "asset", "type": "fileupload", "label": "Asset" }' },
            { type: 'multifield', use: 'Repeating set of fields (list of items)', example: '{ "name": "items", "type": "multifield", "label": "Items" }' },
            { type: 'checkbox', use: 'On / off toggle', example: '{ "name": "showCta", "type": "checkbox", "label": "Show CTA" }' },
            { type: 'select', use: 'Single value from a fixed list', example: '{ "name": "style", "type": "select", "label": "Style" }' },
            { type: 'numberfield', use: 'Numeric input', example: '{ "name": "delay", "type": "numberfield", "label": "Delay (ms)" }' },
            { type: 'datepicker', use: 'Date / datetime picker', example: '{ "name": "publishDate", "type": "datepicker", "label": "Publish date" }' },
        ],
        commonVariants: ['(use Style System / cq:styleGroups)', 'dark', 'wide', 'centered', 'reversed'],
        featureToggles: [
            { name: 'extendsCore', question: 'Extend a Core Component? (teaser, list, navigation, image, button, etc.) Uses Sling Resource Merger pattern.', default: 'no' },
            { name: 'hasServlet', question: 'Does the component need a Sling Servlet (dynamic data, external API, form submission)?', default: 'false' },
            { name: 'styleSystem', question: 'Should authors pick visual variants via the Style System (cq:styleGroups in policy)?', default: 'yes' },
        ],
        questions: [
            { id: 'componentName', question: 'Component name in kebab-case (e.g. `promo-card`, `hero-banner`)?', required: true },
            { id: 'title', question: 'Editor-visible title (e.g. "Promo Card")?', required: true },
            { id: 'project', question: 'AEM project name — copy from `.aem-skills-config.yaml` `project:` (used in `/apps/<project>/components/...`).', required: true, hint: 'Do NOT guess. Read the file.' },
            { id: 'javaPackage', question: 'Java base package — copy from `.aem-skills-config.yaml` `javaPackage:` (e.g. `com.mysite.core`).', required: true },
            { id: 'group', question: 'Component group — copy from `.aem-skills-config.yaml` `group:` (e.g. "MySite Components").', required: true },
            { id: 'fields', question: 'Which Granite UI dialog fields do you need? For each: name + label + type (see field-type catalog). EXACTLY the fields the user named — no extras.', required: true },
            { id: 'extendsCore', question: 'Extend a Core Component? Name it (`teaser`, `list`, …) or skip.', required: false },
            { id: 'hasServlet', question: 'Need a Sling Servlet? (true / false)', required: false },
            { id: 'variants', question: 'Visual variants — recommend Style System over CSS modifiers. Names + intended look.', required: false },
        ],
        jsonTemplate: `{
  "componentName": "promo-card",
  "title":         "Promo Card",
  "project":       "<from .aem-skills-config.yaml>",
  "javaPackage":   "<from .aem-skills-config.yaml>",
  "group":         "<from .aem-skills-config.yaml>",
  "fields": [
    { "name": "title",      "type": "textfield", "label": "Title" },
    { "name": "description","type": "richtext",  "label": "Description" },
    { "name": "image",      "type": "pathfield", "label": "Image" }
  ],
  "extendsCore": "teaser",   // optional
  "hasServlet":  false
}`,
    },
    aem65lts: {
        scaffoldTool: 'scaffold_aem65_component',
        toolNotes: 'AEM 6.5 LTS / AMS — same Granite UI Coral 3 / HTL / Sling Models surface as Cloud, but: project / javaPackage / group are passed directly (no `.aem-skills-config.yaml`), uber-jar / cq.quickstart provides the APIs, Felix SCR is still allowed (DS R6 preferred), deploy via `mvn -PautoInstallPackage clean install` + Package Manager (NEVER Cloud Manager).',
        fieldTypes: [
            // identical Granite UI surface as Cloud
            { type: 'textfield', use: 'Single-line text', example: '{ "name": "title", "type": "textfield", "label": "Title" }' },
            { type: 'textarea', use: 'Multi-line plain text', example: '{ "name": "summary", "type": "textarea", "label": "Summary" }' },
            { type: 'richtext', use: 'Formatted prose with RTE', example: '{ "name": "body", "type": "richtext", "label": "Body" }' },
            { type: 'pathfield', use: 'Page / asset picker', example: '{ "name": "ctaPath", "type": "pathfield", "label": "CTA path" }' },
            { type: 'image', use: 'Inline image', example: '{ "name": "image", "type": "image", "label": "Image" }' },
            { type: 'fileupload', use: 'Direct file upload', example: '{ "name": "asset", "type": "fileupload", "label": "Asset" }' },
            { type: 'multifield', use: 'Repeating set of fields', example: '{ "name": "items", "type": "multifield", "label": "Items" }' },
            { type: 'checkbox', use: 'On / off toggle', example: '{ "name": "showCta", "type": "checkbox", "label": "Show CTA" }' },
            { type: 'select', use: 'Single value from a fixed list', example: '{ "name": "style", "type": "select", "label": "Style" }' },
            { type: 'numberfield', use: 'Numeric input', example: '{ "name": "delay", "type": "numberfield", "label": "Delay (ms)" }' },
            { type: 'datepicker', use: 'Date / datetime picker', example: '{ "name": "publishDate", "type": "datepicker", "label": "Publish date" }' },
        ],
        commonVariants: ['(use Style System / cq:styleGroups)', 'dark', 'wide', 'centered', 'reversed'],
        featureToggles: [
            { name: 'extendsCore', question: 'Extend a Core Component? Requires Core Components 2.x+ on 6.5 LTS.', default: 'no' },
            { name: 'hasServlet', question: 'Need a Sling Servlet (dynamic data, external API, form submission)?', default: 'false' },
            { name: 'styleSystem', question: 'Use Style System (cq:styleGroups) for visual variants?', default: 'yes' },
        ],
        questions: [
            { id: 'componentName', question: 'Component name in kebab-case?', required: true },
            { id: 'title', question: 'Editor-visible title?', required: true },
            { id: 'project', question: 'AEM project name — read from root `pom.xml` `<artifactId>` (used in `/apps/<project>/components/...`).', required: true, hint: 'Do NOT guess.' },
            { id: 'javaPackage', question: 'Java base package — read from `core/pom.xml` or existing `core/src/main/java/`.', required: true },
            { id: 'group', question: 'Component group displayed in SidePanel (e.g. "MySite - Content").', required: true },
            { id: 'fields', question: 'Granite UI dialog fields — name + label + type. EXACTLY the fields the user named — no extras.', required: true },
            { id: 'extendsCore', question: 'Extend a Core Component? Name it or skip.', required: false },
            { id: 'hasServlet', question: 'Need a Sling Servlet? (true / false)', required: false },
            { id: 'variants', question: 'Visual variants — Style System recommended. Names + intended look.', required: false },
        ],
        jsonTemplate: `{
  "componentName": "promo-card",
  "title":         "Promo Card",
  "project":       "<from root pom.xml artifactId>",
  "javaPackage":   "<from core/pom.xml>",
  "group":         "MySite - Content",
  "fields": [
    { "name": "title",      "type": "textfield", "label": "Title" },
    { "name": "description","type": "richtext",  "label": "Description" },
    { "name": "image",      "type": "pathfield", "label": "Image" }
  ],
  "extendsCore": "teaser",   // optional, requires Core Components 2.x+
  "hasServlet":  false
}`,
    },
};
export function registerComponentInterview(server) {
    server.tool('component_interview', `Return the canonical question set for collecting authoring fields, variants, and feature toggles BEFORE calling a scaffold tool. Use this to drive an interactive Q&A with the user instead of guessing fields. Works across **EDS** (Universal Editor blocks), **EDS Commerce Storefront** (drop-in blocks), **AEMaaCS** (Granite UI components), and **AEM 6.5 LTS / AMS** (Granite UI components). Returns: the matching scaffold tool name, the field-type catalog with examples, common variants, feature toggles, the ordered question list, and a JSON template the chat fills in from the user's answers. PRECONDITION: call \`detect_project_type\` first so you pass the right \`projectType\`.`, {
        projectType: z.enum(['eds', 'storefront', 'aemaacs', 'aem65lts']).describe('Project type from `detect_project_type`. eds = Universal Editor blocks, storefront = EDS Commerce Storefront drop-in blocks, aemaacs = AEM as a Cloud Service, aem65lts = AEM 6.5 LTS / AMS.'),
        componentName: z.string().optional().describe('Optional working name (kebab-case). Echoed in the question prompts so the chat is concrete.'),
        purpose: z.string().optional().describe('Optional one-sentence description of what the component should do. Echoed back to keep the interview focused.'),
    }, {
        title: 'Component Interview',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ projectType, componentName, purpose }) => {
        const spec = SPECS[projectType];
        const out = [];
        const label = projectType === 'aem65lts' ? 'AEM 6.5 LTS / AMS' : projectType === 'aemaacs' ? 'AEMaaCS' : projectType === 'storefront' ? 'EDS Commerce Storefront' : 'EDS';
        out.push(`# Component interview — ${label}\n\nNext scaffold tool: \`${spec.scaffoldTool}\`\n\n${spec.toolNotes}`);
        out.push(`## 🚨 Interactive turn-by-turn rule\n\nThis is a **strict turn-by-turn interview**. The agent MUST:\n\n1. Ask the questions below **one at a time**.\n2. After EACH question, **end the turn**. Do not generate the next question. Do not call other tools. Do not assume answers.\n3. When the user replies, ack briefly and ask the NEXT question.\n4. Use the IDE\u2019s structured-question UI when available (e.g. \`vscode_askQuestions\` in VS Code) so the user gets an input field.\n5. NEVER auto-add fields, variants, or features the user did not name.\n6. After all questions are answered, show the assembled JSON and ask \u201cShould I scaffold this now?\u201d \u2014 only call \`${spec.scaffoldTool}\` on explicit yes.`);
        if (componentName || purpose) {
            out.push(`## Working name & purpose\n\n- **Name:** \`${componentName ?? '(not yet picked)'}\`\n- **Purpose:** ${purpose ?? '(not yet described)'}`);
        }
        out.push(`## Field-type catalog\n\nUse these exact \`type\` values when collecting fields:\n\n| type | use | example |\n| --- | --- | --- |\n${spec.fieldTypes.map((f) => `| \`${f.type}\` | ${f.use} | \`${f.example.replace(/\|/g, '\\|')}\` |`).join('\n')}`);
        out.push(`## Common variants\n\n${spec.commonVariants.map((v) => `- ${v}`).join('\n')}`);
        out.push(`## Feature toggles\n\n${spec.featureToggles.map((t) => `- **${t.name}** — ${t.question}${t.default ? ` _(default: ${t.default})_` : ''}`).join('\n')}`);
        // EDS-specific complexity guides
        if (projectType === 'eds') {
            out.push(`## 4 Canonical Content Model Types (Adobe)

Choose the type that matches how authors will structure the block in the document:

| Type | Authoring table shape | Examples | scaffold_block tip |
|---|---|---|---|
| **standalone** | Single table, one set of rows/cells | hero, banner, blockquote, promo | Default — no \`items[]\` needed |
| **collection** | Repeating row pattern, each row = one child | cards, carousel, accordion, tabs | Pass \`items[{id, fields}]\` |
| **configuration** | Key-value config rows (\`key \| value\`) | blog listing, product search, locator | Use \`textarea\`/\`text\` fields for API params |
| **auto-blocked** | Author writes default content; JS transforms it | YouTube embed, tabs from a list | No \`_block.json\` model needed; \`decorate()\` does the transform |

**Quick rule:** “list of identical items” → collection. “shows API results” → configuration. “transforms what the author typed” → auto-blocked. Everything else → standalone.`);
            out.push(`## Pattern → scaffold tool routing

| User says… | Pattern | Tool |
|---|---|---|
| "hero", "banner", "full-width image + text" | \`hero\` | \`scaffold_block\` or \`generate_block_from_design\` |
| "cards", "grid", "repeating items", "articles" | \`cards\` | \`scaffold_block\` (set \`items\`) |
| "FAQ", "accordion", "expand/collapse" | \`accordion\` | \`scaffold_block\` |
| "carousel", "slider", "gallery", "testimonials" | \`carousel\` | \`scaffold_block\` |
| "columns", "side by side", "split", "two-up" | \`columns\` | \`scaffold_block\` |
| "tabs", "tabbed", "switchable panels" | \`tabs\` | \`scaffold_block\` (set \`items\`) |
| "I have a Figma/screenshot/image" | any | **\`generate_block_from_design\`** (vision + pattern classifier) |
| "not sure / something else" | \`custom\` | \`scaffold_block\` |`);
            out.push(`## Container block complexity — when to use the block→item pattern

Use a **container + item** structure when:
- The block contains a **repeating set of structurally identical children** (each child has image + title + body + link)
- Items need their own UE authored fields (the author adds/removes items in Universal Editor)
- Examples: \`cards\` → \`card\` items, \`tabs\` → \`tab\` items, \`accordion\` → \`accordion-item\` items, \`carousel\` → \`slide\` items

**Container block JSON contract** — three things must be wired together:
\`\`\`
_block.json
  definitions[0]  container  →  filter: "<blockName>"  (block template)
  definitions[1]  item       →  resourceType: .../block/v1/block/item, model: "<itemId>"
  models[0]       item model →  has its own field list (+ classes multiselect)
  filters[0]      { id: "<blockName>", components: ["<itemId>"] }
\`\`\`

**Leaf block** (no repeating items) — single definition + single model, no filter.

**Nested containers** (e.g. tabs containing a cards grid):
- Declare one filter entry per nesting level
- Only the outermost block gets \`filter\` on its template
- Inner items use \`resourceType: .../block/v1/block/item\`

**Sub-questions to ask when the user says "container":**
1. What is the child item id? (e.g. \`card\`, \`tab\`, \`slide\`)
2. What fields does each item have? (name + label + type per field)
3. What is the maximum expected number of items? (affects DA row hint)
4. Can items contain further nested items (e.g. tabs → cards)? If yes, repeat for each level.`);
            out.push(`## Above-fold / LCP performance rules

If \`aboveFold: true\` or \`pattern: "hero"\`:
- **First media** → \`loading="eager"\` + \`fetchpriority="high"\` on \`<img>\`
- **Inline first-fold CSS** — keep selector count low, no \`@import\`
- **No lazy-loaded scripts** in \`decorate()\` for above-fold blocks
- **Total pre-LCP JS + CSS budget = 100 KB** (blocks/name.js + blocks/name.css combined)
- After scaffolding, run \`check_performance\` with \`isAboveFold: true\`

If \`aboveFold: false\`:
- Use \`IntersectionObserver\` for heavy dependencies (map SDK, video player, chart lib)
- Load third-party scripts via \`loadScript()\` inside the observer callback
- Place the block in \`loadLazy()\` tier; heavy analytics go in \`delayed.js\` (≥3s after LCP)`);
        }
        out.push(`## Questions to ask the user (in order)\n\nAsk these one at a time, accept the user's exact wording, do NOT invent extra fields. Stop and ask follow-ups before scaffolding if any **required** answer is missing.\n\n${spec.questions.map((q, i) => `${i + 1}. ${q.required ? '**[required]** ' : ''}${q.question}${q.hint ? `\n   - _Hint:_ ${q.hint}` : ''}`).join('\n')}`);
        out.push(`## JSON template to fill from the user's answers\n\nOnce the user has answered, populate this and call \`${spec.scaffoldTool}\`:\n\n\`\`\`json\n${spec.jsonTemplate}\n\`\`\``);
        out.push(`## Mandatory rules\n\n- Pass through **only** the fields the user named — never auto-add description, image, or CTA fields the user did not request.\n- Re-confirm the JSON with the user before calling \`${spec.scaffoldTool}\`.\n- After scaffolding, run any project-specific validation (\`validate_block\` for EDS, \`validate_storefront\` for storefront, build/install for AEM Maven projects).`);
        return { content: [{ type: 'text', text: out.join('\n\n') }] };
    });
}
//# sourceMappingURL=component-interview.js.map