# EDS MCP Server

MCP server for AEM Edge Delivery Services development — scaffolding, validation, configuration, and guidance tools for VS Code and Cursor.

---

## Quick install (for end users)

Once published to npm, add this to your project's `.vscode/mcp.json`:

```jsonc
{
  "servers": {
    "eds-mcp-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:Swapnil-dept/EDS_Build_Pluign"]
    }
  }
}
```

That's it. Restart VS Code → Copilot Chat (Agent mode) will discover the tools automatically. No npm account needed.

Pin to a specific release for stability:
```jsonc
"args": ["-y", "github:Swapnil-dept/EDS_Build_Pluign#v1.0.0"]
```

---

## Prerequisites

- **Node.js** ≥ 18.0.0
- **VS Code** with [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) (agent mode) **or** [Cursor](https://cursor.sh/)

---

## Setup (Step by Step)

### Step 1 — Clone the repository

```bash
git clone <repo-url>
cd EDS_Build_Pluign
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Build the project

```bash
npm run build
```

This compiles TypeScript to `dist/` and makes the server executable.

### Step 4 — Configure VS Code MCP

You can wire the server into **any** EDS / Storefront / AEM repo. Pick **one** of the methods below.

#### Option A — Consume directly from GitHub (recommended — no clone, no build)

In your **target project's** `.vscode/mcp.json`:

```jsonc
{
  "servers": {
    "eds-mcp-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:Swapnil-dept/EDS_Build_Pluign#<COMMIT_SHA>"]
    }
  }
}
```

> ⚠️ **Pin to a commit SHA, not a branch name.** `npx` caches `github:` URLs aggressively — if you write `#dev`, you'll be stuck on whatever was at `dev` the first time you ran it, even after we push updates. Pinning to a SHA changes the cache key and forces a fresh fetch each time you bump it.

To bump to the latest:

