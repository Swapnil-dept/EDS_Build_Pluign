import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HARD_CONSTRAINTS } from '../knowledge/eds-conventions.js';

const PROJECT_SUMMARY_WORKFLOW =
  'Create or refresh a workspace summary file at `.project-summary.md` (or `PROJECT_SUMMARY.md`) by calling `project_summary` with the same workspace snapshots plus any global files you have (for example `styles/styles.css`, `scripts/scripts.js`, `scripts/initializers.js`). At the end of the task, call `project_summary` again with `existingSummary` + `sessionChanges` and update the same file so the next session starts with current architecture, theme, security/auth, and runtime notes.';

/**
 * Register MCP Prompts — pre-built templates for common EDS development tasks.
 * These appear as slash commands in IDEs (e.g., /mcp.eds.new-block).
 *
 * All prompts target the Universal Editor boilerplate
 * (https://github.com/adobe-rnd/aem-boilerplate-xwalk). Each block ships a
 * single combined config file at `blocks/<name>/_<name>.json` containing
 * `definitions` + `models` + `filters` together; these are aggregated into
 * the project-root `component-definitions.json` / `component-models.json` /
 * `component-filters.json` at build/deploy time. The in-repo
 * `blocks/tabs-card` and `blocks/carousel` samples are the canonical
 * references for container blocks (block → item pattern).
 */
