/**
 * Adobe EDS Skills — condensed workflow knowledge.
 *
 * Source: https://github.com/adobe/skills/tree/beta/skills/aem/edge-delivery-services/skills
 * License: Apache-2.0 (Adobe). Condensed for MCP consumption.
 *
 * These are the workflows the IDE LLM should follow when building or
 * modifying EDS blocks. They are surfaced via MCP resources and composed
 * into tool outputs (e.g. generate_block_from_design).
 */

export const ADOBE_SKILLS_INDEX: Array<{ id: string; purpose: string; when: string }> = [
  { id: 'analyze-and-plan',           purpose: 'Turn requirements + designs into acceptance criteria', when: 'CDD Step 2 — before writing code' },
  { id: 'content-modeling',           purpose: 'Design the authoring table (rows/columns, semantic formatting)', when: 'CDD Step 3' },
  { id: 'authoring-analysis',         purpose: 'Decide per-sequence: default content vs specific block', when: 'During import / decomposition' },
  { id: 'building-blocks',            purpose: 'Implement block JS + CSS following EDS patterns', when: 'CDD Step 5' },
  { id: 'ue-component-model',         purpose: 'Generate component-definitions/models/filters JSON for Universal Editor', when: 'When a block needs UE authoring' },
  { id: 'testing-blocks',             purpose: 'Browser + responsive testing of a block', when: 'After implementation' },
  { id: 'code-review',                purpose: 'Self-review against EDS standards before PR', when: 'End of development' },
  { id: 'content-driven-development', purpose: 'Top-level 8-step orchestrator for ALL code changes', when: 'Always — entry point' },
  { id: 'block-collection-and-party', purpose: 'Look up existing block implementations (Adobe + community)', when: 'Before building a new block' },
  { id: 'identify-page-structure',    purpose: 'Break a screenshot/page into sections + sequences', when: 'Page import' },
  { id: 'page-decomposition',         purpose: 'Map page structure to blocks', when: 'Page import' },
  { id: 'generate-import-html',       purpose: 'Produce EDS-table HTML from analysis', when: 'Page import' },
];

// ─── Content-Driven Development (orchestrator) ─────────────────

export const CDD_WORKFLOW = `
# Content-Driven Development (CDD) — 8-step workflow

**Rule:** Never start writing code without first identifying or creating the
content you will use to test your changes.

1. **Start dev server** — \`aem up --no-open --forward-browser-logs\` (verify http://localhost:3000 → 200)
2. **Analyze & plan** — apply the \`analyze-and-plan\` skill; produce acceptance criteria (functional, edge cases, responsive, author experience, DoD)
3. **Design content model** — apply the \`content-modeling\` skill; define the authoring table structure (rows/columns, semantic formatting, ≤4 cells/row)
4. **Identify/create test content** — reuse existing page, create in CMS, or use a local \`drafts/tmp/<block>.plain.html\`
5. **Implement** — apply the \`building-blocks\` skill; create \`blocks/<name>/<name>.{js,css}\` and iterate in the browser
6. **Lint & test** — \`npm run lint\` and \`npm test\`
7. **Final validation** — walk through every acceptance criterion across mobile/tablet/desktop; check no regressions
8. **Ship it** — conventional-commit message, push branch, open PR with preview URL in description

**Draft PR** when only local test content exists for new functionality. Otherwise open a regular PR.
`.trim();

// ─── Analyze & Plan ─────────────────────────────────────────────

export const ANALYZE_AND_PLAN_TEMPLATE = `
# Acceptance Criteria Template

## Acceptance Criteria: <Block/Component Name> — <Task Type>

### Functional Requirements
- [ ] <specific observable behavior or output>

### Edge Cases
- [ ] Empty content field
- [ ] Maximum content length / overflow
- [ ] Missing optional fields

### Responsive Behavior
- [ ] Mobile (< 600px): <layout/behavior>
- [ ] Tablet (600–899px): <layout/behavior>
- [ ] Desktop (≥ 900px): <layout/behavior>

### Author Experience
- [ ] Authors provide: <list fields>
- [ ] Required: <list> — Optional: <list>
- [ ] Constraints/defaults: <notes>

### Definition of Done
- [ ] All functional requirements pass
- [ ] No visual regressions on any viewport
- [ ] Edge cases handled gracefully
- [ ] Lighthouse stays green on mobile + desktop
`.trim();

