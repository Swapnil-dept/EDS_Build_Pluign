import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AEM_CLOUD_PATTERNS } from '../knowledge/aem-cloud-skills.js';

const MIGRATION_ROOT = 'https://github.com/adobe/skills/tree/beta/skills/aem/cloud-service/skills/migration';
const BEST_PRACTICES_ROOT = 'https://github.com/adobe/skills/tree/beta/skills/aem/cloud-service/skills/best-practices';

export function registerAemMigrationPattern(server: McpServer) {
  server.tool(
    'aem_migration_pattern',
    `Run **one** legacy AEM → AEMaaCS migration pattern with the orchestration rules from Adobe's "migration" skill. Pick a single pattern id (scheduler | resourceChangeListener | replication | eventListener | eventHandler | assetApi | htlLint). The tool returns the discovery flow (BPA CSV → CAM/MCP → manual), the pattern's reference module path, and the strict critical rules. PRECONDITION: only after detect_project_type returns "aemaacs". RULE: one pattern per session. If the user asks to "fix everything", ask them to pick one before calling this.`,
    {
      pattern: z.enum(['scheduler', 'resourceChangeListener', 'replication', 'eventListener', 'eventHandler', 'assetApi', 'htlLint']).describe('Exactly one pattern id.'),
      source:  z.enum(['bpa-csv', 'cam-mcp', 'manual']).default('manual').describe('Where the targets come from. bpa-csv = user provides ./reports/bpa.csv. cam-mcp = run list-projects then fetch-cam-bpa-findings. manual = user names files.'),
      bpaCsvPath: z.string().optional().describe('Path to the BPA CSV when source = "bpa-csv".'),
      filePaths:  z.array(z.string()).default([]).describe('Workspace-relative file paths when source = "manual".'),
    },
    {
      title: 'AEMaaCS Migration (one pattern)',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ pattern, source, bpaCsvPath, filePaths }) => {
      const ref = AEM_CLOUD_PATTERNS.find((p) => p.id === pattern);
      if (!ref) {
        return { content: [{ type: 'text' as const, text: `Unknown pattern "${pattern}".` }], isError: true };
      }

      const sections: string[] = [];
      sections.push(`# AEMaaCS migration — \`${pattern}\` (${ref.title})\n\nSource (BETA): ${MIGRATION_ROOT}\nBest-practices module: [\`${ref.module}\`](${BEST_PRACTICES_ROOT}/${ref.module})`);

      sections.push(`## One pattern per session\n\nOnly fix \`${pattern}\` in this session. If other patterns appear in the BPA report, run a separate session per pattern (one commit per pattern).`);

      sections.push(`## Discovery flow\n\n${
        pattern === 'htlLint'
          ? '`htlLint` is **NOT** in BPA/CAM. Targets come from proactive `rg` discovery in `ui.apps/**/jcr_root/**/*.html`. The reference module ships the exact `rg` patterns for each of the 4 fix variants (boolean literal, raw string, numeric, split expression).'
          : source === 'bpa-csv'
            ? `Use the BPA CSV at \`${bpaCsvPath ?? './reports/bpa.csv'}\`. Filter rows where \`pattern == "${pattern}"\`. Typical columns: \`pattern\`, \`filePath\`, \`message\`. Build a unified collection under \`./unified-collections/\` and re-use it on subsequent runs.`
            : source === 'cam-mcp'
              ? `1. Call CAM MCP \`list-projects\` first.\n2. Wait for the user to **explicitly confirm** which project row to use (prefer \`projectId\`).\n3. Call \`fetch-cam-bpa-findings\` with the confirmed id.\n4. **On any MCP error: STOP.** Show the verbatim tool error to the user. Do **not** infer a different project, do **not** silently fall back to manual or BPA CSV.`
              : `Manual flow. Files the user named:\n${filePaths.length ? filePaths.map((f) => `- \`${f}\``).join('\n') : '- (none — ask the user for paths inside the workspace root)'}\n\nDo **not** search outside the IDE workspace root. If a path doesn't resolve, tell the user — don't hunt.`
      }`);

      sections.push(`## Required reading **before** editing code\n\n1. \`${BEST_PRACTICES_ROOT}/SKILL.md\` — critical rules + pattern table.\n2. \`${BEST_PRACTICES_ROOT}/${ref.module}\` — the active pattern module (full read).\n3. If the code uses SCR / ResourceResolver / console logging:\n   - \`${BEST_PRACTICES_ROOT}/references/scr-to-osgi-ds.md\`\n   - \`${BEST_PRACTICES_ROOT}/references/resource-resolver-logging.md\`\n   - or the prerequisites hub: \`${BEST_PRACTICES_ROOT}/references/aem-cloud-service-pattern-prerequisites.md\``);

      sections.push(`## Per-file processing order\n\nFor each target:\n\n1. Read source.\n2. Classify against the module's criteria.\n3. Apply the module's transformation steps **in order**.\n4. Verify HTL/Java lints / unit tests pass.\n5. Move to next file.`);

      sections.push(`## Critical rules\n\n- **READ THE PATTERN MODULE FIRST.**\n- **DO** preserve \`isAuthor()\` and other run-mode guards.\n- **DO NOT** change business logic.\n- **DO NOT** rename classes unless the module says to.\n- **DO NOT** invent values — extract from existing code.\n- **DO NOT** edit files outside the agreed scope (BPA targets / paths the user named).\n- **DO** keep grep / discovery / edits inside the IDE workspace root(s).`);

      sections.push(`## Reporting\n\nAt the end of the session, summarize:\n- Files touched (workspace-relative paths)\n- Sub-paths that were skipped or failed\n- Lint/test status after the change`);

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}