export function registerPrompts(server: McpServer) {
  // ─── New Block Prompt ───────────────────────────────────
  server.prompt(
    'new-block',
    'Step-by-step guide for creating a new EDS block (aligned with aem-boilerplate-xwalk Universal Editor)',
    {
      blockName: z.string().describe('Block name in kebab-case (e.g. "product-card")'),
      description: z.string().describe('What this block should do and look like'),
      container: z
        .string()
        .optional()
        .describe('If the block has repeating children, comma-separated item ids (e.g. "card" or "tab")'),
    },
    ({ blockName, description, container }) => {
      const items = container?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      const isContainer = items.length > 0;

      const lines: string[] = [];
      lines.push(`Create an AEM EDS block named "${blockName}" that ${description}.`);
      lines.push('');
      lines.push('**Step 0 (always first):** call `detect_project_type` with snapshots of the workspace (package.json, ls of root/scripts/blocks/scripts/__dropins__, head.html, config.json). If it returns `storefront`, STOP — use `scaffold_commerce_block` and the storefront prompts instead. Continue below only if it returns `eds`.');
      lines.push('');
      lines.push(`**Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}`);
      lines.push('');
      lines.push('Target: aem-boilerplate-xwalk (Universal Editor authoring).');
      lines.push('');
      lines.push('Requirements:');
      lines.push('- Vanilla JS, `export default function decorate(block)`');
      lines.push(`- Scope CSS to \`main .${blockName}\` — never style \`.${blockName}-wrapper\` / \`.${blockName}-container\` (EDS auto-generates those)`);
      lines.push('- Mobile-first; breakpoints 600 / 900 / 1200 px (min-width only)');
      lines.push('- Reuse platform `<picture>` / `<a>` nodes — do not recreate them');
      lines.push('- No npm / frameworks / build step');
      if (isContainer) {
        lines.push(`- Container block: iterate \`block.children\` as ${items.join(' / ')} items (UE block/item pattern, like \`blocks/tabs-card\` / \`blocks/carousel\`)`);
      }
      lines.push('- Expose CSS variants via a `multiselect` field named `classes` (grouped options)');
      lines.push('');
      lines.push('How data becomes HTML (keep in mind while writing `decorate`):');
      lines.push('1. Author fills UE fields (or writes a doc table). UE/Helix serializes each block (or item) into a row-of-cells DOM that EDS serves in `<path>.plain.html`.');
      lines.push('2. Field naming drives the shape: `image`+`imageAlt` → `<picture><img alt>` cell, `link`+`linkText` → `<a>` cell, `title`+`titleType` → `<hN>` cell, `classes` multiselect → classes on the block root.');
      lines.push('3. `aem.js` finds the block div, loads this block\u2019s JS+CSS, then calls `decorate(block)`.');
      lines.push('4. Your `decorate()` reads those rows/cells and rewrites them into the final semantic DOM (reusing the existing `<picture>`/`<a>` nodes).');
      lines.push('');
      lines.push('Steps:');
      lines.push('1. Call `scaffold_block` with `blockName` and (optionally) `hasMedia` / `interactive` / `layout`.');
      lines.push(
        `2. Call \`scaffold_model\` with the field list${
          isContainer ? ` and \`items: [${items.map((id) => `{ id: "${id}", fields: [...] }`).join(', ')}]\`` : ''
        } to produce the combined \`_${blockName}.json\` (definitions + models + filters in one file).`,
      );
      lines.push('3. Implement `decorate(block)` per the analysis, then run `validate_block` + `check_performance`.');
      lines.push('');
      lines.push('Return these files:');
      lines.push(`1. \`blocks/${blockName}/${blockName}.js\``);
      lines.push(`2. \`blocks/${blockName}/${blockName}.css\``);
      lines.push(`3. \`blocks/${blockName}/_${blockName}.json\` — combined definitions + models + filters`);
      lines.push('');
      lines.push(`**Do NOT** commit \`README.md\`, \`test.html\`, or \`sample-content.md\` inside \`blocks/${blockName}/\` — they break the UE block contract. Keep them in \`docs/\`, \`.dev/\`, or your PR description if needed.`);

      return {
        messages: [
          {
            role: 'user' as const,
            content: { type: 'text' as const, text: lines.join('\n') },
          },
        ],
      };
    },
  );

  // ─── Fix Block Prompt ───────────────────────────────────
  server.prompt(
    'fix-block',
    'Diagnose and fix issues with an existing EDS block',
    {
      blockName: z.string().describe('Block name'),
      issue: z.string().describe('What is going wrong (e.g. "styles leak to other blocks", "Lighthouse dropped to 85")'),
    },
    ({ blockName, issue }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Fix this EDS block issue for "${blockName}": ${issue}\n\n` +
              `**Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
              `Check against core EDS rules and Universal Editor conventions ` +
              `(aem-boilerplate-xwalk):\n` +
              `${HARD_CONSTRAINTS.slice(0, 6).map((c) => `- ${c}`).join('\n')}\n` +
              `- Field types use UE canonical names: \`text\` / \`textarea\` (not \`text-input\` / \`text-area\`)\n` +
              `- Container blocks use the block → item pattern with a matching filter entry in the block's combined \`_<block>.json\`\n` +
              `- Each block has ONE combined config at \`blocks/<name>/_<name>.json\` containing \`definitions\` + \`models\` + \`filters\`\n` +
              `- Variants are authored via a \`multiselect\` field named \`classes\`\n` +
              `- Remember: field names drive the DOM shape your \`decorate()\` receives — \`image\`+\`imageAlt\` → \`<picture>\` cell, \`link\`+\`linkText\` → \`<a>\` cell, \`classes\` → classes on block root\n\n` +
              `Return:\n` +
              `1. Root cause\n` +
              `2. Corrected code (JS / CSS / JSON as needed)\n` +
              `3. Short explanation`,
          },
        },
      ],
    }),
  );

  // ─── Design-to-Block Prompt (text / image / Figma) ──────
  server.prompt(
    'design-to-block',
    "Turn a text description, a design screenshot, and/or a Figma URL into an EDS block using Adobe's Content-Driven-Development workflow (Universal Editor aligned)",
    {
      blockName: z.string().describe('Block name in kebab-case (e.g. "hero", "product-card")'),
      text: z.string().optional().describe('What the block should do / look like'),
      imageRefs: z.string().optional().describe('Comma-separated image paths or URLs of the design'),
      figmaUrl: z.string().optional().describe('Figma file or frame URL'),
    },
    ({ blockName, text, imageRefs, figmaUrl }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Build an AEM EDS block named "${blockName}" from the following design inputs. ` +
              `Target: aem-boilerplate-xwalk (Universal Editor).\n\n` +
              (text ? `**Description:** ${text}\n` : '') +
              (imageRefs ? `**Images:** ${imageRefs}\n` : '') +
              (figmaUrl ? `**Figma:** ${figmaUrl}\n` : '') +
              `\n` +
              `**Step 0 (always first):** call \`detect_project_type\` with workspace snapshots. If it returns \`storefront\`, switch to the \`storefront-from-design\` prompt — commerce pages must be composed from drop-ins, not vanilla blocks.\n\n` +
              `**Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
              `Steps to follow (Adobe CDD workflow):\n` +
              `1. Call \`generate_block_from_design\` with the same inputs to get the workflow outline, vision-analysis prompt, Figma-fetch recipe (if any), and a baseline scaffold.\n` +
              `2. Execute the vision-analysis prompt against the image(s) / Figma export — produce structure, fields, variants, responsive behavior, interactivity, design tokens, and acceptance criteria.\n` +
              `3. Decide authoring shape:\n` +
              `   • If there are repeating children (cards, tabs, slides, accordion items) → model as a **container block with item children** (UE block/item pattern, see \`blocks/tabs-card\` and \`blocks/carousel\`).\n` +
              `   • Otherwise → leaf block with fields on the block itself.\n` +
              `4. Edit \`blocks/${blockName}/${blockName}.{js,css}\` to match the analysis; reuse platform \`<picture>\` / \`<a>\` nodes; keep every selector scoped to \`main .${blockName}\`.\n` +
              `5. Call \`scaffold_model\` with the derived field list. For container blocks pass \`items: [{ id, fields }]\`; for CSS variants add a \`multiselect\` field named \`classes\`. Output is a combined \`blocks/${blockName}/_${blockName}.json\` (definitions + models + filters in one file).\n` +
              `6. Call \`validate_block\` and \`check_performance\`; fix any findings.\n` +
              `7. Self-review against the code-review checklist before opening a PR.\n\n` +
              `Data → HTML render pipeline (so \`decorate()\` aligns with the model):\n` +
              `• UE/Helix serializes each block (and each item) into a row-of-cells DOM.\n` +
              `• Field names shape the cells: \`image\`+\`imageAlt\` → \`<picture>\`, \`link\`+\`linkText\` → \`<a>\`, \`title\`+\`titleType\` → \`<hN>\`, \`classes\` → classes on block root.\n` +
              `• \`aem.js\` lazy-loads this block's JS/CSS and calls \`export default decorate(block)\` with the block's root div.\n` +
              `• Your \`decorate()\` reads those rows/cells and rewrites them into the final semantic DOM — reuse existing nodes, don't recreate \`<picture>\`/\`<a>\`.\n\n` +
              `Hard constraints:\n` +
              `${HARD_CONSTRAINTS.slice(0, 8).map((c) => `- ${c}`).join('\n')}\n`,
          },
        },
      ],
    }),
  );

  // NOTE: migrate-to-eds and review-block prompts are available
  // in the premium tier only.

  // ─── Storefront Prompts ─────────────────────────────────

  server.prompt(
    'new-storefront-project',
    'Bootstrap a new EDS + Adobe Commerce storefront from the boilerplate, install drop-ins, and wire up scripts/initializers.js + scripts/scripts.js.',
    {
      siteName: z.string().describe('Project / site name'),
      backend: z.string().optional().describe('Backend variant: paas (default), accs, or aco'),
      dropins: z.string().optional().describe('Comma-separated dropin ids to install initially (cart, checkout, pdp, …)'),
    },
    ({ siteName, backend, dropins }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Bootstrap a new EDS + Adobe Commerce storefront named "${siteName}".\n\n` +
              `**Step 0 (if a project already exists in the workspace):** call \`detect_project_type\` first. If it reports \`eds\` or \`storefront\`, confirm with the user before overwriting. If \`unknown\` or empty workspace, proceed.\n\n` +
              `**Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
              `Steps:\n` +
              `1. Call \`scaffold_storefront_project\` with siteName="${siteName}", backend="${backend ?? 'paas'}"${dropins ? `, dropins=[${dropins.split(',').map((s) => `"${s.trim()}"`).join(', ')}]` : ''}.\n` +
              `2. Execute the install + postinstall steps it returns.\n` +
              `3. Call \`eds_storefront_config\` with configType="all" to generate default-site.json, default-config.json, demo-config.json, default-query.yaml, default-sitemap.yaml, head.html, and scripts/configs.js.\n` +
              `4. Call \`commerce_events_guide\` (topic="bootstrap" then "collector") to wire ACDL.\n` +
              `5. For each drop-in to install on a page, call \`scaffold_commerce_block\`.\n` +
              `6. Run \`validate_storefront\` once everything is in place and resolve all errors.\n\n` +
              `Hard rules:\n` +
              `- Never edit files in scripts/__dropins__/ (they are regenerated by \`npm run postinstall\`).\n` +
              `- All commerce config flows through scripts/configs.js → getConfigValue(); never hardcode endpoints/api keys.\n` +
              `- Heavy drop-ins (PDP, Checkout) live in lazy blocks, not in scripts.js, to protect the pre-LCP budget.\n`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'add-and-customize-dropin',
    'Install a single drop-in, scaffold its block, and customize selected slots with brand-specific content/styles.',
    {
      dropin: z.string().describe('Drop-in id (e.g. "cart", "pdp")'),
      slots: z.string().optional().describe('Comma-separated slot names to override (e.g. "EmptyCart,OrderSummaryFooter")'),
      brandPrimary: z.string().optional().describe('Brand primary color (hex)'),
    },
    ({ dropin, slots, brandPrimary }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Add the **${dropin}** drop-in to this storefront and brand it.\n\n` +
              `**Step 0 (always first):** call \`detect_project_type\` with workspace snapshots. If type is not \`storefront\`, run \`scaffold_storefront_project\` first — you cannot add drop-ins to a vanilla EDS project.\n\n` +
              `**Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
              `Steps:\n` +
              `1. \`lookup_dropin\` with query="${dropin}" — review containers, slots, and events.\n` +
              `2. \`add_dropin\` with dropin="${dropin}" — install + wire initializer.\n` +
              `3. \`scaffold_commerce_block\` with blockName="commerce-${dropin}" — generate the block files.\n` +
              (slots
                ? slots.split(',').map((s, i) => `${4 + i}. \`customize_dropin_slot\` with dropin="${dropin}", slot="${s.trim()}" — write the override.`).join('\n')
                : '4. (Optional) \`customize_dropin_slot\` for each slot you need to override.') +
              '\n' +
              (brandPrimary
                ? `${4 + (slots?.split(',').length ?? 1)}. \`style_dropin\` with dropin="${dropin}", brandPrimary="${brandPrimary}" — apply brand tokens.\n`
                : `5. (Optional) \`style_dropin\` to apply your brand tokens.\n`) +
              `\nFinish with \`validate_storefront\` to confirm postinstall + wiring.\n`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'storefront-from-design',
    'Translate a design (Figma / screenshot / description) into commerce blocks composed from drop-ins, with slot overrides and brand tokens.',
    {
      pageType: z.string().describe('Which page: pdp, plp, cart, checkout, account, home'),
      text: z.string().optional().describe('Design description'),
      imageRefs: z.string().optional().describe('Comma-separated image paths/URLs'),
      figmaUrl: z.string().optional().describe('Figma URL'),
    },
    ({ pageType, text, imageRefs, figmaUrl }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Build the **${pageType}** page from this design using Adobe Commerce drop-ins.\n\n` +
              (text ? `**Description:** ${text}\n` : '') +
              (imageRefs ? `**Images:** ${imageRefs}\n` : '') +
              (figmaUrl ? `**Figma:** ${figmaUrl}\n` : '') + '\n' +
              `**Step 0 (always first):** call \`detect_project_type\`. If not \`storefront\`, run \`scaffold_storefront_project\` before continuing.\n\n` +
              `**Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
              `Steps:\n` +
              `1. Identify which drop-in(s) the page needs (cart, checkout, pdp, product-discovery, …) — call \`lookup_dropin\` for each candidate.\n` +
              `2. For each drop-in, decide between **slot overrides** (small UI tweaks inside the dropin layout) and **container composition** (custom layout assembled from individual containers like ProductGallery + ProductPrice + custom CTA).\n` +
              `3. \`scaffold_commerce_block\` for each block.\n` +
              `4. \`customize_dropin_slot\` for each slot the design changes (empty states, badges, CTAs, trust marks, footers).\n` +
              `5. \`style_dropin\` with the brand colors / fonts / radius extracted from the design — output goes into the block CSS or styles/styles.css.\n` +
              `6. \`validate_storefront\` and \`check_performance\` for each block.\n\n` +
              `Rules:\n` +
              `- Customize via slots before composition; compose individual containers only if slot overrides are insufficient.\n` +
              `- Override design via CSS custom properties (--color-*, --type-*, --spacing-*); never !important; never edit scripts/__dropins__/.\n` +
              `- Heavy commerce blocks load lazily — keep them out of scripts.js.\n`,
          },
        },
      ],
    }),
  );

  // ─── New AEM Component (AEMaaCS) ─────────────────────────
  server.prompt(
    'new-aem-component',
    'Step-by-step guide for scaffolding an AEM as a Cloud Service component (Java / HTL / Granite UI dialog).',
    {
      componentName: z.string().describe('kebab-case component name (e.g. "promo-card")'),
      description:   z.string().describe('What the component does and the dialog fields the user wants'),
      extendsCore:   z.string().optional().describe('Optional Core Component to extend (teaser, list, navigation, etc.)'),
    },
    ({ componentName, description, extendsCore }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text:
            `Create an AEM as a Cloud Service component named "${componentName}" that ${description}.${extendsCore ? `\nExtend the Core Component "${extendsCore}".` : ''}\n\n` +
            `**Step 0 (always first):** call \`detect_project_type\` with snapshots of the workspace. Pass \`pomXml\`, \`aemSkillsConfigYaml\`, and listings of \`ui.apps/\`, \`core/\`, \`dispatcher/\`. If it does NOT return \`aemaacs\`, STOP.\n\n` +
            `**Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
            `**Step 1:** if no \`AGENTS.md\` exists at the workspace root, call \`ensure_agents_md\` first. Write the AGENTS.md, CLAUDE.md, and \`.aem-skills-config.yaml\` it returns. Wait for the user to fill in \`.aem-skills-config.yaml\` (project, package, group, configured: true).\n\n` +
            `**Step 2:** read \`.aem-skills-config.yaml\` — it is the **single source of truth**. Do not infer project / package / group from the file system or pom.xml.\n\n` +
            `**Step 3:** ask the user to **confirm the dialog field list** verbatim before scaffolding. No extras, no renames.\n\n` +
            `**Step 4:** call \`scaffold_aem_component\` with the confirmed fields and the values from \`.aem-skills-config.yaml\`. Write the files it returns to the exact paths shown.\n\n` +
            `**Step 5:** if you need patterns (Sling Resource Merger for Core Component dialogs, ResourceResolver service users, OSGi DS R6, HTL guardrails) call \`aem_best_practices\` and read the matching reference module before editing.\n\n` +
            `**Step 6:** build with \`mvn -PautoInstallSinglePackage clean install -pl core,ui.apps\`.`,
        },
      }],
    }),
  );

  // ─── Migrate one pattern to AEMaaCS ─────────────────────
  server.prompt(
    'migrate-to-cloud-service',
    'Migrate **one** legacy AEM pattern (scheduler / replication / eventListener / eventHandler / resourceChangeListener / assetApi / htlLint) to AEM as a Cloud Service.',
    {
      pattern: z.string().describe('Exactly one of: scheduler, resourceChangeListener, replication, eventListener, eventHandler, assetApi, htlLint'),
      source:  z.string().optional().describe('"bpa-csv", "cam-mcp", or "manual" (default).'),
    },
    ({ pattern, source }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text:
            `Migrate the **${pattern}** pattern to AEM as a Cloud Service.\n\n` +
            `**Step 0:** call \`detect_project_type\` and confirm the workspace is \`aemaacs\`. If \`AGENTS.md\` is missing, run \`ensure_agents_md\` first.\n\n` +
            `**Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
            `**Step 1:** call \`aem_migration_pattern\` with \`pattern: "${pattern}"\` and \`source: "${source ?? 'manual'}"\`. Follow the discovery flow it prints. **One pattern per session** — refuse to fix a different pattern in this same chat.\n\n` +
            `**Step 2:** read the best-practices module the tool points to **before** editing any code. Use \`aem_best_practices\` if you need the index again.\n\n` +
            `**Step 3:** for each target file: read source → classify per the module → apply transformation steps in order → run lints / unit tests → next file.\n\n` +
            `**Step 4:** preserve \`isAuthor()\` and other run-mode guards. Do not change business logic. Do not rename classes unless the module says to. Do not invent values.\n\n` +
            `**Step 5:** if MCP fails, **stop** and show the verbatim error. Do not silently fall back. Wait for the user to direct the next step.\n\n` +
            `**Step 6:** report files touched, sub-paths, and lint/test status.`,
        },
      }],
    }),
  );

  // ─── Dispatcher config ──────────────────────────────────
  server.prompt(
    'aem-dispatcher-task',
    'Route an AEMaaCS Dispatcher request (config / advisory / incident / perf / security) to the right specialist guidance.',
    {
      intent:   z.string().describe('config-authoring | technical-advisory | incident-response | performance-tuning | security-hardening | workflow-orchestrator'),
      question: z.string().describe('The user question or task in their own words'),
    },
    ({ intent, question }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text:
            `Help with this AEMaaCS Dispatcher task: ${question}\n\n` +
            `**Step 0:** confirm the workspace is \`aemaacs\` via \`detect_project_type\` (pass \`dispatcherDirListing\` so the score reflects it).\n\n` +
            `**Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
            `**Step 1:** call \`aem_dispatcher_config\` with \`intent: "${intent}"\` and the user question. Follow the specialist guidance it returns.\n\n` +
            `**Step 2:** for config edits, validate locally with the Dispatcher SDK before committing:\n\`\`\`bash\ncd dispatcher && bin/validator.sh -d out src/conf.dispatcher.d\n\`\`\`\n\n` +
            `**Step 3:** never widen the deny-by-default filter farm without explicit justification. Never expose \`/system/\`, \`/crx/\`, \`/etc/\`, \`/apps/\`, \`/var/\` from publish vhosts.`,
        },
      }],
    }),
  );

  // ─── New AEM Component (6.5 LTS / AMS) ───────────────────
  server.prompt(
    'new-aem65-component',
    'Step-by-step guide for scaffolding an AEM 6.5 LTS / AMS component (Java / HTL / Granite UI dialog). Use on on-prem or Adobe Managed Services projects — NOT AEMaaCS.',
    {
      componentName: z.string().describe('kebab-case component name (e.g. "promo-card")'),
      description:   z.string().describe('What the component does and the dialog fields the user wants'),
      extendsCore:   z.string().optional().describe('Optional Core Component to extend (teaser, list, navigation, etc.) — requires Core Components 2.x+ on 6.5 LTS'),
    },
    ({ componentName, description, extendsCore }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text:
            `Create an AEM 6.5 LTS / AMS component named "${componentName}" that ${description}.${extendsCore ? `\nExtend the Core Component "${extendsCore}" (verify Core Components 2.x+ is installed in \`all/pom.xml\` first).` : ''}\n\n` +
            `**Step 0 (always first):** call \`detect_project_type\` with snapshots of the workspace. Pass \`pomXml\` and listings of \`ui.apps/\`, \`core/\`, \`dispatcher/\`. The pom must reference \`com.adobe.aem:uber-jar\` or \`cq.quickstart.version\` (not \`aem-sdk-api\`). If it does NOT return \`aem65lts\`, STOP — use \`new-aem-component\` (Cloud Service) or \`new-block\` (EDS) instead.\n\n` +
            `**Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
            `**Step 1:** if no \`AGENTS.md\` exists at the workspace root, call \`ensure_agents_md\` with \`variant: "6.5-lts"\`. Write the AGENTS.md and CLAUDE.md it returns. (6.5 LTS does NOT use \`.aem-skills-config.yaml\` — that is a Cloud-Service-only convention.)\n\n` +
            `**Step 2:** read project metadata directly from the source of truth:\n` +
            `- \`project\` (artifact name) ← root \`pom.xml\` \`<artifactId>\`\n` +
            `- \`javaPackage\` ← \`core/pom.xml\` \`<package>\` or existing \`core/src/main/java/...\` path\n` +
            `- \`group\` ← match the convention used by other components in \`ui.apps/src/main/content/jcr_root/apps/<project>/components/\` (look at any existing \`.content.xml\` for \`componentGroup="..."\`)\n\n` +
            `**Step 3:** ask the user to **confirm the dialog field list** verbatim before scaffolding. No extras, no renames.\n\n` +
            `**Step 4:** call \`scaffold_aem65_component\` with the confirmed fields, \`componentName\`, \`title\`, \`project\`, \`javaPackage\`, \`group\`${extendsCore ? `, \`extendsCore: "${extendsCore}"\`` : ''}. Write the files it returns to the exact paths shown.\n\n` +
            `**Step 5:** 6.5-specific guardrails — DO NOT call the Cloud-Service-only tools \`aem_best_practices\` or \`aem_migration_pattern\` (those reference modules describe AEMaaCS rules that don't all apply on 6.5). Instead, for advanced patterns:\n` +
            `- Replication / publish flow → call \`aem65_replication\`.\n` +
            `- Workflow models / processes → call \`aem65_workflow\`.\n` +
            `- Dispatcher edits → call \`aem_dispatcher_config\` with \`variant: "ams"\`.\n` +
            `- Skill index → \`aem65_skills_index\`.\n\n` +
            `**Step 6:** build with \`mvn -PautoInstallPackage clean install -pl core,ui.apps\`. Deploy via Package Manager or the Content Package Maven Plugin — NEVER reference Cloud Manager pipelines on 6.5.\n\n` +
            `**Step 7:** verify in author UI — drop the component on a test page and confirm the dialog shows exactly the confirmed fields.\n\n` +
            `Hard rules (6.5 LTS / AMS):\n` +
            `- Use OSGi DS R6 annotations for new code (\`org.osgi.service.component.annotations\`). Felix SCR is still supported but legacy — don't introduce it in greenfield code.\n` +
            `- Never write to \`/libs\`. Use \`/apps\` overlays or \`/conf/global/\`.\n` +
            `- Use \`ResourceResolverFactory.getServiceResourceResolver()\` with a sub-service mapping. Avoid \`loginAdministrative()\`.\n` +
            `- Doc links go to \`experienceleague.adobe.com/en/docs/experience-manager-65/...\` — never Cloud Service URLs.\n` +
            `- Granite UI dialogs use **Coral 3** (\`cq/gui/components/authoring/dialog/richtext\`, \`granite/ui/components/coral/foundation/...\`) — Coral 2 \`htmlField\` is deprecated.`,
        },
      }],
    }),
  );

  // ─── AEM 6.5 LTS / AMS Replication task ──────────────────
  server.prompt(
    'aem65-replication-task',
    'Route an AEM 6.5 LTS / AMS Replication request (agent config, content activation, Replicator API, troubleshooting) to the right specialist.',
    {
      intent:   z.string().describe('configure-replication-agent | replicate-content | replication-api | troubleshoot-replication | replication-orchestrator'),
      question: z.string().describe('The user question or task in their own words'),
    },
    ({ intent, question }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text:
            `Help with this AEM 6.5 LTS / AMS Replication task: ${question}\n\n` +
            `**Step 0:** confirm the workspace is \`aem65lts\` via \`detect_project_type\` (pass \`pomXml\`). If the pom uses \`aem-sdk-api\`, STOP — Cloud Service uses Sling Distribution, not legacy replication agents. Use \`aem-dispatcher-task\` or the Cloud migration prompt instead.\n\n` +
            `**Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
            `**Step 1:** call \`aem65_replication\` with \`intent: "${intent}"\` and the user question. Follow the specialist guidance it returns.\n\n` +
            `**Step 2:** legacy Replicator API only — \`com.day.cq.replication.Replicator\`, \`ReplicationOptions\`, \`ReplicationStatus\`, \`AgentManager\`, \`ReplicationQueue\`, \`ReplicationListener\`. Do NOT use \`org.apache.sling.distribution.*\` (that is Cloud Service only).\n\n` +
            `**Step 3:** for agent config, edit JCR nodes under \`/etc/replication/agents.author/\` or \`/etc/replication/agents.publish/\`. Always test in author/publish before promoting.`,
        },
      }],
    }),
  );

  // ─── AEM 6.5 LTS / AMS Workflow task ─────────────────────
  server.prompt(
    'aem65-workflow-task',
    'Route an AEM 6.5 LTS / AMS Granite Workflow request (model design, custom step, launcher, JMX triage, debugging) to the right specialist.',
    {
      intent:   z.string().describe('workflow-model-design | workflow-development | workflow-triggering | workflow-launchers | workflow-debugging | workflow-triaging | workflow-orchestrator'),
      question: z.string().describe('The user question or task in their own words'),
    },
    ({ intent, question }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text:
            `Help with this AEM 6.5 LTS / AMS Workflow task: ${question}\n\n` +
            `**Step 0:** confirm the workspace is \`aem65lts\` via \`detect_project_type\`. If \`aemaacs\`, JMX-based remediation is forbidden — use the Cloud Service workflow skills instead.\n\n` +
            `**Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
            `**Step 1:** call \`aem65_workflow\` with \`intent: "${intent}"\` and the user question. Follow the specialist guidance it returns.\n\n` +
            `**Step 2:** path conventions on 6.5 LTS:\n` +
            `- Workflow model **design-time**: \`/conf/global/settings/workflow/models/<id>\` (preferred) or \`/etc/workflow/models/<id>\` (legacy — still allowed on 6.5).\n` +
            `- Workflow model **runtime** (API): \`/var/workflow/models/<id>\`.\n` +
            `- Launcher config: \`/conf/global/settings/workflow/launcher/config/\`.\n\n` +
            `**Step 3:** JMX is **allowed** on 6.5 LTS / AMS — \`retryFailedWorkItems\`, \`countStaleWorkflows\`, \`restartStaleWorkflows\`, \`purgeCompleted\` are valid remediation tools (they are forbidden on Cloud Service).\n\n` +
            `**Step 4:** for custom steps, implement \`com.adobe.granite.workflow.exec.WorkflowProcess\` and register via OSGi DS R6 (Felix SCR still supported but discouraged for new code).`,
        },
      }],
    }),
  );

  // ─── Input adapters: design → block (auto-route by project type) ───
  //
  // These three prompts are *input adapters*. They each turn a design source
  // (Figma URL, image, web URL) into a normalized spec, then hand off to the
  // platform-specific scaffold prompt based on `detect_project_type`:
  //   eds        → new-block / design-to-block
  //   storefront → storefront-from-design
  //   aemaacs    → new-aem-component
  //   aem65lts   → new-aem65-component

  const ROUTE_BY_PROJECT_TYPE =
    `Routing rule (apply after extracting the spec):\n` +
    `- \`detect_project_type\` returns \`eds\`        → use \`new-block\` or \`design-to-block\` to scaffold.\n` +
    `- \`detect_project_type\` returns \`storefront\` → use \`storefront-from-design\` (commerce pages compose drop-ins, NOT vanilla blocks).\n` +
    `- \`detect_project_type\` returns \`aemaacs\`    → use \`new-aem-component\` (AEM as a Cloud Service).\n` +
    `- \`detect_project_type\` returns \`aem65lts\`  → use \`new-aem65-component\` (AEM 6.5 LTS / AMS / on-prem).`;

  // ─── Figma → component ───────────────────────────────────
  server.prompt(
    'figma-to-component',
    'Read a Figma frame / file and turn it into a block or AEM component, auto-routed to the right platform (EDS / Storefront / AEMaaCS / AEM 6.5 LTS).',
    {
      figmaUrl: z.string().describe('Figma file or frame URL (e.g. https://www.figma.com/file/<key>/...?node-id=123%3A456)'),
      componentName: z.string().describe('kebab-case name for the resulting block/component (e.g. "promo-card")'),
      description: z.string().optional().describe('Optional extra context the LLM should consider'),
    },
    ({ figmaUrl, componentName, description }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text:
            `Build "${componentName}" from this Figma source: ${figmaUrl}.${description ? `\nContext: ${description}` : ''}\n\n` +
            `**Step 0 — detect available Figma reader.** Check the active MCP tool inventory for any tool whose name starts with \`mcp__figma__\` / \`figma_\` / contains "figma" (e.g. \`get_figma_data\`, \`get_file\`, \`get_node\`).\n\n` +
            `- **If a Figma MCP tool is available:** call it with the file key and node id parsed from the URL. Extract: layers, components / variants, auto-layout direction, fills (colors), strokes, typography (family / weight / size / line-height), spacing tokens, image fills, and any text content. Save the structured spec.\n\n` +
            `- **If NO Figma MCP tool is available:** STOP and return this exact instruction to the user:\n\n` +
            `  > To get accurate Figma extraction, please install **Microsoft's official Figma MCP server**:\n` +
            `  > \n` +
            `  > \`\`\`json\n` +
            `  > // .vscode/mcp.json or .cursor/mcp.json\n` +
            `  > {\n` +
            `  >   "servers": {\n` +
            `  >     "figma": {\n` +
            `  >       "command": "npx",\n` +
            `  >       "args": ["-y", "figma-developer-mcp", "--stdio"],\n` +
            `  >       "env": { "FIGMA_API_KEY": "<your-figma-personal-access-token>" }\n` +
            `  >     }\n` +
            `  >   }\n` +
            `  > }\n` +
            `  > \`\`\`\n` +
            `  > \n` +
            `  > Get a token from https://www.figma.com/settings → Personal access tokens. Restart your IDE, then re-run \`figma-to-component\`.\n` +
            `  > \n` +
            `  > **Fallback (without Figma MCP):** export the frame as a PNG/JPG and re-run \`image-to-component\` with the file path.\n\n` +
            `**Step 1 — Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
            `**Step 2 — detect project type:** call \`detect_project_type\` with workspace snapshots so you know which platform to target.\n\n` +
            `**Step 3 — normalize the Figma spec into a block-friendly schema:**\n` +
            `- \`structure\`: leaf vs container (any frame with ≥2 sibling instances of the same component is a container with item children).\n` +
            `- \`fields\`: per item — image+imageAlt, title+titleType, eyebrow, body (richtext), link+linkText (CTAs), classes (variants).\n` +
            `- \`variants\`: any Figma component variant property maps to an option on the \`classes\` multiselect.\n` +
            `- \`tokens\`: colors → CSS custom properties, typography → \`font-family / font-size / line-height\`, spacing → margins / gaps.\n` +
            `- \`responsive\`: if multiple breakpoint frames exist, capture each at 600 / 900 / 1200 px (mobile-first).\n\n` +
            `**Step 4 — hand off:**\n${ROUTE_BY_PROJECT_TYPE}\n\nPass \`blockName: "${componentName}"\` (or \`componentName\` for AEM) and the normalized spec from Step 3 as the design description.\n\n` +
            `Hard rules across all platforms:\n` +
            `- Reuse platform image / link nodes (don't recreate \`<picture>\` / \`<a>\`).\n` +
            `- Mobile-first CSS, breakpoints 600 / 900 / 1200 px.\n` +
            `- No new npm dependencies in EDS / Storefront blocks.`,
        },
      }],
    }),
  );

  // ─── Image → component (vision) ──────────────────────────
  server.prompt(
    'image-to-component',
    'Analyze a design screenshot / mockup with vision and turn it into a block or AEM component, auto-routed to the right platform.',
    {
      componentName: z.string().describe('kebab-case name for the resulting block/component'),
      imagePaths:    z.string().describe('Comma-separated local file paths or URLs of the design image(s)'),
      description:   z.string().optional().describe('Optional extra context (e.g. "match the brand from styles/styles.css")'),
    },
    ({ componentName, imagePaths, description }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text:
            `Build "${componentName}" from these design image(s): ${imagePaths}.${description ? `\nContext: ${description}` : ''}\n\n` +
            `**Step 0 — confirm the IDE LLM can see images.** You (the assistant) MUST attach / view the listed image(s) using your native vision capability before proceeding. If the image path is local, read it as an image. If it is a URL, fetch and view it. Do NOT guess from the filename.\n\n` +
            `**Step 1 — Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
            `**Step 2 — detect project type:** call \`detect_project_type\` with workspace snapshots.\n\n` +
            `**Step 3 — vision extraction.** For each image, produce a structured spec:\n` +
            `- **Layout**: grid columns at desktop, stacking at mobile, alignment, gaps.\n` +
            `- **Components & repetitions**: any element repeated ≥2 times is an item child of a container block.\n` +
            `- **Fields**: list every distinct authorable element (heading, eyebrow, body, image, CTA primary, CTA secondary, badge, price, etc.) with field name in camelCase.\n` +
            `- **Variants**: dark / light, wide / compact, with-image / text-only — anything that toggles → entry on the \`classes\` multiselect.\n` +
            `- **Design tokens**: foreground / background colors (hex), accent / brand colors, font families (primary + secondary), font sizes for h1/h2/h3/body, border radius, button shape (sharp / soft / pill).\n` +
            `- **Interactive behavior**: hover states, transitions, accordion / carousel mechanics, autoplay timing.\n` +
            `- **Responsive**: behavior at 600 / 900 / 1200 px breakpoints.\n` +
            `- **Acceptance criteria**: 5–8 bullets a reviewer can check against the image.\n\n` +
            `**Step 4 — sanity check.** For pre-LCP / above-the-fold blocks, verify nothing in the spec violates:\n` +
            `- 100 KB pre-LCP budget (no carousels with 20+ slides eager-loaded).\n` +
            `- Authoring shape that EDS / UE / Granite can actually express (no hard-coded counts; use container blocks for repeating items).\n\n` +
            `**Step 5 — hand off:**\n${ROUTE_BY_PROJECT_TYPE}\n\nPass \`blockName: "${componentName}"\` (or \`componentName\` for AEM) plus the spec from Step 3 as \`description\`.\n\n` +
            `**Step 6 — call \`generate_block_from_design\`** if the target is EDS / Storefront — it returns the canonical scaffold + the same vision-analysis prompt structure for cross-checking. Skip this step for AEMaaCS / AEM 6.5.`,
        },
      }],
    }),
  );

  // ─── URL → component (crawler + Playwright handoff) ──────
  server.prompt(
    'url-to-component',
    'Crawl a public URL, identify components / variations / theme, and build a matching block or AEM component, auto-routed to the right platform.',
    {
      url: z.string().describe('Public URL to crawl (e.g. https://www.example.com/page)'),
      componentName: z.string().describe('kebab-case name for the block/component to generate (e.g. "feature-cards")'),
      target: z.string().optional().describe('Optional CSS selector or section description to focus on (e.g. ".hero", "the testimonials carousel")'),
    },
    ({ url, componentName, target }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text:
            `Build "${componentName}" by reverse-engineering this page: ${url}.${target ? `\nFocus area: ${target}` : ''}\n\n` +
            `**Step 0 — Project summary rule:** ${PROJECT_SUMMARY_WORKFLOW}\n\n` +
            `**Step 1 — static crawl.** Call \`crawl_url\` with \`url: "${url}"\`. Read its output: page meta, palette, fonts, headings, component candidates (hero / cards / carousel / tabs / accordion / form / cta), repeating CSS classes, and counts.\n\n` +
            `**Step 2 — decide if you need rendered HTML.**\n` +
            `- If the static crawl shows few headings / no inline styles / a "Frameworks: React (SSR) / Next.js / Nuxt" hint AND the user's focus area is dynamic, you need the rendered DOM.\n` +
            `- Check for **Microsoft Playwright MCP** in the tool inventory (any tool starting with \`browser_\` / \`playwright_\` — typically \`browser_navigate\`, \`browser_snapshot\`, \`browser_evaluate\`).\n` +
            `- **If Playwright MCP is available:** call \`browser_navigate\` with the URL, wait for network idle, then \`browser_evaluate\` with \`() => document.documentElement.outerHTML\` (or \`browser_snapshot\` for an accessibility tree). Pipe the rendered HTML back into \`crawl_url\` via the \`html\` parameter for a second-pass analysis.\n` +
            `- **If Playwright MCP is NOT available** and you decided you need it, STOP and tell the user:\n\n` +
            `  > For accurate analysis of JS-rendered / SPA pages, install **Microsoft's official Playwright MCP server**:\n` +
            `  > \n` +
            `  > \`\`\`json\n` +
            `  > // .vscode/mcp.json or .cursor/mcp.json\n` +
            `  > {\n` +
            `  >   "servers": {\n` +
            `  >     "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest"] }\n` +
            `  >   }\n` +
            `  > }\n` +
            `  > \`\`\`\n` +
            `  > \n` +
            `  > Restart your IDE, then re-run \`url-to-component\`.\n\n` +
            `  Otherwise (static-only is fine), continue with the crawl_url result.\n\n` +
            `**Step 3 — identify the component.** From the candidates + repeating classes, decide which page section maps to "${componentName}":\n` +
            `- \`focus area\` ${target ? `is "${target}"` : 'was not provided — pick the strongest candidate (hero if it dominates the fold, cards if a class repeats ≥3 times, carousel if multiple sliders share a class, etc.)'}.\n` +
            `- Detect variations: if the same class appears with modifier suffixes (\`.card\`, \`.card--dark\`, \`.card--wide\`), each modifier becomes a \`classes\` multiselect option.\n` +
            `- Repeating siblings (\`<div class="card">\` × N) → container block with item children. N ≥ 3 → strong signal.\n\n` +
            `**Step 4 — extract design tokens** from the crawl output: top palette entries → CSS custom properties; top font families → \`--type-base-font-family\` / \`--type-headline-font-family\`; visible button radius / spacing → CSS variables.\n\n` +
            `**Step 5 — detect project type:** call \`detect_project_type\` with workspace snapshots.\n\n` +
            `**Step 6 — hand off:**\n${ROUTE_BY_PROJECT_TYPE}\n\nPass \`blockName: "${componentName}"\` (or \`componentName\`) plus a description that includes:\n- the component candidate type (e.g. "cards container with 6 items + dark variant")\n- the field list inferred from the DOM (image / title / body / cta — match what the source page actually authors)\n- the design tokens (palette + fonts) to apply in the block CSS\n- the source URL for traceability.\n\n` +
            `**Step 7 — final review.** After the scaffold prompt finishes, run \`validate_block\` (EDS / Storefront) or \`mvn -PautoInstallPackage clean install -pl core,ui.apps\` (AEM 6.5) / \`mvn -PautoInstallSinglePackage ...\` (AEMaaCS) to confirm the build passes.\n\n` +
            `Constraints:\n` +
            `- Reverse-engineer **structure and theme**, not copyrighted content. Replace any extracted text/imagery with placeholders unless the user explicitly owns the source page.\n` +
            `- Don't introduce frameworks (Bootstrap, Tailwind) the source uses if the target project is EDS — re-implement with vanilla CSS scoped to \`main .${componentName}\`.`,
        },
      }],
    }),
  );
}