// ─── Content Modeling ──────────────────────────────────────────

export const CONTENT_MODEL_RULES = `
# Content Modeling Rules

Two authoring surfaces to support:

## 1. Document authoring (Google Docs / Word tables)
- First row of the block table = block name + optional \`(variant)\`
- Each subsequent row = one content item (or one key/value pair for config blocks)
- Keep rows to \u22644 cells \u2014 split into multiple rows instead of wide ones
- Use semantic formatting in the document (headings, lists, links) \u2014 EDS preserves it
- Images live in their own cell; EDS wraps them in \`<picture>\`

## 2. Universal Editor authoring (aem-boilerplate-xwalk)
- Expose authorable inputs as typed fields in \`component-models.json\`
- Use **shared prefixes** to collapse related fields (\`image\`+\`imageAlt\`,
  \`link\`+\`linkText\`, \`title\`+\`titleType\`)
- Expose CSS variants as a \`multiselect\` field named \`classes\` (options
  grouped under a label). Values are applied as classes on the block root.
- For **repeating children** (cards, tabs, slides, accordion items) use a
  **container block with item children**: block template declares
  \`\"filter\": \"<id>\"\`, items use resourceType \`.../block/v1/block/item\`,
  and \`component-filters.json\` restricts the container's allowed children.
- Prefer author-friendly models: can a non-developer fill this in without\n  copy-pasting syntax?

**Anti-patterns:** JSON blobs in cells, ordering-dependent free text, hidden
config strings, one JS file per variant, nested blocks.
`.trim();

// ─── Authoring Analysis decision tree ──────────────────────────

export const AUTHORING_DECISION_TREE = `
# Authoring Decision Tree (per content sequence)

**Step 3a — Default content check (MANDATORY FIRST):**
> "Can an author create this with normal typing in Word/Google Docs?"
- YES → Mark as DEFAULT CONTENT, done. (Headings, paragraphs, lists, inline images, simple quotes, buttons.)
- NO → Proceed to Step 3b.

**Step 3b — Block selection:**
- Repeating structured patterns (card grids) → \`cards\`
- Expandable Q&A → \`accordion\`
- Switchable panels → \`tabs\`
- Side-by-side content → \`columns\`
- Rotating media → \`carousel\`
- Ambiguous → invoke content-modeling / block-collection search

**Step 3e — Section styling (single-block sections only):**
- Background is an image/gradient OR content is edge-to-edge → SKIP section-metadata
- Solid color with visible padding → KEEP section-metadata
`.trim();

// ─── Building Blocks — implementation patterns ────────────────

export const BUILDING_BLOCKS_PATTERNS = `
# Building Blocks — core patterns

## JavaScript decorate(block)
\`\`\`javascript
export default async function decorate(block) {
  // Re-use platform-delivered DOM — never recreate <picture>/<img>
  const picture = block.querySelector('picture');
  const heading = block.querySelector('h2');

  const figure = document.createElement('figure');
  figure.append(picture); // moves the node, preserves lazy-loading

  const wrapper = document.createElement('div');
  wrapper.className = 'content-wrapper';
  wrapper.append(heading, figure);

  block.replaceChildren(wrapper);
}
\`\`\`

**Rules:**
- Scope all queries to \`block.*\` — never \`document.querySelector\`
- Don't fight the platform: keep \`<picture>\`, keep \`<a>\`, reuse nodes
- Use \`loadScript\` / \`IntersectionObserver\` for heavy third-party libs — never put them in \`head.html\`
- No build step, no bundler, no CSS-in-JS

## CSS (mobile-first, block-scoped)
\`\`\`css
main .my-block { /* mobile default */ }
main .my-block .item { display: flex; gap: 1rem; }

@media (width >= 600px) { main .my-block { padding: 2rem; } }
@media (width >= 900px) { main .my-block { flex-direction: row; } }

main .my-block.dark { background: var(--dark-color); color: var(--clr-white); }
\`\`\`

**Rules:**
- Every selector starts with \`main .<block-name>\` (or \`.<block-name>\`)
- Use CSS custom properties (\`var(--link-color)\`, \`var(--heading-font-family)\`) for consistency
- Standard breakpoints: 600px, 900px, 1200px — all \`min-width\`
- No \`!important\` without justification
- No preprocessors, no Tailwind, no CSS-in-JS
`.trim();

