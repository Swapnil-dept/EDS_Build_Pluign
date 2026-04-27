import { z } from 'zod';
import { AEM_65_LTS_SKILLS, findAem65LtsSkill, AEM_65_LTS_HARD_RULES, AEM_65_LTS_PROJECT_STRUCTURE, } from '../knowledge/aem-65-lts-skills.js';
export function registerAem65SkillsIndex(server) {
    server.tool('aem65_skills_index', `Look up the catalog of Adobe AEM 6.5 LTS / AMS skills (mirrors github.com/adobe/skills/tree/beta/skills/aem/6.5-lts). Returns the 4 skills (ensure-agents-md, aem-replication, aem-workflow, dispatcher) — note: NO create-component, best-practices, or migration skills here (those are Cloud-Service-only). Pass a query string to filter, or leave it empty to get the full index. PRECONDITION: only use this tool after detect_project_type returns "aem65lts".`, {
        query: z.string().optional().describe('Optional skill id or keyword (e.g. "replication", "workflow", "dispatcher"). Empty = list all.'),
    }, {
        title: 'AEM 6.5 LTS Skills Index',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ query }) => {
        const skills = query?.trim()
            ? [findAem65LtsSkill(query.trim())].filter(Boolean)
            : AEM_65_LTS_SKILLS;
        if (!skills.length) {
            return {
                content: [{
                        type: 'text',
                        text: `No 6.5 LTS skill matched "${query}". Try one of: ${AEM_65_LTS_SKILLS.map((s) => s.id).join(', ')}.`,
                    }],
            };
        }
        const sections = [];
        sections.push(`# Adobe AEM 6.5 LTS / AMS — Skills (${skills.length})\n\nAll skills are **[BETA]**. Source: https://github.com/adobe/skills/tree/beta/skills/aem/6.5-lts`);
        for (const s of skills) {
            sections.push(`## \`${s.id}\` — ${s.title} [${s.status.toUpperCase()}]\n\n` +
                `**Description:** ${s.description}\n\n` +
                `**When to use:** ${s.when}\n\n` +
                `**SKILL.md:** ${s.path}\n\n` +
                (s.subSkills?.length
                    ? `**Sub-skills:**\n${s.subSkills.map((ss) => `- \`${ss.id}\` — ${ss.description}`).join('\n')}`
                    : ''));
        }
        if (!query) {
            sections.push(`## 6.5 LTS guardrails (apply to **every** task)\n\n${AEM_65_LTS_HARD_RULES.map((r) => `- ${r}`).join('\n')}`);
            sections.push(`## Canonical project layout\n\n\`\`\`\n${AEM_65_LTS_PROJECT_STRUCTURE}\n\`\`\``);
        }
        sections.push(`## Routing\n\n` +
            `- Workspace has no \`AGENTS.md\` → call \`ensure_agents_md\` with \`variant: "6.5-lts"\` first.\n` +
            `- Replication agents / Replicator API / blocked queues → \`aem65_replication\`.\n` +
            `- Workflow models / WorkflowProcess / JMX debug → \`aem65_workflow\`.\n` +
            `- Dispatcher (AMS variant) → \`aem_dispatcher_config\` with \`variant: "ams"\`.\n\n` +
            `Heads up: AEM 6.5 LTS does **not** ship a \`create-component\`, \`best-practices\`, or \`migration\` skill in Adobe's repo. For component scaffolding here, use plain Maven archetype templates and 6.5 docs — do not use \`scaffold_aem_component\` (that targets Cloud Service constraints).`);
        return { content: [{ type: 'text', text: sections.join('\n\n') }] };
    });
}
//# sourceMappingURL=aem65-skills-index.js.map