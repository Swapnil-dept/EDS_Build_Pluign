import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const TEMPLATES = {
  'default-site': (siteName: string, locale: string, currency: string) =>
    JSON.stringify({
      site: { name: siteName, title: siteName.replace(/-/g, ' ') },
      locale: { code: locale, currency },
      search: { engine: 'live-search' },
    }, null, 2),

  'default-config': (backend: string, endpoint: string, envId: string, storeView: string, apiKey: string) =>
    JSON.stringify({
      'commerce-endpoint': endpoint,
      'commerce-environment-id': envId,
      'commerce-website-code': 'base',
      'commerce-store-code': 'main_website_store',
      'commerce-store-view-code': storeView,
      'commerce-x-api-key': apiKey,
      'commerce-extra-price-data': false,
      ...(backend === 'aco' ? { 'adobe-commerce-optimizer': true } : {}),
      headers: {
        cs: {
          'Magento-Customer-Group': '<group-id>',
          'Magento-Environment-Id': envId,
          'Magento-Store-Code': 'main_website_store',
          'Magento-Store-View-Code': storeView,
          'Magento-Website-Code': 'base',
          'x-api-key': apiKey,
        },
      },
    }, null, 2),

  'demo-config': (backend: string) => `// Same shape as default-config.json but pointing to your demo backend.
// Useful for sandbox previews. Adobe Commerce Optimizer (ACO) sets adobe-commerce-optimizer: true.
${backend === 'aco' ? '// (ACO variant)' : '// (PaaS / SaaS variant)'}
`,

  'default-query': () => `# default-query.yaml — Helix Query indexer for products
version: 1
indices:
  products:
    include:
      - /products/**
    target: /query-index.json
    properties:
      title:
        select: head > title
        value: |
          attribute(el, 'content')
      sku:
        select: head > meta[name="sku"]
        value: |
          attribute(el, 'content')
      price:
        select: head > meta[name="price"]
        value: |
          attribute(el, 'content')
      image:
        select: head > meta[property="og:image"]
        value: |
          attribute(el, 'content')
`,

  'default-sitemap': (domain: string) => `# default-sitemap.yaml
sitemaps:
  default:
    origin: https://${domain}
    source: /query-index.json
    destination: /sitemap.xml
    lastmod: YYYY-MM-DD
`,

  'head-html': (endpointOrigin: string) => `<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta property="og:type" content="website" />

<!-- Adobe Client Data Layer bootstrap (must run before any dropin) -->
<script>window.adobeDataLayer = window.adobeDataLayer || [];</script>

<!-- Preconnect to commerce backend for faster first GraphQL request -->
<link rel="preconnect" href="${endpointOrigin}" crossorigin />

<!-- Critical CSS -->
<link rel="stylesheet" href="/styles/styles.css" />

<!-- App scripts (EDS lifecycle) -->
<script src="/scripts/aem.js" type="module"></script>
<script src="/scripts/scripts.js" type="module"></script>

<!-- Optional: load events SDK + collector early -->
<script type="module">
  import('/scripts/commerce-events.js').catch(() => {});
</script>
`,

  configs: () => `// scripts/configs.js — read from /config.json
let configPromise;
async function loadConfig() {
  if (!configPromise) {
    configPromise = fetch(\`\${window.location.origin}/config.json\`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)));
  }
  return configPromise;
}
export async function getConfigValue(key) {
  const config = await loadConfig();
  return config?.[key];
}
export async function getHeaders(scope = 'cs') {
  const config = await loadConfig();
  return config?.headers?.[scope] ?? {};
}
`,
};

export function registerEdsStorefrontConfig(server: McpServer) {
  server.tool(
    'eds_storefront_config',
    `Generate configuration files for an EDS commerce storefront. Templates: default-site.json, default-config.json, demo-config.json (PaaS/SaaS), demo-config-aco.json (Adobe Commerce Optimizer), default-query.yaml (Helix Query for products), default-sitemap.yaml, head.html (with ACDL bootstrap + preconnect), and scripts/configs.js helper.`,
    {
      configType: z
        .enum(['default-site', 'default-config', 'demo-config', 'default-query', 'default-sitemap', 'head-html', 'configs', 'all'])
        .describe('Which config file to generate, or "all"'),
      backend: z.enum(['paas', 'accs', 'aco']).default('paas').describe('Backend variant — affects default-config and demo-config'),
      siteName: z.string().default('my-storefront').describe('Site name (used in default-site.json)'),
      domain: z.string().default('www.example.com').describe('Production domain (used in sitemap)'),
      endpoint: z.string().default('https://<env>.api.commerce.adobe.com/graphql').describe('Commerce GraphQL endpoint'),
      environmentId: z.string().default('<env-id>').describe('commerce-environment-id'),
      storeViewCode: z.string().default('default').describe('commerce-store-view-code'),
      apiKey: z.string().default('<api-key>').describe('commerce-x-api-key'),
      locale: z.string().default('en_US').describe('Locale code'),
      currency: z.string().default('USD').describe('Currency code'),
    },
    {
      title: 'Storefront Config',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async (args) => {
      const { configType, backend, siteName, domain, endpoint, environmentId, storeViewCode, apiKey, locale, currency } = args;
      const endpointOrigin = (() => { try { return new URL(endpoint).origin; } catch { return endpoint; } })();

      const out: Array<{ file: string; lang: string; body: string }> = [];
      const want = (k: string) => configType === 'all' || configType === k;

      if (want('default-site'))    out.push({ file: 'default-site.json',     lang: 'json', body: TEMPLATES['default-site'](siteName, locale, currency) });
      if (want('default-config'))  out.push({ file: 'default-config.json',   lang: 'json', body: TEMPLATES['default-config'](backend, endpoint, environmentId, storeViewCode, apiKey) });
      if (want('demo-config'))     out.push({ file: backend === 'aco' ? 'demo-config-aco.json' : 'demo-config.json', lang: 'json', body: TEMPLATES['default-config'](backend, endpoint, environmentId, storeViewCode, apiKey) });
      if (want('default-query'))   out.push({ file: 'default-query.yaml',    lang: 'yaml', body: TEMPLATES['default-query']() });
      if (want('default-sitemap')) out.push({ file: 'default-sitemap.yaml',  lang: 'yaml', body: TEMPLATES['default-sitemap'](domain) });
      if (want('head-html'))       out.push({ file: 'head.html',             lang: 'html', body: TEMPLATES['head-html'](endpointOrigin) });
      if (want('configs'))         out.push({ file: 'scripts/configs.js',    lang: 'js',   body: TEMPLATES.configs() });

      const sections: string[] = [`# Storefront config templates (${out.length} file${out.length === 1 ? '' : 's'})`];
      for (const f of out) {
        sections.push(`## \`${f.file}\`\n\n\`\`\`${f.lang}\n${f.body}\n\`\`\``);
      }
      sections.push(`## Notes\n\n- All commerce values can be overridden per environment by adding \`config.{stage,prod}.json\`.\n- Drop-ins read these via \`getConfigValue(key)\` from \`scripts/configs.js\`.\n- For ACO, set \`adobe-commerce-optimizer: true\` (already injected when \`backend="aco"\`).`);

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}
