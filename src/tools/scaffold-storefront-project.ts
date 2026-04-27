import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  STOREFRONT_PROJECT_STRUCTURE,
  STOREFRONT_HARD_CONSTRAINTS,
  DROPIN_LIFECYCLE,
  STOREFRONT_CONFIG_SCHEMA,
  CONFIG_HELPER_SNIPPET,
  INITIALIZERS_SNIPPET,
  BACKEND_TYPES,
} from '../knowledge/storefront-conventions.js';
import { DROPIN_CATALOG } from '../knowledge/storefront-dropins.js';

export function registerScaffoldStorefrontProject(server: McpServer) {
  server.tool(
    'scaffold_storefront_project',
    `Guide for setting up a new AEM Edge Delivery Services + Adobe Commerce storefront project. Returns step-by-step instructions, file layout, drop-in installation lifecycle, configuration templates (default-site.json, default-config.json, demo-config.json, default-query.yaml, head.html), and an initial drop-in selection. Based on hlxsites/aem-boilerplate-commerce.`,
    {
      siteName: z.string().describe('Project / site name (used in package.json, README, etc.)'),
      backend: z
        .enum(['paas', 'accs', 'aco'])
        .default('paas')
        .describe('Adobe Commerce backend: paas (Cloud / on-prem), accs (Adobe Commerce as a Cloud Service), aco (Adobe Commerce Optimizer)'),
      includeB2B: z
        .boolean()
        .default(false)
        .describe('Include B2B drop-ins (Quick Order, Requisition Lists). Requires B2B-enabled backend.'),
      dropins: z
        .array(z.string())
        .optional()
        .describe('Initial drop-in ids to install. Defaults to the standard B2C set: cart, checkout, order, pdp, product-discovery, auth, account, payment-services.'),
      contentSource: z
        .enum(['google-drive', 'sharepoint'])
        .default('google-drive')
        .describe('Where authored content lives'),
    },
    {
      title: 'Scaffold EDS Storefront Project',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ siteName, backend, includeB2B, dropins, contentSource }) => {
      const defaultB2C = ['cart', 'checkout', 'order', 'pdp', 'product-discovery', 'auth', 'account', 'payment-services'];
      const selected = dropins?.length ? dropins : [...defaultB2C, ...(includeB2B ? ['quick-order'] : [])];
      const specs = selected
        .map((id) => DROPIN_CATALOG.find((d) => d.id === id))
        .filter((d): d is NonNullable<typeof d> => Boolean(d));
      const installCmd = specs.map((s) => s.package).join(' ');
      const backendSpec = BACKEND_TYPES.find((b) => b.id === backend)!;

      const sections: string[] = [];

      sections.push(
        `# Setting Up "${siteName}" — EDS Commerce Storefront\n\n` +
        `**Backend:** ${backendSpec.label} — _${backendSpec.note}_\n` +
        `**Content source:** ${contentSource}\n` +
        `**Initial drop-ins (${specs.length}):** ${specs.map((s) => s.id).join(', ')}\n` +
        (includeB2B ? '**B2B:** enabled (Quick Order)\n' : '')
      );

      sections.push(
        `## Step 1 · Clone the boilerplate\n\n` +
        '```bash\n' +
        '# Use as template (recommended): https://github.com/hlxsites/aem-boilerplate-commerce\n' +
        `git clone https://github.com/hlxsites/aem-boilerplate-commerce.git ${siteName}\n` +
        `cd ${siteName}\n` +
        'rm -rf .git && git init\n' +
        `git remote add origin https://github.com/<your-org>/${siteName}.git\n` +
        '```'
      );

      sections.push(
        `## Step 2 · Install AEM CLI + dependencies\n\n` +
        '```bash\n' +
        'npm install -g @adobe/aem-cli\n' +
        'npm install\n' +
        'npm run postinstall   # copies @dropins/* → scripts/__dropins__/\n' +
        'aem up                # http://localhost:3000\n' +
        '```'
      );

      sections.push(
        `## Step 3 · Install drop-ins\n\n` +
        '```bash\n' +
        `npm install @dropins/tools ${installCmd}\n` +
        'npm run postinstall   # MUST be re-run after each install\n' +
        '```\n\n' +
        `Then wire them in \`scripts/initializers.js\`:\n\n` +
        '```js\n' +
        `import { initializers } from '@dropins/tools/initializer.js';\n` +
        specs.map((s) => `import * as ${s.id.replace(/-/g, '')}Api from '${s.apiImport}';`).join('\n') +
        `\nimport { fetchPlaceholders } from './aem.js';\n\n` +
        `export async function initializeDropins() {\n` +
        `  const langDefinitions = { default: await fetchPlaceholders() };\n` +
        `  await Promise.all([\n` +
        specs.map((s) => `    initializers.mountImmediately(${s.id.replace(/-/g, '')}Api.initialize, { langDefinitions }),`).join('\n') +
        `\n  ]);\n` +
        `}\n` +
        '```'
      );

      sections.push(
        `## Step 4 · Configure backend\n\n` +
        `Create \`config.json\` (and optionally \`demo-config.json\`):\n\n` +
        '```json\n' +
        JSON.stringify(
          {
            'commerce-endpoint': backend === 'aco'
              ? 'https://<env>.api.commerce.adobe.com/graphql'
              : 'https://<your-store>/graphql',
            'commerce-environment-id': '<env-id>',
            'commerce-website-code': 'base',
            'commerce-store-code': 'main_website_store',
            'commerce-store-view-code': 'default',
            'commerce-x-api-key': '<api-key>',
            ...(backend === 'aco' ? { 'adobe-commerce-optimizer': true } : {}),
            headers: {
              cs: {
                'Magento-Environment-Id': '<env-id>',
                'Magento-Website-Code': 'base',
                'Magento-Store-Code': 'main_website_store',
                'Magento-Store-View-Code': 'default',
                'x-api-key': '<api-key>',
              },
            },
          },
          null,
          2,
        ) +
        '\n```\n\n' +
        `Then expose values via \`scripts/configs.js\`:\n\n` +
        '```js\n' + CONFIG_HELPER_SNIPPET + '\n```'
      );

      sections.push(`## Step 5 · Wire \`scripts/scripts.js\`\n\n` +
        '```js\n' +
        `// scripts/scripts.js (excerpt)\n` +
        `import { loadEager as edsLoadEager, loadLazy as edsLoadLazy, loadDelayed as edsLoadDelayed } from './aem.js';\n` +
        `import { initializeDropins } from './initializers.js';\n\n` +
        `async function loadEager(doc) {\n` +
        `  await initializeDropins();   // bootstraps dropin data layer ASAP\n` +
        `  await edsLoadEager(doc);\n` +
        `}\n` +
        `async function loadLazy(doc) { await edsLoadLazy(doc); }\n` +
        `async function loadDelayed() { await edsLoadDelayed(); }\n` +
        `\n` +
        `loadEager(document).then(loadLazy).then(loadDelayed);\n` +
        '```'
      );

      sections.push(`## Step 6 · Project structure\n\n\`\`\`\n${STOREFRONT_PROJECT_STRUCTURE}\n\`\`\``);
      sections.push(`## Step 7 · Drop-in lifecycle\n\n${DROPIN_LIFECYCLE}`);
      sections.push(`## Step 8 · Configuration files\n\n${STOREFRONT_CONFIG_SCHEMA}`);

      sections.push(
        `## Hard constraints\n\n` +
        STOREFRONT_HARD_CONSTRAINTS.map((c) => `- ${c}`).join('\n')
      );

      sections.push(
        `## Next steps\n\n` +
        `1. \`add_dropin\` — install/wire any additional drop-in\n` +
        `2. \`scaffold_commerce_block\` — create commerce block (cart, PDP, PLP, …)\n` +
        `3. \`customize_dropin_slot\` — override slots\n` +
        `4. \`style_dropin\` — brand the drop-ins via design tokens\n` +
        `5. \`validate_storefront\` — sanity-check your project\n` +
        `6. \`commerce_events_guide\` — wire Adobe Client Data Layer\n`
      );

      sections.push(`---\n_initializers.js reference:_\n\`\`\`js\n${INITIALIZERS_SNIPPET}\n\`\`\``);

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}
