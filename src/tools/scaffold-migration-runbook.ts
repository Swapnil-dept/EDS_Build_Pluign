import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * `scaffold_migration_runbook` — emit the disk-state-driven migration runbook
 * (`MIGRATION-RUNBOOK.md`) plus a per-page `STATUS.md` tracker, implementing
 * the gate-driven, resumable "one item at a time, only a gate can mark
 * passed" pattern for large multi-section/multi-block page migrations.
 *
 * Read-only — returns file content for the caller to write. The runbook body
 * is static (the ground rules / stage table / thresholds don't vary by
 * page); STATUS.md is parameterized per page.
 */

const SECTION_SCHEMA = z.object({
  id: z.string().describe('Section id, e.g. "01"'),
  slug: z.string().describe('Section slug, e.g. "breadcrumb"'),
  selector: z.string().optional().describe('CSS selector for this section on the live page'),
  background: z.string().optional().describe('Section background style, e.g. "white", "light-blue"'),
  content: z.string().optional().describe('Short default-content summary, e.g. "h1, p" or "—"'),
  blocks: z.string().optional().describe('Block name(s)/variant(s) in this section, e.g. "hero (plan-promo)"'),
});

const BLOCK_SCHEMA = z.object({
  name: z.string().describe('Block name'),
  variant: z.string().optional().describe('Variant label, e.g. "price"'),
  decision: z.enum(['reuse', 'variant', 'extend', 'new']).describe('Reuse decision per the registry rules'),
  decisionReason: z.string().optional().describe('Required when decision is "extend" or "new" — why 1\u20133 could not work'),
  instances: z.number().int().positive().optional().describe('Instance count on this page (default 1)'),
  sections: z.string().optional().describe('Section id(s) this block appears in, e.g. "07" or "07, 12"'),
});