// ─── Universal Editor component model ──────────────────────────

export const UE_COMPONENT_MODEL_RULES = `
# Universal Editor Component Model

Reference: \`adobe-rnd/aem-boilerplate-xwalk\` and the in-repo
\`blocks/tabs-card\` and \`blocks/carousel\` samples.

## Per-block combined config: \`blocks/<name>/_<name>.json\`

Each block ships **one JSON file** at \`blocks/<name>/_<name>.json\`
containing all three keys (definitions + models + filters). At build/deploy
time these are aggregated into the project-root
\`component-definitions.json\` / \`component-models.json\` / \`component-filters.json\`.

\`\`\`jsonc
// blocks/carousel/_carousel.json
{
  "definitions": [
    {
      "title": "Carousel",
      "id": "carousel",
      "plugins": { "xwalk": { "page": {
        "resourceType": "core/franklin/components/block/v1/block",
        "template": { "name": "carousel", "model": "carousel", "filter": "carousel-slides" }
      }}}
    },
    {
      "title": "Carousel Slide",
      "id": "carousel-slide",
      "plugins": { "xwalk": { "page": {
        "resourceType": "core/franklin/components/block/v1/block/item",
        "template": { "name": "carousel-slide", "model": "carousel-slide" }
      }}}
    }
  ],
  "models": [
    { "id": "carousel",       "fields": [ /* block-level \`classes\` variants */ ] },
    { "id": "carousel-slide", "fields": [ /* image, title, text, link, linkText */ ] }
  ],
  "filters": [
    { "id": "carousel-slides", "components": ["carousel-slide"] }
  ]
}
\`\`\`

## Root-level aggregates (shape authors consume)

**component-definitions.json** \u2014 \`groups[]\` with components:
\`\`\`json
{
  "groups": [
    { "title": "Blocks", "id": "blocks", "components": [ /* all block definitions */ ] }
  ]
}
\`\`\`

**component-models.json** \u2014 flat array of \`{ id, fields }\`:
\`\`\`json
[ { "id": "hero", "fields": [ /* \u2026 */ ] } ]
\`\`\`

**component-filters.json** \u2014 flat array of \`{ id, components }\`. The
\`id\` must equal the filter name referenced by the block template
(not \`<block>-filter\`):
\`\`\`json
[
  { "id": "section", "components": ["text","image","hero","cards"] },
  { "id": "cards",   "components": ["card"] }
]
\`\`\`

## Three resource types

| Kind | resourceType |
|------|---|
| Block (container or leaf) | \`core/franklin/components/block/v1/block\` |
| Item nested inside a block | \`core/franklin/components/block/v1/block/item\` |
| Default content (text / title / image / button) | \`core/franklin/components/<name>/v1/<name>\` |

## Container blocks (block \u2192 item pattern)

When a block has repeating children (cards, tabs, accordion, carousel,
tabs-card), model it as a **container block with item children**:

1. Block template includes \`"template": { "name": "Cards", "filter": "cards" }\`
2. Item definition uses \`resourceType: core/franklin/components/block/v1/block/item\`
   and \`"template": { "name": "Card", "model": "card" }\`
3. Add a filter entry \`{ "id": "cards", "components": ["card"] }\` so
   only \`card\` items can be added inside the \`cards\` block.

Nested containers (e.g. tabs-card \u2192 tab \u2192 card) declare multiple filter
entries: one for the outer block, one for each level of items.

Do **not** put \`filter\` on an item's template \u2014 only on the container.

## How model fields become the DOM your \`decorate()\` receives

UE serializes each block/item into **rows of cells**. Field names control
the shape:

- \`image\` + \`imageAlt\` \u2192 cell with \`<picture><img alt="\u2026"></picture>\`
- \`link\` + \`linkText\` (+ \`linkTitle\` / \`linkType\`) \u2192 cell with \`<a href title class>text</a>\`
- \`title\` + \`titleType\` \u2192 cell with \`<hN>title</hN>\`
- \`classes\` (multiselect) \u2192 classes on the block root (not a cell)
- Every other field \u2192 one cell carrying its content

So the authoring model, the DOM EDS serves, and your \`decorate()\` must
agree on the row/cell shape. Design them together.

## Common field mappings

| Authoring need | component | Notes |
|---|---|---|
| Single-line text | \`text\` | UE canonical name (not \`text-input\`) |
| Multi-line plain text | \`textarea\` | UE canonical name (not \`text-area\`) |
| Rich text | \`richtext\` | Headings / lists / inline links |
| Image | \`reference\` (name: \`image\`) | Pair with \`imageAlt\` \u2192 \`<picture><img alt>\` |
| Link / URL | \`aem-content\` (name: \`link\`) | Pair with \`linkText\`/\`linkTitle\`/\`linkType\` |
| Heading level | \`select\` h1\u2013h6 | Pair with \`title\` \u2192 \`<hN>title</hN>\` |
| CSS variants | \`multiselect\` (name: **\`classes\`**) | Values applied as classes on block root |
| Boolean | \`boolean\` (valueType \`boolean\`) | |
| Number | \`number\` (valueType \`number\`) | |

## Semantic collapsing (shared prefixes) \u2014 recap

- \`image\` + \`imageAlt\` \u2192 \`<picture><img alt="\u2026"></picture>\`
- \`link\` + \`linkText\` + \`linkTitle\` + \`linkType\` \u2192 \`<a href title class>text</a>\`
- \`title\` + \`titleType\` \u2192 \`<hN>title</hN>\`

## Variants via \`classes\` (preferred)

Instead of authoring variants as \`Block Name (dark)\` in a table cell,
expose them as a \`multiselect\` field named \`classes\` with grouped
options. UE writes the selected values as classes on the block root so
the same CSS targeting pattern (\`.my-block.dark\`) still applies.
`.trim();

