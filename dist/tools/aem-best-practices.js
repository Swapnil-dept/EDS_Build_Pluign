import { z } from 'zod';
import { AEM_CLOUD_PATTERNS, AEM_CLOUD_HARD_RULES } from '../knowledge/aem-cloud-skills.js';
const BEST_PRACTICES_ROOT = 'https://github.com/adobe/skills/tree/beta/skills/aem/cloud-service/skills/best-practices';
export function registerAemBestPractices(server) {
    server.tool('aem_best_practices', `Look up AEM as a Cloud Service Java/OSGi/HTL pattern reference modules. Mirrors the index of Adobe's best-practices skill. Pass a pattern id or a substring (e.g. "scheduler", "replication", "eventListener", "eventHandler", "resourceChangeListener", "assetApi", "scr-to-ds", "resolver-logging", "htlLint") to get the matching module path + classification + Cloud Service hard rules. Empty query = list all. PRECONDITION: only call after detect_project_type returns "aemaacs". Critical rules: read the matching reference module BEFORE editing code; never change business logic; preserve isAuthor() guards; do not rename classes unless the module says to.`, {
        query: z.string().optional().describe('Pattern id or keyword (scheduler / replication / eventListener / eventHandler / resourceChangeListener / assetApi / scr-to-ds / resolver-logging / htlLint). Empty = all.'),
    }, {
        title: 'AEMaaCS Best Practices',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ query }) => {
        const q = query?.trim().toLowerCase();
        const matches = q
            ? AEM_CLOUD_PATTERNS.filter((p) => p.id.toLowerCase().includes(q) || p.title.toLowerCase().includes(q))
            : AEM_CLOUD_PATTERNS;
        if (!matches.length) {
            return {
                content: [{ type: 'text', text: `No pattern matched "${query}". Available: ${AEM_CLOUD_PATTERNS.map((p) => p.id).join(', ')}.` }],
            };
        }
        const sections = [];
        sections.push(`# AEMaaCS Best Practices — pattern reference\n\nSource (BETA): ${BEST_PRACTICES_ROOT}`);
        sections.push(`## Patterns (${matches.length})\n\n` +
            '| Pattern | Module | Classification |\n|---|---|---|\n' +
            matches.map((p) => `| \`${p.id}\` — ${p.title} | [\`${p.module}\`](${BEST_PRACTICES_ROOT}/${p.module}) | ${p.classification} |`).join('\n'));
        sections.push(`## Critical rules (apply to **every** pattern)\n\n` +
            `- **READ THE PATTERN MODULE FIRST** — never transform code without reading the module.\n` +
            `- When SCR / ResourceResolver / logging are in scope, also read \`references/scr-to-osgi-ds.md\` and \`references/resource-resolver-logging.md\` (or the prerequisites hub).\n` +
            `- **DO** preserve environment guards (e.g. \`isAuthor()\` run-mode checks).\n` +
            `- **DO NOT** change business logic inside methods (Java) or logical show/hide intent (HTL) unless the module explicitly allows it.\n` +
            `- **DO NOT** rename classes unless the pattern module explicitly says to.\n` +
            `- **DO NOT** invent values — extract from existing code.\n` +
            `- **DO** keep searches and edits inside the IDE workspace root(s) currently open.`);
        sections.push(`## AEMaaCS hard rules (always)\n\n${AEM_CLOUD_HARD_RULES.map((r) => `- ${r}`).join('\n')}`);
        sections.push(`## Workflow\n\n1. Pick **one** pattern (the rule above is "one pattern per session" when migrating).\n2. Open the module link above and read it fully.\n3. Apply the transformation steps **in order** as documented.\n4. Run \`mvn clean install\` (or the project's HTL/lint target) to confirm warnings are gone.\n5. For BPA/CAM-driven runs, use \`aem_migration_pattern\` instead — it carries the orchestration rules.`);
        return { content: [{ type: 'text', text: sections.join('\n\n') }] };
    });
}
//# sourceMappingURL=aem-best-practices.js.map