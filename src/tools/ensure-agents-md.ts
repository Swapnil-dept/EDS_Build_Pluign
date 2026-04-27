import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AEM_SKILLS_CONFIG_TEMPLATE } from '../knowledge/aem-cloud-skills.js';

const CLOUD_HARD_RULES = `- \`/libs\` is **immutable** — never write to \`/libs\`. Use \`/conf/global/\` or
  \`/apps/\` overlays.
- Use OSGi DS R6 annotations (\`@Component\`, \`@Reference\`) — never Felix SCR
  (\`org.apache.felix.scr.annotations.*\`).
- Never use \`getAdministrativeResourceResolver()\`. Use **service users** with
  Sling subservice mappings (\`workflow-process-service\`, etc.).
- Use **SLF4J** for logging — never \`System.out\` / \`printStackTrace()\`.
- Deploy via **Cloud Manager** pipelines (no Package Manager in production).
- One migration pattern per session (scheduler / replication / eventListener
  / eventHandler / resourceChangeListener / assetApi / htlLint).
- Read \`.aem-skills-config.yaml\` before scaffolding components — that is the
  single source of truth for project name, package, and component group.`;

const LTS_HARD_RULES = `- This project is **AEM 6.5 LTS / AMS**, not Cloud Service. Resource links and
  APIs target \`experience-manager-65\` docs and the 6.5 LTS Javadoc.
- Avoid editing \`/libs\`. Use overlays under \`/apps\` or store at \`/conf/global/\`.
- OSGi DS R6 annotations are preferred. Felix SCR is still supported on 6.5 LTS
  but new code should use DS.
- Use \`ResourceResolverFactory.getServiceResourceResolver()\` with a sub-service.
  Avoid \`loginAdministrative()\`.
- Deploy via **Package Manager** or **Maven + Content Package Plugin** (no
  Cloud Manager pipeline on 6.5).
- JMX is allowed (\`retryFailedWorkItems\`, \`countStaleWorkflows\`, \`purgeCompleted\`,
  \`restartStaleWorkflows\`).
- Replication uses legacy **replication agents** (Replicator API). Do not introduce
  Sling Distribution patterns — those are Cloud Service only.
- Dispatcher MCP variant: \`AEM_DEPLOYMENT_MODE=ams\`.`;

const TEMPLATE = `# AGENTS.md — {{PROJECT_NAME}}

## Project overview

This is an **{{AEM_VARIANT_NAME}}** Maven project. AI coding agents
should follow these guidelines when working in this repository.

## Hard rules

{{HARD_RULES}}

{{ADD_ONS_SECTION}}

## Modules

{{MODULES_SECTION}}

## Build

\`\`\`bash
{{BUILD_COMMANDS}}
{{FRONTEND_BUILD}}
{{DISPATCHER_VALIDATE}}
\`\`\`

## Important resources

{{BASE_RESOURCES}}
{{EXTRA_RESOURCES}}
`;

const MODULE_DESCRIPTIONS: Record<string, string> = {
  'core':         '**`core/`** — OSGi bundles. Sling Models, Sling Servlets, OSGi services (DS R6). Java unit tests under `core/src/test/java`.',
  'ui.apps':      '**`ui.apps/`** — Immutable JCR content (`/apps/<project>/`). Component definitions (`.content.xml`), dialogs (`_cq_dialog`), HTL templates, clientlibs.',
  'ui.config':    '**`ui.config/`** — Mutable OSGi config / runmode-scoped settings (`/apps/<project>/osgiconfig/`).',
  'ui.frontend':  '**`ui.frontend/`** — Webpack source for clientlibs (CSS/JS) compiled into `ui.apps/.../clientlibs/`.',
  'ui.content':   '**`ui.content/`** — Sample/test page content under `/content/<project>/` (often runmode-scoped).',
  'ui.tests':     '**`ui.tests/`** — UI tests (WebDriver / Cypress) running against the Author/Publish.',
  'it.tests':     '**`it.tests/`** — Sling integration tests against a running AEM instance.',
  'dispatcher':   '**`dispatcher/`** — Apache HTTPD Dispatcher SDK config (vhosts, rewrites, cache, filter rules).',
  'all':          '**`all/`** — Aggregator package — assembled from `ui.apps`, `ui.config`, `ui.content`, and OSGi bundles for deployment via Cloud Manager.',
};

