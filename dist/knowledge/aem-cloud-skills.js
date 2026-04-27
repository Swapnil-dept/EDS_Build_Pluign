/**
 * AEM as a Cloud Service — skills catalog & conventions
 *
 * Mirrors the Adobe Skills repo at
 *   https://github.com/adobe/skills/tree/beta/skills/aem/cloud-service
 *
 * The actual SKILL.md files (and their `references/*.md`) live in Adobe's
 * repo. This module surfaces the index, hard rules, project layout, and
 * pattern map that the IDE LLM needs to route correctly.
 */
const ROOT = 'https://github.com/adobe/skills/tree/beta/skills/aem/cloud-service/skills';
export const AEM_CLOUD_SKILLS = [
    {
        id: 'ensure-agents-md',
        title: 'Ensure AGENTS.md & CLAUDE.md',
        description: 'Bootstrap step. Run FIRST in any AEMaaCS workspace that lacks `AGENTS.md` at the repo root. Detects modules and add-ons from `pom.xml`, generates a tailored AGENTS.md, and creates `CLAUDE.md` (`@AGENTS.md`).',
        when: 'Workspace root has no AGENTS.md and `pom.xml` references `aem-sdk-api` / `aem-project-archetype` or has classic AEM modules (core, ui.apps, dispatcher).',
        path: `${ROOT}/ensure-agents-md`,
        status: 'beta',
    },
    {
        id: 'best-practices',
        title: 'Best Practices (Java/OSGi/HTL)',
        description: 'Holds the **pattern reference modules** for Cloud Service-correct Java/OSGi code and HTL lint fixes (scheduler, ResourceChangeListener, replication, JCR observation event listener, OSGi Event Admin event handler, DAM AssetManager, Felix SCR → OSGi DS, ResourceResolver/SLF4J, HTL `data-sly-test` redundant constant).',
        when: 'Greenfield/maintenance Java work, refactoring legacy patterns, or fixing HTL Cloud SDK lint warnings without BPA orchestration.',
        path: `${ROOT}/best-practices`,
        status: 'beta',
    },
    {
        id: 'create-component',
        title: 'Create Component',
        description: 'Creates complete AEM components: `.content.xml`, `_cq_dialog/`, HTL template, Sling Model + tests, clientlibs, optional Sling Servlet. Supports extending Core Components via `@Self @Via(type = ResourceSuperType.class)` delegation. Reads `.aem-skills-config.yaml` (project root) before doing anything.',
        when: 'User asks to create / build / scaffold an AEM component (teaser, card, hero, banner, accordion, tabs, carousel, list, navigation, breadcrumb, custom). Extending Core Components, adding dialogs, building Sling Models, or converting Figma to HTL.',
        path: `${ROOT}/create-component`,
        status: 'beta',
    },
    {
        id: 'dispatcher',
        title: 'Dispatcher',
        description: 'Single entry point for the Apache HTTPD Dispatcher module on AEMaaCS. Routes to specialists for config authoring, technical advisory, incident response, performance tuning, security hardening, and full-lifecycle orchestration.',
        when: 'Editing `.any` / vhost / rewrite / cache / filter files; debugging probe regressions or cache anomalies; tuning latency/throughput; auditing exposure / headers.',
        path: `${ROOT}/dispatcher`,
        status: 'beta',
        subSkills: [
            { id: 'config-authoring', description: 'Create/modify/review/harden dispatcher config files' },
            { id: 'technical-advisory', description: 'Conceptual questions (statfileslevel, filter rules, URL decomposition, cache invalidation)' },
            { id: 'incident-response', description: 'Investigate runtime incidents, probe regressions, cache anomalies' },
            { id: 'performance-tuning', description: 'Cache efficiency, latency, throughput' },
            { id: 'security-hardening', description: 'Security audit, threat model, exposure control, header hardening' },
            { id: 'workflow-orchestrator', description: 'End-to-end lifecycle' },
        ],
    },
    {
        id: 'migration',
        title: 'Migration (legacy AEM → AEMaaCS)',
        description: 'Orchestrates legacy AEM 6.x / AMS / on-prem → AEMaaCS migration. Drives off **BPA** (CSV / cached collection) or **CAM via MCP**. Enforces **one pattern per session**. Delegates transformation to the `best-practices` references.',
        when: 'User has BPA/CAM findings, Cloud Service blockers, or wants to migrate code paths like scheduler, ResourceChangeListener, replication, EventListener, OSGi EventHandler, DAM AssetManager, or HTL `data-sly-test` lint.',
        path: `${ROOT}/migration`,
        status: 'beta',
    },
    {
        id: 'aem-workflow',
        title: 'AEM Workflow',
        description: 'Single entry point for AEMaaCS Granite Workflow. Routes to specialists for model design, custom process step / participant chooser development, launcher configuration, workflow triggering, debugging stuck/failed workflows, triaging with Cloud Manager logs, thread pool analysis, and Sling Job diagnostics.',
        when: 'User mentions workflow models, WorkflowProcess, ParticipantStepChooser, launchers, Inbox tasks, stuck/failed workflows, thread pool exhaustion, or workflow purge.',
        path: `${ROOT}/aem-workflow`,
        status: 'beta',
        subSkills: [
            { id: 'workflow-model-design', description: 'Workflow model XML, step types, OR/AND splits, variables' },
            { id: 'workflow-development', description: 'WorkflowProcess, ParticipantStepChooser, OSGi service registration' },
            { id: 'workflow-triggering', description: 'Start workflows from code / HTTP / Timeline UI / Manage Publication' },
            { id: 'workflow-launchers', description: 'Launcher config, auto-start on asset upload, OOTB overlay' },
            { id: 'workflow-debugging', description: 'Stuck workflows, failed steps, missing Inbox tasks, thread pools, purge' },
            { id: 'workflow-triaging', description: 'Classify workflow incidents, choose logs, Splunk queries' },
            { id: 'workflow-orchestrator', description: 'Full lifecycle across all workflow specialists' },
        ],
    },
];
export function findAemCloudSkill(query) {
    const q = query.toLowerCase().trim();
    return AEM_CLOUD_SKILLS.find((s) => s.id === q ||
        s.title.toLowerCase() === q ||
        s.id.includes(q) ||
        s.title.toLowerCase().includes(q));
}
// ─── Hard rules (apply everywhere on AEMaaCS) ──────────────────
export const AEM_CLOUD_HARD_RULES = [
    '`/libs` is **immutable** — never write to it. Use `/conf/global/` or `/apps/` overlays.',
    'Use OSGi DS R6 annotations (`@Component`, `@Reference` from `org.osgi.service.component.annotations`) — Felix SCR (`org.apache.felix.scr.annotations.*`) is forbidden.',
    'Never use `getAdministrativeResourceResolver()`. Use **service users** (e.g. `workflow-process-service`) with the Sling subservice mapping.',
    'Use **SLF4J** (`LoggerFactory.getLogger(...)`) — never `System.out` / `printStackTrace()`.',
    'Deploy via **Cloud Manager** pipelines — Package Manager is not used in production.',
    'No JMX in production (no `restartStaleWorkflows`, `purgeCompleted`, etc.). Use replacements documented in the workflow skills.',
    'Workflow model **design-time** path: `/conf/global/settings/workflow/models/<id>`. **Runtime** (for API calls): `/var/workflow/models/<id>`.',
    'Workflow launcher config path: `/conf/global/settings/workflow/launcher/config/`.',
    'When extending **Core Components**, use `@Self @Via(type = ResourceSuperType.class)` delegation, implement `ComponentExporter`, and add `resourceType` to the `@Model` annotation.',
    'When extending Core Component **dialogs**, use Sling Resource Merger (`sling:hideResource`, `sling:hideProperties`, `sling:orderBefore`).',
    'Component dialogs must use **Granite UI Coral 3** field types — exact resource types are listed in the field-type table in `create-component`.',
    'Components are scaffolded only after reading `.aem-skills-config.yaml` (project root). The config carries `project`, `package`, `group`, and a `configured: true` gate.',
    '**One pattern per migration session**. If a user asks to "fix everything", ask which pattern first (scheduler / replication / eventListener / eventHandler / resourceChangeListener / assetApi / htlLint).',
];
// ─── Canonical project layout ──────────────────────────────────
export const AEM_CLOUD_PROJECT_STRUCTURE = `
AEMaaCS project layout (aem-project-archetype):

/
├── all/                          # Aggregator package (deployed to AEM)
├── core/                         # OSGi bundles (Java)
│   ├── pom.xml
│   └── src/main/java/com/<org>/<project>/core/
│       ├── models/               # Sling Models
│       ├── servlets/             # Sling Servlets
│       └── services/             # OSGi services (DS R6)
├── ui.apps/                      # /apps content package (immutable code)
│   └── src/main/content/jcr_root/apps/<project>/
│       ├── components/<name>/.content.xml
│       ├── components/<name>/_cq_dialog/.content.xml
│       ├── components/<name>/<name>.html       # HTL
│       └── clientlibs/clientlib-<name>/        # CSS + JS + js.txt + css.txt
├── ui.config/                    # OSGi configs (mutable / per env)
├── ui.content/                   # /content seed (test pages, sample assets)
├── ui.frontend/                  # webpack / npm clientlibs source (optional)
├── ui.tests/                     # UI tests (WebDriver / Cypress)
├── it.tests/                     # Integration tests (Sling)
├── dispatcher/                   # Apache HTTPD Dispatcher SDK config
│   └── src/conf.dispatcher.d/
├── pom.xml                       # Reactor pom
├── .aem-skills-config.yaml       # Source of truth for create-component
├── AGENTS.md                     # Created by ensure-agents-md
└── CLAUDE.md                     # @AGENTS.md
`.trim();
export const AEM_CLOUD_PATTERNS = [
    {
        id: 'scheduler',
        title: 'Scheduler',
        module: 'references/scheduler.md',
        classification: '`org.apache.sling.commons.scheduler.Scheduler` / `scheduler.schedule(Runnable)`',
    },
    {
        id: 'resourceChangeListener',
        title: 'Resource Change Listener',
        module: 'references/resource-change-listener.md',
        classification: '`implements ResourceChangeListener`',
    },
    {
        id: 'replication',
        title: 'Replication',
        module: 'references/replication.md',
        classification: '`com.day.cq.replication.Replicator` / `org.apache.sling.replication.*`',
    },
    {
        id: 'eventListener',
        title: 'JCR Observation Event Listener',
        module: 'references/event-migration.md (Path A)',
        classification: '`javax.jcr.observation.EventListener`, `onEvent(EventIterator)`',
    },
    {
        id: 'eventHandler',
        title: 'OSGi Event Admin Handler',
        module: 'references/event-migration.md (Path B)',
        classification: '`org.osgi.service.event.EventHandler`, `handleEvent(Event)` doing resolver/session/node work',
    },
    {
        id: 'assetApi',
        title: 'DAM Asset Manager API',
        module: 'references/asset-manager.md',
        classification: '`com.day.cq.dam.api.AssetManager` create/remove asset APIs',
    },
    {
        id: 'scr-to-ds',
        title: 'Felix SCR → OSGi DS R6',
        module: 'references/scr-to-osgi-ds.md',
        classification: '`org.apache.felix.scr.annotations.*` imports',
    },
    {
        id: 'resolver-logging',
        title: 'ResourceResolver + SLF4J',
        module: 'references/resource-resolver-logging.md',
        classification: '`getAdministrativeResourceResolver`, `System.out`, `printStackTrace`',
    },
    {
        id: 'htlLint',
        title: 'HTL `data-sly-test` redundant constant',
        module: 'references/data-sly-test-redundant-constant.md',
        classification: 'Cloud SDK build warning `data-sly-test: redundant constant value comparison`',
    },
];
// ─── Granite Coral field-type map (for create-component) ────────
export const AEM_DIALOG_FIELD_MAP = [
    { user: 'Textfield', resourceType: 'granite/ui/components/coral/foundation/form/textfield' },
    { user: 'Textarea', resourceType: 'granite/ui/components/coral/foundation/form/textarea' },
    { user: 'Richtext', resourceType: 'cq/gui/components/authoring/dialog/richtext' },
    { user: 'Pathfield', resourceType: 'granite/ui/components/coral/foundation/form/pathfield' },
    { user: 'Image', resourceType: 'Embed Core Image via `data-sly-resource` — do NOT use fileupload', note: 'Use Core Image (cq/wcm/components/image/v3/image) via HTL.' },
    { user: 'Fileupload', resourceType: 'cq/gui/components/authoring/dialog/fileupload', note: 'For non-image files only (PDFs, documents).' },
    { user: 'Multifield', resourceType: 'granite/ui/components/coral/foundation/form/multifield' },
    { user: 'Checkbox', resourceType: 'granite/ui/components/coral/foundation/form/checkbox' },
    { user: 'Select', resourceType: 'granite/ui/components/coral/foundation/form/select' },
    { user: 'Numberfield', resourceType: 'granite/ui/components/coral/foundation/form/numberfield' },
    { user: 'Datepicker', resourceType: 'granite/ui/components/coral/foundation/form/datepicker' },
];
// ─── Core Component extension map (Tier 2 in create-component) ──
export const CORE_COMPONENT_MAP = {
    image: 'core/wcm/components/image/v3/image',
    teaser: 'core/wcm/components/teaser/v2/teaser',
    card: 'core/wcm/components/teaser/v2/teaser',
    text: 'core/wcm/components/text/v2/text',
    richtext: 'core/wcm/components/text/v2/text',
    title: 'core/wcm/components/title/v3/title',
    heading: 'core/wcm/components/title/v3/title',
    list: 'core/wcm/components/list/v4/list',
    button: 'core/wcm/components/button/v2/button',
    cta: 'core/wcm/components/button/v2/button',
    navigation: 'core/wcm/components/navigation/v2/navigation',
    nav: 'core/wcm/components/navigation/v2/navigation',
    container: 'core/wcm/components/container/v1/container',
    section: 'core/wcm/components/container/v1/container',
    accordion: 'core/wcm/components/accordion/v1/accordion',
    tabs: 'core/wcm/components/tabs/v1/tabs',
    carousel: 'core/wcm/components/carousel/v1/carousel',
    embed: 'core/wcm/components/embed/v2/embed',
    video: 'core/wcm/components/embed/v2/embed',
};
// ─── .aem-skills-config.yaml template ──────────────────────────
export const AEM_SKILLS_CONFIG_TEMPLATE = `# .aem-skills-config.yaml — single source of truth for create-component
# Place this file in the project root (next to pom.xml).
project:    mysite                   # AEM project name (artifact in /apps/<project>/)
package:    com.mysite.core          # Java base package
group:      MySite Components        # Component group shown in editor
configured: true                     # required: skills will refuse to scaffold without it
`;
//# sourceMappingURL=aem-cloud-skills.js.map