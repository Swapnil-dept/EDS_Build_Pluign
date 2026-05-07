import { z } from 'zod';
import { detectProjectType, DETECTION_INPUT_RECIPE } from '../knowledge/project-detection.js';
export function registerDetectProjectType(server) {
    server.tool('detect_project_type', `Detect which kind of project the current workspace is — vanilla AEM Edge Delivery Services, EDS + Adobe Commerce Storefront, AEM as a Cloud Service (Maven/Java), or AEM 6.5 LTS / AMS (Maven/Java, on-prem). Pass any combination of: package.json, root/scripts/blocks dir listings, scripts/__dropins__/ listing, head.html, config.json, fstab.yaml, plus AEM inputs (pom.xml, .aem-skills-config.yaml, ui.apps/ core/ dispatcher/ listings). Returns: project type (eds | storefront | aemaacs | aem65lts | unknown), confidence, the signals that drove the verdict, installed drop-ins, detected AEM modules, mismatch warnings, and the recommended next tools. Always run this BEFORE deciding which scaffold/validate/lookup tool to use so the right tools are recommended. The Cloud Service vs 6.5 LTS distinction is driven by the AEM API dependency in pom.xml: aem-sdk-api → Cloud, uber-jar / cq.quickstart.version → 6.5 LTS.`, {
        packageJson: z.string().optional().describe('Contents of package.json'),
        rootDirListing: z.string().optional().describe('`ls` of project root (one name per line)'),
        scriptsDirListing: z.string().optional().describe('`ls scripts/`'),
        blocksDirListing: z.string().optional().describe('`ls blocks/`'),
        dropinsDirListing: z.string().optional().describe('`ls scripts/__dropins__/` — pass empty string if directory does not exist'),
        headHtml: z.string().optional().describe('Contents of head.html'),
        configJson: z.string().optional().describe('Contents of config.json or default-config.json'),
        fstabYaml: z.string().optional().describe('Contents of fstab.yaml'),
        pomXml: z.string().optional().describe('Contents of root pom.xml (AEMaaCS / classic AEM)'),
        aemSkillsConfigYaml: z.string().optional().describe('Contents of .aem-skills-config.yaml at the project root'),
        uiAppsDirListing: z.string().optional().describe('`ls ui.apps/` if the directory exists'),
        coreDirListing: z.string().optional().describe('`ls core/` if the directory exists'),
        dispatcherDirListing: z.string().optional().describe('`ls dispatcher/` if the directory exists'),
    }, {
        title: 'Detect Project Type',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async (input) => {
        const result = detectProjectType(input);
        const provided = Object.entries(input).filter(([, v]) => v != null && v !== '');
        if (!provided.length) {
            return {
                content: [{
                        type: 'text',
                        text: `# Project type detection — no inputs provided\n\n` +
                            `Pass workspace snapshots so detection can run. Recipe:\n\n${DETECTION_INPUT_RECIPE}`,
                    }],
                isError: true,
            };
        }
        const headlineByType = {
            storefront: '✅ This is an EDS + Adobe Commerce **Storefront** project. Use the storefront tools below.',
            eds: '✅ This is a vanilla **AEM Edge Delivery Services** project. Use the standard EDS tools below.',
            aemaacs: '✅ This is an **AEM as a Cloud Service** (Maven/Java) project. Use the AEMaaCS tools below.',
            aem65lts: '✅ This is an **AEM 6.5 LTS / AMS** (Maven/Java, on-prem) project. Use the 6.5 LTS tools below. Do **not** use Cloud Service tools — they target a different API surface.',
            unknown: '⚠️ Could not determine the project type confidently. Provide more inputs (see the recipe at the bottom).',
        };
        const verdict = `**${result.type.toUpperCase()}** (${result.confidence} confidence, commerce score ${result.score >= 0 ? '+' : ''}${result.score}, aemaacs score +${result.aemScore}, aem65lts score +${result.aem65Score})`;
        const sections = [];
        sections.push(`# Project type: ${verdict}\n\n${headlineByType[result.type]}`);
        sections.push(`## 🚨 Ask the user clarifying questions BEFORE writing code\n\n` +
            `Whatever the user asked for next — a new block / component / drop-in, a fix, a theme change, a migration, a refactor, a perf tweak — do NOT scaffold or edit files yet. Call \`clarify_task\` with the user's raw request (or an explicit intent) to get the canonical question list, then ask the user **one question per turn** using the IDE’s structured-question UI when available (\`vscode_askQuestions\` in VS Code, equivalent in Cursor / Cline / Continue). Only after the required answers are collected and confirmed should you call the matching scaffold / generate / migrate tool.`);
        sections.push(`## 📌 First-trigger gate — \`.project-summary.md\`\n\n` +
            `Before continuing with any other tool, ensure a workspace summary exists:\n\n` +
            `1. Check whether \`.project-summary.md\` (or \`PROJECT_SUMMARY.md\`) is in the workspace root.\n` +
            `2. **If missing** — call \`project_summary\` now with the same snapshots you passed here, plus \`styles/styles.css\` / \`scripts/scripts.js\` / \`scripts/initializers.js\` when present, and write the returned markdown to \`.project-summary.md\`.\n` +
            `3. **If present** — read it once for context.\n` +
            `4. **After every change** in this session (scaffolding, edits, migrations, drop-in installs, etc.), call \`project_summary\` again with \`existingSummary\` (current file content) + \`sessionChanges\` (one-line description) and overwrite \`.project-summary.md\`.\n\n` +
            `The summary keeps the next session aware of architecture, theme, security/auth, and runtime state. Treat it as a hard rule, not a suggestion.`);
        if (result.installedDropins.length) {
            sections.push(`## Installed drop-ins (${result.installedDropins.length})\n\n${result.installedDropins.map((d) => `- \`${d}\``).join('\n')}`);
        }
        if (result.detectedAemModules.length) {
            sections.push(`## Detected AEM modules (${result.detectedAemModules.length})\n\n${result.detectedAemModules.map((m) => `- \`${m}/\``).join('\n')}`);
        }
        if (result.hasDropinsDir || result.hasCommerceBlocks || result.hasAemSkillsConfig) {
            const items = [];
            if (result.hasDropinsDir)
                items.push('- `scripts/__dropins__/` populated (postinstall has run)');
            if (result.hasCommerceBlocks)
                items.push('- `blocks/commerce-*` block(s) present');
            if (result.hasAemSkillsConfig)
                items.push('- `.aem-skills-config.yaml` present and `configured: true`');
            sections.push(`## Filesystem signals\n\n${items.join('\n')}`);
        }
        if (result.signals.length) {
            sections.push(`## Detection signals (${result.signals.length})\n\n` +
                '| Bucket | Source | Δ | Detail |\n|---|---|---|---|\n' +
                result.signals
                    .slice()
                    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
                    .map((s) => `| ${s.bucket ?? 'commerce'} | ${s.source} | ${s.weight >= 0 ? '+' : ''}${s.weight} | ${s.detail} |`)
                    .join('\n'));
        }
        if (result.warnings.length) {
            sections.push(`## ⚠️ Warnings\n\n${result.warnings.map((w) => `- ${w}`).join('\n')}`);
        }
        sections.push(`## Recommended next tools\n\n${result.recommendedTools.map((t) => `- \`${t}\``).join('\n')}`);
        const antiByType = {
            storefront: '- Do **NOT** use `scaffold_block` for commerce features — use `scaffold_commerce_block` so the dropin mount + slots + UE config are wired correctly.\n' +
                '- Do **NOT** edit files inside `scripts/__dropins__/` — they are regenerated by `npm run postinstall`.\n' +
                '- Do **NOT** call `scaffold_aem_component` here — that is for AEM as a Cloud Service (Java/HTL), not EDS.',
            eds: '- Do **NOT** use `scaffold_commerce_block` / `add_dropin` here — this is not a commerce project.\n' +
                '- Do **NOT** call `scaffold_aem_component` here — that is for AEM as a Cloud Service (Java/HTL), not EDS.',
            aemaacs: '- Do **NOT** use `scaffold_block` / `scaffold_commerce_block` / `add_dropin` here — those are EDS / Storefront tools and will produce nothing useful in a Maven project.\n' +
                '- Do **NOT** edit files under `/libs` — `/libs` is immutable on AEMaaCS. Use `/conf/global/` or `/apps/` overlays.\n' +
                '- Do **NOT** scaffold a component before `AGENTS.md` and `.aem-skills-config.yaml` exist — run `ensure_agents_md` first, then create the config with `configured: true`.\n' +
                '- Do **NOT** use the 6.5 LTS tools (`aem65_*`) here — they target legacy replication agents / JMX / Felix SCR which do not apply on Cloud Service.',
            aem65lts: '- Do **NOT** use `scaffold_block` / `scaffold_commerce_block` / `add_dropin` here — those are EDS / Storefront tools.\n' +
                '- Do **NOT** use the Cloud Service tools (`aem_migration_pattern`, `aem_best_practices`, `scaffold_aem_component`, `aem_skills_index`) — they target Cloud-only constraints (no JMX, Sling Distribution, no Felix SCR).\n' +
                '- Do **NOT** edit `/libs`. Use overlays under `/apps` or store at `/conf/global/`.\n' +
                '- Replication on 6.5 uses **agents** (Replicator API). Do **not** introduce Sling Distribution patterns here.\n' +
                '- Dispatcher MCP variant must be `AEM_DEPLOYMENT_MODE=ams` — not `cloud`.',
            unknown: '- Run `scaffold_project` (vanilla EDS) or `scaffold_storefront_project` (commerce) to bootstrap an EDS project before using other tools.\n' +
                '- For AEMaaCS, generate from the `aem-project-archetype` (Maven) outside this MCP, then re-run detection.',
        };
        sections.push(`## Anti-recommendations\n\n${antiByType[result.type]}`);
        sections.push(`---\n\n_Detection input recipe:_\n\n${DETECTION_INPUT_RECIPE}`);
        return { content: [{ type: 'text', text: sections.join('\n\n') }] };
    });
}
//# sourceMappingURL=detect-project-type.js.map