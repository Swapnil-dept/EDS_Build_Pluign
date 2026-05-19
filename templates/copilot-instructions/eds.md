# GitHub Copilot Instructions — AEM Edge Delivery Services (EDS)

This workspace is an **Adobe EDS project** based on `aem-boilerplate`.
This workspace uses the **`eds-mcp-server`** MCP server (`eds-mcp-serve`).
**Always load and prefer its tools** for any EDS-related task.

---

## Project setup (run once after cloning)

```bash
# 1. Install dependencies
npm install

# 2. Start the local dev server
npx @adobe/aem-cli@latest up
# → Opens http://localhost:3000 with hot-reload

# 3. After creating or editing any block JSON (_<block>.json)
npm run build:json
# Aggregates blocks/*/_*.json → component-definitions.json / component-models.json / component-filters.json
```

### fstab.yaml — mount your Google Drive / SharePoint
```yaml
mountpoints:
  /: https://drive.google.com/drive/folders/<YOUR_FOLDER_ID>
```
Commit and push; AEM EDS will start serving your authored content.

### head.html — register custom metadata / scripts
Edit `head.html` in the repo root; changes are served automatically.

---

## Mandatory workflow for every request

1. **First call:** `detect_project_type` — confirm this is `eds`. Pass snapshots of package.json, head.html, fstab.yaml, root/scripts/blocks listings.

2. **Project-summary gate:**
   - Missing `.project-summary.md` → call `project_summary` and write it.
   - Present → read it for context.
   - After every change → call `project_summary` again with `existingSummary` + `sessionChanges` and overwrite.

3. **Clarify before scaffolding:** call `clarify_task` (intent: `new-block` / `fix-bug` / etc.). Ask the user **one question per turn**. Never auto-add fields.

4. **Scaffold:** once answers are collected, call `scaffold_block` + `scaffold_model`.

5. **Validate after every change:**
   - `validate_block` — EDS coding standards
   - `check_performance` — LCP / CLS budget (above-the-fold blocks)

---

## Tool routing cheat-sheet

| User intent | First MCP tool |
|---|---|
| Create / scaffold a block | `clarify_task` (intent: `new-block`) → `scaffold_block` |
| Generate block from design / Figma / URL | `generate_block_from_design` |
| Fix a bug in a block | `clarify_task` (intent: `fix-bug`) → `validate_block` |
| Performance / LCP | `check_performance` |
| Configure fstab / head.html / redirects / headers | `eds_config` |
| Understand DOM before `decorate()` | `explain_dom` |
| Look up an existing block pattern | `lookup_block` |
| Search Adobe Block Collection | `search_block_collection` |
| Customise scripts.js / delayed.js | `eds_scripts_guide` |

---

## Project conventions

- **Vanilla JS only** — no npm imports, no frameworks, no build step inside blocks.
- `export default function decorate(block)` — single entry point per block.
- **CSS scoping:** `main .block-name { }` — never style `.block-name-wrapper` / `.block-name-container`.
- Mobile-first, breakpoints at 600 / 900 / 1200 px (`min-width` only).
- Reuse platform `<picture>` / `<a>` nodes — never recreate them.
- Block JSON at `blocks/<name>/_<name>.json` — definitions + models + filters combined.
- Run `npm run build:json` after any `_<name>.json` change.
- Secret tokens: `window.TOKEN_NAME || ''` — never hardcode.
- CSS custom properties in `styles/styles.css`.

---

## Hard rules

- **Never invent fields** the user did not name.
- **Never bypass `detect_project_type`** — wrong scaffolder = broken code.
- **One question per turn** during interviews. Wait for the user's reply before continuing.

---

## 🧠 Karpathy Guidelines (apply to every response)

> Reduce common LLM coding mistakes. Bias toward caution over speed.

### 1. Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, name what's confusing and ask.

### 2. Simplicity First
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" that wasn't requested.
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
- Transform tasks into verifiable goals before writing code.
- For multi-step tasks, state a plan:
  ```
  1. [Step] → verify: [check]
  2. [Step] → verify: [check]
  ```
- Strong success criteria let you loop independently. Weak ones ("make it work") require constant clarification.
