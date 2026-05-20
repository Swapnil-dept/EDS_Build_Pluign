# GitHub Copilot Instructions — AEM as a Cloud Service (AEMaaCS)

This workspace is an **Adobe AEM as a Cloud Service** project (Maven / Java stack).
This workspace uses the **`eds-mcp-server`** MCP server (`eds-mcp-serve`).
**Always load and prefer its tools** for any AEM-related task.

---

## Project setup (run once after cloning)

```bash
# 1. Ensure Java 11+ and Maven 3.8+ are installed
java -version && mvn -version

# 2. Build and deploy to a local AEM Author (port 4502)
mvn -PautoInstallSinglePackage clean install

# 3. Build all sub-packages without deploying
mvn clean install

# 4. Install only the ui.apps package
mvn -PautoInstallPackage clean install -pl ui.apps
```

### Prerequisites
- **AEM SDK** (Cloud Service QuickStart JAR) running on port 4502.
- `crx.host` / `crx.port` / `crx.username` / `crx.password` in `~/.m2/settings.xml` or passed via `-D` flags.
- Service pack / license file configured per the AEM QuickStart setup guide.

### Cloud Manager pipeline
Push to `main` to trigger Cloud Manager — full-stack or frontend pipeline depending on the changed modules.

---

## Mandatory workflow for every request

1. **First call:** `detect_project_type` — confirm this is `aemaacs`. Pass pom.xml, ui.apps/core/dispatcher listings, `.aem-skills-config.yaml`.

2. **Bootstrap gate:** confirm `AGENTS.md` and `.aem-skills-config.yaml` exist. If missing → call `ensure_agents_md` first.

3. **Project-summary gate:**
   - Missing `.project-summary.md` → call `project_summary` and write it.
   - Present → read it for context.
   - After every change → refresh with `project_summary`.

4. **Clarify before scaffolding:** call `clarify_task` (intent: `new-component` / `fix-bug` / etc.). Ask the user **one question per turn**.

5. **Scaffold:** call `scaffold_aem_component` with confirmed answers only.

6. **Validate:** remind the user to run `mvn -PautoInstallSinglePackage clean install` and check the AEM error.log.

---

## Tool routing cheat-sheet

| User intent | First MCP tool |
|---|---|
| Create / scaffold a component | `clarify_task` (intent: `new-component`) → `scaffold_aem_component` |
| Component dialog design | `aem_dialog_design` |
| Java / OSGi / HTL best practices | `aem_best_practices` |
| Dispatcher config | `aem_dispatcher_config` |
| Migrate legacy pattern to Cloud | `aem_migration_pattern` |
| Security pipeline (SAST / OWASP / secrets) | `aem_security_pipeline` |
| Bootstrap AGENTS.md + config yaml | `ensure_agents_md` |
| Browse all AEMaaCS skills | `aem_skills_index` |

---

## Project conventions

- **Never modify `/libs`** — it is read-only in Cloud Service.
- OSGi components must use **DS R6 annotations** (`@Component`, `@Service`, `@Reference`).
- Use **service users** with `org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended` — never use `ResourceResolverFactory` with admin credentials.
- Sling Models: annotate with `@Model(adaptables = ...)`, use `@Inject` / `@ValueMapValue` / `@ChildResource`.
- Scheduler jobs: use `@Component` + `Runnable` with `scheduler.expression`; avoid `Thread.sleep`.
- HTL: use `data-sly-use` / `data-sly-resource`; no logic in templates.
- Dialog fields: read `project` / `javaPackage` / `group` from `.aem-skills-config.yaml` — never guess.
- Secrets: use `$[secret:VARIABLE_NAME]` Cloud Manager environment variables — never hardcode.

---

## Hard rules

- **Never invent `project` / `javaPackage` / `group`** — always read from `.aem-skills-config.yaml`.
- **Never bypass `detect_project_type`** — wrong scaffolder = broken code.
- **One question per turn** during interviews. Wait for the user's reply.

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
