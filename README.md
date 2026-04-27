# EDS MCP Server

MCP server for AEM Edge Delivery Services development — scaffolding, validation, configuration, and guidance tools for VS Code and Cursor.

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

Create (or update) `.vscode/mcp.json` in your **EDS project workspace**:

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

> If the MCP server lives in a different folder than your EDS project, replace `${workspaceFolder}/dist/index.js` with the absolute path to `dist/index.js`.

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
| `detect_project_type` | Inspect package.json, dir listings, head.html, config.json, fstab.yaml and decide whether the workspace is a vanilla EDS project or an EDS Commerce Storefront. Returns confidence-scored verdict, installed drop-ins, mismatch warnings (e.g. dropin installed but `npm run postinstall` not run), and the recommended next tools. |

### Block & project tools

| Tool | Description |
|---|---|
| `scaffold_block` | Generate a complete block file structure (JS, CSS, README, test.html, sample content) |
| `scaffold_model` | Generate Universal Editor component model files (definitions, models, filters) |
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

## Prompts

| Prompt | Description |
|---|---|
| `new-block` | Step-by-step guide for creating a new EDS block from scratch |
| `fix-block` | Diagnose and fix issues with an existing EDS block |
| `design-to-block` | Turn a design (text / screenshot / Figma URL) into an EDS block |
| `new-storefront-project` | Bootstrap a new EDS + Adobe Commerce storefront end-to-end |
| `add-and-customize-dropin` | Install a drop-in, scaffold its block, override slots, apply brand tokens |
| `storefront-from-design` | Translate a page design into commerce blocks composed from drop-ins |

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

## License

MIT