import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { extractCssVariables, extractFontHints } from './project-summary.js';

/**
 * `generate_project_md` — generate/refresh a `PROJECT.md` project map: block
 * inventory + variants, design tokens, page list, section styles, import
 * infrastructure, and (optional) multi-brand notes.
 *
 * This is the "read PROJECT.md first" file Adobe's Experience Modernization
 * Console relies on to stay consistent with what already exists in a project.
 * Complements (does not replace) `project_summary` — `project_summary` is a
 * session-scoped handoff note; `PROJECT.md` is the durable project map an
 * agent should read before planning or scaffolding anything.
 */

const BRAND_SCHEMA = z.object({
  name: z.string().describe('Brand/theme name, e.g. "nippon"'),
  tokenScopeClass: z.string().optional().describe('Body class the tokens are scoped under, e.g. "body.nippon"'),
  notes: z.string().optional(),
});

function listLines(s?: string): string[] {
  return (s ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function groupBlockVariants(blocksDirListing?: string): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const line of listLines(blocksDirListing)) {
    // Accept plain names ("hero") or "base (variant1, variant2)" style lines
    const match = line.match(/^([a-z0-9-]+)\s*(?:\(([^)]*)\))?$/i);
    if (!match) continue;
    const [, base, variants] = match;
    const list = grouped.get(base) ?? [];
    if (variants) list.push(...variants.split(',').map((v) => v.trim()).filter(Boolean));
    grouped.set(base, list);
  }
  return grouped;
}

export function registerGenerateProjectMd(server: McpServer) {
  server.registerTool(
    'generate_project_md',
    {
      description: 'Generate or refresh `PROJECT.md` — a durable project map covering the block inventory + variants, design tokens (colors/fonts as CSS custom properties), page list, section-style conventions, import infrastructure (fstab/importer), and optional multi-brand notes. AI agents should read this file FIRST (before AGENTS.md workflow steps) to stay consistent with what already exists. Refresh after adding/removing blocks, tokens, pages, or brands.',
      inputSchema: {
      blocksDirListing: z
        .string()
        .optional()
        .describe('`ls blocks/`, one block per line. Optionally annotate variants as "base (variant1, variant2)"'),
      stylesCss: z.string().optional().describe('Contents of styles/styles.css or equivalent global stylesheet'),
      headHtml: z.string().optional().describe('Contents of head.html'),
      fstabYaml: z.string().optional().describe('Contents of fstab.yaml'),
      importerDirListing: z.string().optional().describe('`ls tools/importer/` if present'),
      pagesListing: z
        .string()
        .optional()
        .describe('One page per line, e.g. "/ — Home" or "/about — About Us"'),
      brands: z.array(BRAND_SCHEMA).optional().describe('Brands/themes this project serves, if more than the default'),
      existingProjectMd: z.string().optional().describe('Current contents of PROJECT.md when refreshing'),
      sessionChanges: z.string().optional().describe('What changed this session (new blocks, tokens, pages, brands)'),
      projectMdPath: z.string().optional().describe('Target path, defaults to `PROJECT.md`'),
    },
      annotations: {
      title: 'Generate PROJECT.md',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    },
    async (input) => {
      const path = input.projectMdPath ?? 'PROJECT.md';
      const blockGroups = groupBlockVariants(input.blocksDirListing);
      const cssVars = extractCssVariables(input.stylesCss);
      const fontHints = extractFontHints(input.stylesCss, input.headHtml);
      const pages = listLines(input.pagesListing);
      const importerFiles = listLines(input.importerDirListing);

      const lines: string[] = [];
      lines.push('# PROJECT.md');
      lines.push('');
      lines.push(`_Suggested file: ${path}. Read this first — before AGENTS.md workflow steps — to stay consistent with what already exists._`);
      lines.push('');

      lines.push('## Blocks & Variants');
      if (blockGroups.size) {
        for (const [base, variants] of blockGroups) {
          lines.push(variants.length ? `- **${base}** (${variants.join(', ')})` : `- **${base}**`);
        }
      } else {
        lines.push('- No block listing provided. Pass `blocksDirListing` (`ls blocks/`) to populate this section.');
      }
      lines.push('');

      lines.push('## Design Tokens');
      if (cssVars.length) {
        lines.push(`- CSS custom properties: ${cssVars.join(', ')}`);
      } else {
        lines.push('- No CSS variables detected. Pass `stylesCss` to populate this section.');
      }
      if (fontHints.length) {
        lines.push(`- Typography: ${fontHints.join('; ')}`);
      }
      lines.push('');

      lines.push('## Pages');
      if (pages.length) {
        for (const page of pages) lines.push(`- ${page}`);
      } else {
        lines.push('- No page list provided. Pass `pagesListing` to populate this section.');
      }
      lines.push('');

      lines.push('## Section Styles');
      lines.push('- Background variants: `dark`, `accent`, `secondary` (project default set — confirm against this project\'s `styles.css` / section-metadata usage).');
      lines.push('- Compound modifiers: `narrow` (constrained width), `center` (centered text/buttons). Can combine (e.g. `dark, narrow`) or stand alone.');
      lines.push('- Applied via section-metadata in content HTML — never hardcode per page.');
      lines.push('');

      if (input.brands?.length) {
        lines.push('## Multi-Brand');
        for (const brand of input.brands) {
          lines.push(`- **${brand.name}**${brand.tokenScopeClass ? ` — tokens scoped under \`${brand.tokenScopeClass}\`` : ''}${brand.notes ? ` — ${brand.notes}` : ''}`);
        }
        lines.push('- See `eds_multibrand_theming_guide` for the body-class scoping pattern and shared header/footer brand checks.');
        lines.push('');
      }

      lines.push('## Import Infrastructure');
      if (importerFiles.length) {
        lines.push(`- Importer files: ${importerFiles.join(', ')}`);
      } else {
        lines.push('- No importer directory listing provided. Pass `importerDirListing` (`ls tools/importer/`) if the project has one.');
      }
      if (input.fstabYaml) {
        lines.push('- Content is mounted through `fstab.yaml`.');
      }
      lines.push('');

      lines.push('## Session Delta');
      if (input.sessionChanges) {
        for (const change of listLines(input.sessionChanges.replace(/^[-*]\s*/gm, ''))) lines.push(`- ${change}`);
      } else if (input.existingProjectMd) {
        lines.push('- No new changes recorded this session.');
      } else {
        lines.push('- Initial version of PROJECT.md.');
      }
      lines.push('');

      lines.push('## Operating Rule');
      lines.push('- Read this file first, before the AGENTS.md mandatory-workflow steps.');
      lines.push('- Refresh it after adding/removing blocks, tokens, pages, or brands — call `generate_project_md` again with `existingProjectMd` + `sessionChanges`.');
      lines.push('- Never run git commands — leave staging/sync to the user.');

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );
}