1. Find the latest SHA on the [`dev` branch](https://github.com/Swapnil-dept/EDS_Build_Pluign/commits/dev).
2. Replace `<COMMIT_SHA>` in your `mcp.json` with the short or full SHA (e.g. `ffc013c`).
3. **Fully quit VS Code / Cursor** (Cmd+Q on macOS, not just Reload Window) and reopen.

If the cache still misbehaves, one-time clear:

```bash
rm -rf ~/.npm/_npx
```

##### One-time bootstrap inside your project

The first time you ask the agent anything in a new workspace, it should call `detect_project_type` (which is the first instruction it sees) and then `bootstrap_workspace_instructions`. The latter returns ready-to-write contents for `.github/copilot-instructions.md`, `.cursorrules`, and `AGENTS.md`. Once those files exist in your repo, the agent will route to `eds-mcp-server` tools automatically — you'll never need to type "use eds mcp server" again.

#### Option B — Absolute path (developing / contributing to this server)

In your **target project's** `.vscode/mcp.json` (create the file if missing):

```jsonc
{
  "servers": {
    "eds-mcp-server": {
      "type": "stdio",
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/EDS_Build_Pluign/dist/index.js"]
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/EDS_Build_Pluign` with the real path on your machine. Use **forward slashes** even on Windows. Verify it works:

```bash
node /ABSOLUTE/PATH/TO/EDS_Build_Pluign/dist/index.js
# Should print: 🚀 EDS MCP Server v1.0.0 running on stdio
# Press Ctrl+C to exit.
```

#### Option C — `npm link` (system-wide command)

From this repo:

```bash
cd /path/to/EDS_Build_Pluign
npm run build
npm link
```

This registers `eds-mcp-server` as a global command. Then in any project:

```jsonc
{
  "servers": {
    "eds-mcp-server": {
      "type": "stdio",
      "command": "eds-mcp-server"
    }
  }
}
```

Verify with `which eds-mcp-server`. If it prints a path, the link worked. To uninstall: `npm unlink -g eds-mcp-server`.

#### Option D — Same-workspace (only when this repo IS your target)

```jsonc
{
  "servers": {
    "eds-mcp-server": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"]
    }
  }
}
```

> `${workspaceFolder}` resolves to the currently-open VS Code workspace. It will fail in other projects because `dist/index.js` doesn't exist there — use Option A or B instead.

#### Troubleshooting "MCP server not found / not starting"

| Symptom | Fix |
|---|---|
| `Error: Cannot find module .../dist/index.js` | Run `npm run build` in this repo. The `dist/` folder is gitignored. |
| Stale tools / missing `clarify_task` after pushing updates (Option A) | `npx` cached the old GitHub tarball. Bump the SHA in `mcp.json` (changes the cache key) or run `rm -rf ~/.npm/_npx`. |
| `command not found: eds-mcp-server` (Option C) | Re-run `npm link` after each `npm run build`. Check `npm config get prefix` is on your `$PATH`. |
| Tools don't appear in Copilot Chat | **Fully quit** VS Code (Cmd+Q), don't just Reload Window — the MCP child process needs a clean restart. Open the **Output → MCP** panel for stderr logs. |
| Agent ignores the MCP server unless I name it | The workspace is missing `.github/copilot-instructions.md` / `.cursorrules` / `AGENTS.md`. Ask the agent to call `bootstrap_workspace_instructions` and write the returned files. |
| Server starts but no logs | Logs go to **stderr** by design (stdout is reserved for JSON-RPC). Check the MCP output channel, not the terminal. |
| `EACCES: permission denied` running `dist/index.js` | `chmod 755 dist/index.js dist/cli.js` (the build script does this — re-run `npm run build`). |

### Step 5 — Verify

Open VS Code, switch to the Copilot Chat panel in **Agent mode**, and type a command like:

```
@eds scaffold a hero block
```

If the server is running, Copilot will use the MCP tools automatically.

---

## Copilot Instructions Templates

To make GitHub Copilot automatically use the right tools and follow correct conventions for your project, add a `.github/copilot-instructions.md` to your repo. Pick the template that matches your project type:

| Project type | Template file | When to use |
|---|---|---|
| AEM Edge Delivery Services | [`templates/copilot-instructions/eds.md`](templates/copilot-instructions/eds.md) | `aem-boilerplate` projects |
| AEM as a Cloud Service | [`templates/copilot-instructions/aem-cloud-service.md`](templates/copilot-instructions/aem-cloud-service.md) | AEMaaCS Maven / Java projects |
| AEM 6.5 LTS / Managed Services | [`templates/copilot-instructions/aem-managed-service.md`](templates/copilot-instructions/aem-managed-service.md) | AEM 6.5 LTS / AMS on-prem projects |

### What each template includes

Every template ships with:
- **Project setup steps** — exact commands to run after cloning (install, build, local dev server)
- **Mandatory workflow** — `detect_project_type` → project-summary gate → `clarify_task` → scaffold → validate
- **Tool routing table** — maps every user intent to the correct MCP tool for that project type
- **Project conventions** — naming, CSS scoping, secrets, file layout rules specific to the stack
- **Hard rules** — guardrails the agent must never bypass
- **🧠 Karpathy Guidelines** — 4 behavioral rules applied to every response:
  1. *Think Before Coding* — surface assumptions and ambiguity before writing code
  2. *Simplicity First* — minimum code that solves the problem, nothing speculative
  3. *Surgical Changes* — touch only what was asked, match existing style
  4. *Goal-Driven Execution* — define verifiable success criteria, plan multi-step tasks

### How to add to your project

**Option A — Copy the template manually**

```bash
mkdir -p .github
# EDS project example:
curl -o .github/copilot-instructions.md \
  https://raw.githubusercontent.com/Swapnil-dept/EDS_Build_Pluign/main/templates/copilot-instructions/eds.md
```

**Option B — Let the agent do it (recommended)**

In your target project (with `mcp.json` configured), ask Copilot:

```
Bootstrap this workspace — detect the project type and write the copilot instructions file
```

The agent will call `detect_project_type`, then `bootstrap_workspace_instructions` with the detected project type, and write the correct template to `.github/copilot-instructions.md`. Restart VS Code after.

**Option C — Direct MCP tool call**

```json
{
  "tool": "bootstrap_workspace_instructions",
  "params": {
    "projectType": "eds",
    "includeCopilot": true,
    "includeCursor": true,
    "includeAgentsMd": true
  }
}
```

Valid `projectType` values: `eds` · `aemaacs` · `aem65lts`

---

## Available Tools

### Routing — call FIRST in any new workspace

| Tool | Description |
|---|---|
| `detect_project_type` | Inspect package.json, dir listings, head.html, config.json, fstab.yaml, **plus pom.xml, .aem-skills-config.yaml, and ui.apps/core/dispatcher listings**, and decide whether the workspace is a vanilla EDS project or an AEM Maven project (**AEM as a Cloud Service** / **AEM 6.5 LTS / AMS**). Returns a confidence-scored verdict, detected AEM modules, mismatch warnings (e.g. missing `AGENTS.md` or `.aem-skills-config.yaml`), and the recommended next tools. |
| `project_summary` | Generate or refresh a root summary file such as `.project-summary.md` / `PROJECT_SUMMARY.md`. Captures detected project type, functional scope, global definitions (theme CSS, runtime scripts, auth/encryption/config signals), and the latest session delta so each session starts with current context. |

### Block & project tools

| Tool | Description |
|---|---|
| `scaffold_block` | Generate the canonical 3-file UE block: `<name>.js` + `<name>.css` + `_<name>.json` (definitions + models + filters combined). Returns README/test.html/sample-content separately as **dev-only** helpers. Supports `baseBlock`/`blockVariant` family-grouping metadata and `authoringTarget: "xwalk" \| "da"` (DA target skips the UE JSON entirely). |
| `scaffold_model` | Generate the combined `_<block>.json` for an existing block (definitions + models + filters in one file — no more 3-file merge dance). Supports `select`/`multiselect` `options` (flat or grouped), field `description`, `baseBlock`/`blockVariant` family metadata, and `authoringTarget: "da"` (returns guidance instead of a UE model). |
| `scaffold_project` | Step-by-step guide for setting up a new EDS project (standard or repoless) |
| `generate_block_from_design` | Generate a block from a text description, screenshot, and/or Figma URL |
| `validate_block` | Validate a block against EDS coding standards and best practices |
| `check_performance` | Analyze block code for performance issues and LCP budget impact |
| `explain_dom` | Show how authored content transforms into DOM before `decorate()` runs |
| `lookup_block` | Look up block patterns, implementation guidance, and references |
| `search_block_collection` | Search Adobe's Block Collection and community Block Party repos |
| `eds_config` | Get configuration templates (fstab, head.html, redirects, headers, robots, etc.) |
| `eds_scripts_guide` | Guidance for customizing scripts.js, delayed.js, and aem.js |
| `scaffold_migration_plan` | Generate a section-by-section build plan for a full page (reuse-vs-new-block decisions, content-authoring approach, brand/token notes, checklist) formatted for `.migration/plans/<page>.md`. Advisory — recommended for screenshot-only builds or pages introducing a new brand. |
| `generate_project_md` | Generate/refresh `PROJECT.md` — a durable project map (block inventory + variants, design tokens, page list, section styles, import infrastructure, multi-brand notes). Read this first, before the AGENTS.md workflow. |
| `eds_multibrand_theming_guide` | Guidance for serving multiple brands/themes from one EDS repo via body-class token scoping, shared header/footer brand checks, and `promoteInlineMetadata()`. |
| `eds_visual_verification_guide` | Guidance for verifying a built/migrated page: DOM-snapshot checks, computed-style checks against tokens, and a final pixel-diff against a reference screenshot. |
| `eds_martech_integration_guide` | Guidance for vendoring and instrumenting Adobe's [aem-martech](https://github.com/adobe-rnd/aem-martech) plugin: `git subtree` install commands (not executed), Launch container self-hosted-alloy config, head.html preload hints, scripts.js eager/lazy/delayed wiring, consent management (AEM Consent Banner Block/OneTrust/Cookiebot), SPA personalization, and API reference. |
| `scaffold_generation_manifest` | Resumable, per-block-variant generation tracker for a multi-block page migration — `.migration/manifest/<page>.json`. Each entry tracks pending/generated/validated/failed/skipped status; pass the prior manifest back in on a re-run to resume instead of restarting. |
| `scaffold_page_template_catalog` | Record a migrated page as a reusable template keyed by `urlPattern` (`.migration/catalog/page-templates.json`), so other pages on the same site matching that pattern can reuse its known section/block structure. Also supports lookup-only mode to check for a match before starting a fresh migration. |
| `generate_selector_coverage_map` | Assemble a `page-templates.json`-style section/block selector map from already-resolved selectors and run a coverage check: source vs. mapped section counts, missing selectors, and selector collisions across sections/blocks — before those mistakes reach an import parser. |
| `scaffold_migration_runbook` | Emit the disk-state-driven `MIGRATION-RUNBOOK.md` (ground rules, 9-stage pipeline, block registry/reuse rules, visual-gate loop, thresholds) plus a page-specific `STATUS.md` tracker. For large multi-section/multi-block migrations where state must survive across many sessions — the agent re-reads `STATUS.md` every run instead of relying on chat memory, and only a gate script may mark an item `passed`. |
| `scaffold_visual_gate` | Generate the `gate:visual` Node script (Playwright + pixelmatch) the migration runbook's block-build loop depends on: renders a block's test-harness page, screenshots at 1440/375, diffs against the original section screenshot, masks declared dynamic regions, and writes a pass/fail `report.json`. |


### AEM as a Cloud Service tools (Maven / Java stack)

Mirror Adobe's [skills/aem/cloud-service](https://github.com/adobe/skills/tree/beta/skills/aem/cloud-service) skills (BETA). All AEMaaCS tools require `detect_project_type` to first return `aemaacs`.

| Tool | Description |
|---|---|
| `aem_skills_index` | Index of the 6 Adobe AEMaaCS skills (ensure-agents-md, best-practices, create-component, dispatcher, migration, aem-workflow): purpose, when-to-use, SKILL.md links. |
| `ensure_agents_md` | Bootstrap. Generates a tailored `AGENTS.md`, a one-line `CLAUDE.md` (`@AGENTS.md`), and a `.aem-skills-config.yaml` stub at the workspace root. Refuses to overwrite existing files. |
| `scaffold_aem_component` | Scaffold a full AEMaaCS component: `.content.xml`, `_cq_dialog/.content.xml` (Granite UI Coral 3), HTL template, Sling Model + JUnit test, clientlib (CSS/JS/css.txt/js.txt), optional Sling Servlet. Supports extending Core Components via `@Self @Via(ResourceSuperType.class)`. |
| `aem_best_practices` | Pattern reference index for Java/OSGi/HTL guardrails (scheduler, replication, eventListener, eventHandler, resourceChangeListener, assetApi, scr-to-ds, resolver-logging, htlLint). Returns the matching `references/<module>.md` path + Cloud Service hard rules. |
| `aem_security_pipeline` | End-to-end security pipeline reference for **both AEM Cloud Service and EDS**. Covers SAST/SonarQube (Cloud Manager), OWASP Maven dependency scanning, secrets management (`$[secret:...]` Cloud Manager vars), Dispatcher security filters, HTTP security headers, GitHub Actions security workflows (secret scan + npm audit + CodeQL), client-side JS XSS prevention in EDS blocks, and full deployment-readiness checklists. Query by platform (`aem`/`eds`/`both`) and section (`overview`/`sast`/`deps`/`secrets`/`dispatcher`/`headers`/`blocks`/`ci`/`checklist`). |
| `aem_dialog_design` | AEM component dialog design best practices. Covers 13 core principles (naming consistency, simplicity, tab organization, policy-driven config, style system prioritization, show/hide logic, in-context editing, CoralUI compliance, tooltips, validation, multiselect modeling, path-picker context, AEMaaCS compatibility), 14 field types with guidance, 5 reusable dialog patterns, and a complete naming convention system. Searchable by principle, field type, pattern, or naming rules. |
| `aem_migration_pattern` | Migrate **one** legacy AEM pattern to AEMaaCS. Carries the orchestration rules from Adobe's `migration` skill (BPA CSV / CAM via MCP / manual flows). One pattern per session. |
| `aem_dispatcher_config` | Route Dispatcher requests to the right specialist (config-authoring, technical-advisory, incident-response, performance-tuning, security-hardening, workflow-orchestrator). Surfaces the core-7 MCP tools when the user has Dispatcher MCP configured for cloud variant. |

## Resources

| Resource | URI | Description |
|---|---|---|
| Coding Standards | `eds://docs/coding-standards` | EDS constraints, conventions, file structure, and rules |
| Block Guide | `eds://docs/block-development` | DOM pipeline, CSS scoping, content authoring tables |
| Cheatsheet | `eds://docs/cheatsheet` | Quick reference — common patterns, file locations, CLI commands |
| Adobe Skills | `eds://docs/adobe-skills` | CDD workflow, content modeling, UE component model, code review |
| AEMaaCS Skills | `eds://docs/aemaacs-skills` | Index of Adobe's AEM Cloud Service skills (BETA) — ensure-agents-md, best-practices, create-component, dispatcher, migration, aem-workflow |
| AEMaaCS Architecture | `eds://docs/aemaacs-architecture` | Maven project layout, hard rules (`/libs` immutable, OSGi DS R6, service users, Cloud Manager deploy), and the migration pattern reference table |

## Prompts

| Prompt | Description |
|---|---|
| `new-block` | Step-by-step guide for creating a new EDS block from scratch |
| `fix-block` | Diagnose and fix issues with an existing EDS block |
| `design-to-block` | Turn a design (text / screenshot / Figma URL) into an EDS block |
| `new-aem-component` | Scaffold an AEMaaCS component (Java / HTL / Granite UI dialog) with Step-0 detection + `.aem-skills-config.yaml` gate |
| `migrate-to-cloud-service` | Migrate one legacy AEM pattern (scheduler / replication / event* / asset* / htlLint) to AEMaaCS |
| `aem-dispatcher-task` | Route an AEMaaCS Dispatcher task (config / advisory / incident / perf / security) to the right specialist guidance |

---

## CLI — Block Validator

A standalone linter for EDS blocks, usable outside of the MCP server.

```bash
# Validate all blocks in a directory
npx eds-validate ./blocks

# Strict mode (warnings become errors)
npx eds-validate ./blocks --strict

# JSON output for CI pipelines
npx eds-validate ./blocks --json
```

### Validation checks

- **JavaScript** — `decorate()` export, scoped queries, no frameworks/npm imports, XSS safety, size budget (10 KB)
- **CSS** — scoped to block class, no `!important`, no ID selectors, size budget (15 KB)
- **JSON model** — valid structure, matching block ID, known field component types
- **Content** — correct authoring table format
- **README** — presence check

Each block gets a score from 0–100. Exit code `1` on errors (or warnings in `--strict` mode).

---

## NPM Scripts

| Script | Description |
|---|---|
| `npm run build` | Compile TypeScript and prepare executables |
| `npm run dev` | Watch mode for development |
| `npm start` | Run the MCP server directly |
| `npm run validate:blocks` | Run the CLI block validator |
| `npm run inspect` | Launch MCP Inspector for debugging |
| `npm run lint` | Type-check without emitting |
| `npm run clean` | Remove `dist/` |

---

## Publishing (maintainers only)

This package is published to npm as **`@swapnil-dept/eds-mcp-server`**.

### One-time setup

1. Create an [npm account](https://www.npmjs.com/signup) and verify your email.
2. If publishing under a scope you don't own, [create the org](https://www.npmjs.com/org/create) on npm.
3. `npm login` locally (or generate an automation token at npmjs.com → Access Tokens → Generate New → **Automation**).
4. **For CI** — add the token to GitHub: repo Settings → Secrets and variables → Actions → New secret named `NPM_TOKEN`.

### Manual release (from your laptop)

```bash
npm run release:patch   # 1.0.0 → 1.0.1
npm run release:minor   # 1.0.0 → 1.1.0
npm run release:major   # 1.0.0 → 2.0.0
```

Each command runs `prepublishOnly` (clean + build), bumps the version in `package.json`, creates a git tag, publishes to npm, and pushes the tag.

### CI release (recommended)

Push a `vX.Y.Z` tag and `.github/workflows/publish.yml` handles the rest (build → smoke test → publish with [npm provenance](https://docs.npmjs.com/generating-provenance-statements)):

```bash
npm version patch       # creates v1.0.1 tag locally
git push --follow-tags  # triggers the workflow
```

### Inspect the tarball before publishing

```bash
npm pack --dry-run
```

Verify only `dist/`, `README.md`, `LICENSE`, and `package.json` ship — never `src/`, `blocks/`, `examples/`, or `.aem-skills-config.yaml`.

### Yanking a bad release

```bash
npm deprecate @swapnil-dept/eds-mcp-server@1.0.1 "Buggy — use 1.0.2"
# Or, within 72 hours of publish:
npm unpublish @swapnil-dept/eds-mcp-server@1.0.1
```

---

## License

MIT