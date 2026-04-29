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

#### Option A — Absolute path (simplest, recommended)

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

#### Option B — `npm link` (system-wide command)

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

#### Option C — Same-workspace (only when this repo IS your target)

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
| `command not found: eds-mcp-server` (Option B) | Re-run `npm link` after each `npm run build`. Check `npm config get prefix` is on your `$PATH`. |
| Tools don't appear in Copilot Chat | Restart VS Code after editing `.vscode/mcp.json`. Open the **Output → MCP** panel for stderr logs. |
| Server starts but no logs | Logs go to **stderr** by design (stdout is reserved for JSON-RPC). Check the MCP output channel, not the terminal. |
| `EACCES: permission denied` running `dist/index.js` | `chmod 755 dist/index.js dist/cli.js` (the build script does this — re-run `npm run build`). |

### Step 5 — Verify

Open VS Code, switch to the Copilot Chat panel in **Agent mode**, and type a command like:

```
@eds scaffold a hero block
```

If the server is running, Copilot will use the MCP tools automatically.

---

## Available Tools

### Routing — call FIRST in any new workspace

| Tool | Description |
|---|---|
| `detect_project_type` | Inspect package.json, dir listings, head.html, config.json, fstab.yaml, **plus pom.xml, .aem-skills-config.yaml, and ui.apps/core/dispatcher listings**, and decide whether the workspace is a vanilla EDS project, an EDS Commerce Storefront, or **AEM as a Cloud Service** (Maven/Java). Returns a confidence-scored verdict, installed drop-ins / detected AEM modules, mismatch warnings (e.g. missing `AGENTS.md` or `.aem-skills-config.yaml`), and the recommended next tools. |
| `project_summary` | Generate or refresh a root summary file such as `.project-summary.md` / `PROJECT_SUMMARY.md`. Captures detected project type, functional scope, global definitions (theme CSS, runtime scripts, auth/encryption/config signals), and the latest session delta so each session starts with current context. |

### Block & project tools

| Tool | Description |
|---|---|
| `scaffold_block` | Generate the canonical 3-file UE block: `<name>.js` + `<name>.css` + `_<name>.json` (definitions + models + filters combined). Returns README/test.html/sample-content separately as **dev-only** helpers. |
| `scaffold_model` | Generate the combined `_<block>.json` for an existing block (definitions + models + filters in one file — no more 3-file merge dance). |
| `scaffold_project` | Step-by-step guide for setting up a new EDS project (standard or repoless) |
| `generate_block_from_design` | Generate a block from a text description, screenshot, and/or Figma URL |
| `validate_block` | Validate a block against EDS coding standards and best practices |
| `check_performance` | Analyze block code for performance issues and LCP budget impact |
| `explain_dom` | Show how authored content transforms into DOM before `decorate()` runs |
| `lookup_block` | Look up block patterns, implementation guidance, and references |
| `search_block_collection` | Search Adobe's Block Collection and community Block Party repos |
| `eds_config` | Get configuration templates (fstab, head.html, redirects, headers, robots, etc.) |
| `eds_scripts_guide` | Guidance for customizing scripts.js, delayed.js, and aem.js |

### Storefront tools (Adobe Commerce drop-ins)

| Tool | Description |
|---|---|
| `scaffold_storefront_project` | Bootstrap a new EDS + Adobe Commerce storefront from `aem-boilerplate-commerce`. Returns install steps, dropin selection, initializer wiring, configs, and the project layout. |
| `add_dropin` | Install a single drop-in (cart, checkout, pdp, …) — npm install + postinstall + initializer + block scaffold + slot/event reference. |
| `lookup_dropin` | Browse the catalog of all 12 drop-ins (B2C + B2B): packages, containers, slots, events, suggested block names. |
| `customize_dropin_slot` | Generate a slot-override snippet (EmptyCart, ProductAttributes, PaymentMethods, …) using the SlotContext API. |
| `style_dropin` | Brand a drop-in via Drop-in SDK design tokens (`--color-brand-*`, `--type-*`, `--spacing-*`, `--shape-*`). Outputs scoped CSS. |
| `scaffold_commerce_block` | Scaffold a complete commerce block (JS + CSS + README + sample-content + `_<block>.json` UE config + test.html) that mounts a drop-in container. |
| `validate_storefront` | Sanity-check a storefront project: dropin/postinstall sync, initializer wiring, config completeness, ACDL bootstrap, pre-LCP discipline. |
| `eds_storefront_config` | Generate `default-site.json`, `default-config.json`, `demo-config.json` (PaaS/SaaS), `demo-config-aco.json` (Adobe Commerce Optimizer), `default-query.yaml`, `default-sitemap.yaml`, `head.html`, and `scripts/configs.js`. |
| `commerce_events_guide` | Guide for Adobe Client Data Layer + `@dropins/tools` event bus. Includes setup of `@adobe/magento-storefront-events-sdk` + `@adobe/magento-storefront-event-collector` and analytics/cart-counter/custom-event snippets. |

