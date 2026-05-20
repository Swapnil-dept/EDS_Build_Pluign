import { z } from 'zod';
/**
 * `bootstrap_workspace_instructions` — emit ready-to-write rule files that
 * teach the user's AI agent (Copilot / Cursor / Cline / Continue) to use
 * the eds-mcp-server tools automatically, without the user having to say
 * "use eds mcp server" each turn.
 *
 * Supports 4 project-type-specific instruction sets:
 *   - eds         → AEM Edge Delivery Services (aem-boilerplate)
 *   - storefront  → AEM EDS + Adobe Commerce Storefront (aem-boilerplate-commerce)
 *   - aemaacs     → AEM as a Cloud Service (Maven / Java)
 *   - aem65lts    → AEM 6.5 LTS / AEM Managed Services (on-prem / AMS)
 *
 * End-users consume this MCP server via `mcp.json` (npx + GitHub URL); they
 * never clone this repo, so the `.github/copilot-instructions.md` /
 * `.cursorrules` files that ship with this repo never reach them.
 * The agent calls this tool once per workspace and writes the returned
 * files at the user's repo root.
 *
 * Template files (for manual copy) live at:
 *   templates/copilot-instructions/{eds,aem-cloud-service,aem-managed-service,eds-storefront}.md
 */
// ─── Shared Karpathy block ─────────────────────────────────────────────────
const KARPATHY_BLOCK = `## 🧠 Karpathy Guidelines (apply to every response)

> Reduce common LLM coding mistakes. Bias toward caution over speed.
> Derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876).

### 1. Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, name what's confusing and ask.

### 2. Simplicity First
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- Mention unrelated dead code — don't delete it.
- Remove only imports/variables made unused **by your changes**.
- Every changed line must trace directly to the user's request.

### 4. Goal-Driven Execution
- Transform tasks into verifiable goals (e.g. "Fix the bug" → "Write a test that reproduces it, then make it pass").
- For multi-step tasks, state a brief plan with a verify step for each action.
- Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.`;
// ─── EDS (aem-boilerplate) ─────────────────────────────────────────────────
const INSTRUCTIONS_EDS = `# GitHub Copilot Instructions — AEM Edge Delivery Services (EDS)

This workspace is an **Adobe EDS project** based on \`aem-boilerplate\`.
This workspace uses the **\`eds-mcp-server\`** MCP server (\`eds-mcp-serve\`).
**Always load and prefer its tools** for any EDS-related task.

## Project setup (run once after cloning)

\`\`\`bash
npm install
npx @adobe/aem-cli@latest up   # → http://localhost:3000
# After any block JSON change:
npm run build:json
\`\`\`

Edit \`fstab.yaml\` to point at your Google Drive / SharePoint folder.
Edit \`head.html\` in the repo root for custom metadata and scripts.

## Mandatory workflow for every request

1. **\`detect_project_type\`** — confirm \`eds\`. Pass package.json, head.html, fstab.yaml, blocks listing.
2. **Project-summary gate** — \`.project-summary.md\` missing → call \`project_summary\` and write it; present → read it; after every change → refresh it.
3. **\`clarify_task\`** before scaffolding — ask user **one question per turn**. Never auto-add fields.
4. **Scaffold** with \`scaffold_block\` + \`scaffold_model\` once answers collected.
5. **Validate** — \`validate_block\` then \`check_performance\` (above-the-fold blocks).

## Tool routing

| Intent | Tool |
|---|---|
| New block | \`clarify_task\` (new-block) → \`scaffold_block\` |
| Block from design / Figma | \`generate_block_from_design\` |
| Fix a block bug | \`clarify_task\` (fix-bug) → \`validate_block\` |
| Performance / LCP | \`check_performance\` |
| fstab / head.html / redirects | \`eds_config\` |
| DOM before decorate() | \`explain_dom\` |
| Find existing block | \`lookup_block\` / \`search_block_collection\` |

## Conventions
- Vanilla JS, \`export default function decorate(block)\`, no npm imports.
- CSS: \`main .block-name { }\` — never style \`-wrapper\` / \`-container\`.
- Mobile-first, breakpoints 600 / 900 / 1200 px (\`min-width\`).
- Reuse platform \`<picture>\` / \`<a>\` nodes.
- Run \`npm run build:json\` after any \`_<name>.json\` change.
- Secrets: \`window.TOKEN_NAME || ''\` — never hardcode.

## Hard rules
- Never invent fields the user did not name.
- Never bypass \`detect_project_type\`.
- One question per turn. Wait for the user's reply.

${KARPATHY_BLOCK}`;
// ─── EDS Storefront (aem-boilerplate-commerce) ────────────────────────────
const INSTRUCTIONS_STOREFRONT = `# GitHub Copilot Instructions — AEM EDS + Adobe Commerce Storefront

This workspace is an **AEM EDS Commerce Storefront** based on \`aem-boilerplate-commerce\`.
This workspace uses the **\`eds-mcp-server\`** MCP server (\`eds-mcp-serve\`).
**Always load and prefer its tools** for any EDS or commerce-related task.

## Project setup (run once after cloning)

\`\`\`bash
npm install            # also runs postinstall → wires scripts/__dropins__/
npx @adobe/aem-cli@latest up   # → http://localhost:3000
# After adding/upgrading a drop-in:
npm run postinstall
# After any block JSON change:
npm run build:json
\`\`\`

Edit \`scripts/configs.js\` with your Commerce endpoint / environment handles.

### Adobe Commerce AI Agent Skills (recommended)
\`\`\`bash
npx @adobe/aio-cli@latest plugins:install https://github.com/adobe-commerce/aio-cli-plugin-commerce && \\
  npx @adobe/aio-cli@latest commerce extensibility tools-setup \\
  --starter-kit aem-boilerplate-commerce --agent "GitHub Copilot" --package-manager npm
# Restart your IDE after install
\`\`\`

## Mandatory workflow for every request

1. **\`detect_project_type\`** — confirm \`storefront\`. Pass package.json, scripts/__dropins__ listing, head.html.
2. **Project-summary gate** — \`.project-summary.md\` missing → call \`project_summary\`; present → read; after change → refresh.
3. **\`clarify_task\`** before scaffolding — one question per turn.
4. **Scaffold** with \`scaffold_commerce_block\` or \`add_dropin\`.
5. **Validate** — \`validate_storefront\` after every change.

## Tool routing

| Intent | Tool |
|---|---|
| New commerce block | \`clarify_task\` (new-storefront-block) → \`scaffold_commerce_block\` |
| Install a drop-in | \`clarify_task\` (add-dropin) → \`add_dropin\` |
| Browse drop-ins | \`lookup_dropin\` |
| Customize a drop-in slot | \`customize_dropin_slot\` |
| Brand / theme | \`clarify_task\` (style-or-theme) → \`style_dropin\` |
| Validate wiring | \`validate_storefront\` |
| Configure configs.js / head.html | \`eds_storefront_config\` |
| Analytics / ACDL | \`commerce_events_guide\` |

## Conventions
- **Never edit \`scripts/__dropins__/\`** — regenerated by \`npm run postinstall\`.
- Drop-ins: \`package.json\` dependencies → wired via initializers in \`scripts/initializers/\`.
- EDS block rules still apply (vanilla JS, scoped CSS, no frameworks).
- Secrets: \`window.TOKEN_NAME || ''\` — never hardcode.

## Hard rules
- Never edit \`scripts/__dropins__/\` directly.
- Never invent fields the user did not name.
- Never bypass \`detect_project_type\`.
- One question per turn. Wait for the user's reply.

${KARPATHY_BLOCK}`;
// ─── AEM as a Cloud Service ────────────────────────────────────────────────
const INSTRUCTIONS_AEM_CLOUD = `# GitHub Copilot Instructions — AEM as a Cloud Service (AEMaaCS)

This workspace is an **Adobe AEM as a Cloud Service** project (Maven / Java stack).
This workspace uses the **\`eds-mcp-server\`** MCP server (\`eds-mcp-serve\`).
**Always load and prefer its tools** for any AEM-related task.

## Project setup (run once after cloning)

\`\`\`bash
# Build and deploy to local AEM Author (port 4502)
mvn -PautoInstallSinglePackage clean install

# Build without deploying
mvn clean install

# Deploy only ui.apps
mvn -PautoInstallPackage clean install -pl ui.apps
\`\`\`

Prerequisites: AEM SDK QuickStart JAR on port 4502; credentials in \`~/.m2/settings.xml\`.
Cloud Manager: push to \`main\` to trigger the CI/CD pipeline.

## Mandatory workflow for every request

1. **\`detect_project_type\`** — confirm \`aemaacs\`. Pass pom.xml, ui.apps/core/dispatcher listings, \`.aem-skills-config.yaml\`.
2. **Bootstrap gate** — \`AGENTS.md\` / \`.aem-skills-config.yaml\` missing → call \`ensure_agents_md\` first.
3. **Project-summary gate** — \`.project-summary.md\` missing → call \`project_summary\`; present → read; after change → refresh.
4. **\`clarify_task\`** before scaffolding — one question per turn.
5. **Scaffold** with \`scaffold_aem_component\`.
6. **Validate** — remind user to run \`mvn -PautoInstallSinglePackage clean install\` and check \`error.log\`.

## Tool routing

| Intent | Tool |
|---|---|
| New component | \`clarify_task\` (new-component) → \`scaffold_aem_component\` |
| Dialog design | \`aem_dialog_design\` |
| Java / OSGi / HTL best practices | \`aem_best_practices\` |
| Dispatcher config | \`aem_dispatcher_config\` |
| Migrate legacy pattern | \`aem_migration_pattern\` |
| Security pipeline | \`aem_security_pipeline\` |
| Bootstrap AGENTS.md | \`ensure_agents_md\` |

## Conventions
- **Never modify \`/libs\`** — read-only in Cloud Service.
- OSGi DS R6 annotations (\`@Component\`, \`@Service\`, \`@Reference\`).
- Service users with \`ServiceUserMapperImpl.amended\` — never admin credentials.
- Sling Models: \`@Model(adaptables = ...)\`, \`@Inject\` / \`@ValueMapValue\`.
- Secrets: \`$[secret:VARIABLE_NAME]\` Cloud Manager env vars — never hardcode.
- Read \`project\` / \`javaPackage\` / \`group\` from \`.aem-skills-config.yaml\` — never guess.

## Hard rules
- Never invent \`project\` / \`javaPackage\` / \`group\`.
- Never bypass \`detect_project_type\`.
- One question per turn. Wait for the user's reply.

${KARPATHY_BLOCK}`;
// ─── AEM 6.5 LTS / Managed Services ───────────────────────────────────────
const INSTRUCTIONS_AEM_MANAGED = `# GitHub Copilot Instructions — AEM 6.5 LTS / AEM Managed Services (AMS)

This workspace is an **Adobe AEM 6.5 LTS / AMS** project (Maven / Java, on-prem or Adobe Managed Services).
This workspace uses the **\`eds-mcp-server\`** MCP server (\`eds-mcp-serve\`).
**Always load and prefer its tools** for any AEM-related task.

## Project setup (run once after cloning)

\`\`\`bash
# Build and deploy to local AEM Author (port 4502)
mvn -PautoInstallPackage clean install

# Build without deploying
mvn clean install

# Deploy to Publish (port 4503)
mvn -PautoInstallPackagePublish clean install
\`\`\`

Prerequisites: AEM 6.5 LTS QuickStart JAR on port 4502; SP22+ installed; credentials in \`~/.m2/settings.xml\`.
Configure Replication Agent (Author → Tools → Replication → Agents on Author) after first deploy.

## Mandatory workflow for every request

1. **\`detect_project_type\`** — confirm \`aem65lts\`. Pass pom.xml, ui.apps/core/dispatcher listings.
2. **Project-summary gate** — \`.project-summary.md\` missing → call \`project_summary\`; present → read; after change → refresh.
3. **\`clarify_task\`** before scaffolding — one question per turn.
4. **Scaffold** with \`scaffold_aem65_component\`.
5. **Validate** — remind user to run \`mvn -PautoInstallPackage clean install\` and check \`crx-quickstart/logs/error.log\`.

## Tool routing

| Intent | Tool |
|---|---|
| New component | \`clarify_task\` (new-component) → \`scaffold_aem65_component\` |
| Dialog design | \`aem_dialog_design\` |
| Java / OSGi / HTL best practices | \`aem_best_practices\` |
| Configure replication | \`aem65_replication\` |
| Configure workflows | \`aem65_workflow\` |
| Dispatcher config | \`aem_dispatcher_config\` |
| Security pipeline | \`aem_security_pipeline\` |
| Browse AEM 6.5 skills | \`aem65_skills_index\` |

## Conventions
- Read \`project\` / \`javaPackage\` / \`group\` from root \`pom.xml\` — never guess.
- OSGi DS R6 annotations (\`org.osgi.service.component.annotations\`) — not legacy Felix SCR.
- Service users with \`ServiceUserMapperImpl.amended\` — never admin credentials.
- Touch UI dialogs: \`_cq_dialog/.content.xml\` (Granite UI Coral 3).
- Secrets: \`System.getenv()\` or CryptoSupport OSGi service — never hardcode.

## Hard rules
- Never invent \`project\` / \`javaPackage\` / \`group\`.
- Never bypass \`detect_project_type\`.
- One question per turn. Wait for the user's reply.

${KARPATHY_BLOCK}`;
// ─── Generic fallback (all project types) ─────────────────────────────────
const COPILOT_INSTRUCTIONS = `# EDS MCP Server — Project Instructions

This workspace uses the **\`eds-mcp-server\`** MCP server. **Always prefer its tools** over your built-in knowledge when the user asks about Adobe Edge Delivery Services (EDS), EDS + Adobe Commerce Storefront, AEM as a Cloud Service (AEMaaCS), or AEM 6.5 LTS / AMS.

## Mandatory workflow for every request

1. **First call:** \`detect_project_type\` with workspace snapshots (package.json, head.html, fstab.yaml, root/scripts/blocks/dropins listings; pom.xml + ui.apps/core/dispatcher listings for AEM Maven projects). The response tells you which project type this is and which tools to use.

2. **Project-summary gate:** check whether \`.project-summary.md\` exists at workspace root.
   - If missing → call \`project_summary\` and write the result to \`.project-summary.md\`.
   - If present → read it for context.
   - After every change in the session → call \`project_summary\` again with \`existingSummary\` + \`sessionChanges\` and overwrite the file.

3. **Clarify before scaffolding:** call \`clarify_task\` with the user's raw request (or an explicit \`intent\`) to get the canonical question list. Then ask the user **one question per turn** using \`vscode_askQuestions\` (or the equivalent IDE input UI). Never auto-add fields, variants, or features the user did not name.

4. **Scaffold / generate / migrate:** only after required answers are collected, call the matching tool — \`scaffold_block\` / \`scaffold_commerce_block\` / \`scaffold_aem_component\` / \`scaffold_aem65_component\` / etc. The \`clarify_task\` and \`component_interview\` responses tell you which.

5. **Validate after every change:**
   - EDS → \`validate_block\` and (above-the-fold) \`check_performance\`
   - Storefront → \`validate_storefront\`
   - AEM Maven → remind user to \`mvn -PautoInstallSinglePackage clean install\` (Cloud) or \`mvn -PautoInstallPackage clean install\` (6.5)

## Tool routing cheat-sheet

| User intent | First MCP tool to call |
| --- | --- |
| "Create / scaffold a block" | \`clarify_task\` (intent: \`new-block\`) → \`scaffold_block\` |
| "Create a commerce / cart / PDP / drop-in block" | \`clarify_task\` (intent: \`new-storefront-block\`) → \`scaffold_commerce_block\` |
| "Add a drop-in" | \`clarify_task\` (intent: \`add-dropin\`) → \`add_dropin\` |
| "Create an AEM component" | \`clarify_task\` (intent: \`new-component\`) → \`scaffold_aem_component\` / \`scaffold_aem65_component\` |
| "Migrate / import a URL" | \`migrate-page-to-eds\` prompt (uses Playwright MCP) |
| "Generate a block from a Figma / image / URL" | \`generate_block_from_design\` |
| "Theme / colours / fonts" | \`clarify_task\` (intent: \`style-or-theme\`) → \`style_dropin\` (storefront) or direct CSS edits |
| "Fix a bug in a block" | \`clarify_task\` (intent: \`fix-bug\`) + \`validate_block\` |
| "Slow / LCP / performance" | \`clarify_task\` (intent: \`performance\`) → \`check_performance\` |
| "Configure fstab / head.html / redirects" | \`eds_config\` |
| "Lookup a block / drop-in" | \`lookup_block\` / \`lookup_dropin\` / \`search_block_collection\` |

## Hard rules

- **Never invent fields** the user did not name. Pass through ONLY what was asked for.
- **Never bypass \`detect_project_type\`** — the wrong scaffolder for the project type produces broken code.
- **For AEM Maven:** never invent \`project\` / \`javaPackage\` / \`group\` — read from \`.aem-skills-config.yaml\` (Cloud) or \`pom.xml\` (6.5 LTS).
- **For storefront:** never edit \`scripts/__dropins__/\` directly (regenerated by \`npm run postinstall\`).
- **One question per turn** during interviews. End the turn after asking. Wait for the user's reply.

## 🧠 Karpathy Guidelines (apply to every response)

> Behavioral rules to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876).

### 1. Think Before Coding
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove only imports/variables/functions that **your** changes made unused.
- Every changed line must trace directly to the user's request.

### 4. Goal-Driven Execution
- Transform tasks into verifiable goals (e.g. "Fix the bug" → "Write a test that reproduces it, then make it pass").
- For multi-step tasks, state a brief plan with a verify step for each action.
- Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
`;
const CURSOR_RULES = `# Cursor / Cline / Continue — EDS MCP Server Rules

This workspace uses the **\`eds-mcp-server\`** MCP server. Always prefer its tools when the user asks about Adobe Edge Delivery Services (EDS), EDS + Adobe Commerce Storefront, AEM as a Cloud Service, or AEM 6.5 LTS / AMS.

See \`.github/copilot-instructions.md\` for the full tool-routing table and mandatory workflow. Same rules apply here.

Quick summary:
1. \`detect_project_type\` first
2. Maintain \`.project-summary.md\` (\`project_summary\` tool)
3. \`clarify_task\` before any scaffolding — ask user one question per turn
4. Scaffold / generate with the project-type-specific tool
5. Validate (\`validate_block\`, \`validate_storefront\`, AEM Maven build)

## 🧠 Karpathy Guidelines (apply to every response)
- **Think before coding:** state assumptions, surface ambiguity, push back when simpler approaches exist.
- **Simplicity first:** no features, abstractions, or error handling beyond what was asked.
- **Surgical changes:** touch only what you must; match existing style; mention (don't delete) unrelated dead code.
- **Goal-driven execution:** define verifiable success criteria before starting; plan multi-step tasks with a check per step.
`;
const AGENTS_MD = `# AGENTS.md

This workspace uses the **\`eds-mcp-server\`** MCP server (https://github.com/Swapnil-dept/EDS_Build_Pluign).

Any AI coding agent (Copilot, Cursor, Cline, Continue, Claude Code, etc.) working in this repo must:

1. Call \`detect_project_type\` before any other tool.
2. Ensure \`.project-summary.md\` exists; refresh it after every change with \`project_summary\`.
3. Call \`clarify_task\` and ask the user clarifying questions before scaffolding code.
4. Use the EDS MCP scaffold / validate / migrate tools instead of writing equivalent code from memory.

See \`.github/copilot-instructions.md\` for the full ruleset.
`;
export function registerBootstrapWorkspace(server) {
    server.tool('bootstrap_workspace_instructions', `Emit ready-to-write project-instruction files that teach the user's AI agent (Copilot / Cursor / Cline / Continue / Claude Code) to use the eds-mcp-server tools automatically. Pass \`projectType\` (from \`detect_project_type\`) to get a project-specific \`.github/copilot-instructions.md\` with the correct setup steps, tool routing, and conventions. Omit \`projectType\` to get the generic all-projects version. Returns EXACT contents to write to: \`.github/copilot-instructions.md\` (VS Code Copilot Chat), \`.cursorrules\` (Cursor / Cline / Continue), and \`AGENTS.md\` (Claude Code / generic). Call this **once per new workspace**, right after \`detect_project_type\`. Idempotent: refuse to overwrite existing files without explicit user permission.`, {
        projectType: z
            .enum(['eds', 'storefront', 'aemaacs', 'aem65lts'])
            .optional()
            .describe('Project type returned by detect_project_type. When provided, emits a project-specific copilot-instructions.md (with setup steps, tool routing, conventions). Omit for the generic all-projects fallback.'),
        includeCopilot: z.boolean().default(true).describe('Emit `.github/copilot-instructions.md` for VS Code Copilot Chat.'),
        includeCursor: z.boolean().default(true).describe('Emit `.cursorrules` for Cursor / Cline / Continue.'),
        includeAgentsMd: z.boolean().default(true).describe('Emit `AGENTS.md` for Claude Code / generic agents.'),
    }, {
        title: 'Bootstrap Workspace Instructions',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ projectType, includeCopilot, includeCursor, includeAgentsMd }) => {
        // Select the right copilot-instructions content for this project type
        const instructionsMap = {
            eds: INSTRUCTIONS_EDS,
            storefront: INSTRUCTIONS_STOREFRONT,
            aemaacs: INSTRUCTIONS_AEM_CLOUD,
            aem65lts: INSTRUCTIONS_AEM_MANAGED,
        };
        const copilotContent = projectType ? (instructionsMap[projectType] ?? COPILOT_INSTRUCTIONS) : COPILOT_INSTRUCTIONS;
        const typeLabel = projectType ? ` (project type: \`${projectType}\`)` : ' (generic — all project types)';
        const out = [];
        out.push(`# Bootstrap workspace instructions${typeLabel}\n\nWrite the files below to the user's workspace root **only if they don't already exist** (refuse to overwrite without explicit user permission). After writing, the user's AI agent will route to \`eds-mcp-server\` tools automatically.\n\n> Template files for manual copy live in the MCP server repo at \`templates/copilot-instructions/\`.`);
        if (includeCopilot) {
            out.push(`## File: \`.github/copilot-instructions.md\`\n\nVS Code Copilot Chat reads this on every request in the workspace.\n\n\`\`\`markdown\n${copilotContent}\n\`\`\``);
        }
        if (includeCursor) {
            out.push(`## File: \`.cursorrules\`\n\nCursor / Cline / Continue read this automatically.\n\n\`\`\`markdown\n${CURSOR_RULES}\n\`\`\``);
        }
        if (includeAgentsMd) {
            out.push(`## File: \`AGENTS.md\`\n\nClaude Code and several other agents look for this file at the workspace root.\n\n\`\`\`markdown\n${AGENTS_MD}\n\`\`\``);
        }
        out.push(`## Next steps\n\n1. Write the file(s) above.\n2. Add \`.project-summary.md\` next via the \`project_summary\` tool.\n3. **Restart the IDE** (full quit, not just reload window) so the agent picks up the new instruction files.`);
        return { content: [{ type: 'text', text: out.join('\n\n') }] };
    });
}
//# sourceMappingURL=bootstrap-workspace.js.map