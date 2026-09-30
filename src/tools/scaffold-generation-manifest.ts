import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * `scaffold_generation_manifest` — resumable, per-block-variant generation
 * tracker for a multi-block page migration (mirrors the manifest-driven
 * "Finish X / Re-finish X" pattern seen in large third-party page-import
 * tools). Read-only — returns the manifest JSON to write to
 * `.migration/manifest/<pageSlug>.json`; the caller writes/re-reads it.
 *
 * Pass the previous manifest back in via `existingManifest` on a re-run so
 * already-`validated` entries are preserved and only `pending`/`failed`
 * entries need to be worked.
 */

const ENTRY_STATUS = z.enum(['pending', 'generated', 'validated', 'failed', 'skipped']);
type EntryStatus = z.infer<typeof ENTRY_STATUS>;


const ENTRY_SCHEMA = z.object({
  blockName: z.string().describe('Block variant folder name, kebab-case (e.g. "cards-price")'),
  baseBlock: z.string().optional().describe('Family this variant belongs to (e.g. "cards"). Defaults to blockName.'),
  blockVariant: z.string().optional().describe('Human-readable variant label within baseBlock (e.g. "price")'),
  instances: z.number().int().positive().optional().describe('How many times this variant occurs on the page (default 1)'),
  status: ENTRY_STATUS.optional().describe('Current status. Omit on first run — defaults to "pending". Pass the prior value back on re-runs to preserve progress.'),
  note: z.string().optional().describe('Free-text note (e.g. a validation error that was fixed, or why an entry was skipped)'),
});

export function registerScaffoldGenerationManifest(server: McpServer) {
  server.registerTool(
    'scaffold_generation_manifest',
    {
      description: 'Generate or update a resumable, per-block-variant manifest for a multi-block page migration, in the shape `.migration/manifest/<pageSlug>.json`. Each entry tracks one block variant\'s status (pending/generated/validated/failed/skipped). Pass the previous manifest content back in via `existingManifest` on a re-run to merge/preserve progress instead of restarting. Returns the manifest JSON plus a status table and the next pending entry to work on. Read-only — caller writes the file.',
      inputSchema: {
        pageSlug: z.string().describe('kebab-case page identifier, e.g. "term-insurance"'),
        entries: z.array(ENTRY_SCHEMA).min(1).describe('All block variants planned for this page (from authoring-analysis). Include every variant even if already generated in a prior run.'),
        existingManifest: z.string().optional().describe('Raw JSON content of the previously written manifest file, if this is a re-run. Statuses/notes for matching `blockName` entries are preserved; new entries are added as "pending".'),
      },
      annotations: {
        title: 'Scaffold Generation Manifest',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ pageSlug, entries, existingManifest }) => {
      try {
        let prior: Array<{ blockName: string; status?: string; note?: string }> = [];
        if (existingManifest) {
          try {
            const parsed = JSON.parse(existingManifest);
            prior = Array.isArray(parsed?.entries) ? parsed.entries : [];
          } catch {
            return {
              isError: true,
              content: [{ type: 'text' as const, text: '`existingManifest` is not valid JSON — pass the exact prior file content, or omit it to start fresh.' }],
            };
          }
        }

        const merged = entries.map((e) => {
          const prev = prior.find((p) => p.blockName === e.blockName);
          return {
            blockName: e.blockName,
            baseBlock: e.baseBlock ?? e.blockName,
            blockVariant: e.blockVariant,
            instances: e.instances ?? 1,
            status: e.status ?? (prev?.status as EntryStatus | undefined) ?? 'pending',
            note: e.note ?? prev?.note,
          };
        });

        const manifest = {
          pageSlug,
          generatedAt: new Date().toISOString(),
          entries: merged,
        };

        const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
        const manifestPath = `.migration/manifest/${pageSlug}.json`;

        const counts = merged.reduce<Record<string, number>>((acc, e) => {
          acc[e.status] = (acc[e.status] ?? 0) + 1;
          return acc;
        }, {});
        const statusLine = (['pending', 'generated', 'validated', 'failed', 'skipped'] as const)
          .filter((s) => counts[s])
          .map((s) => `${counts[s]} ${s}`)
          .join(' · ');

        const table = merged
          .map((e, i) => `| ${i + 1} | \`${e.blockName}\` | \`${e.baseBlock}\`${e.blockVariant ? ` (${e.blockVariant})` : ''} | ${e.instances} | ${e.status}${e.note ? ` — ${e.note}` : ''} |`)
          .join('\n');

        const nextPending = merged.find((e) => e.status === 'pending' || e.status === 'failed');

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `## Generation manifest — \`${pageSlug}\` (${merged.length} variant${merged.length > 1 ? 's' : ''})\n\n` +
                `**Status:** ${statusLine || 'no entries'}\n\n` +
                `| # | Block | Family | Instances | Status |\n|---|---|---|---|---|\n${table}\n\n` +
                `### ${manifestPath}\n\`\`\`json\n${manifestJson}\`\`\`\n\n` +
                (nextPending
                  ? `**Next to work on:** \`${nextPending.blockName}\` (${nextPending.status}). Generate it (\`scaffold_block\` + \`scaffold_model\`), validate it (\`validate_block\`), then re-call this tool with that entry's \`status\` set to \`"validated"\` (or \`"failed"\` + a \`note\` if it didn't pass) and \`existingManifest\` set to this file's content, to record progress before moving to the next entry.\n\n`
                  : `**All entries are ${merged.every((e) => e.status === 'validated') ? '`validated`' : 'terminal (validated/skipped/failed)'}.** ${merged.some((e) => e.status === 'failed') ? 'Re-check the `failed` entries before considering this page done.' : 'Generation is complete for this page.'}\n\n`) +
                `Write/overwrite \`${manifestPath}\` with the JSON above after every status change — this is what makes a re-run resumable instead of restarting all ${merged.length} variants from scratch.`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Manifest generation failed: ${(error as Error).message}` }],
        };
      }
    },
  );
}