### AEM as a Cloud Service tools (Maven / Java stack)

Mirror Adobe's [skills/aem/cloud-service](https://github.com/adobe/skills/tree/beta/skills/aem/cloud-service) skills (BETA). All AEMaaCS tools require `detect_project_type` to first return `aemaacs`.

| Tool | Description |
|---|---|
| `aem_skills_index` | Index of the 6 Adobe AEMaaCS skills (ensure-agents-md, best-practices, create-component, dispatcher, migration, aem-workflow): purpose, when-to-use, SKILL.md links. |
| `ensure_agents_md` | Bootstrap. Generates a tailored `AGENTS.md`, a one-line `CLAUDE.md` (`@AGENTS.md`), and a `.aem-skills-config.yaml` stub at the workspace root. Refuses to overwrite existing files. |
| `scaffold_aem_component` | Scaffold a full AEMaaCS component: `.content.xml`, `_cq_dialog/.content.xml` (Granite UI Coral 3), HTL template, Sling Model + JUnit test, clientlib (CSS/JS/css.txt/js.txt), optional Sling Servlet. Supports extending Core Components via `@Self @Via(ResourceSuperType.class)`. |
| `aem_best_practices` | Pattern reference index for Java/OSGi/HTL guardrails (scheduler, replication, eventListener, eventHandler, resourceChangeListener, assetApi, scr-to-ds, resolver-logging, htlLint). Returns the matching `references/<module>.md` path + Cloud Service hard rules. |
| `aem_migration_pattern` | Migrate **one** legacy AEM pattern to AEMaaCS. Carries the orchestration rules from Adobe's `migration` skill (BPA CSV / CAM via MCP / manual flows). One pattern per session. |
| `aem_dispatcher_config` | Route Dispatcher requests to the right specialist (config-authoring, technical-advisory, incident-response, performance-tuning, security-hardening, workflow-orchestrator). Surfaces the core-7 MCP tools when the user has Dispatcher MCP configured for cloud variant. |

## Resources

| Resource | URI | Description |
|---|---|---|
| Coding Standards | `eds://docs/coding-standards` | EDS constraints, conventions, file structure, and rules |
| Block Guide | `eds://docs/block-development` | DOM pipeline, CSS scoping, content authoring tables |
| Cheatsheet | `eds://docs/cheatsheet` | Quick reference — common patterns, file locations, CLI commands |
| Adobe Skills | `eds://docs/adobe-skills` | CDD workflow, content modeling, UE component model, code review |
| Storefront Architecture | `eds://docs/storefront-architecture` | Project layout, dropin lifecycle, configs, backends (PaaS / ACCS / ACO) |
| Storefront Drop-ins | `eds://docs/storefront-dropins` | Catalog of all drop-ins with packages, containers, slots, events |
| Storefront SDK | `eds://docs/storefront-sdk` | `@dropins/tools` design system, tokens, container/slot pattern, event bus |
| AEMaaCS Skills | `eds://docs/aemaacs-skills` | Index of Adobe's AEM Cloud Service skills (BETA) — ensure-agents-md, best-practices, create-component, dispatcher, migration, aem-workflow |
| AEMaaCS Architecture | `eds://docs/aemaacs-architecture` | Maven project layout, hard rules (`/libs` immutable, OSGi DS R6, service users, Cloud Manager deploy), and the migration pattern reference table |

## Prompts

| Prompt | Description |
|---|---|
| `new-block` | Step-by-step guide for creating a new EDS block from scratch |
| `fix-block` | Diagnose and fix issues with an existing EDS block |
| `design-to-block` | Turn a design (text / screenshot / Figma URL) into an EDS block |
| `new-storefront-project` | Bootstrap a new EDS + Adobe Commerce storefront end-to-end |
| `add-and-customize-dropin` | Install a drop-in, scaffold its block, override slots, apply brand tokens |
| `storefront-from-design` | Translate a page design into commerce blocks composed from drop-ins |
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