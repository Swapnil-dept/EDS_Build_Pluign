import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const CLOUD_ROOT = 'https://github.com/adobe/skills/tree/beta/skills/aem/cloud-service/skills/dispatcher';
const LTS_ROOT   = 'https://github.com/adobe/skills/tree/beta/skills/aem/6.5-lts/skills/dispatcher';

const SUB_SKILLS: Record<string, { title: string; when: string; advice: string }> = {
  'config-authoring': {
    title: 'Config Authoring',
    when: 'Create / modify / review / harden dispatcher config files (`.any`, vhost, rewrite, cache, filter).',
    advice: `Files live under \`dispatcher/src/conf.dispatcher.d/\`:
- \`available_vhosts/\` + \`enabled_vhosts/\` — Apache vhost configs.
- \`available_farms/\` + \`enabled_farms/\` — dispatcher farm configs.
- \`filters/\` — request filter rules (most common edits live here).
- \`cache/\` — cache rules (\`statfileslevel\`, headers).
- \`rewrites/\` — mod_rewrite rules.
- \`clientheaders/\` — header allowlists.

Validate locally before committing:
\`\`\`bash
cd dispatcher && bin/validator.sh -d out src/conf.dispatcher.d
\`\`\``,
  },
  'technical-advisory': {
    title: 'Technical Advisory',
    when: 'Conceptual questions: `statfileslevel`, filter rule semantics, URL decomposition, cache invalidation, rewrite behaviour, security headers.',
    advice: 'Use the Adobe docs links below + read the matching SKILL.md. The advisory skill ships an evidence checklist — record the exact directive name, the file it lives in, and the test that confirmed the behaviour.',
  },
  'incident-response': {
    title: 'Incident Response',
    when: 'Live incident: probe regression, cache anomaly, surge in 503/504, sudden invalidation cascades.',
    advice: `Reach for the core-7 MCP tools (when configured): \`tail_logs\`, \`monitor_metrics\`, \`inspect_cache\`, \`trace_request\`. Do not edit configs during an incident — capture evidence first.`,
  },
  'performance-tuning': {
    title: 'Performance Tuning',
    when: 'Optimise cache hit ratio, response latency, throughput.',
    advice: 'Start with `inspect_cache` + `monitor_metrics`. Tune `statfileslevel`, cache rules per content path, and TTLs. Avoid blanket `/.*` invalidations.',
  },
  'security-hardening': {
    title: 'Security Hardening',
    when: 'Audit exposure, threat model, header hardening, deny rules.',
    advice: 'Lock down the filter farm (deny by default, allow specific paths). Enforce HSTS, CSP, X-Frame-Options at the vhost. Review `clientheaders/` for unnecessary header passthrough. Block direct access to `/system/*`, `/crx/*`, `/etc/*` from publish.',
  },
  'workflow-orchestrator': {
    title: 'Workflow Orchestrator',
    when: 'End-to-end lifecycle (design → implement → validate → release → incident) or requests spanning multiple concerns.',
    advice: 'Route to the right specialist per phase; never compress all phases into a single change.',
  },
};

const MCP_TOOLS = [
  ['validate',         'Static config validation'],
  ['lint',             'Deep / order-aware linting'],
  ['sdk',              'SDK check-files & diff-baseline'],
  ['trace_request',    'Trace a request through dispatcher'],
  ['inspect_cache',    'Inspect cache state'],
  ['monitor_metrics',  'Runtime metrics'],
  ['tail_logs',        'Log tailing'],
];

