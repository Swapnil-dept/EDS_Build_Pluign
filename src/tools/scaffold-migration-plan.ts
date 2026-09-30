import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * `scaffold_migration_plan` — generate a section-by-section build plan for a
 * full EDS page migration/build, in the shape Adobe's Experience Modernization
 * Console writes to `.migration/plans/<page>.md` before any content or block
 * is authored.
 *
 * Advisory tool: recommended (not enforced) for full-page work — especially
 * when there's no live source URL (screenshot-only / hand-authored content)
 * or when the page introduces a new brand/theme into an existing project.
 * Single-block work should keep using `clarify_task` / `scaffold_block` /
 * `generate_block_from_design` directly.
 */

const SECTION_SCHEMA = z.object({
  name: z.string().describe('Section as it appears in the reference (e.g. "Hero", "iNAV table")'),
  approach: z.enum(['reuse', 'new']).describe('Reuse an existing block or create a new one'),
  blockName: z.string().optional().describe('Existing block to reuse, or the new block name (kebab-case)'),
  notes: z.string().optional().describe('Why this approach, any structural detail worth recording'),
});

export function registerScaffoldMigrationPlan(server: McpServer) {
  server.registerTool(
    'scaffold_migration_plan',
    {
      description: 'Generate a section-by-section EDS build plan (page/brand context, per-section reuse-vs-new-block decisions, content-authoring approach, design-token/brand notes, and a checklist) formatted to save at `.migration/plans/<page-slug>.md`. Reference screenshots go in `.migration/screens/`. Advisory: recommended before authoring content/blocks for a full page, especially screenshot-only builds or pages introducing a new brand/theme. Read-only — returns markdown; the caller writes the file and gets user approval before implementing.',
      inputSchema: {
      pageName: z.string().describe('Human-readable page name, e.g. "Nippon India ETF Homepage"'),
      pageSlug: z
        .string()
        .optional()
        .describe('kebab-case filename stem for `.migration/plans/<slug>.md`. Inferred from pageName if omitted.'),
      sourceType: z
        .enum(['live-url', 'screenshot', 'description'])
        .describe('What reference material exists: a live URL to import, a screenshot/image only, or a plain-text description'),
      sourceRef: z.string().optional().describe('The URL, screenshot path, or short description of the reference material'),
      brandName: z.string().optional().describe('Brand/theme name if this page introduces or belongs to a brand distinct from the project default (e.g. "nippon")'),
      brandDeviationNotes: z
        .string()
        .optional()
        .describe('How this brand differs from the existing design system, and the isolation strategy (e.g. page-scoped tokens, new blocks instead of editing shared CSS)'),
      sections: z.array(SECTION_SCHEMA).min(1).describe('Section-by-section mapping from the reference to EDS blocks/content'),
      dataNotes: z.string().optional().describe('Notes on data to transcribe exactly from the reference (figures, copy, links) rather than invent'),
      screenshotPaths: z.array(z.string()).optional().describe('Reference screenshot paths to save under `.migration/screens/`'),
      additionalChecklist: z.array(z.string()).optional().describe('Extra checklist items beyond the standard per-section + lint + visual QA items'),
    },
      annotations: {
      title: 'Scaffold Migration Plan',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    },
    async ({
      pageName,
      pageSlug,
      sourceType,
      sourceRef,
      brandName,
      brandDeviationNotes,
      sections,
      dataNotes,
      screenshotPaths,
      additionalChecklist,
    }) => {
      const slug = pageSlug ?? pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const planPath = `.migration/plans/${slug}.md`;

      const lines: string[] = [];
      lines.push(`# ${pageName} — Build Plan`);
      lines.push('');

      const sourceLine = sourceType === 'live-url'
        ? `Building this page by importing the live source${sourceRef ? `: ${sourceRef}` : '.'}`
        : sourceType === 'screenshot'
          ? `Building this page from the reference screenshot${sourceRef ? ` (${sourceRef})` : ''} — no live source URL.`
          : `Building this page from a text description${sourceRef ? `: ${sourceRef}` : '.'}`;
      lines.push(sourceLine);
      lines.push('');

      if (brandName) {
        lines.push(`> **Note:** This page's brand (\`${brandName}\`)${brandDeviationNotes ? ` — ${brandDeviationNotes}` : ' differs from the existing design system.'} New color/typography choices will be added as **page-scoped tokens/section styles** rather than edited into the shared stylesheet, and new blocks will be created rather than overwriting existing block CSS. See \`eds_multibrand_theming_guide\` for the body-class scoping pattern.`);
        lines.push('');
      }

      lines.push('---');
      lines.push('');
      lines.push('## Section-by-section mapping');
      lines.push('');
      lines.push('| # | Section | Approach |');
      lines.push('|---|---|---|');
      sections.forEach((section, i) => {
        const approach = section.approach === 'reuse'
          ? `Reuse \`${section.blockName ?? 'existing block'}\`${section.notes ? ` — ${section.notes}` : ''}`
          : `New \`${section.blockName ?? 'block-name'}\` block${section.notes ? ` — ${section.notes}` : ''}`;
        lines.push(`| ${i + 1} | ${section.name} | ${approach} |`);
      });
      lines.push('');

      lines.push('---');
      lines.push('');
      lines.push('## Approach decisions');
      lines.push('');
      const newBlocks = sections.filter((s) => s.approach === 'new').map((s) => s.blockName).filter(Boolean);
      const reusedBlocks = sections.filter((s) => s.approach === 'reuse').map((s) => s.blockName).filter(Boolean);
      lines.push(
        sourceType === 'live-url'
          ? '- **Content authoring:** use the `migrate-page-to-eds` prompt with `sourceType: "url"` (Playwright-driven scrape + section/block analysis).'
          : '- **Content authoring:** use the `migrate-page-to-eds` prompt with `sourceType: "image"` or `sourceType: "figma"` — the IDE\'s own vision (or Figma MCP) drives section/block analysis directly from the screenshot/description, same pipeline as the URL path.',
      );
      if (dataNotes) lines.push(`- **Data:** ${dataNotes}`);
      if (newBlocks.length) lines.push(`- **New blocks to create:** ${newBlocks.join(', ')}.`);
      if (reusedBlocks.length) lines.push(`- **Reused blocks:** ${reusedBlocks.join(', ')}.`);
      if (brandName) lines.push(`- **Design tokens:** add a \`${brandName}\`-scoped palette without altering the project's global tokens.`);
      lines.push('- **Verification:** DOM snapshot + computed-style checks per section while building, then a final pixel-diff against the reference at desktop and mobile widths — see `eds_visual_verification_guide`.');
      lines.push('');

      lines.push('---');
      lines.push('');
      lines.push('## Checklist');
      lines.push('');
      for (const section of sections) {
        const label = section.approach === 'reuse'
          ? `Reuse \`${section.blockName ?? 'block'}\` for **${section.name}**`
          : `Build the **${section.name}** section (new \`${section.blockName ?? 'block'}\` block)`;
        lines.push(`- [ ] ${label}`);
      }
      lines.push('- [ ] Assemble the full `.plain.html` page with correct section-metadata boundaries');
      lines.push('- [ ] Preview locally and verify each section\'s DOM/layout; iterate CSS to match the reference');
      lines.push('- [ ] Run `npm run lint` and fix any ESLint/Stylelint issues');
      lines.push('- [ ] Final visual QA vs. the reference (see `eds_visual_verification_guide`)');
      for (const item of additionalChecklist ?? []) lines.push(`- [ ] ${item}`);
      lines.push('');

      lines.push('---');
      lines.push('');
      lines.push(`*Save this plan to \`${planPath}\`${screenshotPaths?.length ? ` and reference screenshots to \`.migration/screens/\` (${screenshotPaths.join(', ')})` : ''}. Get user approval before implementing — do not run git commands; leave staging/sync to the user.*`);

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );
}
