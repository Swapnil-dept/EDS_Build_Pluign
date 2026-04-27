import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DROPIN_CATALOG } from '../knowledge/storefront-dropins.js';

interface Finding {
  level: 'error' | 'warning' | 'info';
  message: string;
}

export function registerValidateStorefront(server: McpServer) {
  server.tool(
    'validate_storefront',
    `Validate an EDS commerce storefront project for common issues. Pass the contents of package.json, scripts/initializers.js, scripts/scripts.js, config.json, and head.html. Returns errors (block release), warnings (should fix), and info (suggestions). Checks: drop-in dependency vs postinstall sync, initializer wiring, config completeness, ACDL bootstrap, and pre-LCP discipline.`,
    {
      packageJson: z.string().optional().describe('Contents of package.json'),
      initializersJs: z.string().optional().describe('Contents of scripts/initializers.js'),
      scriptsJs: z.string().optional().describe('Contents of scripts/scripts.js'),
      configJson: z.string().optional().describe('Contents of config.json (or default-config.json)'),
      headHtml: z.string().optional().describe('Contents of head.html'),
      dropinsDirListing: z.string().optional().describe('Output of `ls scripts/__dropins__/` (one folder per line) — used to verify postinstall ran'),
    },
    {
      title: 'Validate Storefront',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ packageJson, initializersJs, scriptsJs, configJson, headHtml, dropinsDirListing }) => {
      const findings: Finding[] = [];
      const installed = new Set<string>();

      // ─── package.json ────────────────────────────────────
      if (packageJson) {
        try {
          const pkg = JSON.parse(packageJson);
          const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
          for (const name of Object.keys(deps)) {
            if (name.startsWith('@dropins/storefront-')) installed.add(name);
          }
          if (!('@dropins/tools' in deps)) {
            findings.push({ level: 'error', message: '`@dropins/tools` is missing from dependencies. Every drop-in needs it. Run `npm install @dropins/tools`.' });
          }
          if (!pkg.scripts?.postinstall) {
            findings.push({ level: 'error', message: '`postinstall` script missing from package.json. Drop-ins will never be copied into scripts/__dropins__/.' });
          }
          if (installed.size === 0) {
            findings.push({ level: 'warning', message: 'No `@dropins/storefront-*` packages installed. Add at least one drop-in (cart, checkout, …).' });
          }
        } catch (err) {
          findings.push({ level: 'error', message: `package.json is not valid JSON: ${(err as Error).message}` });
        }
      } else {
        findings.push({ level: 'info', message: 'No package.json provided — could not check dropin dependencies.' });
      }

      // ─── postinstall sync ────────────────────────────────
      if (dropinsDirListing && installed.size) {
        const dirNames = new Set(dropinsDirListing.split(/\r?\n/).map((s) => s.trim()).filter(Boolean));
        for (const pkg of installed) {
          const folder = pkg.replace('@dropins/', '');
          if (!dirNames.has(folder)) {
            findings.push({ level: 'error', message: `Drop-in \`${pkg}\` is in package.json but not in scripts/__dropins__/. Run \`npm run postinstall\`.` });
          }
        }
      } else if (installed.size) {
        findings.push({ level: 'info', message: 'Pass `dropinsDirListing` (output of `ls scripts/__dropins__/`) to verify postinstall sync.' });
      }

      // ─── initializers.js ─────────────────────────────────
      if (initializersJs) {
        if (!/from\s+['"]@dropins\/tools\/initializer\.js['"]/.test(initializersJs)) {
          findings.push({ level: 'error', message: 'scripts/initializers.js does not import from `@dropins/tools/initializer.js`.' });
        }
        if (!/mountImmediately/.test(initializersJs)) {
          findings.push({ level: 'warning', message: 'scripts/initializers.js does not call `initializers.mountImmediately(...)`. Drop-ins will not bootstrap.' });
        }
        for (const pkg of installed) {
          if (!initializersJs.includes(pkg)) {
            const spec = DROPIN_CATALOG.find((d) => d.package === pkg);
            findings.push({ level: 'warning', message: `\`${pkg}\` is installed but not initialized in scripts/initializers.js. Mount with \`initializers.mountImmediately(${spec?.id.replace(/-/g, '') ?? 'X'}Api.initialize, { langDefinitions })\`.` });
          }
        }
        if (!/langDefinitions/.test(initializersJs)) {
          findings.push({ level: 'warning', message: 'No `langDefinitions` passed to initialize() — drop-in UI will not be localized.' });
        }
      } else {
        findings.push({ level: 'info', message: 'No scripts/initializers.js provided — could not check dropin wiring.' });
      }

      // ─── scripts.js ──────────────────────────────────────
      if (scriptsJs) {
        if (!/initializeDropins\s*\(/.test(scriptsJs) && !/initializers\.mount/.test(scriptsJs)) {
          findings.push({ level: 'error', message: 'scripts/scripts.js does not call initializeDropins() (or mountImmediately) during loadEager. Drop-ins will not boot.' });
        }
        if (/loadEager[\s\S]*from ['"][^'"]*storefront-/.test(scriptsJs)) {
          findings.push({ level: 'warning', message: 'A heavy `@dropins/storefront-*` UI container appears imported in loadEager — keep heavy drop-ins in lazy blocks to protect pre-LCP budget.' });
        }
      } else {
        findings.push({ level: 'info', message: 'No scripts/scripts.js provided — skipped lifecycle checks.' });
      }

      // ─── config.json ─────────────────────────────────────
      if (configJson) {
        try {
          const cfg = JSON.parse(configJson);
          const required = ['commerce-endpoint', 'commerce-store-view-code'];
          for (const key of required) {
            if (!cfg[key]) findings.push({ level: 'error', message: `config.json missing required key \`${key}\`.` });
          }
          if (!cfg.headers?.cs) {
            findings.push({ level: 'warning', message: 'config.json missing `headers.cs` — commerce GraphQL requests will be unauthenticated.' });
          }
          if (cfg['commerce-endpoint']?.includes('<')) {
            findings.push({ level: 'error', message: 'config.json `commerce-endpoint` still contains placeholder `<…>`. Replace with real endpoint.' });
          }
        } catch (err) {
          findings.push({ level: 'error', message: `config.json invalid JSON: ${(err as Error).message}` });
        }
      } else {
        findings.push({ level: 'info', message: 'No config.json provided — could not check backend config.' });
      }

      // ─── head.html ───────────────────────────────────────
      if (headHtml) {
        if (!/adobeDataLayer/.test(headHtml)) {
          findings.push({ level: 'warning', message: 'head.html does not bootstrap `window.adobeDataLayer = []`. Add it so drop-ins can push events before the collector loads.' });
        }
        if (!/preconnect/.test(headHtml)) {
          findings.push({ level: 'info', message: 'Consider adding `<link rel="preconnect" href="<commerce-endpoint origin>">` to head.html to speed up first GraphQL request.' });
        }
      }

      const errors = findings.filter((f) => f.level === 'error');
      const warnings = findings.filter((f) => f.level === 'warning');
      const infos = findings.filter((f) => f.level === 'info');

      const lines: string[] = [];
      lines.push(`# Storefront validation report\n\n${errors.length} error(s) · ${warnings.length} warning(s) · ${infos.length} info`);
      const fmt = (f: Finding) => `- ${f.message}`;
      if (errors.length)   lines.push(`## ❌ Errors\n\n${errors.map(fmt).join('\n')}`);
      if (warnings.length) lines.push(`## ⚠️ Warnings\n\n${warnings.map(fmt).join('\n')}`);
      if (infos.length)    lines.push(`## ℹ️ Info\n\n${infos.map(fmt).join('\n')}`);
      if (!findings.length) lines.push('✅ No issues detected.');

      return { content: [{ type: 'text' as const, text: lines.join('\n\n') }] };
    },
  );
}
