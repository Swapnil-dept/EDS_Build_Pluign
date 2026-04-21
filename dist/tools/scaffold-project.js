import { z } from 'zod';
import { PROJECT_STRUCTURE, LOADING_LIFECYCLE, HARD_CONSTRAINTS } from '../knowledge/eds-conventions.js';
import { CONFIG_TEMPLATES } from '../knowledge/eds-conventions.js';
export function registerScaffoldProject(server) {
    server.tool('scaffold_project', `Guide for setting up a new AEM Edge Delivery Services project. Returns step-by-step instructions, file structure, required configuration files, and common customization patterns. Covers both standard and repoless architectures. Does NOT create files directly — provides the complete blueprint and commands.`, {
        projectType: z
            .enum(['standard', 'repoless-code', 'repoless-content'])
            .describe('standard: full project | repoless-code: shared code repo | repoless-content: content-only site'),
        siteName: z.string().describe('Project/site name (used in package.json, README, etc.)'),
        contentSource: z
            .enum(['google-drive', 'sharepoint'])
            .default('google-drive')
            .describe('Where content lives'),
        includeUE: z
            .boolean()
            .default(false)
            .describe('Include Universal Editor component model files'),
        includeCommerce: z
            .boolean()
            .default(false)
            .describe('Include Commerce Drop-in integration setup'),
    }, {
        title: 'Scaffold EDS Project',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ projectType, siteName, contentSource, includeUE, includeCommerce }) => {
        const sections = [];
        // ─── Step 1: Create Repo ────────────────────────────
        sections.push(`# Setting Up "${siteName}" — AEM EDS Project\n\n` +
            `**Architecture:** ${projectType === 'standard' ? 'Standard (code + content in one repo)' : projectType === 'repoless-code' ? 'Repoless Code Repo (shared blocks/scripts)' : 'Repoless Content Site (content only, references code repo)'}\n` +
            `**Content source:** ${contentSource}\n\n` +
            `## Step 1: Create Repository\n\n` +
            `\`\`\`bash\n` +
            `# Option A: Use Adobe's boilerplate (recommended)\n` +
            `# Go to https://github.com/adobe/aem-boilerplate and click "Use this template"\n` +
            `# Name your repo: ${siteName}\n\n` +
            `# Option B: Clone and re-init\n` +
            `git clone https://github.com/adobe/aem-boilerplate.git ${siteName}\n` +
            `cd ${siteName}\n` +
            `rm -rf .git\n` +
            `git init\n` +
            `git remote add origin https://github.com/<your-org>/${siteName}.git\n` +
            `\`\`\``);
        // ─── Step 2: Install AEM CLI ────────────────────────
        sections.push(`## Step 2: Install AEM CLI & Start Dev Server\n\n` +
            `\`\`\`bash\n` +
            `npm install -g @adobe/aem-cli\n` +
            `cd ${siteName}\n` +
            `aem up\n` +
            `# Dev server starts at http://localhost:3000\n` +
            `# Edit blocks and see changes instantly\n` +
            `\`\`\``);
        // ─── Step 3: Configure Content Source ───────────────
        const fstabTemplate = contentSource === 'sharepoint'
            ? CONFIG_TEMPLATES.fstabSharePoint
            : projectType === 'repoless-content'
                ? CONFIG_TEMPLATES.fstabRepoless
                : CONFIG_TEMPLATES.fstab;
        sections.push(`## Step 3: Configure Content Source\n\n` +
            `Create \`fstab.yaml\` in your repo root:\n\n` +
            `\`\`\`yaml\n${fstabTemplate}\n\`\`\`\n\n` +
            (contentSource === 'google-drive'
                ? `**Google Drive setup:**\n` +
                    `1. Create a folder in Google Drive for your site content\n` +
                    `2. Share the folder with \`helix@adobe.com\` (Viewer access)\n` +
                    `3. Copy the folder ID from the URL and update fstab.yaml\n` +
                    `4. Create your first page as a Google Doc in that folder`
                : `**SharePoint setup:**\n` +
                    `1. Create a SharePoint site or use an existing one\n` +
                    `2. Note the path: \`https://<tenant>.sharepoint.com/sites/<site>/Shared Documents/<folder>\`\n` +
                    `3. Update fstab.yaml with the full SharePoint path\n` +
                    `4. Create your first page as a Word document in that folder`));
        // ─── Step 4: Connect to AEM.live ────────────────────
        sections.push(`## Step 4: Connect to aem.live\n\n` +
            `1. Go to https://admin.hlx.page/\n` +
            `2. Install the AEM Sidekick Chrome extension\n` +
            `3. Add your GitHub repo: \`https://github.com/<org>/${siteName}\`\n` +
            `4. Sidekick enables Preview / Publish / Edit from any page\n\n` +
            `**Your site URLs:**\n` +
            `- Preview: \`https://main--${siteName}--<org>.aem.page/\`\n` +
            `- Live: \`https://main--${siteName}--<org>.aem.live/\`\n` +
            `- Local dev: \`http://localhost:3000\``);
        // ─── Step 5: Project Structure ──────────────────────
        if (projectType !== 'repoless-content') {
            sections.push(`## Step 5: Project Structure\n\n` +
                `\`\`\`\n${PROJECT_STRUCTURE}\n\`\`\``);
        }
        else {
            sections.push(`## Step 5: Repoless Content Site Structure\n\n` +
                `\`\`\`\n` +
                `/\n` +
                `├── fstab.yaml           # Content mount + code repo reference\n` +
                `├── head.html            # (optional) Override code repo's head.html\n` +
                `├── styles/\n` +
                `│   └── styles.css       # (optional) Site-specific style overrides\n` +
                `└── blocks/\n` +
                `    └── (any block)/     # (optional) Site-specific block overrides\n` +
                `\`\`\`\n\n` +
                `Blocks and scripts come from your code repo. Only add files here to override.`);
        }
        // ─── Step 6: Universal Editor (optional) ────────────
        if (includeUE) {
            sections.push(`## Step 6: Universal Editor Setup\n\n` +
                `Create these files in your project root:\n\n` +
                `**component-models.json** — defines authoring fields:\n` +
                `\`\`\`json\n[\n  {\n    "id": "hero",\n    "fields": [\n      { "component": "reference", "name": "image", "label": "Image", "valueType": "string" },\n      { "component": "richtext", "name": "text", "label": "Content", "valueType": "string" }\n    ]\n  }\n]\n\`\`\`\n\n` +
                `**component-definitions.json** — registers blocks:\n` +
                `\`\`\`json\n[\n  {\n    "title": "Hero",\n    "id": "hero",\n    "plugins": {\n      "xwalk": {\n        "page": {\n          "resourceType": "core/franklin/components/block/v1/block",\n          "template": { "name": "Hero", "model": "hero" }\n        }\n      }\n    }\n  }\n]\n\`\`\`\n\n` +
                `**component-filters.json** — controls allowed children:\n` +
                `\`\`\`json\n[\n  { "id": "section", "components": ["hero", "cards", "columns"] }\n]\n\`\`\`\n\n` +
                `Use the \`scaffold_model\` tool to generate these for each block.`);
        }
        // ─── Commerce Drop-in (optional) ────────────────────
        if (includeCommerce) {
            sections.push(`## Commerce Drop-in Integration\n\n` +
                `\`\`\`bash\n` +
                `# Add Commerce Drop-in CSS to head.html:\n` +
                `<link rel="stylesheet" href="https://cdn.aem.live/commerce/v1/commerce.css">\n\n` +
                `# Add Commerce Drop-in JS to scripts.js loadLazy():\n` +
                `import('https://cdn.aem.live/commerce/v1/commerce.js');\n` +
                `\`\`\`\n\n` +
                `**Commerce blocks to create:**\n` +
                `- product-details (PDP)\n` +
                `- product-list (PLP / category pages)\n` +
                `- cart (shopping cart)\n` +
                `- checkout (checkout flow)\n\n` +
                `Each commerce block connects to your commerce backend (Magento/Adobe Commerce) via GraphQL.`);
        }
        // ─── Key Rules ──────────────────────────────────────
        sections.push(`## Key Rules to Remember\n\n` +
            HARD_CONSTRAINTS.map((c) => `- ${c}`).join('\n') +
            `\n\n` + LOADING_LIFECYCLE);
        return {
            content: [
                {
                    type: 'text',
                    text: sections.join('\n\n---\n\n'),
                },
            ],
        };
    });
}
//# sourceMappingURL=scaffold-project.js.map