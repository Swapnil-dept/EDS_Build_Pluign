import { z } from 'zod';
const ROOT = 'https://github.com/adobe/skills/tree/beta/skills/aem/edge-delivery-services/skills';
const EDS_SKILLS = [
    { id: 'create-site', title: 'Create Site', description: 'Bootstrap a new EDS site from boilerplate / Helix templates.', when: 'New site / project onboarding.', url: `${ROOT}/create-site` },
    { id: 'page-import', title: 'Page Import (orchestrator)', description: 'Top-level 5-step orchestrator: scrape → identify-structure → authoring-analysis → generate-html → preview.', when: 'Migrate one URL to EDS.', url: `${ROOT}/page-import` },
    { id: 'scrape-webpage', title: 'Scrape Webpage', description: 'Playwright + Sharp script. Captures screenshot, downloads images (converts WebP/AVIF/SVG → PNG), extracts metadata + cleaned HTML to ./import-work/.', when: 'page-import Step 1.', url: `${ROOT}/scrape-webpage` },
    { id: 'identify-page-structure', title: 'Identify Page Structure', description: 'Two-level hierarchy: section boundaries (Step 2a), then content sequences per section (Step 2b). Invokes block-inventory.', when: 'page-import Step 2.', url: `${ROOT}/identify-page-structure` },
    { id: 'page-decomposition', title: 'Page Decomposition', description: 'Per-section: produce neutral content-sequence descriptions (no block names yet).', when: 'Invoked by identify-page-structure.', url: `${ROOT}/page-decomposition` },
    { id: 'block-inventory', title: 'Block Inventory', description: 'Survey local blocks + Block Collection / Block Party with purposes and live example URLs.', when: 'Invoked by identify-page-structure (Step 2.5).', url: `${ROOT}/block-inventory` },
    { id: 'authoring-analysis', title: 'Authoring Analysis', description: 'Decide per sequence: default content vs specific block (David\'s Model). Step 3e validates section-metadata for single-block sections.', when: 'page-import Step 3.', url: `${ROOT}/authoring-analysis` },
    { id: 'block-collection-and-party', title: 'Block Collection & Party', description: 'Validate that a chosen block exists; fetch live example URL + content model.', when: 'Invoked by authoring-analysis when block selection is unclear.', url: `${ROOT}/block-collection-and-party` },
    { id: 'content-modeling', title: 'Content Modeling', description: 'Design the authoring table (rows/cols, semantic formatting, ≤4 cells/row). Validates ambiguous block selections.', when: 'CDD Step 3 / unclear block selection.', url: `${ROOT}/content-modeling` },
    { id: 'generate-import-html', title: 'Generate Import HTML', description: 'Produce the final <page>.plain.html using DIV structure (no tables, no field comments). Applies section-metadata + Metadata block. Copies images/ folder.', when: 'page-import Step 4.', url: `${ROOT}/generate-import-html` },
    { id: 'preview-import', title: 'Preview Import', description: 'Run `aem up --html-folder <dir>`, open documentPath, visually diff against screenshot.png.', when: 'page-import Step 5.', url: `${ROOT}/preview-import` },
    { id: 'analyze-and-plan', title: 'Analyze & Plan', description: 'Turn requirements + designs into acceptance criteria (functional, edge cases, responsive, author experience, DoD).', when: 'CDD Step 2 — before writing code.', url: `${ROOT}/analyze-and-plan` },
    { id: 'content-driven-development', title: 'Content-Driven Development', description: 'Top-level 8-step orchestrator for ALL code changes (greenfield + refactor).', when: 'Always — entry point for new block work.', url: `${ROOT}/content-driven-development` },
    { id: 'building-blocks', title: 'Building Blocks', description: 'Implement block JS + CSS following EDS patterns. Modify existing block code.', when: 'CDD Step 5.', url: `${ROOT}/building-blocks` },
    { id: 'ue-component-model', title: 'UE Component Model', description: 'Generate component-definitions / models / filters JSON for Universal Editor.', when: 'When a block needs UE authoring.', url: `${ROOT}/ue-component-model` },
    { id: 'testing-blocks', title: 'Testing Blocks', description: 'Browser + responsive verification of a block. (Folder: testing-blocks)', when: 'After implementation.', url: `${ROOT}/testing-blocks` },
    { id: 'code-review', title: 'Code Review', description: 'Self-review against EDS standards before PR.', when: 'End of development.', url: `${ROOT}/code-review` },
    { id: 'find-test-content', title: 'Find Test Content', description: 'Locate existing test pages or create local drafts/tmp content for iteration.', when: 'CDD Step 4.', url: `${ROOT}/find-test-content` },
    { id: 'docs-search', title: 'Docs Search', description: 'Search aem.live / Helix docs for canonical answers.', when: 'Lookup / disambiguation.', url: `${ROOT}/docs-search` },
];
// ─── Canonical block HTML structures (Adobe DIV format) ────────────
// See https://github.com/adobe/aem-block-collection for live examples.
const BLOCK_STRUCTURES = {
    hero: {
        description: 'Single block. One row with one cell containing default content (heading + buttons + optional image). Background is usually block-specific — skip section-metadata in single-block sections (authoring-analysis Step 3e).',
        rows: '1 row × 1 cell',
        example: `<div class="hero">
  <div>
    <div>
      <h1>Headline goes here</h1>
      <p>Supporting copy.</p>
      <p><a href="/cta">Primary CTA</a> <a href="/secondary">Secondary</a></p>
      <p><picture><img src="./images/hero.jpg" alt="" /></picture></p>
    </div>
  </div>
</div>`,
    },
    cards: {
        description: 'Container block. One row per card. Each card is 1 row × 2 cells (image | content) — or 1 cell if no image. Variants: "cards (no images)", "cards (icons)".',
        rows: 'N rows × 2 cells (image | content)',
        example: `<div class="cards">
  <div>
    <div><picture><img src="./images/card1.jpg" alt="" /></picture></div>
    <div>
      <p><strong>Card 1 title</strong></p>
      <p>Card 1 description.</p>
    </div>
  </div>
  <div>
    <div><picture><img src="./images/card2.jpg" alt="" /></picture></div>
    <div>
      <p><strong>Card 2 title</strong></p>
      <p>Card 2 description.</p>
    </div>
  </div>
</div>`,
        notes: 'KEEP section-metadata for cards — they typically inherit section background.',
    },
    columns: {
        description: 'Container block. One row per row. Each row has 2..N cells of free-form default content (no field comments, ever).',
        rows: 'M rows × N cells',
        example: `<div class="columns">
  <div>
    <div>
      <h3>Left column heading</h3>
      <p>Left column copy.</p>
    </div>
    <div>
      <p><picture><img src="./images/right.jpg" alt="" /></picture></p>
    </div>
  </div>
</div>`,
        notes: 'NEVER add field-name comments. Cells contain only default content. Variant naming: column count is auto-derived (`columns-2-cols`, `columns-3-cols`).',
    },
    accordion: {
        description: 'Container block. One row per Q&A item. Each item is 1 row × 2 cells (question | answer). Decoration toggles open/close.',
        rows: 'N rows × 2 cells (question | answer)',
        example: `<div class="accordion">
  <div>
    <div>How do I import a page?</div>
    <div>Run the page-import skill — see SKILL.md.</div>
  </div>
  <div>
    <div>Where do images live?</div>
    <div>In an <code>images/</code> folder next to the .plain.html file.</div>
  </div>
</div>`,
    },
    tabs: {
        description: 'Container block. One row per tab. Each tab is 1 row × 2 cells (tab label | tab content). First tab is active by default.',
        rows: 'N rows × 2 cells (label | content)',
        example: `<div class="tabs">
  <div>
    <div>Overview</div>
    <div><p>Overview content.</p></div>
  </div>
  <div>
    <div>Specs</div>
    <div><p>Specs content.</p></div>
  </div>
</div>`,
        notes: 'KEEP section-metadata for tabs — they typically use section background.',
    },
    carousel: {
        description: 'Container block. One row per slide. Each slide is 1 row × 1 cell (image + caption).',
        rows: 'N rows × 1 cell',
        example: `<div class="carousel">
  <div>
    <div>
      <p><picture><img src="./images/slide1.jpg" alt="" /></picture></p>
      <p>Slide 1 caption.</p>
    </div>
  </div>
  <div>
    <div>
      <p><picture><img src="./images/slide2.jpg" alt="" /></picture></p>
      <p>Slide 2 caption.</p>
    </div>
  </div>
</div>`,
    },
    quote: {
        description: 'Single block. 1 row × 1 cell with quote + attribution.',
        rows: '1 row × 1 cell',
        example: `<div class="quote">
  <div>
    <div>
      <p>"Edge Delivery is the fastest way to ship a website."</p>
      <p>— Jane Doe, CTO</p>
    </div>
  </div>
</div>`,
    },
    fragment: {
        description: 'Single block referencing a reusable fragment by path.',
        rows: '1 row × 1 cell (link to fragment path)',
        example: `<div class="fragment">
  <div>
    <div><a href="/fragments/promo">/fragments/promo</a></div>
  </div>
</div>`,
    },
    metadata: {
        description: 'Special block — page-level metadata. Always last section. Each row is Key | Value.',
        rows: 'N rows × 2 cells (key | value)',
        example: `<div class="metadata">
  <div>
    <div>title</div>
    <div>About Us — Acme</div>
  </div>
  <div>
    <div>description</div>
    <div>Learn more about Acme.</div>
  </div>
  <div>
    <div>image</div>
    <div><img src="./images/og.jpg" alt="" /></div>
  </div>
</div>`,
        notes: 'Skip og:* / twitter:* / viewport / canonical (auto-populated). Skip title/description/image when they match H1 / first paragraph / first content image.',
    },
    'section-metadata': {
        description: 'Per-section styling. Placed as the FIRST child div of a section that needs container styling. Stripped + applied as section CSS classes by the platform.',
        rows: 'N rows × 2 cells (key | value)',
        example: `<div class="section-metadata">
  <div>
    <div>Style</div>
    <div>grey</div>
  </div>
</div>`,
        notes: 'authoring-analysis Step 3e: SKIP this for single-block sections where the background is block-specific (hero with image, full-bleed banners). KEEP for solid-color sections with visible padding around the content.',
    },
};
// ─────────────────────────────────────────────────────────────────────
export function registerEdsPageImport(server) {
    // ─── 1. Skills index ─────────────────────────────────────
    server.tool('eds_page_import_skills_index', `Look up Adobe's official AEM Edge Delivery Services skills catalog (mirrors github.com/adobe/skills/tree/beta/skills/aem/edge-delivery-services/skills). Returns 19 skills: page-import (orchestrator) and its sub-skills (scrape-webpage, identify-page-structure, page-decomposition, block-inventory, authoring-analysis, block-collection-and-party, content-modeling, generate-import-html, preview-import) plus the parallel content-driven-development orchestrator and its sub-skills. Pass a query string to filter, or leave empty for the full index. PRECONDITION: only use after \`detect_project_type\` returns \`eds\` (or before scaffolding a new EDS site).`, {
        query: z.string().optional().describe('Optional skill id or keyword (e.g. "import", "scrape", "metadata"). Empty = all.'),
    }, {
        title: 'EDS Skills Index',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ query }) => {
        const filter = (query ?? '').toLowerCase().trim();
        const matches = filter
            ? EDS_SKILLS.filter((s) => s.id.includes(filter) ||
                s.title.toLowerCase().includes(filter) ||
                s.description.toLowerCase().includes(filter) ||
                s.when.toLowerCase().includes(filter))
            : EDS_SKILLS;
        const lines = [];
        lines.push(`# Adobe EDS Skills (${matches.length}/${EDS_SKILLS.length})\n\nSource: ${ROOT}\nLicense: Apache-2.0\n`);
        for (const s of matches) {
            lines.push(`## \`${s.id}\` — ${s.title}\n\n- ${s.description}\n- **When:** ${s.when}\n- **SKILL.md:** ${s.url}\n`);
        }
        if (!matches.length)
            lines.push('_No skills match._');
        lines.push(`---\n\n**Routing:** for a full URL migration, drive the workflow from the \`migrate-page-to-eds\` prompt — it follows the \`page-import\` orchestrator (5 steps). For a single block, use \`design-to-block\` / \`url-to-component\` (CDD orchestrator).`);
        return { content: [{ type: 'text', text: lines.join('\n') }] };
    });
    // ─── 2. Block HTML structure reference ───────────────────
    server.tool('eds_block_html_structure', `Return the canonical Adobe **DIV-structure** HTML for a block (no tables, no field comments). EDS Universal Editor and the modern aem-importer-cli both expect div-blocks: \`<div class="<block>"><div><div>...</div></div></div>\` — outer = block, middle = row, inner = cell. Use BEFORE generating import HTML to see exact row/column shape per block. Pass a block name (hero / cards / columns / accordion / tabs / carousel / quote / fragment / metadata / section-metadata) or omit for the full reference.`, {
        block: z.string().optional().describe('Block name. Omit for the full reference.'),
    }, {
        title: 'EDS Block HTML Structure',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ block }) => {
        const out = [];
        out.push(`# EDS DIV block structure\n\nMandatory rules (apply to every block):\n\n- Output ONLY top-level section divs. NO \`<html>\` / \`<head>\` / \`<body>\` / \`<header>\` / \`<main>\` / \`<footer>\` wrappers — the AEM CLI auto-wraps.\n- Each top-level \`<div>\` is one section.\n- Inside a section: free-form default content (h1..h6, p, ul, ol, picture, a) and/or block divs.\n- A **block** is \`<div class="<name>">\` with one or more **row** divs. Each row contains one or more **cell** divs.\n- **NEVER** emit \`<!-- field:* -->\` HTML comments. The DIV structure replaces field hints; UE / Helix infer the model from row × cell shape.\n- Section break = a new top-level \`<div>\`. (NOT \`<hr>\`.)`);
        const target = block ? block.toLowerCase().trim() : null;
        const entries = target
            ? Object.entries(BLOCK_STRUCTURES).filter(([k]) => k === target)
            : Object.entries(BLOCK_STRUCTURES);
        if (target && entries.length === 0) {
            out.push(`\n_Unknown block \`${target}\`._ Available: ${Object.keys(BLOCK_STRUCTURES).join(', ')}.`);
        }
        for (const [name, info] of entries) {
            out.push(`\n## \`${name}\`\n\n- ${info.description}\n- **Shape:** ${info.rows}\n${info.notes ? `- **Notes:** ${info.notes}\n` : ''}\n\`\`\`html\n${info.example}\n\`\`\``);
        }
        return { content: [{ type: 'text', text: out.join('\n') }] };
    });
    // ─── 3. Generate import HTML (Adobe div-structure) ───────
    const SequenceSchema = z.object({
        decision: z.enum(['default-content', 'block']).describe('Per `authoring-analysis`: default-content (just type) or block.'),
        block: z.string().optional().describe('Block name when decision=block (e.g. "hero", "cards", "columns").'),
        content: z.string().optional().describe('For default-content: HTML snippet (h1, p, picture, a). For blocks: omit (use `rows`).'),
        rows: z.array(z.array(z.string())).optional().describe('For block decisions: 2D array — outer = rows, inner = cells. Each cell is an HTML snippet.'),
    });
    const SectionSchema = z.object({
        sectionMetadata: z.record(z.string()).optional().describe('Optional section-metadata key/value pairs (e.g. {Style: "grey"}). Skip for single-block sections where background is block-specific (authoring-analysis Step 3e).'),
        sequences: z.array(SequenceSchema).min(1).describe('Ordered sequences — each is default content OR a block.'),
    });
    server.tool('eds_generate_import_html', `Generate the final \`<page>.plain.html\` for a page-import session, following Adobe's \`generate-import-html\` skill. Emits Adobe **DIV structure** (sections as top-level \`<div>\`s, blocks as \`<div class="<name>">\` with row × cell divs, section-metadata at section start, Metadata block at end). NO field comments. NO \`<html>\` / \`<head>\` / \`<body>\` / \`<header>\` / \`<main>\` / \`<footer>\` wrappers — the AEM CLI auto-wraps. PRECONDITION: must be called AFTER \`authoring-analysis\` produced the section + sequence list. Pair with \`eds_block_html_structure\` to validate per-block row/cell shape before passing data here.`, {
        htmlFilePath: z.string().describe('Output path from scrape-webpage `metadata.json` (e.g. "us/en/about.plain.html"). Images folder will be sibling: us/en/images/.'),
        sections: z.array(SectionSchema).min(1).describe('Sections in document order. Each contains optional section-metadata + ordered sequences.'),
        metadata: z.record(z.string()).optional().describe('Page metadata key/values (title, description, image, canonical, tags). Skip og:* / twitter:* / viewport (auto-populated). Omits if all values match defaults.'),
    }, {
        title: 'Generate EDS Import HTML',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ htmlFilePath, sections, metadata }) => {
        const sectionDivs = [];
        for (const section of sections) {
            const inner = [];
            if (section.sectionMetadata && Object.keys(section.sectionMetadata).length) {
                const rows = Object.entries(section.sectionMetadata)
                    .map(([k, v]) => `    <div>\n      <div>${escapeHtml(k)}</div>\n      <div>${escapeHtml(String(v))}</div>\n    </div>`)
                    .join('\n');
                inner.push(`  <div class="section-metadata">\n${rows}\n  </div>`);
            }
            for (const seq of section.sequences) {
                if (seq.decision === 'default-content') {
                    const content = (seq.content ?? '').trim();
                    if (content)
                        inner.push(indent(content, 2));
                }
                else {
                    const block = seq.block?.trim();
                    if (!block) {
                        return { content: [{ type: 'text', text: 'Sequence with decision=block is missing `block` name.' }], isError: true };
                    }
                    const rows = seq.rows ?? [];
                    if (!rows.length) {
                        return { content: [{ type: 'text', text: `Block "${block}" has no rows.` }], isError: true };
                    }
                    const rowsHtml = rows.map((cells) => {
                        const cellsHtml = cells.map((cell) => `      <div>\n${indent(cell.trim(), 8)}\n      </div>`).join('\n');
                        return `    <div>\n${cellsHtml}\n    </div>`;
                    }).join('\n');
                    inner.push(`  <div class="${escapeHtml(block)}">\n${rowsHtml}\n  </div>`);
                }
            }
            sectionDivs.push(`<div>\n${inner.join('\n')}\n</div>`);
        }
        // Metadata block — always last section, unless empty
        if (metadata && Object.keys(metadata).length) {
            const rows = Object.entries(metadata)
                .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
                .map(([k, v]) => {
                const isImage = /^image$/i.test(k) && /^(https?:|\.\/|\/)/.test(String(v));
                const value = isImage
                    ? `<img src="${escapeAttr(String(v))}" alt="" />`
                    : escapeHtml(String(v));
                return `    <div>\n      <div>${escapeHtml(k)}</div>\n      <div>${value}</div>\n    </div>`;
            })
                .join('\n');
            if (rows)
                sectionDivs.push(`<div>\n  <div class="metadata">\n${rows}\n  </div>\n</div>`);
        }
        const finalHtml = sectionDivs.join('\n');
        // Image folder hint
        const dir = htmlFilePath.includes('/') ? htmlFilePath.replace(/\/[^/]+$/, '') : '';
        const imagesPath = dir ? `${dir}/images/` : 'images/';
        const out = [];
        out.push(`# Generate import HTML — \`${htmlFilePath}\`\n\nFollows the \`generate-import-html\` skill (Adobe DIV structure). Sections: ${sections.length}. Metadata: ${metadata ? Object.keys(metadata).length : 0} fields.`);
        out.push(`## File to write\n\n\`${htmlFilePath}\``);
        out.push(`### \`${htmlFilePath}\` (DIV structure — no tables, no field comments, no html/body/header/main/footer)\n\n\`\`\`html\n${finalHtml}\n\`\`\``);
        out.push(`## Images\n\nCopy \`./import-work/images/\` → \`${imagesPath}\` (the directory containing the \`.plain.html\`).\n\n\`\`\`bash\nmkdir -p ${imagesPath}\ncp -r ./import-work/images/* ${imagesPath}\n\`\`\``);
        out.push(`## Validation checklist (mandatory before preview-import)\n\n- [ ] Section count: \`${sections.length}\` top-level \`<div>\` elements (matches identify-page-structure).\n- [ ] No truncation, no \`<!-- … -->\` placeholders, no \`...\`.\n- [ ] No \`<html>\` / \`<head>\` / \`<body>\` / \`<header>\` / \`<main>\` / \`<footer>\` wrappers.\n- [ ] No \`<!-- field:* -->\` comments anywhere.\n- [ ] Images folder exists at \`${imagesPath}\` and at least one file is reachable.\n- [ ] Section-metadata applied per authoring-analysis Step 3e.`);
        out.push(`## Next step\n\nRun the \`preview-import\` skill: \`aem up --html-folder ${dir || '.'}\` and open \`http://localhost:3000/${htmlFilePath.replace(/\.plain\.html$/, '').replace(/\/index$/, '/')}\`. Visually diff against \`./import-work/screenshot.png\`.`);
        return { content: [{ type: 'text', text: out.join('\n\n') }] };
    });
}
// ─── helpers ────────────────────────────────────────────────
function escapeHtml(s) {
    return s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}
function escapeAttr(s) {
    return s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}
function indent(s, n) {
    const pad = ' '.repeat(n);
    return s.split('\n').map((l) => (l ? pad + l : l)).join('\n');
}
//# sourceMappingURL=eds-page-import.js.map