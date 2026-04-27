import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  AEM_CLOUD_SKILLS,
  findAemCloudSkill,
  AEM_CLOUD_HARD_RULES,
  AEM_CLOUD_PROJECT_STRUCTURE,
} from '../knowledge/aem-cloud-skills.js';

export function registerAemSkillsIndex(server: McpServer) {
  server.tool(
    'aem_skills_index',
    `Look up the catalog of Adobe AEM as a Cloud Service skills (mirrors github.com/adobe/skills/tree/beta/skills/aem/cloud-service). Returns the 6 skills (ensure-agents-md, best-practices, create-component, dispatcher, migration, aem-workflow), their purpose, when to use each, and links to the canonical SKILL.md. Pass a query string to filter, or leave it empty to get the full index. PRECONDITION: only use this tool after detect_project_type returns "aemaacs".`,
    {
      query: z.string().optional().describe('Optional skill id or keyword (e.g. "dispatcher", "migration", "create-component"). Empty = list all.'),
    },
    {
      title: 'AEM Cloud Service Skills Index',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ query }) => {
      const skills = query?.trim()
        ? [findAemCloudSkill(query.trim())].filter(Boolean) as typeof AEM_CLOUD_SKILLS
        : AEM_CLOUD_SKILLS;

      if (!skills.length) {
        return {
          content: [{
            type: 'text' as const,
            text: `No AEMaaCS skill matched "${query}". Try one of: ${AEM_CLOUD_SKILLS.map((s) => s.id).join(', ')}.`,
          }],
        };
      }

      const sections: string[] = [];
      sections.push(`# Adobe AEM as a Cloud Service — Skills (${skills.length})\n\nAll skills are **[BETA]**. Source: https://github.com/adobe/skills/tree/beta/skills/aem/cloud-service`);

      for (const s of skills) {
        sections.push(
          `## \`${s.id}\` — ${s.title} [${s.status.toUpperCase()}]\n\n` +
          `**Description:** ${s.description}\n\n` +
          `**When to use:** ${s.when}\n\n` +
          `**SKILL.md:** ${s.path}\n\n` +
          (s.subSkills?.length
            ? `**Sub-skills:**\n${s.subSkills.map((ss) => `- \`${ss.id}\` — ${ss.description}`).join('\n')}`
            : ''),
        );
      }

      if (!query) {
        sections.push(
          `## Hard rules that apply to **every** AEMaaCS task\n\n${AEM_CLOUD_HARD_RULES.map((r) => `- ${r}`).join('\n')}`,
        );
        sections.push(`## Canonical project layout\n\n\`\`\`\n${AEM_CLOUD_PROJECT_STRUCTURE}\n\`\`\``);
      }

      sections.push(
        `## Routing\n\n` +
        `- Workspace has no \`AGENTS.md\` → call \`ensure_agents_md\` first.\n` +
        `- Creating a component → \`scaffold_aem_component\`.\n` +
        `- Migrating one legacy pattern → \`aem_migration_pattern\`.\n` +
        `- Java/OSGi/HTL guardrails → \`aem_best_practices\`.\n` +
        `- Dispatcher config → \`aem_dispatcher_config\`.`,
      );

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}
