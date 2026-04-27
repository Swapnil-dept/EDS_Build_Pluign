import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const WF_ROOT = 'https://github.com/adobe/skills/tree/beta/skills/aem/6.5-lts/skills/aem-workflow';

const SUB_SKILLS: Record<string, { title: string; when: string; advice: string }> = {
  'workflow-model-design': {
    title: 'Workflow Model Design',
    when: 'Create a workflow model, add steps, design OR/AND splits, configure variables.',
    advice: `Design-time path: \`/conf/global/settings/workflow/models/<id>\` (preferred) or \`/etc/workflow/models/<id>\` (legacy).
Runtime path (used when starting workflows via API): \`/var/workflow/models/<id>\`.

Steps are nodes under \`<model>/jcr:content/flow/...\`:
- \`process\` — \`PROCESS\` step calling a \`WorkflowProcess\` OSGi service via \`PROCESS_AUTO_ADVANCE\` + \`PROCESS\` properties.
- \`participant\` — assigns to a user/group; can use a \`ParticipantStepChooser\`.
- \`split\` — OR/AND split with branches.
- \`container\` — sub-workflow.

Variables live on \`<model>/jcr:content/metaData\`. For runtime data, use the WorkflowData metadata map.`,
  },
  'workflow-development': {
    title: 'Workflow Development (WorkflowProcess / ParticipantStepChooser)',
    when: 'Implement a custom WorkflowProcess step, ParticipantStepChooser, OSGi service registration.',
    advice: `\`\`\`java
@Component(service = WorkflowProcess.class, property = {
    "process.label=My Custom Step"
})
public class MyProcess implements WorkflowProcess {
    @Reference
    private ResourceResolverFactory resolverFactory;

    @Override
    public void execute(WorkItem item, WorkflowSession session, MetaDataMap args) throws WorkflowException {
        try (ResourceResolver resolver = resolverFactory.getServiceResourceResolver(
                Map.of(ResourceResolverFactory.SUBSERVICE, "workflow-process-service"))) {
            String payload = (String) item.getWorkflowData().getPayload();
            // ... do work ...
        } catch (LoginException e) {
            throw new WorkflowException("service user not mapped", e);
        }
    }
}
\`\`\`

Pass step arguments via PROCESS_ARGS in the model (\`<step>/metaData/PROCESS_ARGS\`). They arrive in \`args\`.

ParticipantStepChooser implements \`com.adobe.granite.workflow.exec.ParticipantStepChooser\` and returns the dynamic principal.`,
  },
  'workflow-triggering': {
    title: 'Workflow Triggering',
    when: 'Start a workflow from code, HTTP API, Timeline UI, Manage Publication, or replication trigger.',
    advice: `Programmatic:

\`\`\`java
WorkflowSession wfSession = resolver.adaptTo(WorkflowSession.class);
WorkflowModel model = wfSession.getModel("/var/workflow/models/<id>");
WorkflowData data = wfSession.newWorkflowData("JCR_PATH", payloadPath);
wfSession.startWorkflow(model, data);
\`\`\`

HTTP: \`POST /etc/workflow/instances\` with \`model=<runtime-path>\` + \`payloadType=JCR_PATH\` + \`payload=<path>\`.

Replication trigger: configure on \`/conf/global/settings/workflow/launcher/config/<launcher>\` with \`event=ReplicationEvent\` + \`condition\` filter on path / action.

Manage Publication uses the \`request_for_activation\` model by default — overlay it under \`/apps\` to customise.`,
  },
  'workflow-launchers': {
    title: 'Workflow Launchers',
    when: 'Auto-start a workflow on JCR events (asset upload, content modification, etc.).',
    advice: `Path: \`/conf/global/settings/workflow/launcher/config/<launcher>\` (preferred). Properties:

- \`enabled\` — Boolean.
- \`eventType\` — JCR event type bitmask (1=ADDED, 2=REMOVED, 4=MODIFIED, ...).
- \`glob\` — node-name pattern (e.g. \`/content/dam(/.*)?\`).
- \`nodetype\` — usually \`nt:file\` or \`cq:Page\`.
- \`workflow\` — runtime model path (\`/var/workflow/models/<id>\`).
- \`runModes\` — restrict to \`author\` for editorial workflows.
- \`condition\` — JEXL guard (e.g. \`event.path matches '.*\\\\.png'\`).

To overlay an OOTB launcher, copy from \`/libs/settings/workflow/launcher/config/...\` to \`/conf/global/settings/workflow/launcher/config/...\` and edit.`,
  },
  'workflow-debugging': {
    title: 'Workflow Debugging',
    when: 'Workflow stuck, failed step, missing Inbox task, stale instances, thread pool exhaustion, purge.',
    advice: `JMX is allowed on 6.5 LTS — use it.

| Symptom | JMX MBean / op |
|---|---|
| Stuck items | \`com.adobe.granite.workflow.core.WorkflowEngine\` → \`countStaleWorkflows()\` |
| Restart stale | \`restartStaleWorkflows(dryRun=true)\` then \`dryRun=false\` |
| Retry failed | \`retryFailedWorkItems()\` |
| Purge completed | \`purgeCompleted(daysOld, modelId, dryRun)\` |

Thread pools live in OSGi config \`com.adobe.granite.workflow.core.WorkflowSessionFactory\` — increase \`max.parallel.jobs\` only after diagnosing the bottleneck (don't paper over a slow step).

Inbox missing? Check \`/var/workflow/instances\` for the running instance, confirm the participant principal exists, check \`workflow.log\`.`,
  },
  'workflow-triaging': {
    title: 'Workflow Triaging',
    when: 'Classify a workflow incident, determine required logs, JMX diagnostics, Splunk queries.',
    advice: 'Capture: workflow id (model), instance id, step type, payload path, time of failure, error.log + workflow.log lines, JMX queue snapshot. On AMS, use the AMS log access URL with a Splunk query keyed on the instance id.',
  },
  'workflow-orchestrator': {
    title: 'Workflow Orchestrator',
    when: 'End-to-end lifecycle or requests spanning multiple workflow concerns.',
    advice: 'Coordinate model design → development → triggering → launchers → debugging → triaging. Don\'t collapse phases; commit each phase separately.',
  },
};

