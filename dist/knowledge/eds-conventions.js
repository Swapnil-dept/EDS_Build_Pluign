/**
 * EDS Conventions Knowledge Base
 *
 * Encodes all AEM Edge Delivery Services rules, constraints,
 * and best practices. Tools reference this to generate correct
 * code and validate existing blocks.
 */
// ─── Project Structure ──────────────────────────────────────────
export const PROJECT_STRUCTURE = `
AEM Edge Delivery Services project structure:

/
├── blocks/                    # Block components
│   └── <block-name>/
│       ├── <block-name>.js    # ESM module with default decorate() export
│       ├── <block-name>.css   # Block-scoped styles
│       └── _<block-name>.json # Universal Editor config — definitions + models + filters combined
├── scripts/
│   ├── aem.js                 # Core EDS framework (DO NOT MODIFY)
│   ├── scripts.js             # Global orchestration: loadEager / loadLazy / loadDelayed
│   └── delayed.js             # Third-party scripts loaded ≥3s after LCP
├── styles/
│   ├── styles.css             # Critical global CSS (loaded pre-LCP)
│   └── lazy-styles.css        # Non-critical global CSS (loaded post-LCP)
├── head.html                  # Injected into <head> server-side by EDS
├── nav.html                   # (optional) navigation fragment
├── footer.html                # (optional) footer fragment
├── fstab.yaml                 # Content source mount configuration
├── paths.json                 # (optional) URL path mappings
├── redirects.xlsx             # (optional) redirect rules spreadsheet
├── headers.xlsx               # (optional) custom HTTP headers
├── component-models.json      # (aggregated) Block field definitions — built from blocks/*/_<block>.json
├── component-definitions.json # (aggregated) Block registration — built from blocks/*/_<block>.json
├── component-filters.json     # (aggregated) Allowed children — built from blocks/*/_<block>.json
├── robots.txt                 # Search engine crawling rules
├── sitemap.xml                # (auto-generated or custom) site map
└── .helix/                    # (optional) Helix configuration
    └── config.xlsx            # CDN/indexing config
`.trim();
// ─── Hard Constraints (Public — from aem.live docs) ────────────
export const HARD_CONSTRAINTS = [
    'No npm dependencies in production code — zero node_modules at runtime',
    'No build tools, bundlers, or transpilers — code runs as-is from GitHub',
    'No frameworks (React, Vue, Angular, etc.) — vanilla ES6+ only',
    'Aggregate payload before LCP must stay under 100KB',
    'Blocks cannot nest inside other blocks',
    'All JavaScript must be vanilla ES6+ ESM modules',
    'CSS must be scoped to the block class — no bare element selectors',
    'Block JS must export default function decorate(block) {}',
    'No document.querySelector() in blocks — use block.querySelector()',
    'No inline styles in generated HTML — use CSS classes',
    'Images must use <picture> with WebP and fallback — never bare <img>',
    'All links must be accessible — no empty href or javascript: links',
    'Block folders must be lowercase, hyphenated: my-block/ not MyBlock/',
];
// ─── Extended Constraints (Premium — production-learned) ────────
// These rules are learned from production EDS deployments and go
// beyond what Adobe publishes in public documentation.
export const EXTENDED_CONSTRAINTS = [
    'Lighthouse score must remain 100 — GitHub bot auto-fails PRs otherwise',
    'No localStorage/sessionStorage in blocks — server-rendered content only',
    'Each block must have exactly ONE JavaScript file — all variations handled inside via block.classList.contains()',
    'Always use block.querySelector() inside decorate() — document.querySelector() breaks when multiple instances of the same block exist on one page',
    'Never use .{blockname}-container or .{blockname}-wrapper in your own CSS — EDS auto-generates these on the parent section and block wrapper respectively',
];
// ─── Block HTML Contract (Premium — production-learned) ────────
// These rules go beyond public Adobe docs. The multi-instance bug
// explanation, reserved class diagnosis, and test.html contract
// are learned from production EDS deployments.
export const BLOCK_HTML_CONTRACT = `
## Block HTML Contract Rules

### DOM Structure Contract
The EDS block DOM follows a strict hierarchy:
\`\`\`
block element (div.block-name)
  └─ row(s) as direct children (div)
       └─ cell(s) as children of rows (div)
\`\`\`
A common mistake is adding extra wrapper divs. The decorate function must work with exactly this structure.

### Single JavaScript File Rule
Each block must have exactly **ONE** JavaScript file: \`blocks/<name>/<name>.js\`.
All variation logic goes inside the single file using class checks:
\`\`\`javascript
export default function decorate(block) {
  const isWide = block.classList.contains('wide');
  const isDark = block.classList.contains('dark');
  // All variant-specific logic here
}
\`\`\`
Never create separate JS files per variant (e.g. \`hero-dark.js\`, \`hero-wide.js\`).

### Multi-Instance Safety
\`block.querySelector()\` is scoped to the block element. Using \`document.querySelector('.block-name')\` will always return the **first** instance on the page, silently breaking all subsequent instances. This is one of the most common production bugs in EDS.

### Reserved Class Names
EDS auto-generates wrapper elements with these class names — **never** use them in your own CSS:
- \`.{blockname}-container\` — auto-generated on the parent **section** div
- \`.{blockname}-wrapper\` — auto-generated on the block's **wrapper** div

Using these accidentally applies your styles to the wrong elements, causing subtle layout bugs that are difficult to diagnose.

### test.html Contract
When testing blocks locally with test.html:
1. \`block.dataset.blockName\` must be set before calling \`loadBlock()\`
2. \`document.body.classList.add('appear')\` must be called before \`loadBlock()\` — otherwise the page stays hidden
3. The block DOM must exactly match the structure EDS generates (row > cell hierarchy)
`;
// ─── Block DOM Pipeline ─────────────────────────────────────────
export const BLOCK_DOM_PIPELINE = `
## Content-to-DOM Pipeline (how authored data becomes HTML)

There are **two authoring surfaces** that feed the same runtime DOM shape:

### A. Document authoring (Google Docs / SharePoint Word)
Authors create blocks as **tables**:

| Block Name (variant) |      |
|----------------------|------|
| Cell 1               | Cell 2 |
| Cell 3               | Cell 4 |

On publish, Helix converts the doc → semantic HTML and saves it at
\`<path>.plain.html\`. The table becomes:

\`\`\`html
<div class="block-name variant">
  <div><!-- row -->
    <div><!-- cell --><p>Cell 1</p></div>
    <div><!-- cell --><p>Cell 2</p></div>
  </div>
  <div><!-- row -->
    <div><!-- cell --><p>Cell 3</p></div>
    <div><!-- cell --><p>Cell 4</p></div>
  </div>
</div>
\`\`\`

### B. Universal Editor authoring (structured fields)
Authors fill in the typed fields defined in \`_<block>.json\` (models).
UE serializes each component instance (or item inside a container block)
into the **same row/cell shape** the loader expects \u2014 this is why field
names matter:

- \`image\` + \`imageAlt\` \u2192 a cell containing \`<picture><img alt="\u2026"></picture>\`
- \`link\` + \`linkText\` \u2192 a cell containing \`<a href="\u2026">linkText</a>\`
- \`title\` + \`titleType\` \u2192 a cell containing \`<hN>title</hN>\`
- \`classes\` (multiselect) \u2192 classes added to the block root div
- Every other field \u2192 a cell with that field's content (text / richtext / number)

A container block (e.g. carousel, tabs-card, cards) renders each **item**
as one top-level row inside the block, and items may themselves contain
nested item rows (tabs \u2192 cards).

### Runtime loading sequence (aem.js)
1. Browser requests the page \u2192 Helix returns server-rendered HTML (the divs above).
2. \`scripts.js\` scans \`main\` for \`section-metadata\`, decorates sections, finds blocks.
3. For each block, aem.js loads \`blocks/<name>/<name>.js\` + \`<name>.css\` (lazily).
4. aem.js calls \`export default decorate(block)\` with the block's root div.
5. Your \`decorate()\` reads the row/cell structure and transforms it into the
   final semantic DOM (cards, tabs, carousel, etc.).
6. aem.js removes the \`display:none\` on the block \u2192 user sees the result.

### Variant handling
- Doc: \`Block Name (dark, wide)\` \u2192 \`class="block-name dark wide"\`
- UE:  \`classes\` multiselect [Dark, Wide] \u2192 same output
- Multi-word variants are hyphenated: "super wide" \u2192 "super-wide"
- EDS wraps each block: \`<div class="block-name-wrapper">\` \u2014 don't style it

### What \`decorate(block)\` must do
1. Read content from the row/cell structure EDS gives you
2. Build semantic HTML (lists, articles, nav, etc.) \u2014 **reuse** existing \`<picture>\` / \`<a>\` nodes
3. Add ARIA attributes for accessibility
4. Attach event handlers if interactive
5. Replace original block content with the transformed DOM

**Golden rule:** the shape of \`_<block>.json\` models directly determines the
row/cell shape your \`decorate()\` receives. Design them together.
`;
// ─── CSS Scoping Rules ──────────────────────────────────────────
export const CSS_SCOPING_RULES = `
## CSS Scoping Rules

ALL block CSS must be prefixed with the block class name.

### Allowed:
\`\`\`css
.hero { display: flex; }
.hero h2 { font-size: 2rem; }
.hero .hero-content { padding: 1rem; }
.hero-wrapper { max-width: 1200px; }
\`\`\`

### Forbidden:
\`\`\`css
h2 { font-size: 2rem; }        /* bare element — leaks globally */
.content { padding: 1rem; }     /* too generic — conflicts */
#hero { display: flex; }         /* no IDs in block CSS */
\`\`\`

### Reserved class names (auto-generated by EDS — never use):
- \`.{blockname}-container\`  ← auto-generated section wrapper
- \`.{blockname}-wrapper\`    ← auto-generated block wrapper

### Best practices:
- Mobile-first: base styles for mobile, \`@media (min-width: 900px)\` for desktop
- Use CSS custom properties from styles/styles.css for brand consistency
- Keep specificity low — avoid deep nesting beyond 3 levels
- Use \`font: inherit\` on buttons and inputs
`;
// ─── CSS Safe Suffixes (Premium — curated from production) ──────
// These are production-tested class name suffixes that won't
// collide with EDS auto-generated classes.
export const CSS_SAFE_SUFFIXES = [
    '-backdrop', '-panel', '-inner', '-grid', '-list', '-content', '-dialog',
    '-header', '-body', '-footer', '-item', '-media', '-text', '-overlay',
];
// ─── Loading Lifecycle ──────────────────────────────────────────
export const LOADING_LIFECYCLE = `
## EDS Loading Lifecycle

### Phase 1: Eager (blocks above the fold)
- styles/styles.css loaded
- scripts/scripts.js: loadEager() runs
- First section's blocks loaded (JS + CSS in parallel)
- LCP image gets loading="eager", fetchpriority="high"

### Phase 2: Lazy (remaining content)
- scripts/scripts.js: loadLazy() runs
- All remaining section blocks loaded
- styles/lazy-styles.css loaded
- Header and footer fragments loaded

### Phase 3: Delayed (3+ seconds after LCP)
- scripts/delayed.js loaded
- Analytics, chat widgets, social embeds
- Non-critical third-party scripts

### Performance rules:
- Total pre-LCP payload < 100KB
- No render-blocking resources
- Images below fold: loading="lazy"
- LCP image: loading="eager", fetchpriority="high"
- Fonts: loaded via CSS @font-face with font-display: swap
- No external CSS imports in blocks — inline all block styles
`;
// ─── Component Model Field Types ────────────────────────────────
// Canonical component names match aem-boilerplate-xwalk / Universal Editor.
// Legacy aliases (text-input, text-area) are still accepted for backward compat.
export const FIELD_TYPES = [
    { component: 'text', valueType: 'string', description: 'Single-line text field (UE canonical)' },
    { component: 'textarea', valueType: 'string', description: 'Multi-line text area (UE canonical)' },
    { component: 'richtext', valueType: 'string', description: 'Rich text editor (HTML output)' },
    { component: 'reference', valueType: 'string', description: 'Asset reference (images, videos) — pair with <name>Alt' },
    { component: 'aem-content', valueType: 'string', description: 'Link / content fragment reference — pair with linkText/linkTitle/linkType' },
    { component: 'select', valueType: 'string', description: 'Dropdown select (single value)' },
    { component: 'multiselect', valueType: 'string[]', description: 'Multi-select dropdown — use name:"classes" to apply CSS variant classes to the block' },
    { component: 'boolean', valueType: 'boolean', description: 'Toggle switch (true/false)' },
    { component: 'number', valueType: 'number', description: 'Numeric input field' },
    { component: 'date-input', valueType: 'string', description: 'Date picker' },
    { component: 'container', valueType: 'object', description: 'Multi-field container for repeatable groups' },
    { component: 'tab', valueType: 'object', description: 'Tab group for organizing fields in the property panel' },
];
// Legacy → UE canonical mapping. Prefer the canonical name in new code.
export const FIELD_TYPE_ALIASES = {
    'text-input': 'text',
    'text-area': 'textarea',
};
export function normalizeFieldType(t) {
    return FIELD_TYPE_ALIASES[t] ?? t;
}
// ─── Field Collapse Conventions (Premium — tribal knowledge) ────
// Adobe docs mention field collapse briefly but don't provide
// this clean lookup table. Curated from production experience.
export const FIELD_COLLAPSE_RULES = `
## Field Collapse Conventions (Universal Editor)

When related fields share a prefix, UE collapses them into single DOM elements:

| Fields | Collapsed DOM |
|--------|---------------|
| image + imageAlt | \`<picture>…<img src="..." alt="..."></picture>\` |
| link + linkText | \`<a href="link">linkText</a>\` |
| link + linkText + linkTitle | \`<a href="link" title="linkTitle">linkText</a>\` |
| link + linkText + linkType | \`<a href="link" class="linkType">linkText</a>\` |
| title + titleType | \`<hN>title</hN>\` where N comes from titleType (h1–h6) |

This is automatic — no code needed. Just name fields with matching prefixes.

## CSS Variants via \`classes\` (multiselect)

Add a \`multiselect\` field named **\`classes\`** to let authors toggle CSS variants
on the block. Values are applied as classes on the block's root div:

\`\`\`json
{
  "component": "multiselect",
  "name": "classes",
  "label": "Block Variants",
  "options": [
    { "name": "Block Styles", "children": [
      { "name": "Dark", "value": "dark" },
      { "name": "Compact", "value": "compact" }
    ]}
  ]
}
\`\`\`

Selecting "Dark" renders \`<div class="my-block dark">…</div>\` — target in CSS
with \`.my-block.dark { … }\`. This is the canonical pattern used across
aem-boilerplate-xwalk blocks (hero, cards, tabs-card, …).
`;
// ─── Configuration Files (Premium — production templates) ───────
// Curated, production-ready config templates with inline docs.
// The repoless fstab and helix config schemas are premium.
export const CONFIG_TEMPLATES = {
    fstab: `
mountpoints:
  /: https://drive.google.com/drive/folders/<folder-id>
`.trim(),
    fstabSharePoint: `
mountpoints:
  /: https://<tenant>.sharepoint.com/sites/<site>/Shared Documents/<folder>
`.trim(),
    fstabRepoless: `
mountpoints:
  /: https://drive.google.com/drive/folders/<folder-id>

# Repoless configuration — this site uses code from another repo
# No blocks/ or scripts/ folder needed in this repo
folders:
  /: https://github.com/<owner>/<code-repo>/tree/main
`.trim(),
    headHtml: `
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="/scripts/aem.js" type="module"></script>
<script src="/scripts/scripts.js" type="module"></script>
<link rel="stylesheet" href="/styles/styles.css">
<link rel="icon" href="data:,">
`.trim(),
    robotsTxt: `
User-agent: *
Allow: /

Sitemap: https://<your-domain>/sitemap.xml
`.trim(),
    redirectsFormat: `
# redirects.xlsx format — create in Google Sheets or Excel:
# Column A: Source (path or pattern)
# Column B: Destination (path or full URL)
# Column C: (optional) Status code (301 or 302, default 301)
#
# Example rows:
# /old-page           /new-page            301
# /blog/2024/*        /archive/2024/:path  301
# /promo              https://external.com 302
`.trim(),
    headersFormat: `
# headers.xlsx format — create in Google Sheets or Excel:
# Column A: URL pattern (glob)
# Column B: Header name
# Column C: Header value
#
# Example rows:
# /api/**          Access-Control-Allow-Origin    *
# /**              X-Frame-Options                SAMEORIGIN
# /assets/**       Cache-Control                  public, max-age=31536000
`.trim(),
    helixConfig: `
# .helix/config.xlsx — CDN and indexing configuration
# Sheet: "cdn" — CDN rules
# Sheet: "index" — search indexing properties
#
# cdn sheet columns:
# URL pattern | Header | Value
# /**         | X-Robots-Tag | noindex (for staging)
#
# index sheet columns:
# Property | Source | Type
# title    | h1     | string
# image    | img    | link
# date     | meta:published-time | date
`.trim(),
};
// ─── Decorate Function Template (Premium — 6-step methodology) ──
// This structured 6-step pattern is a production-learned
// architectural recipe. Adobe docs show simple examples;
// this is a codified methodology.
export const DECORATE_TEMPLATE = `
/**
 * Decorate function template — follows the 6-step EDS pattern:
 *
 * 1. Configuration — constants, CSS classes, defaults
 * 2. Content extraction — pull data from the authored DOM
 * 3. DOM creation — build semantic HTML
 * 4. Component building — compose complex sub-components
 * 5. Event handlers — interactivity (if needed)
 * 6. Content replacement — swap block innerHTML
 */

export default function decorate(block) {
  // 1. Configuration
  const CLASSES = {
    item: 'blockname-item',
    media: 'blockname-media',
    content: 'blockname-content',
  };

  // 2. Content extraction
  const rows = [...block.children];
  const items = rows.map((row) => {
    const cells = [...row.children];
    return {
      media: cells[0],    // first column
      content: cells[1],  // second column (if exists)
    };
  });

  // 3. DOM creation
  const list = document.createElement('ul');
  list.className = CLASSES.item + '-list';

  // 4. Component building
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = CLASSES.item;

    if (item.media) {
      const mediaDiv = document.createElement('div');
      mediaDiv.className = CLASSES.media;
      mediaDiv.append(...item.media.childNodes);
      li.append(mediaDiv);
    }

    if (item.content) {
      const contentDiv = document.createElement('div');
      contentDiv.className = CLASSES.content;
      contentDiv.append(...item.content.childNodes);
      li.append(contentDiv);
    }

    list.append(li);
  });

  // 5. Event handlers (example: click handler)
  // list.addEventListener('click', (e) => { ... });

  // 6. Content replacement
  block.textContent = '';
  block.append(list);
}
`;
// ─── Common Block Patterns (Premium — codified consulting) ────
// 6 curated block patterns with exact field definitions,
// cssHint, and jsHint. The hints encode production-learned
// strategies that go beyond public documentation.
export const BLOCK_PATTERNS = {
    hero: {
        description: 'Full-width banner with image background, heading, text, and CTA button',
        fields: [
            { name: 'image', type: 'reference', label: 'Background Image' },
            { name: 'imageAlt', type: 'text', label: 'Image Alt Text' },
            { name: 'heading', type: 'text', label: 'Heading' },
            { name: 'text', type: 'richtext', label: 'Body Text' },
            { name: 'link', type: 'aem-content', label: 'CTA URL' },
            { name: 'linkText', type: 'text', label: 'CTA Label' },
        ],
        cssHint: 'Use min-height: 400px, background-size: cover, overlay for text readability',
        jsHint: 'Extract picture from first cell, move to background, wrap text content in .hero-content',
    },
    cards: {
        description: 'Grid of cards (UE container block with nested "card" items)',
        fields: [],
        cssHint: 'CSS Grid with auto-fill: minmax(300px, 1fr), gap: 1rem',
        jsHint: 'Iterate block.children as cards, extract picture + content per card, convert to <ul><li>',
        items: [
            {
                id: 'card',
                title: 'Card',
                fields: [
                    { name: 'image', type: 'reference', label: 'Card Image' },
                    { name: 'imageAlt', type: 'text', label: 'Image Alt Text' },
                    { name: 'title', type: 'text', label: 'Card Title' },
                    { name: 'description', type: 'richtext', label: 'Card Description' },
                    { name: 'link', type: 'aem-content', label: 'Card Link' },
                    { name: 'linkText', type: 'text', label: 'Card Link Text' },
                ],
            },
        ],
    },
    columns: {
        description: 'Multi-column layout (2-4 columns) for side-by-side content',
        fields: [
            { name: 'content', type: 'richtext', label: 'Column Content' },
        ],
        cssHint: 'Flexbox row, equal width children, stack on mobile',
        jsHint: 'Add columns-{n}-cols class based on cell count in first row',
    },
    accordion: {
        description: 'Expandable/collapsible content sections (UE container block with nested "accordion-item")',
        fields: [],
        cssHint: 'Use details/summary for native a11y, or custom with aria-expanded',
        jsHint: 'Iterate block.children and render each as <details><summary>heading</summary>content</details>',
        items: [
            {
                id: 'accordion-item',
                title: 'Accordion Item',
                fields: [
                    { name: 'heading', type: 'text', label: 'Section Title' },
                    { name: 'content', type: 'richtext', label: 'Section Content' },
                ],
            },
        ],
    },
    tabs: {
        description: 'Tabbed interface (UE container block with nested "tab" items)',
        fields: [],
        cssHint: 'Flex row for tab bar, hidden panels with .active toggle',
        jsHint: 'Build tab buttons from each item\u2019s title, panels from its content, manage aria-selected',
        items: [
            {
                id: 'tab',
                title: 'Tab',
                fields: [
                    { name: 'title', type: 'text', label: 'Tab Title' },
                    { name: 'content', type: 'richtext', label: 'Tab Content' },
                ],
            },
        ],
    },
    carousel: {
        description: 'Horizontal scrolling gallery (UE container block with nested "slide" items)',
        fields: [],
        cssHint: 'Scroll-snap with overflow-x: auto, hide scrollbar, prev/next buttons',
        jsHint: 'Wrap slides in scroll container, create nav buttons, use scrollTo with behavior: smooth',
        items: [
            {
                id: 'slide',
                title: 'Slide',
                fields: [
                    { name: 'image', type: 'reference', label: 'Slide Image' },
                    { name: 'imageAlt', type: 'text', label: 'Image Alt Text' },
                    { name: 'caption', type: 'text', label: 'Slide Caption' },
                ],
            },
        ],
    },
};
// ─── Repoless Architecture (Premium — operational knowledge) ──
// Step-by-step repoless setup with customization override
// rules (block folder precedence, site-specific CSS overlay).
export const REPOLESS_GUIDE = `
## Repoless Site Architecture

A "repoless" EDS site separates content from code:

### How it works:
1. **Code repo** — Contains blocks/, scripts/, styles/ (shared across sites)
2. **Content repo(s)** — Contains only fstab.yaml pointing to Google Drive/SharePoint
   plus a \`folders:\` mapping to the code repo

### fstab.yaml for repoless content site:
\`\`\`yaml
mountpoints:
  /: https://drive.google.com/drive/folders/<content-folder-id>
folders:
  /: https://github.com/<owner>/<code-repo>/tree/main
\`\`\`

### Benefits:
- Multiple sites share one codebase
- Content authors don't touch code
- Centralized block library
- Independent content publishing

### Setup steps:
1. Create the code repo from aem-boilerplate
2. Build and test blocks in the code repo
3. For each content site, create a new repo with only fstab.yaml
4. Configure fstab.yaml with content mount + code reference
5. Set up site in aem.live admin
6. Authors work in Google Docs/SharePoint, site pulls code from code repo

### Customization in repoless:
- Site-specific styles: add site-specific CSS in content repo's styles/ folder
- Site-specific head.html: override in content repo
- Block overrides: add a block folder in content repo — it takes precedence
`;
// ─── Sitemap & SEO ──────────────────────────────────────────────
export const SITEMAP_SEO = `
## Sitemap & SEO in EDS

### Auto-generated sitemap:
EDS automatically generates /sitemap.xml from published pages.
No manual configuration needed for basic sites.

### Custom sitemap:
For custom sitemap needs, create a sitemap.xml in your content source:
1. Create a Google Doc or Word document at /sitemap
2. Or provide a static sitemap.xml in the repo root

### SEO metadata:
Metadata is authored in a "Metadata" section at the bottom of each page:
| Metadata |
|---|
| Title | Page Title Here |
| Description | Meta description for SEO |
| Image | /path/to/og-image.jpg |
| Keywords | comma, separated, keywords |

### Bulk metadata:
Create a metadata.xlsx spreadsheet for bulk/default metadata:
| URL | Title | Description | Image |
|-----|-------|-------------|-------|
| /** | Site Name | Default description | /default-og.jpg |
| /blog/** | Blog - Site Name | Blog posts | /blog-og.jpg |

### Structured data:
Add JSON-LD in head.html or via scripts/delayed.js:
\`\`\`html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "...",
  "url": "..."
}
</script>
\`\`\`
`;
// ─── Performance Best Practices (Premium — production thresholds) ─
// EDS-specific performance thresholds (< 10KB per block JS,
// < 15KB CSS) and pattern detection are production-refined.
export const PERFORMANCE_RULES = `
## Performance Rules for Lighthouse 100

### Critical (will fail Lighthouse):
- Total pre-LCP payload must be < 100KB (HTML + CSS + JS + fonts)
- No render-blocking resources in <head>
- LCP image must have loading="eager" and fetchpriority="high"
- All below-fold images: loading="lazy"
- Fonts: use font-display: swap or optional
- No layout shift (CLS): set explicit width/height on images

### Important (affects score):
- Minimize main-thread work in eager-loaded blocks
- Defer all analytics/tracking to delayed.js (3s+ after LCP)
- Use CSS containment on blocks: contain: layout style
- Avoid forced reflows in decorate functions
- No document.write() or synchronous XHR

### Image optimization:
- EDS auto-optimizes images via /.helix/media_* pipeline
- Use <picture> with WebP source + fallback
- Specify width and height attributes to prevent CLS
- Hero images: preload via <link rel="preload"> in head.html

### JavaScript:
- Block JS should be < 10KB per block (uncompressed)
- Use requestAnimationFrame for DOM-heavy transforms
- Prefer CSS transitions over JS animations
- No external library imports in block JS
`;
//# sourceMappingURL=eds-conventions.js.map