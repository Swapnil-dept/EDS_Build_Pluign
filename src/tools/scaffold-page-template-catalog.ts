import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * `scaffold_page_template_catalog` — fingerprint a migrated page into a
 * reusable template entry keyed by URL pattern, so future pages that match
 * the same pattern (e.g. other "/life-insurance-plans/*" pages on the same
 * site) can skip re-deriving section/block structure from scratch.
 *
 * Read-only — returns the catalog entry (and the merged catalog file) to
 * write to `.migration/catalog/page-templates.json`. Pass the previous
 * catalog content back in via `existingCatalog` to merge instead of
 * overwrite.
 */

const BLOCK_USAGE_SCHEMA = z.object({
  blockName: z.string().describe('Block variant used on this page (e.g. "cards-price")'),
  baseBlock: z.string().optional().describe('Family this variant belongs to'),
  instances: z.number().int().positive().optional().describe('How many times it occurs (default 1)'),
});

export function registerScaffoldPageTemplateCatalog(server: McpServer) {
  server.registerTool(
    'scaffold_page_template_catalog',
    {
      description: 'Record a migrated page as a reusable template entry keyed by URL pattern, so other pages matching the same pattern on the same site can reuse its section/block decisions instead of re-running structure analysis from scratch. Returns the entry + merged catalog to write to `.migration/catalog/page-templates.json`. Pass `existingCatalog` (the prior file content) on a re-run to merge rather than overwrite, and call with `lookupUrlPattern` only (no other fields) to check whether a catalog entry already covers a new URL before starting a fresh migration.',
      inputSchema: {
        lookupUrlPattern: z.string().optional().describe('Set this ALONE (omit the other fields) to check whether an existing catalog entry\'s `urlPattern` matches this URL, before starting a full migration. Requires `existingCatalog`.'),
        templateName: z.string().optional().describe('Short template name, e.g. "life-insurance-plans". Required unless using `lookupUrlPattern`.'),
        urlPattern: z.string().optional().describe('Glob-style pattern identifying pages that share this template, e.g. "/life-insurance-plans/*". Required unless using `lookupUrlPattern`.'),
        representativeUrl: z.string().optional().describe('The URL actually migrated to derive this template'),
        sectionCount: z.number().int().nonnegative().optional().describe('Number of sections found on the representative page (from page-structure.json)'),
        sectionStyleSequence: z.array(z.string()).optional().describe('Section background styles in order, e.g. ["light","light-blue","grey","light-blue", ...] — a lightweight structural fingerprint'),
        blocks: z.array(BLOCK_USAGE_SCHEMA).optional().describe('Block variants used, from authoring-analysis.json / the generation manifest'),
        existingCatalog: z.string().optional().describe('Raw JSON content of the previously written `.migration/catalog/page-templates.json`, for merge or lookup'),
      },
      annotations: {
        title: 'Scaffold Page Template Catalog',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ lookupUrlPattern, templateName, urlPattern, representativeUrl, sectionCount, sectionStyleSequence, blocks, existingCatalog }) => {
      try {
        type Template = {
          name: string;
          urls: string[];
          representativeUrl?: string;
          urlPattern: string;
          sectionCount?: number;
          sectionStyleSequence?: string[];
          blocks: Array<{ blockName: string; baseBlock?: string; instances?: number }>;
        };

        let templates: Template[] = [];
        if (existingCatalog) {
          try {
            const parsed = JSON.parse(existingCatalog);
            templates = Array.isArray(parsed?.templates) ? parsed.templates : [];
          } catch {
            return {
              isError: true,
              content: [{ type: 'text' as const, text: '`existingCatalog` is not valid JSON — pass the exact prior file content.' }],
            };
          }
        }

        // ── Lookup-only mode ──────────────────────────────────────
        if (lookupUrlPattern !== undefined) {
          const globToRegExp = (glob: string) =>
            new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
          const match = templates.find((t) => globToRegExp(t.urlPattern).test(lookupUrlPattern));
          return {
            content: [
              {
                type: 'text' as const,
                text: match
                  ? `✅ **Catalog hit** — \`${lookupUrlPattern}\` matches template **${match.name}** (\`${match.urlPattern}\`).\n\n` +
                    `Reuse its known structure instead of re-running Step 2/3 from scratch:\n` +
                    `- Section count: ${match.sectionCount ?? 'unknown'}\n` +
                    `- Section style sequence: ${match.sectionStyleSequence?.join(' → ') ?? 'unknown'}\n` +
                    `- Known blocks (${match.blocks.length}): ${match.blocks.map((b) => b.blockName).join(', ') || 'none recorded'}\n\n` +
                    `Still verify against the new page's actual screenshot/DOM — reuse the *expected shape*, don't skip verification.`
                  : `❌ **No catalog match** for \`${lookupUrlPattern}\` — no existing \`urlPattern\` covers it. Run the full migration pipeline (Steps 1–5) and then call this tool again with the discovered structure to seed a new template entry.`,
              },
            ],
          };
        }

        // ── Write/merge mode ───────────────────────────────────────
        if (!templateName || !urlPattern) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'Both `templateName` and `urlPattern` are required when not using `lookupUrlPattern`.' }],
          };
        }

        const existingIdx = templates.findIndex((t) => t.name === templateName);
        const entry: Template = {
          name: templateName,
          urls: existingIdx >= 0
            ? Array.from(new Set([...(templates[existingIdx].urls ?? []), ...(representativeUrl ? [representativeUrl] : [])]))
            : (representativeUrl ? [representativeUrl] : []),
          representativeUrl: representativeUrl ?? templates[existingIdx]?.representativeUrl,
          urlPattern,
          sectionCount: sectionCount ?? templates[existingIdx]?.sectionCount,
          sectionStyleSequence: sectionStyleSequence ?? templates[existingIdx]?.sectionStyleSequence,
          blocks: blocks ?? templates[existingIdx]?.blocks ?? [],
        };

        if (existingIdx >= 0) templates[existingIdx] = entry;
        else templates.push(entry);

        const catalogJson = `${JSON.stringify({ templates }, null, 2)}\n`;
        const catalogPath = `.migration/catalog/page-templates.json`;

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `## Page template catalog — ${existingIdx >= 0 ? 'updated' : 'new'} entry: **${templateName}**\n\n` +
                `\`urlPattern\`: \`${urlPattern}\` · sections: ${entry.sectionCount ?? 'n/a'} · blocks: ${entry.blocks.length}\n\n` +
                `### ${catalogPath}\n\`\`\`json\n${catalogJson}\`\`\`\n\n` +
                `**Next migration under this pattern:** call this tool with just \`lookupUrlPattern\` + \`existingCatalog\` (this file's content) before Step 1, to check for a reusable structure instead of starting cold.`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Catalog generation failed: ${(error as Error).message}` }],
        };
      }
    },
  );
}