export function registerScaffoldMigrationRunbook(server: McpServer) {
  server.registerTool(
    'scaffold_migration_runbook',
    {
      description: 'Emit the disk-state-driven EDS page migration runbook (`MIGRATION-RUNBOOK.md` — ground rules, 9-stage pipeline, block registry/reuse rules, section-analysis contract, visual-gate loop, thresholds, gate script list) plus a page-specific `STATUS.md` tracker (sections table, blocks table, design tokens, masks, allowed content omissions, iteration log). Read-only \u2014 returns file content to write; the agent/loop that follows the runbook is driven by rereading STATUS.md each run, never by chat memory. Call once per page with `sections`/`blocks` to seed STATUS.md; call again later with the same `pageSlug` to regenerate a clean STATUS.md shell if needed (it does not merge/preserve prior progress \u2014 preserve by hand-editing the existing STATUS.md instead of regenerating).',
      inputSchema: {
        pageSlug: z.string().describe('kebab-case page identifier, e.g. "term-insurance"'),
        sourceUrl: z.string().describe('Source URL being migrated'),
        templateName: z.string().optional().describe('Template name if known (from scaffold_page_template_catalog), e.g. "life-insurance-plans"'),
        edsPath: z.string().describe('Target EDS path for this page, e.g. "/life-insurance-plans/term-insurance"'),
        sections: z.array(SECTION_SCHEMA).optional().describe('Sections discovered so far \u2014 seeds the Sections table. Omit for an empty shell.'),
        blocks: z.array(BLOCK_SCHEMA).optional().describe('Blocks discovered so far \u2014 seeds the Blocks table. Omit for an empty shell.'),
      },
      annotations: {
        title: 'Scaffold Migration Runbook',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ pageSlug, sourceUrl, templateName, edsPath, sections, blocks }) => {
      try {
        const runbook = `# EDS Page Migration — Agent Runbook

> The agent reads this file first on **every** run, then reads the page's \`STATUS.md\`,
> picks the next unfinished item, works on it, runs its gate, and updates \`STATUS.md\`.
> The agent never declares a page "done" itself — only gates do.

## 0. Ground rules

1. **State lives on disk, not in the chat.** Start every run by reading \`migration-work/<page>/STATUS.md\`. Never rely on conversation memory.
2. **One item at a time.** Pick the first item that is \`pending\` or \`failing\`. Finish it or record why it is blocked, then move on.
3. **Only a gate can mark an item \`passed\`.** The agent may set \`in-progress\`, \`failing\` or \`blocked\`. A status of \`passed\` is written only after the gate command exits 0, and the gate's output (score, diff %) is copied into the log.
4. **Exact output is the target.** "Looks close" is not done. Done means the visual diff and the content diff are both under the thresholds in §6.
5. **Reuse before you build.** Always check the block registry (§3) before creating a block.
6. **Images are URLs only.** Never download image binaries into the repo. Reference the original URLs from \`images.json\`.
7. **Never edit crawler outputs** (\`snapshots/\`, \`sections/*/source.html\`). They are the ground truth.
8. **Log every iteration** in \`STATUS.md\` → Iteration log: what changed, the gate result, and the next action.

## 1. Folder contract

\`\`\`
tools/importer/snapshots/<host>/<path>.html          # full rendered HTML (crawler)
tools/importer/snapshots/<host>/<path>.images.json   # [{src, alt, width, height, sectionId}] — URLs only
migration-work/<page>/
  STATUS.md                     # progress tracker (this runbook drives it)
  page.json                     # url, template, metadata (title, description, og)
  sections/NN-<slug>/
    source.html                 # outerHTML of the section (rendered DOM)
    desktop.png  mobile.png     # section screenshots of the ORIGINAL (1440 / 375)
    styles.json                 # computed styles per element (font, color, spacing, radius, bg)
    analysis.json               # LLM: default content vs blocks, block mapping
  diffs/<block>/<iter>/         # rendered.png, diff.png, report.json
blocks/<block>/
  <block>.js  <block>.css  _<block>.json  README.md  metadata.json
\`\`\`

> Screenshots in \`migration-work/\` are working files for the LLM (gitignore them if needed) — not site assets.

## 2. Stages (in order)

| # | Stage | Who | Output | Gate |
|---|---|---|---|---|
| 1 | Crawl | script | snapshot.html, images.json, page.json | file exists; images.json has ≥1 entry; no overlay/cookie text in the snapshot |
| 2 | Section split | script | sections/NN/* (source.html, png, styles.json) | each selector matches exactly 1 element on the live page; screenshots are not blank |
| 3 | Design tokens | script + LLM | styles/tokens.css | every color/font used ≥3 times in styles.json is mapped to a token |
| 4 | Section analysis | LLM (vision) | sections/NN/analysis.json | JSON schema valid; every visible text node assigned to default content or a block |
| 5 | Block matching | script + LLM | registry decision per block | decision recorded in STATUS.md with a reason |
| 6 | Block build loop | LLM | blocks/<block>/* | §6 thresholds met at 1440 and 375 |
| 7 | Parser / import | LLM + script | tools/importer/parsers/<block>.js, content | text diff ≥ 98% per block (allowed omissions declared) |
| 8 | Page assembly | script | full page in \`aem up\` preview | page-level visual diff + content completeness ≥ 95% |
| 9 | Polish | LLM | fixes | all items passed; no console errors; Lighthouse ≥ 90 |

## 3. Block registry & reuse rules

Each block has \`blocks/<block>/metadata.json\`:

\`\`\`json
{
  "name": "cards",
  "variants": ["price", "icon-grid", "stats"],
  "structure": "rows of [image?, title, text, cta?]",
  "visualTraits": ["grid 3-4 cols", "rounded card", "shadow"],
  "uePath": "_cards.json",
  "usedOn": ["${edsPath}"]
}
\`\`\`

Decision order for every block found in the analysis:

1. **Reuse as-is.** Same structure and the same look. Add the page to \`usedOn\`.
2. **Variant.** Same structure, different look. Add a CSS modifier (e.g. \`.cards.price\`). Never fork the JS for a visual-only difference.
3. **Extend.** Same purpose, but a new optional row or field. Make the change backward compatible and re-run the gates of every page in \`usedOn\`.
4. **New block.** Only when 1–3 can't work. Write the reason in STATUS.md.

## 4. Section analysis prompt contract (stage 4)

Inputs: \`desktop.png\`, \`mobile.png\`, \`source.html\` (trimmed), \`styles.json\` (summary), the registry list.

Output \`analysis.json\`:

\`\`\`json
{
  "sectionId": "07-plan-cards",
  "sectionStyle": "light-blue",
  "sequences": [
    { "type": "default", "elements": ["h2", "p"] },
    { "type": "block", "block": "cards", "variant": "price",
      "decision": "variant", "instanceCount": 1,
      "rows": [["image", "title", "price", "cta"]],
      "reason": "4 equal cards in a grid, price badge" }
  ]
}
\`\`\`

Rule: plain headings and paragraphs stay **default content**. Only repeated or structured patterns become blocks.

## 5. Block build loop (stage 6) — "keep going until exact"

For each block, in the order listed in STATUS.md:

\`\`\`
iter = 0
loop:
  1. Write/patch <block>.js, <block>.css, README.md (authoring contract), _<block>.json (UE model)
  2. Render: test harness page with the block's real content (from the parser, or README sample)
     → screenshot at 1440 and 375, same crop as the original section
  3. Gate: \`npm run gate:visual -- <block>\`  → diff.png + report.json {diffPct, regions[]}
  4. If pass → set passed in STATUS.md, log result, next block
  5. Else → feed the LLM: original.png, rendered.png, diff.png, styles.json (the exact computed values),
     current CSS. Ask for a targeted patch for the largest diff region first.
  6. iter++ ; log iteration (what changed, diffPct before→after)
  7. If iter == 8 or diffPct improved < 0.2% over 3 iters → mark blocked with the reason, move on,
     revisit after other blocks are done (shared tokens often fix it)
\`\`\`

**Why styles.json matters:** a screenshot alone gives approximate CSS. Computed styles give exact
values (font-size 18px, line-height 26px, color #0B3B7C, padding 24px). The LLM should copy values
from styles.json and use the screenshot only for layout and intent.

## 6. Thresholds (definition of done)

| Check | Desktop 1440 | Mobile 375 |
|---|---|---|
| Visual diff (pixelmatch, threshold 0.1, antialias ignored) | ≤ 3% | ≤ 5% |
| Text content match per block | ≥ 98% | — |
| Page content completeness | ≥ 95% | — |
| Console errors | 0 | 0 |
| Lint (eslint + stylelint) | clean | — |

Dynamic regions (carousels, live API values, videos) are masked in the diff. Declare each mask in
STATUS.md → Masks, so nothing is hidden silently.

## 7. Running it continuously

Interactive in VS Code: ask the agent to "continue the migration for \`<page>\`". It reads this file and STATUS.md.

Unattended loop (one fresh session per item, so long runs don't overflow the context):

\`\`\`bash
#!/usr/bin/env bash
# scripts/run-loop.sh <page-slug>
PAGE=$1
for i in $(seq 1 60); do
  if grep -q "^PAGE_STATUS: done" "migration-work/$PAGE/STATUS.md"; then echo "Done"; exit 0; fi
  claude -p "Follow MIGRATION-RUNBOOK.md. Page: $PAGE. Do exactly one item from STATUS.md, run its gate, update STATUS.md, then stop." \\
    --allowedTools "Read,Write,Edit,Bash,Glob,Grep"
done
\`\`\`

\`PAGE_STATUS: done\` is written only by \`npm run gate:page\` (stage 8/9), never by the agent.

## 8. Gate scripts to implement

| Script | Does |
|---|---|
| \`gate:crawl\` | checks the snapshot, images.json and page.json exist and are non-empty |
| \`gate:sections\` | re-runs selectors on the live page (1 match each); screenshot sanity check |
| \`gate:analysis\` | ajv schema check; text coverage of source.html assigned ≥ 99% |
| \`gate:visual <block>\` | renders, screenshots, pixelmatch → report.json, exit 1 if over threshold. Generate with \`scaffold_visual_gate\`. |
| \`gate:parser <block>\` | parser on each instance → word diff vs source, minus declared omissions |
| \`gate:page\` | full import + \`aem up\` + page diff + completeness; writes \`PAGE_STATUS: done\` |

Every gate also appends one line to the Iteration log in STATUS.md, so the log can't drift from reality.
`;

        const sectionRows = (sections ?? []).map((s) =>
          `| ${s.id} | ${s.slug} | ${s.selector ? `\`${s.selector}\`` : '—'} | ${s.background ?? '—'} | ${s.content ?? '—'} | ${s.blocks ?? '—'} | pending |`,
        ).join('\n') || '| — | — | — | — | — | — | — |';

        const blockRows = (blocks ?? []).map((b) =>
          `| ${b.name} | ${b.variant ?? '—'} | ${b.decision} | ${b.instances ?? 1} | ${b.sections ?? '—'} | – / – | – | 0 | pending |`,
        ).join('\n') || '| — | — | — | — | — | – / – | – | 0 | — |';

        const decisionReasons = (blocks ?? [])
          .filter((b) => (b.decision === 'extend' || b.decision === 'new') && b.decisionReason)
          .map((b) => `- **${b.name}${b.variant ? ` (${b.variant})` : ''} (${b.decision}):** ${b.decisionReason}`)
          .join('\n') || '- *(none recorded yet)*';

        const statusMd = `# Migration Status — ${pageSlug}

PAGE_STATUS: in-progress
<!-- Only \`npm run gate:page\` may change this to: done -->

| Field | Value |
|---|---|
| Source URL | ${sourceUrl} |
| Template | ${templateName ?? '<template-name>'} |
| EDS path | ${edsPath} |
| Last run | ${new Date().toISOString().slice(0, 16).replace('T', ' ')} |
| Current focus | Stage 1 — Crawl |

Status values: \`pending\` · \`in-progress\` · \`failing\` · \`blocked\` · \`passed\` (gate only)

## Stages

| # | Stage | Status | Gate result | Notes |
|---|---|---|---|---|
| 1 | Crawl | pending | | |
| 2 | Section split | pending | | |
| 3 | Design tokens | pending | | |
| 4 | Section analysis | pending | | |
| 5 | Block matching | pending | | |
| 6 | Block build loop | pending | | see Blocks table |
| 7 | Parsers / import | pending | | see Blocks table |
| 8 | Page assembly | pending | | |
| 9 | Polish | pending | | |

## Sections

| ID | Slug | Selector | Background | Content | Blocks | Analysis |
|---|---|---|---|---|---|---|
${sectionRows}

## Blocks

| Block | Variant | Decision | Instances | Sections | Build (visual D / M) | Parser (text) | Iter | Status |
|---|---|---|---|---|---|---|---|---|
${blockRows}

Decision = \`reuse\` \\| \`variant\` \\| \`extend\` \\| \`new\` (reason below for \`extend\`/\`new\`)

### Decision reasons

${decisionReasons}

## Design tokens

| Token | Value | Source (styles.json) | Status |
|---|---|---|---|
| | | | pending |

## Masks (excluded from visual diff)

| Block / section | Region | Reason |
|---|---|---|

## Allowed content omissions (excluded from text diff)

| Block | Omitted | Reason |
|---|---|---|

## Open issues / blocked

| # | Item | Problem | Tried | Next idea |
|---|---|---|---|---|

## Iteration log

<!-- Append-only. One line per gate run. Newest at the bottom. -->

| Time | Item | Change made | Gate | Result | Next |
|---|---|---|---|---|---|
`;

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `## Migration runbook scaffolded for **${pageSlug}**\n\n` +
                `Write these two files, then reference \`MIGRATION-RUNBOOK.md\` from \`AGENTS.md\`/\`CLAUDE.md\` so every session reads it first.\n\n` +
                `### MIGRATION-RUNBOOK.md (repo root — write once, shared across all pages)\n\`\`\`markdown\n${runbook}\`\`\`\n\n` +
                `### migration-work/${pageSlug}/STATUS.md\n\`\`\`markdown\n${statusMd}\`\`\`\n\n` +
                `**Next:** call \`scaffold_visual_gate\` to generate the \`gate:visual\` script stage 6 depends on \u2014 the rest of the pipeline (stages 1\u20135, 7\u20139) still needs gate scripts written by hand per the table in §8, or scaffolded similarly later.\n\n` +
                `**Resuming:** this tool does NOT merge with an existing STATUS.md \u2014 re-running it overwrites the shell. Once a page is in progress, hand-edit STATUS.md directly (per the runbook's own rule: state lives on disk) rather than regenerating it.`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Runbook generation failed: ${(error as Error).message}` }],
        };
      }
    },
  );
}