export function registerAem65Workflow(server: McpServer) {
  server.tool(
    'aem65_workflow',
    `Route AEM 6.5 LTS / AMS Workflow tasks to the right specialist (workflow-model-design | workflow-development | workflow-triggering | workflow-launchers | workflow-debugging | workflow-triaging | workflow-orchestrator). Mirrors Adobe's "aem-workflow" skill index for 6.5. PRECONDITION: only after detect_project_type returns "aem65lts". Differs from the Cloud Service variant: JMX is allowed on 6.5 (purge / retry / stale detection), Felix SCR is still supported, and design-time models may live under /etc/workflow/models for legacy projects.`,
    {
      intent: z.enum(['workflow-model-design', 'workflow-development', 'workflow-triggering', 'workflow-launchers', 'workflow-debugging', 'workflow-triaging', 'workflow-orchestrator']).describe('Which workflow specialist to route to.'),
      question: z.string().optional().describe('The user question, in their words.'),
    },
    {
      title: 'AEM 6.5 LTS Workflow',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ intent, question }) => {
      const s = SUB_SKILLS[intent];
      const sections: string[] = [];

      sections.push(`# AEM 6.5 LTS Workflow — ${s.title}\n\nSource (BETA): ${WF_ROOT}/${intent}/SKILL.md`);
      if (question) sections.push(`**User question:** ${question}`);
      sections.push(`## When to use this specialist\n\n${s.when}`);
      sections.push(`## Guidance\n\n${s.advice}`);
      sections.push(
        `## 6.5 LTS guardrails for workflow\n\n` +
        `- Avoid editing \`/libs\` — overlay under \`/apps\` or store under \`/conf/global/\`.\n` +
        `- Design-time path: \`/conf/global/settings/workflow/models/<id>\` (preferred) or \`/etc/workflow/models/<id>\` (legacy).\n` +
        `- Runtime path: \`/var/workflow/models/<id>\`.\n` +
        `- Launcher path: \`/conf/global/settings/workflow/launcher/config/\`.\n` +
        `- Service user: \`workflow-process-service\` via \`getServiceResourceResolver\`. Avoid \`loginAdministrative\`.\n` +
        `- OSGi DS R6 preferred; Felix SCR still supported.\n` +
        `- JMX allowed: \`retryFailedWorkItems\`, \`countStaleWorkflows\`, \`restartStaleWorkflows\`, \`purgeCompleted\`.\n` +
        `- Deploy via Package Manager / Maven Content Package Plugin.`,
      );
      sections.push(`## Adobe docs\n\n- Workflow (6.5 LTS): https://experienceleague.adobe.com/en/docs/experience-manager-65-lts/content/sites/administering/operations/workflows\n- Granite Workflow Javadoc: https://developer.adobe.com/experience-manager/reference-materials/6-5-lts/javadoc/com/adobe/granite/workflow/package-summary.html`);

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}