export function registerEnsureAgentsMd(server: McpServer) {
  server.tool(
    'ensure_agents_md',
    `Bootstrap the AGENTS.md and CLAUDE.md files at an AEM project root. Mirrors Adobe's "ensure-agents-md" skill for both **Cloud Service** and **6.5 LTS / AMS** variants. PRECONDITION: only use after detect_project_type returns "aemaacs" or "aem65lts". Pass the variant explicitly. Returns a contents-ready AGENTS.md tailored to the modules / add-ons / variant, plus a one-line CLAUDE.md ("@AGENTS.md"), and — for the cloud variant only — a .aem-skills-config.yaml stub. Never overwrite existing files.`,
    {
      variant:     z.enum(['cloud-service', '6.5-lts']).describe('Which Adobe skill variant to render. Pick "cloud-service" for AEMaaCS, "6.5-lts" for AEM 6.5 LTS / AMS / on-prem.'),
      projectName: z.string().describe('Human-readable project name (e.g. "WKND Sites Project", "My Site"). Falls back to a humanised artifactId.'),
      modules:     z.array(z.string()).default([]).describe('Module folders that actually exist (subset of: core, ui.apps, ui.config, ui.frontend, ui.content, ui.tests, it.tests, dispatcher, all). Detection should report this.'),
      addOns:      z.array(z.enum(['cif', 'react-spa', 'angular-spa', 'forms', 'headless-forms', 'precompiled-scripts', 'decoupled'])).default([]).describe('Detected add-ons / variants. Empty array = General Webpack frontend (default archetype).'),
      hasAgentsMd: z.boolean().default(false).describe('Whether AGENTS.md already exists at workspace root. If true, the tool refuses to overwrite.'),
      hasClaudeMd: z.boolean().default(false).describe('Whether CLAUDE.md already exists at workspace root.'),
      hasAemSkillsConfig: z.boolean().default(false).describe('Whether .aem-skills-config.yaml already exists. Only relevant for variant=cloud-service.'),
    },
    {
      title: 'Ensure AGENTS.md (AEM bootstrap)',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ variant, projectName, modules, addOns, hasAgentsMd, hasClaudeMd, hasAemSkillsConfig }) => {
      const isCloud = variant === 'cloud-service';
      const sections: string[] = [];
      sections.push(`# Bootstrap AEM workspace — ${projectName} (${isCloud ? 'AEM as a Cloud Service' : 'AEM 6.5 LTS / AMS'})`);

      if (hasAgentsMd) {
        sections.push(`✅ \`AGENTS.md\` already exists. **Do not overwrite.** Skipping AGENTS.md generation.`);
      } else {
        const moduleLines = modules
          .map((m) => MODULE_DESCRIPTIONS[m] ? `- ${MODULE_DESCRIPTIONS[m]}` : null)
          .filter(Boolean)
          .join('\n') || '- (no modules detected — re-run detection with `uiAppsDirListing`, `coreDirListing`, etc.)';

        const addOnsBlock = addOns.length
          ? `## Add-ons and extensions\n\n${addOns.map((a) => `- \`${a}\``).join('\n')}\n\nLoad the matching reference modules from the \`best-practices\` skill before editing add-on code.`
          : '';

        const frontendBuild = modules.includes('ui.frontend')
          ? `cd ui.frontend && npm install && npm run build  # builds clientlibs into ui.apps/`
          : '';
        const dispatcherValidate = modules.includes('dispatcher')
          ? (isCloud
              ? `cd dispatcher && bin/validator.sh -d out src/conf.dispatcher.d`
              : `httpd -t -f dispatcher/src/conf/httpd.conf  # or apachectl configtest — adjust path to your AMS layout`)
          : '';

        const buildCommands = isCloud
          ? `mvn -PautoInstallPackage clean install   # build & install all/ via Package Manager (local SDK)
mvn -PautoInstallSinglePackage clean install -pl ui.apps,core`
          : `mvn -PautoInstallPackage clean install   # build & install via Maven Content Package Plugin
mvn -PautoInstallSinglePackage clean install -pl ui.apps,core`;

        const baseResources = isCloud
          ? [
              '- AEM as a Cloud Service docs: https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/home',
              '- Core Components: https://github.com/adobe/aem-core-wcm-components',
              '- Project archetype: https://github.com/adobe/aem-project-archetype',
              '- Sling Models: https://sling.apache.org/documentation/bundles/models.html',
              '- Dispatcher SDK: https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/content-delivery/disp-overview',
            ].join('\n')
          : [
              '- AEM 6.5 LTS docs: https://experienceleague.adobe.com/en/docs/experience-manager-65-lts/content/home',
              '- 6.5 LTS Javadoc: https://developer.adobe.com/experience-manager/reference-materials/6-5-lts/javadoc/index.html',
              '- Core Components: https://github.com/adobe/aem-core-wcm-components',
              '- Sling Models: https://sling.apache.org/documentation/bundles/models.html',
              '- HTL spec: https://github.com/adobe/htl-spec',
              '- Dispatcher (AMS) docs: https://experienceleague.adobe.com/en/docs/experience-manager-dispatcher/using/dispatcher',
            ].join('\n');

        const extraResources: string[] = [];
        if (addOns.includes('cif')) {
          extraResources.push(isCloud
            ? '- AEM CIF connector: https://experienceleague.adobe.com/en/docs/commerce-cloud-service/storefront/get-started/overview'
            : '- AEM CIF connector (6.5): https://github.com/adobe/commerce-cif-connector');
        }
        if (addOns.includes('react-spa') || addOns.includes('angular-spa')) {
          extraResources.push(isCloud
            ? '- SPA Editor: https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/developing/headful-headless/spa-editor/spa-editor-overview'
            : '- SPA Editor (6.5): https://experienceleague.adobe.com/en/docs/experience-manager-65/content/implementing/developing/headful-headless/spa-editor/spa-editor-overview');
        }
        if (addOns.includes('forms') || addOns.includes('headless-forms')) {
          extraResources.push(isCloud
            ? '- AEM Forms: https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/forms/home'
            : '- AEM Forms 6.5: https://experienceleague.adobe.com/en/docs/experience-manager-65/content/forms/home');
        }
        if (addOns.includes('decoupled')) {
          extraResources.push(isCloud
            ? '- Frontend Pipelines: https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/developing/aem-as-a-cloud-service-developer-tools-and-headless/aem-cli'
            : '- Headless / external frontend (6.5): https://experienceleague.adobe.com/en/docs/experience-manager-65/content/implementing/developing/headful-headless/headless/introduction');
        }

        const rendered = TEMPLATE
          .replace(/{{PROJECT_NAME}}/g, projectName)
          .replace('{{AEM_VARIANT_NAME}}', isCloud ? 'AEM as a Cloud Service' : 'AEM 6.5 LTS / AMS')
          .replace('{{HARD_RULES}}', isCloud ? CLOUD_HARD_RULES : LTS_HARD_RULES)
          .replace('{{MODULES_SECTION}}', moduleLines)
          .replace('{{ADD_ONS_SECTION}}', addOnsBlock)
          .replace('{{BUILD_COMMANDS}}', buildCommands)
          .replace('{{FRONTEND_BUILD}}', frontendBuild)
          .replace('{{DISPATCHER_VALIDATE}}', dispatcherValidate)
          .replace('{{BASE_RESOURCES}}', baseResources)
          .replace('{{EXTRA_RESOURCES}}', extraResources.join('\n'));

        sections.push(`## Create \`AGENTS.md\` (workspace root)\n\n\`\`\`markdown\n${rendered}\n\`\`\``);
      }

      if (hasClaudeMd) {
        sections.push(`✅ \`CLAUDE.md\` already exists. **Do not overwrite.**`);
      } else {
        sections.push(`## Create \`CLAUDE.md\` (workspace root)\n\n\`\`\`\n@AGENTS.md\n\`\`\``);
      }

      if (hasAemSkillsConfig) {
        sections.push(`✅ \`.aem-skills-config.yaml\` already exists. Verify \`configured: true\`.`);
      } else if (isCloud) {
        sections.push(`## Create \`.aem-skills-config.yaml\` (workspace root)\n\n\`\`\`yaml\n${AEM_SKILLS_CONFIG_TEMPLATE}\`\`\`\n\nThe \`scaffold_aem_component\` tool refuses to run until this file exists with \`configured: true\`.`);
      }

      sections.push(isCloud
        ? `## Next\n\nAfter writing the files, tell the user:\n\n> "I created \`AGENTS.md\` and \`CLAUDE.md\` in your project root. Update \`.aem-skills-config.yaml\` with your project, package, and component group, then re-ask me to scaffold components."`
        : `## Next\n\nAfter writing the files, tell the user:\n\n> "I created \`AGENTS.md\` and \`CLAUDE.md\` in your project root with 6.5 LTS guidance. You can now ask me about replication, workflow, or dispatcher tasks."`);

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}
