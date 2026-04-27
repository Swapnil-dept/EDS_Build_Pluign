import { z } from 'zod';
const REPL_ROOT = 'https://github.com/adobe/skills/tree/beta/skills/aem/6.5-lts/skills/aem-replication';
const SUB_SKILLS = {
    'configure-replication-agent': {
        title: 'Configure Replication Agent',
        when: 'First-time setup, adding a new publish, reconfiguring agents (default / dispatcher-flush / reverse).',
        advice: `Configure agents at \`/etc/replication/agents.author/<agent>/\` (Author) or
\`/etc/replication/agents.publish/<agent>/\` (Publish).

Common agent types:
- **Default** (\`/etc/replication/agents.author/publish\`): Author → Publish, content distribution.
- **Dispatcher Flush** (\`/etc/replication/agents.publish/flush\`): Publish → Dispatcher, cache invalidation.
- **Reverse Replication** (\`/etc/replication/agents.publish/outbox\` + Author \`reverse\`): Publish → Author, user-generated content (forms, comments).
- **Static** (rare): Push to a remote filesystem.

Critical settings on each agent:
- **Serialization Type** — usually \`Default\`.
- **Transport URI** — \`http://<host>:<port>/bin/receive?sling:authRequestLogin=1\`. For dispatcher flush use the Dispatcher's own host.
- **Transport User** — service user (e.g. \`replication-service\`). Avoid \`admin\`.
- **Triggers** — On Modification / On Distribute / No Status Update / No Versioning, depending on agent role.
- **Retry Delay** — start at 60 000 ms.
- **Batch Mode** — leave off unless the queue is overwhelmed.

Multi-publish: clone the default agent per publish (\`publish2\`, \`publish3\`, …). Use the **Sling Topology** for HA when available.`,
    },
    'replicate-content': {
        title: 'Replicate Content',
        when: 'Activate / deactivate pages, assets, or DAM content from UI or workflows.',
        advice: `Available paths:

| Approach | When |
|---|---|
| **Quick Publish** | One-page activation, no scheduling |
| **Manage Publication** | Bulk + scheduling + approval workflow |
| **Tree Activation** (\`/etc/replication/treeactivation.html\`) | Hierarchical bulk with options (modified-only, deactivated children, etc.) |
| **Package Manager** | Move a defined content set across environments |
| **Workflow** | Approval-gated activation (Request for Activation, Publish Example, …) |
| **Scheduled Activation** | \`On/Off Time\` properties on the page |

Always prefer Manage Publication or a workflow over Quick Publish for production paths.`,
    },
    'replication-api': {
        title: 'Replication API (programmatic)',
        when: 'Custom code: bulk operations, workflow process steps, servlets, scheduler jobs.',
        advice: `Public API (com.day.cq.replication):

\`\`\`java
@Reference
private Replicator replicator;

ReplicationOptions opts = new ReplicationOptions();
opts.setSynchronous(false);                            // async = use the queue
opts.setSuppressVersions(false);                       // create version on activate
opts.setSuppressStatusUpdate(false);
opts.setFilter(agent -> "publish".equals(agent.getId())); // narrow to one agent

replicator.replicate(session, ReplicationActionType.ACTIVATE, "/content/mysite/page", opts);
\`\`\`

Other surfaces:
- \`ReplicationStatus\` — query \`isActivated()\`, \`getLastPublished()\`, \`getLastReplicationAction()\`.
- \`AgentManager\` — list/inspect agents at runtime.
- \`ReplicationQueue\` — read queue size, blocked entries.
- \`ReplicationListener\` — \`@Component(service=ReplicationListener.class)\` to react to start/finish.

Use a service user via \`ResourceResolverFactory.getServiceResourceResolver(Map.of(SUBSERVICE, "replication-service"))\` then \`.adaptTo(Session.class)\`. Never \`loginAdministrative\`.

Foundation reference: \`references/replication-foundation/api-reference.md\`.`,
    },
    'troubleshoot-replication': {
        title: 'Troubleshoot Replication',
        when: 'Blocked queues, content not appearing, connection errors, stuck jobs.',
        advice: `Diagnostic flow:

1. **Agent test connection** — open the agent in \`/etc/replication\`, click *Test Connection*. 200 = OK; 401/403 = transport user; 502/504 = network.
2. **Queue inspection** — \`/etc/replication/agents.author/<agent>.queue.json\`. A non-empty queue with the same head item for minutes = blocked.
3. **Logs** — \`crx-quickstart/logs/error.log\` (filter for \`Replication\`, \`AgentManager\`, agent id). On AMS, pull via the AMS log access URL.
4. **JMX** — \`com.day.cq.replication.Agent\` MBeans expose retry / clear / process methods. \`clear\` only as last resort (data loss).
5. **Dispatcher cache** — content activated but not visible? Check \`/etc/replication/treeactivation.html\` for the dispatcher-flush agent state, then test the page directly against publish (bypassing dispatcher).
6. **Reverse replication outbox** — for UGC, inspect \`/var/replication/outbox\` on Publish.

Common causes: wrong transport URI / user, blocked port, expired SSL cert, \`/var\` full, replication thread pool exhausted, scheduled-activation date in the past, ACL denies on transport user, dispatcher \`/cache\` directive missing the path.`,
    },
    'replication-orchestrator': {
        title: 'Replication Orchestrator',
        when: 'End-to-end: new env setup, prod incident response, perf optimisation, migration prep.',
        advice: 'Sequence: configure agents → run a small test activation → monitor queues → tune retry delays / dispatcher flush → document per-environment differences. For migration prep: audit code for agent-id coupling (filter callers) — that is the biggest blocker when moving to Cloud Service Sling Distribution.',
    },
};
export function registerAem65Replication(server) {
    server.tool('aem65_replication', `Route AEM 6.5 LTS / AMS Replication tasks to the right specialist (configure-replication-agent | replicate-content | replication-api | troubleshoot-replication | replication-orchestrator). Mirrors Adobe's "aem-replication" skill index. PRECONDITION: only after detect_project_type returns "aem65lts". DO NOT use on AEM as a Cloud Service — Cloud uses the Sling Distribution API instead, and the migration skill in cloud-service/best-practices/references/replication.md handles that.`, {
        intent: z.enum(['configure-replication-agent', 'replicate-content', 'replication-api', 'troubleshoot-replication', 'replication-orchestrator']).describe('Which replication specialist to route to.'),
        question: z.string().optional().describe('The user question, in their words. Echoed back so the IDE LLM keeps context.'),
    }, {
        title: 'AEM 6.5 LTS Replication',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ intent, question }) => {
        const s = SUB_SKILLS[intent];
        const sections = [];
        sections.push(`# AEM 6.5 LTS Replication — ${s.title}\n\nSource (BETA): ${REPL_ROOT}/${intent}/SKILL.md`);
        if (question)
            sections.push(`**User question:** ${question}`);
        sections.push(`## When to use this specialist\n\n${s.when}`);
        sections.push(`## Guidance\n\n${s.advice}`);
        sections.push(`## 6.5 LTS guardrails for replication\n\n` +
            `- Use a **service user** for the transport user (e.g. \`replication-service\` with proper ACLs). Never use \`admin\`.\n` +
            `- Code paths must use \`ResourceResolverFactory.getServiceResourceResolver(...)\` with a sub-service mapping — never \`loginAdministrative\`.\n` +
            `- Do not couple business logic to a specific agent id when possible — it blocks future migration to Cloud Service Sling Distribution.\n` +
            `- On AMS, use the AMS log access URL for \`error.log\` / \`replication.log\`. On classic on-prem, read \`crx-quickstart/logs/\` directly.\n` +
            `- Migrating to Cloud Service later? Replication agents do **not** exist there — see \`skills/aem/cloud-service/skills/best-practices/references/replication.md\` for the equivalent Sling Distribution pattern.`);
        sections.push(`## Foundation references\n\n` +
            `- Agent types: ${REPL_ROOT}/references/replication-foundation/agent-types.md\n` +
            `- Queue mechanics: ${REPL_ROOT}/references/replication-foundation/queue-mechanics.md\n` +
            `- 6.5 LTS guardrails: ${REPL_ROOT}/references/replication-foundation/65-lts-guardrails.md\n` +
            `- API quick reference: ${REPL_ROOT}/references/replication-foundation/api-reference.md`);
        sections.push(`## Adobe docs\n\n- Replication: https://experienceleague.adobe.com/en/docs/experience-manager-65-lts/content/implementing/deploying/configuring/replication\n- Troubleshooting: https://experienceleague.adobe.com/en/docs/experience-manager-65-lts/content/implementing/deploying/configuring/troubleshoot-rep\n- Replication Javadoc: https://developer.adobe.com/experience-manager/reference-materials/6-5-lts/javadoc/com/day/cq/replication/package-summary.html`);
        return { content: [{ type: 'text', text: sections.join('\n\n') }] };
    });
}
//# sourceMappingURL=aem65-replication.js.map