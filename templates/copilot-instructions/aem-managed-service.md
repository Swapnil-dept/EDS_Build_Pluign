# GitHub Copilot Instructions — AEM 6.5 LTS / AEM Managed Services (AMS)

This workspace is an **Adobe AEM 6.5 LTS / AMS** project (Maven / Java stack, on-prem or Adobe Managed Services).
This workspace uses the **`eds-mcp-server`** MCP server (`eds-mcp-serve`).
**Always load and prefer its tools** for any AEM-related task.

---

## Project setup (run once after cloning)

```bash
# 1. Ensure Java 8 or 11 and Maven 3.6+ are installed
java -version && mvn -version

# 2. Build and deploy to a local AEM Author (port 4502)
mvn -PautoInstallPackage clean install

# 3. Build without deploying
mvn clean install

# 4. Deploy only ui.apps
mvn -PautoInstallPackage clean install -pl ui.apps

# 5. Deploy to AEM Publish (port 4503)
mvn -PautoInstallPackagePublish clean install
```

### Prerequisites
- **AEM 6.5 LTS QuickStart JAR** running on port 4502 (Author) / 4503 (Publish).
- `crx.host` / `crx.port` / `crx.username` / `crx.password` in `~/.m2/settings.xml`.
- Service pack installed (SP22 or later for LTS stability).
- License file (`license.properties`) in the AEM quickstart directory.

### Replication setup (Author → Publish)
After first deploy, configure a Replication Agent in Author → Tools → Replication → Agents on Author.
Use the `aem65_replication` MCP tool for step-by-step guidance.

### Workflow setup
Use the `aem65_workflow` MCP tool for guidance on creating / modifying AEM workflow models.

---

## Mandatory workflow for every request

1. **First call:** `detect_project_type` — confirm this is `aem65lts`. Pass pom.xml, ui.apps/core/dispatcher listings.

2. **Project-summary gate:**
   - Missing `.project-summary.md` → call `project_summary` and write it.
   - Present → read it for context.
   - After every change → refresh with `project_summary`.

3. **Clarify before scaffolding:** call `clarify_task` (intent: `new-component` / `fix-bug` / etc.). Ask the user **one question per turn**.

4. **Scaffold:** call `scaffold_aem65_component` with confirmed answers only.

5. **Validate:** remind the user to run `mvn -PautoInstallPackage clean install` and check `crx-quickstart/logs/error.log`.

---

## Tool routing cheat-sheet

| User intent | First MCP tool |
|---|---|
| Create / scaffold a component | `clarify_task` (intent: `new-component`) → `scaffold_aem65_component` |
| Component dialog design | `aem_dialog_design` |
| Java / OSGi / HTL best practices | `aem_best_practices` |
| Configure replication (Author → Publish) | `aem65_replication` |
| Configure / modify workflows | `aem65_workflow` |
| Dispatcher config | `aem_dispatcher_config` |
| Security pipeline | `aem_security_pipeline` |
| Browse all AEM 6.5 skills | `aem65_skills_index` |

---

## Project conventions

- Read `project` / `javaPackage` / `group` from root `pom.xml` — **never guess**.
- OSGi SCR annotations (`@Component`, `@Service`, `@Reference`) — use DS R6 (`org.osgi.service.component.annotations`), not legacy Felix SCR.
- Use **service users** with `org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended` configs.
- Sling Models: `@Model(adaptables = ...)`, `@Inject` / `@ValueMapValue`.
- Dialog XML: Classic UI uses `/apps/<project>/components/<name>/dialog.xml`; Touch UI uses `_cq_dialog/.content.xml` (Granite UI Coral 3).
- Secrets / credentials: never hardcode — use `System.getenv()` or CryptoSupport OSGi service.
- HTL best practices apply: `data-sly-use`, `data-sly-resource`, no logic in templates.

---

## Hard rules

- **Never invent `project` / `javaPackage` / `group`** — read from `pom.xml`.
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
