import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * `generate_selector_coverage_map` — turn `page-structure.json` +
 * `authoring-analysis.json` decisions into a `page-templates.json`-style
 * `sections[]` / `blocks[]` selector map, and run a coverage check
 * (source section count vs. mapped section count; every block/section has
 * a selector; no selector reused across two different blocks).
 *
 * This tool does NOT parse HTML itself — the caller (IDE assistant) derives
 * each `selector` from the cached `cleaned.html` / live DOM and passes the
 * already-resolved strings in. This tool's job is structural: assemble the
 * canonical map shape and catch coverage/collision mistakes before they
 * reach a parser implementation.
 */

const SECTION_SCHEMA = z.object({
  n: z.number().int().positive().describe('Section number (from page-structure.json)'),
  selector: z.string().optional().describe('CSS selector (or compound selector with :has()/:not()) that uniquely resolves this section in the live DOM / cleaned.html'),
  style: z.string().nullable().optional().describe('Section style, e.g. "light-blue", "grey", or null'),
  blocks: z.array(z.string()).optional().describe('Block variant names (blockName) whose root element falls inside this section'),
  defaultContentSelectors: z.array(z.string()).optional().describe('Selectors for default-content sequences in this section, per authoring-analysis'),
});

const BLOCK_SCHEMA = z.object({
  blockName: z.string().describe('Block variant name, e.g. "cards-price"'),
  selector: z.string().describe('Compound selector that matches only this block\'s instance(s) and nothing belonging to a sibling block or section boundary'),
  instances: z.number().int().positive().optional().describe('Expected instance count (default 1) — used for the coverage check'),
});

export function registerGenerateSelectorCoverageMap(server: McpServer) {
  server.registerTool(
    'generate_selector_coverage_map',
    {
      description: 'Assemble a page-templates.json-style section/block selector map from already-resolved CSS selectors (you derive the selectors from cleaned.html/live DOM — this tool does not parse HTML), and run a coverage check: every source section represented exactly once, no selector matching zero or duplicate-across-block elements reported as a warning, and a `source=N template=M` coverage line. Use this before writing per-block import parsers, so selector mistakes are caught structurally rather than discovered mid-parser-authoring.',
      inputSchema: {
        pageSlug: z.string().describe('kebab-case page/template identifier'),
        sourceSectionCount: z.number().int().nonnegative().describe('Total sections found in Step 2 (page-structure.json) — the ground truth to check `sections` against'),
        sections: z.array(SECTION_SCHEMA).min(1).describe('One entry per section with its resolved selector(s)'),
        blocks: z.array(BLOCK_SCHEMA).optional().describe('One entry per distinct block variant with its resolved selector'),
      },
      annotations: {
        title: 'Generate Selector Coverage Map',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ pageSlug, sourceSectionCount, sections, blocks }) => {
      try {
        const warnings: string[] = [];

        // ── Coverage: section count ────────────────────────────────
        const mappedCount = sections.length;
        if (mappedCount !== sourceSectionCount) {
          warnings.push(
            `Section count mismatch: source=${sourceSectionCount} template=${mappedCount}. Every section from page-structure.json must appear exactly once.`,
          );
        }

        // ── Missing selectors ──────────────────────────────────────
        const noSelector = sections.filter((s) => !s.selector).map((s) => s.n);
        if (noSelector.length > 0) {
          warnings.push(`Section(s) with no selector yet: ${noSelector.join(', ')}.`);
        }

        // ── Duplicate section selectors (collision) ────────────────
        const bySelector = new Map<string, number[]>();
        for (const s of sections) {
          if (!s.selector) continue;
          bySelector.set(s.selector, [...(bySelector.get(s.selector) ?? []), s.n]);
        }
        for (const [sel, ns] of bySelector) {
          if (ns.length > 1) {
            warnings.push(`Selector \`${sel}\` is shared by sections ${ns.join(', ')} — disambiguate with a neighbouring-element selector (EDS Block Forge / page-import convention) before these are used by a parser.`);
          }
        }

        // ── Block selector collisions across blocks ─────────────────
        if (blocks && blocks.length > 0) {
          const blockBySelector = new Map<string, string[]>();
          for (const b of blocks) {
            blockBySelector.set(b.selector, [...(blockBySelector.get(b.selector) ?? []), b.blockName]);
          }
          for (const [sel, names] of blockBySelector) {
            if (new Set(names).size > 1) {
              warnings.push(`Selector \`${sel}\` matches more than one block variant (${names.join(', ')}) — narrow each selector so it targets only its own instance(s).`);
            }
          }

          // block selector nested inside another block's selector text (heuristic — exact substring only)
          for (const a of blocks) {
            for (const b of blocks) {
              if (a.blockName !== b.blockName && a.selector !== b.selector && a.selector.includes(b.selector)) {
                warnings.push(`\`${a.blockName}\`'s selector contains \`${b.blockName}\`'s selector as a substring — verify they aren't nested (a block should never contain another block's root element).`);
              }
            }
          }
        }

        const map = {
          pageSlug,
          sections: sections.map((s) => ({
            n: s.n,
            selector: s.selector ?? null,
            style: s.style ?? null,
            blocks: s.blocks ?? [],
            defaultContentSelectors: s.defaultContentSelectors ?? [],
          })),
          blocks: (blocks ?? []).map((b) => ({ blockName: b.blockName, selector: b.selector, instances: b.instances ?? 1 })),
        };

        const mapJson = `${JSON.stringify(map, null, 2)}\n`;
        const mapPath = `.migration/selector-map/${pageSlug}.json`;

        const coverageLine = `sections: source=${sourceSectionCount} template=${mappedCount} ; unresolved=${noSelector.length}`;

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `## Selector coverage map — \`${pageSlug}\`\n\n` +
                `\`\`\`\n${coverageLine}\n\`\`\`\n\n` +
                (warnings.length > 0
                  ? `**⚠️ ${warnings.length} issue${warnings.length > 1 ? 's' : ''} to resolve before writing parsers:**\n${warnings.map((w) => `- ${w}`).join('\n')}\n\n`
                  : `✅ No coverage or collision issues found.\n\n`) +
                `### ${mapPath}\n\`\`\`json\n${mapJson}\`\`\`\n\n` +
                `Re-run this tool after fixing any flagged selector before treating this page's structure as parser-ready.`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Selector coverage map generation failed: ${(error as Error).message}` }],
        };
      }
    },
  );
}
