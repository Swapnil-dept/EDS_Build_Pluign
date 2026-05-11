import { z } from 'zod';
// ─── Reference Data ────────────────────────────────────────────────────────
const DOCS_URL = 'https://experienceleague.adobe.com/developer/commerce/storefront/boilerplate/ai-agent-skills/';
const PLUGIN_REPO = 'https://github.com/adobe-commerce/aio-cli-plugin-commerce';
const SKILLS = [
    {
        name: 'Project manager',
        description: 'Breaks down tasks, guides phased delivery, and keeps development on track before any code is written.',
    },
    {
        name: 'Researcher',
        description: 'Looks up drop-in component APIs, slot names, event payloads, and TypeScript definitions before implementing.',
    },
    {
        name: 'Block developer',
        description: 'Builds and customizes Edge Delivery Services blocks using correct DOM patterns and CSS scoping.',
    },
    {
        name: 'Drop-in developer',
        description: 'Customizes drop-in components using containers, slots, events, and API functions.',
    },
    {
        name: 'Content modeler',
        description: 'Designs block table structures that are easy for content authors to work with.',
    },
    {
        name: 'Tester',
        description: 'Verifies implementations in a real browser and checks Core Web Vitals and accessibility.',
    },
];
const AGENT_DIRS = {
    Cursor: '.cursor/skills/',
    'Claude Code': '.claude/skills/',
    'GitHub Copilot': '.github/skills/',
    Windsurf: '.windsurf/skills/',
    'Gemini CLI': '.gemini/skills/',
    'OpenAI Codex': '.agents/skills/',
    Cline: '.cline/skills/',
    'Kilo Code': '.kilocode/skills/',
    Antigravity: '.agent/skills/',
    Other: './skills/ (project root)',
};
// ─── Tool ──────────────────────────────────────────────────────────────────
export function registerCommerceSkillsSetup(server) {
    server.tool('commerce_skills_setup', `Guide for installing Adobe Commerce AI Agent Skills into an AEM Boilerplate Commerce storefront project via \`aio commerce extensibility tools-setup\`. Returns step-by-step setup instructions, prerequisite checklist, supported agents + skills directories, the 6 installed skills (project-manager, researcher, block-developer, drop-in-developer, content-modeler, tester), what gets installed, CI/headless flags, and troubleshooting. Pass an agent name (e.g. "Cursor", "GitHub Copilot", "Claude Code") to get agent-specific install path and mcp.json config snippet. PRECONDITION: workspace must be an AEM Boilerplate Commerce project (detect_project_type returns "storefront").`, {
        agent: z
            .string()
            .optional()
            .describe('Coding agent name: Cursor | GitHub Copilot | Claude Code | Windsurf | Gemini CLI | OpenAI Codex | Cline | Kilo Code | Antigravity | Other. Empty = show all agents.'),
        section: z
            .enum(['overview', 'prerequisites', 'install', 'skills', 'what-installed', 'troubleshoot', 'all'])
            .optional()
            .default('all')
            .describe('Section to return. Empty or "all" = full guide.'),
    }, {
        title: 'Adobe Commerce AI Agent Skills Setup',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ agent, section = 'all' }) => {
        const targetAgent = agent?.trim();
        const agentDir = targetAgent ? (AGENT_DIRS[targetAgent] ?? AGENT_DIRS['Other']) : null;
        const parts = [];
        // ── Overview ────────────────────────────────────────────────────────
        if (section === 'all' || section === 'overview') {
            parts.push(`# Adobe Commerce AI Agent Skills Setup\n\n` +
                `**Source:** [${DOCS_URL}](${DOCS_URL})\n\n` +
                `Adobe Commerce AI Agent Skills install **6 specialized skills** into your coding agent, giving it deep knowledge about Adobe Commerce storefront architecture, drop-in component patterns, block conventions, and best practices.\n\n` +
                `The skills work together:\n` +
                `1. Every new task → **Project Manager** scopes the work\n` +
                `2. Before implementing → **Researcher** looks up actual APIs/slot names/events\n` +
                `3. During development → **Block Developer** or **Drop-in Developer** handles the code\n` +
                `4. After implementation → **Tester** verifies in a real browser`);
        }
        // ── Prerequisites ────────────────────────────────────────────────────
        if (section === 'all' || section === 'prerequisites') {
            parts.push(`## Prerequisites\n\n` +
                `> ℹ️ **This MCP plugin requires no installation** — it runs via \`npx\` automatically.\n` +
                `> The steps below set up Adobe Commerce AI Agent Skills **inside your storefront project**.\n\n` +
                `### 1. Node.js 22+\n\n` +
                `The \`aio\` CLI requires Node 22+. Check your version:\n\n` +
                `\`\`\`bash\nnode --version  # must be >= 22.0.0\n\`\`\`\n\n` +
                `Use [nvm](https://formulae.brew.sh/formula/nvm) to switch versions:\n\n` +
                `\`\`\`bash\nnvm install 22 && nvm use 22\n\`\`\`\n\n` +
                `### 2. Run the setup (no global install needed)\n\n` +
                `You can run the full setup with a single \`npx\` command — no global \`aio\` install required:\n\n` +
                `\`\`\`bash\nnpx @adobe/aio-cli@latest plugins:install https://github.com/adobe-commerce/aio-cli-plugin-commerce && \\\n  npx @adobe/aio-cli@latest commerce extensibility tools-setup\n\`\`\`\n\n` +
                `> Prefer a **persistent global install**? (faster for repeated use)\n>\n> \`\`\`bash\n> npm install -g @adobe/aio-cli\n> aio plugins:install https://github.com/adobe-commerce/aio-cli-plugin-commerce\n> \`\`\`\n> Plugin source: [${PLUGIN_REPO}](${PLUGIN_REPO})\n\n` +
                `### 3. (Optional) Adobe I/O Login\n\n` +
                `\`\`\`bash\naio auth login\n# or\nnpx @adobe/aio-cli@latest auth login\n\`\`\`\n\n` +
                `> Without authentication the **Researcher** skill falls back to web search. All other skills work without login.`);
        }
        // ── Install ──────────────────────────────────────────────────────────
        if (section === 'all' || section === 'install') {
            const agentBlock = targetAgent
                ? `\n\n**Target agent detected: \`${targetAgent}\`**\n` +
                    `Skills will be installed to: \`${agentDir}\`\n\n` +
                    `#### Non-interactive install for ${targetAgent} (no global aio needed):\n\n` +
                    `\`\`\`bash\nnpx @adobe/aio-cli@latest plugins:install https://github.com/adobe-commerce/aio-cli-plugin-commerce && \\\n  npx @adobe/aio-cli@latest commerce extensibility tools-setup \\\n` +
                    `  --starter-kit aem-boilerplate-commerce \\\n` +
                    `  --agent "${targetAgent}" \\\n` +
                    `  --package-manager npm\n\`\`\`\n`
                : '';
            parts.push(`## Install the Skills\n\n` +
                `From the **root of your AEM Boilerplate Commerce project**, run one of:\n\n` +
                `**Option A — no global install (npx):**\n\n` +
                `\`\`\`bash\nnpx @adobe/aio-cli@latest plugins:install https://github.com/adobe-commerce/aio-cli-plugin-commerce && \\\n  npx @adobe/aio-cli@latest commerce extensibility tools-setup\n\`\`\`\n\n` +
                `**Option B — with globally installed aio CLI:**\n\n` +
                `\`\`\`bash\naio commerce extensibility tools-setup\n\`\`\`\n\n` +
                `The command walks through **two prompts**:\n\n` +
                `1. **Select a starter kit** → choose **AEM Boilerplate Commerce**\n` +
                `2. **Select your coding agent** → choose your agent (Cursor, GitHub Copilot, Claude Code, etc.)\n` +
                agentBlock +
                `\n### Supported Agents & Skills Directories\n\n` +
                `| Agent | Skills Directory |\n|---|---|\n` +
                Object.entries(AGENT_DIRS)
                    .map(([a, d]) => `| ${a} | \`${d}\` |`)
                    .join('\n') +
                `\n\n> After install, **restart your coding agent** so it picks up the new skills and MCP configuration.`);
        }
        // ── Skills ───────────────────────────────────────────────────────────
        if (section === 'all' || section === 'skills') {
            parts.push(`## The 6 Installed Skills\n\n` +
                SKILLS.map((s) => `### ${s.name}\n\n${s.description}`).join('\n\n') +
                `\n\n### How they work together\n\n` +
                `- **New feature request** → Project Manager assesses complexity + confirms plan → delegates to Block Developer or Drop-in Developer\n` +
                `- **Drop-in customization** → Researcher looks up slot names, events, API functions from source → Drop-in Developer implements\n` +
                `- **New block** → Block Developer follows boilerplate conventions: \`document.createElement()\`, CSS scoped to block name, checks \`/blocks\` first\n` +
                `- **Content structure** → Content Modeler designs block tables that work for both developers and authors\n` +
                `- **After any change** → Tester verifies in real browser (requires \`aem up\` running locally)`);
        }
        // ── What gets installed ──────────────────────────────────────────────
        if (section === 'all' || section === 'what-installed') {
            const installDir = agentDir ?? '<agent-skills-dir>/';
            parts.push(`## What Gets Installed\n\n` +
                `| File / Directory | Purpose |\n|---|---|\n` +
                `| \`AGENTS.md\` (project root) | Top-level instructions your agent reads at the start of every session |\n` +
                `| \`${installDir}\` | Skill files with domain-specific rules for each development area |\n` +
                `| MCP config file | Connects your agent to \`commerce-extensibility:search-commerce-docs\` tool for live documentation search |\n\n` +
                `The \`search-commerce-docs\` MCP tool gives your agent access to **Adobe Commerce and App Builder documentation** directly within the coding session — this is the Researcher skill's primary information source.\n\n` +
                `### npm dev dependency\n\n` +
                `The command also installs \`@adobe-commerce/commerce-extensibility-tools\` as a dev dependency in your project.`);
        }
        // ── Usage Example ────────────────────────────────────────────────────
        if (section === 'all') {
            parts.push(`## Usage After Install\n\n` +
                `Once installed, the skills are available automatically — no need to reference them by name in every prompt.\n\n` +
                `Example prompt that triggers the planning workflow:\n\n` +
                `> _"Use the planning workflow to add a button to the product pages that allows the user to quickly share the product on social media platforms like Facebook and Twitter. The button should be displayed below the title section on the product detail page."_\n\n` +
                `The tester skill requires a running local development server:\n\n` +
                `\`\`\`bash\naem up\n\`\`\``);
        }
        // ── Troubleshoot ─────────────────────────────────────────────────────
        if (section === 'all' || section === 'troubleshoot') {
            parts.push(`## Troubleshooting\n\n` +
                `| Symptom | Fix |\n|---|---|\n` +
                `| \`aio: command not found\` | Use \`npx @adobe/aio-cli@latest\` instead, or run \`npm install -g @adobe/aio-cli\` once |\n` +
                `| \`aio commerce: command not found\` | Run: \`npx @adobe/aio-cli@latest plugins:install https://github.com/adobe-commerce/aio-cli-plugin-commerce\` |\n` +
                `| Node version error from \`aio\` | Upgrade to Node 22+: \`nvm install 22 && nvm use 22\` |\n` +
                `| \`aio commerce extensibility tools-setup\` fails mid-install | Ensure you run from **project root** (where \`package.json\` is) |\n` +
                `| Skills not detected by agent | Restart the agent/IDE after install — skills require a fresh session to be picked up |\n` +
                `| Researcher skill falls back to web search | No IMS session. Run \`aio auth login\` to enable live docs MCP tool |\n` +
                `| Tester skill can't verify implementation | Start local server first: \`aem up\` |\n` +
                `| Skills installed in wrong directory | Reinstall with explicit flag: \`--agent "GitHub Copilot"\` (exact agent name from supported list) |`);
        }
        // ── Resources ────────────────────────────────────────────────────────
        if (section === 'all') {
            parts.push(`## Resources\n\n` +
                `| Resource | URL |\n|---|---|\n` +
                `| Official docs | [AI Agent Skills](${DOCS_URL}) |\n` +
                `| aio Commerce plugin | [${PLUGIN_REPO}](${PLUGIN_REPO}) |\n` +
                `| Adobe I/O CLI install | [App Builder CLI Docs](https://developer.adobe.com/app-builder/docs/guides/runtime_guides/tools/cli-install) |\n` +
                `| Drop-in components | [Drop-in API Reference](https://experienceleague.adobe.com/developer/commerce/storefront/dropins/all/introduction/) |\n` +
                `| Blocks reference | [Blocks Reference](https://experienceleague.adobe.com/developer/commerce/storefront/boilerplate/blocks-reference/) |`);
        }
        return {
            content: [{ type: 'text', text: parts.join('\n\n') }],
        };
    });
}
//# sourceMappingURL=commerce-skills-setup.js.map