export function registerAemDispatcherConfig(server: McpServer) {
  server.tool(
    'aem_dispatcher_config',
    `Route AEM Dispatcher requests to the right specialist (config authoring, technical advisory, incident response, performance tuning, security hardening, full lifecycle). Mirrors Adobe's "dispatcher" skill index. Pass \`variant\` to pick the deployment target: "cloud" (AEMaaCS, AEM_DEPLOYMENT_MODE=cloud) or "ams" (AEM 6.5 LTS / AMS, AEM_DEPLOYMENT_MODE=ams). Returns scoped guidance, the right Adobe SKILL.md link, and the matching MCP core-7 tools (when the user has Dispatcher MCP configured for that variant). PRECONDITION: only after detect_project_type returns "aemaacs" (variant=cloud) or "aem65lts" (variant=ams).`,
    {
      variant:  z.enum(['cloud', 'ams']).describe('cloud = AEMaaCS (AEM_DEPLOYMENT_MODE=cloud). ams = AEM 6.5 LTS / AMS (AEM_DEPLOYMENT_MODE=ams). Match this to the result of detect_project_type.'),
      intent:   z.enum(['config-authoring', 'technical-advisory', 'incident-response', 'performance-tuning', 'security-hardening', 'workflow-orchestrator']).describe('Which dispatcher specialist to route to.'),
      question: z.string().optional().describe('The user question, in their words. Echoed back so the IDE LLM keeps context.'),
    },
    {
      title: 'AEM Dispatcher',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ variant, intent, question }) => {
      const s = SUB_SKILLS[intent];
      const sections: string[] = [];
      const root = variant === 'cloud' ? CLOUD_ROOT : LTS_ROOT;
      const variantLabel = variant === 'cloud' ? 'AEMaaCS' : 'AEM 6.5 LTS / AMS';
      const deploymentMode = variant === 'cloud' ? 'cloud' : 'ams';

      sections.push(`# AEM Dispatcher (${variantLabel}) — ${s.title}\n\nSource (BETA): ${root}/${intent}/SKILL.md`);
      if (question) sections.push(`**User question:** ${question}`);
      sections.push(`## When to use this specialist\n\n${s.when}`);
      sections.push(`## Guidance\n\n${s.advice}`);
      sections.push(`## MCP core-7 tools (${variantLabel} variant)\n\n${MCP_TOOLS.map(([t, d]) => `- \`${t}\` — ${d}`).join('\n')}\n\nRequires \`AEM_DEPLOYMENT_MODE=${deploymentMode}\` in the Dispatcher MCP configuration.`);
      sections.push(variant === 'cloud'
        ? `## Cloud Service hard rules for Dispatcher\n\n- Configs live under \`dispatcher/src/conf.dispatcher.d/\`. Do not put cloud configs under \`/libs\` or \`/conf\`.\n- Use the Dispatcher SDK validator before committing — Cloud Manager will reject invalid configs.\n- Never bypass the filter farm (\`/0001\` deny-all default) by widening on the publish farm without justification.\n- Never deploy publish vhosts that expose \`/system/\`, \`/crx/\`, \`/etc/\`, \`/apps/\`, or \`/var/\` paths.`
        : `## 6.5 LTS / AMS hard rules for Dispatcher\n\n- AMS layout differs from Cloud SDK — configs typically live under \`dispatcher/src/conf.d/\` and \`dispatcher/src/conf.dispatcher.d/\` per the AMS template. Confirm with the AMS engagement-specific layout.\n- Use \`httpd -t -f <httpd.conf>\` or \`apachectl configtest\` to validate Apache syntax before committing.\n- Never expose \`/system/\`, \`/crx/\`, \`/etc/\`, \`/apps/\`, or \`/var/\` from publish vhosts.\n- Cache invalidation runs via the **Dispatcher Flush** replication agent on Publish (not Sling Distribution). See \`aem65_replication\` for agent setup.`);
      sections.push(variant === 'cloud'
        ? `## Adobe docs\n\n- Dispatcher overview: https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/content-delivery/disp-overview\n- Dispatcher SDK: https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/content-delivery/validation-debug`
        : `## Adobe docs\n\n- Dispatcher (6.5 LTS): https://experienceleague.adobe.com/en/docs/experience-manager-dispatcher/using/dispatcher\n- 6.5 LTS docs: https://experienceleague.adobe.com/en/docs/experience-manager-65-lts/content/home`);

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}