// ─── Code Review self-review checklist ────────────────────────

export const CODE_REVIEW_CHECKLIST = `
# Self-Review Checklist (run before commit)

## JavaScript
- [ ] ESLint (airbnb-base) passes — no global \`eslint-disable\`
- [ ] ES6+ modules, \`.js\` extensions in imports
- [ ] No frameworks in critical path; \`loadScript()\` for third-party libs
- [ ] \`aem.js\` NOT modified
- [ ] Existing DOM reused (no \`document.querySelector\` in blocks)
- [ ] No \`console.log\` left behind
- [ ] No hardcoded config that should be authorable

## CSS
- [ ] Stylelint passes
- [ ] Every selector scoped to block
- [ ] No \`!important\` unless justified
- [ ] Mobile-first; breakpoints 600 / 900 / 1200 (min-width only)
- [ ] No CSS-in-JS, no preprocessors, no CSS frameworks

## HTML / Accessibility
- [ ] Semantic elements + proper heading hierarchy
- [ ] Alt text on images, ARIA on interactive controls
- [ ] No inline styles, no marketing scripts in \`<head>\`

## Performance
- [ ] Lighthouse mobile + desktop green (ideally 100)
- [ ] Pre-LCP payload < 100 KB
- [ ] No layout shifts (CLS)
- [ ] Heavy work deferred (IntersectionObserver / delayed.js)

## Security & content
- [ ] No secrets / API keys committed
- [ ] No unsafe \`innerHTML\` from untrusted content
- [ ] External links have \`rel="noopener noreferrer"\`
- [ ] User-facing strings come from content, not hardcoded
`.trim();

// ─── Testing-blocks responsive matrix ─────────────────────────

export const TESTING_MATRIX = `
# Testing matrix

| Viewport | Width | Verify |
|---|---|---|
| Mobile  | 375px  | Stacked layout, no overflow, tap targets ≥44px |
| Tablet  | 768px  | Transitions start, no awkward gaps |
| Desktop | 1200px | Final layout, max-width container, typography scales |

Capture screenshots at each viewport; attach to the PR description.
For visual changes, include before/after.
`.trim();
