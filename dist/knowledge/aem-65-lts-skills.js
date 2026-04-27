/**
 * AEM 6.5 LTS — skills catalog & conventions
 *
 * Mirrors the Adobe Skills repo at
 *   https://github.com/adobe/skills/tree/beta/skills/aem/6.5-lts
 *
 * 6.5 LTS targets on-prem and Adobe Managed Services (AMS) — NOT AEM as a
 * Cloud Service. The Java/OSGi stack is the same shape (Maven project with
 * core / ui.apps / dispatcher / ...), but several things differ:
 *
 *   - pom depends on `com.adobe.aem:uber-jar` (any classifier) or
 *     `cq.quickstart.version` — never `aem-sdk-api`
 *   - JMX is allowed (workflow purge, retry, stale detection)
 *   - Felix SCR annotations are still supported alongside OSGi DS R6
 *   - Deployment via Package Manager / Maven Content Package Plugin
 *     (not Cloud Manager pipelines)
 *   - Replication uses legacy agents, NOT Sling Distribution
 *   - Dispatcher MCP variant is `ams` (AEM_DEPLOYMENT_MODE=ams)
 */
const ROOT = 'https://github.com/adobe/skills/tree/beta/skills/aem/6.5-lts/skills';
export const AEM_65_LTS_SKILLS = [
    {
        id: 'ensure-agents-md',
        title: 'Ensure AGENTS.md & CLAUDE.md (6.5 LTS variant)',
        description: 'Bootstrap step. Run FIRST in any AEM 6.5 LTS / AMS workspace that lacks `AGENTS.md`. Detects modules and add-ons from `pom.xml`, generates an AGENTS.md tailored for AEM 6.5 (not Cloud Service), and creates `CLAUDE.md` (`@AGENTS.md`). Resource links point to `experienceleague.adobe.com/.../experience-manager-65/...`, never to Cloud Service URLs.',
        when: 'Workspace root has no AGENTS.md and `pom.xml` references `com.adobe.aem:uber-jar` (any classifier), `cq-quickstart`, or `cq.quickstart.version` / `aem.version` in the 6.5 line. Excludes Cloud Service projects (those use the cloud-service variant).',
        path: `${ROOT}/ensure-agents-md`,
        status: 'beta',
    },
    {
        id: 'aem-replication',
        title: 'AEM Replication (6.5 LTS / AMS)',
        description: 'Single entry point for AEM 6.5 LTS Replication. Covers configuring agents (default, dispatcher flush, reverse), activating/deactivating content (Quick Publish / Manage Publication / Tree Activation / Package Manager / Workflows / Scheduled), the Replication API (Replicator, ReplicationOptions, ReplicationStatus, AgentManager, ReplicationQueue, ReplicationListener), and troubleshooting (blocked queues, connection errors, dispatcher cache, agent config).',
        when: 'Replication agent setup, content activation/deactivation, Replicator API integration, blocked queues, connectivity issues, distribution problems. NOT applicable to Cloud Service (which uses Sling Distribution).',
        path: `${ROOT}/aem-replication`,
        status: 'beta',
        subSkills: [
            { id: 'configure-replication-agent', description: 'Set up default / dispatcher-flush / reverse / multi-publish agents' },
            { id: 'replicate-content', description: 'Quick Publish, Manage Publication, Tree Activation, Package Manager, Workflows, Scheduled' },
            { id: 'replication-api', description: 'Replicator, ReplicationOptions, ReplicationStatus, AgentManager, ReplicationQueue, ReplicationListener' },
            { id: 'troubleshoot-replication', description: 'Blocked queues, connection errors, content not appearing, agent config, stuck jobs' },
            { id: 'replication-orchestrator', description: 'New env setup, incident response, perf optimisation, migration prep' },
        ],
    },
    {
        id: 'aem-workflow',
        title: 'AEM Workflow (6.5 LTS / AMS)',
        description: 'Single entry point for AEM 6.5 LTS Granite Workflow. Routes to specialists for model design, custom WorkflowProcess / ParticipantStepChooser development, launchers, triggering (incl. replication triggers), debugging stuck/failed workflows, triaging with JMX + Splunk + direct log access, thread pool analysis, and Sling Jobs.',
        when: 'Workflow models, WorkflowProcess, ParticipantStepChooser, launchers, Inbox tasks, stuck/failed workflows, JMX-driven retry/purge, replication-triggered workflows.',
        path: `${ROOT}/aem-workflow`,
        status: 'beta',
        subSkills: [
            { id: 'workflow-model-design', description: 'Workflow model XML, step types, OR/AND splits, variables' },
            { id: 'workflow-development', description: 'WorkflowProcess, ParticipantStepChooser, OSGi service registration' },
            { id: 'workflow-triggering', description: 'Timeline UI, Manage Publication, WorkflowSession API, HTTP API, replication triggers' },
            { id: 'workflow-launchers', description: 'Launcher config, JCR event binding, OOTB overlay' },
            { id: 'workflow-debugging', description: 'Stuck workflows, failed steps, JMX remediation, thread pools, purge' },
            { id: 'workflow-triaging', description: 'Symptom classification, JMX diagnostics, log patterns, Splunk queries' },
            { id: 'workflow-orchestrator', description: 'Full lifecycle across all workflow specialists' },
        ],
    },
    {
        id: 'dispatcher',
        title: 'Dispatcher (6.5 LTS / AMS)',
        description: 'Single entry point for the Apache HTTPD Dispatcher module on AEM 6.5 LTS / AMS. Routes to specialists for config authoring, technical advisory, incident response, performance tuning, security hardening, and full-lifecycle orchestration. Dispatcher MCP variant: `AMS` (`AEM_DEPLOYMENT_MODE=ams`).',
        when: 'Editing `.any` / vhost / rewrite / cache / filter files; debugging cache anomalies; tuning latency/throughput; auditing exposure / headers on AMS or on-prem.',
        path: `${ROOT}/dispatcher`,
        status: 'beta',
        subSkills: [
            { id: 'config-authoring', description: 'Create/modify/review/harden dispatcher config files' },
            { id: 'technical-advisory', description: 'Conceptual questions (statfileslevel, filter rules, URL decomposition, cache invalidation)' },
            { id: 'incident-response', description: 'Investigate runtime incidents, cache anomalies' },
            { id: 'performance-tuning', description: 'Cache efficiency, latency, throughput' },
            { id: 'security-hardening', description: 'Security audit, threat model, exposure control, header hardening' },
            { id: 'workflow-orchestrator', description: 'End-to-end lifecycle' },
        ],
    },
];
export function findAem65LtsSkill(query) {
    const q = query.toLowerCase().trim();
    return AEM_65_LTS_SKILLS.find((s) => s.id === q || s.title.toLowerCase() === q || s.id.includes(q) || s.title.toLowerCase().includes(q));
}
// ─── Hard rules / 6.5 LTS guardrails ────────────────────────
export const AEM_65_LTS_HARD_RULES = [
    '6.5 LTS is **not** AEM as a Cloud Service. Resource links and APIs target `experience-manager-65` docs and the **6.5 LTS Javadoc**, not Cloud Service URLs.',
    'Avoid editing `/libs`. Use overlays under `/apps` or store at `/conf/global/`.',
    'Workflow model **design-time** path: `/conf/global/settings/workflow/models/<id>` (preferred) or `/etc/workflow/models/<id>` (legacy).',
    'Workflow model **runtime** path (for API calls): `/var/workflow/models/<id>`.',
    'Launcher config path: `/conf/global/settings/workflow/launcher/config/` (preferred).',
    'Use `ResourceResolverFactory.getServiceResourceResolver()` with a sub-service. Avoid `loginAdministrative()`.',
    'OSGi DS R6 annotations are preferred. **Felix SCR is still supported on 6.5 LTS** (unlike Cloud Service) but new code should use DS.',
    'Deploy via Package Manager or Maven + Content Package Plugin (no Cloud Manager pipeline on 6.5).',
    'JMX is **allowed** on 6.5 / AMS — `retryFailedWorkItems`, `countStaleWorkflows`, `restartStaleWorkflows`, `purgeCompleted` are valid here (they are forbidden on Cloud Service).',
    'Replication uses legacy **replication agents** (Replicator API). Cloud Service uses Sling Distribution — do not mix the two patterns.',
    'Dispatcher MCP variant for 6.5 / AMS: `AEM_DEPLOYMENT_MODE=ams` (Cloud uses `cloud`).',
];
// ─── Project layout (6.5 LTS) ───────────────────────────────
export const AEM_65_LTS_PROJECT_STRUCTURE = `
AEM 6.5 LTS / AMS project layout (Maven, classic / archetype):

/
├── core/                         # OSGi bundles (Java)
│   └── src/main/java/com/<org>/<project>/core/
│       ├── models/               # Sling Models
│       ├── servlets/             # Sling Servlets
│       └── services/             # OSGi services (DS R6 preferred; SCR still supported)
├── ui.apps/                      # /apps content package
│   └── src/main/content/jcr_root/apps/<project>/
│       ├── components/<name>/.content.xml
│       ├── components/<name>/_cq_dialog/.content.xml
│       ├── components/<name>/<name>.html       # HTL
│       └── clientlibs/clientlib-<name>/        # CSS + JS + js.txt + css.txt
├── ui.config/                    # OSGi configs
├── ui.content/                   # /content seed
├── ui.frontend/                  # webpack / npm clientlibs source (optional)
├── ui.tests/                     # UI tests (optional)
├── it.tests/                     # Sling integration tests (optional)
├── dispatcher/                   # Apache HTTPD Dispatcher config (AMS or classic layout)
├── all/                          # Aggregator content package (deployed via Package Manager)
├── pom.xml                       # Reactor pom — depends on uber-jar / cq.quickstart.version
├── AGENTS.md                     # Created by ensure-agents-md (6.5 LTS variant)
└── CLAUDE.md                     # @AGENTS.md
`.trim();
//# sourceMappingURL=aem-65-lts-skills.js.map