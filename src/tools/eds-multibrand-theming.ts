import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * `eds_multibrand_theming_guide` — guidance for serving more than one brand
 * from a single EDS repo via body-class scoping, mirroring the pattern
 * Adobe's Experience Modernization Console uses (e.g. a `theme: nippon`
 * page alongside a default WKND-style theme).
 */
export function registerEdsMultibrandTheming(server: McpServer) {
  server.registerTool(
    'eds_multibrand_theming_guide',
    {
      description: 'Guidance for serving multiple brands/themes from one EDS repo: page-metadata theme key → body class, token scoping under `body.<brand>`, shared header.js/footer.js brand checks, and `promoteInlineMetadata()` so the theme also works on the local preview server. Includes a production-scale recommendation (separate sites/repos sharing a block library vs. body-class scoping for demos).',
      inputSchema: {
      topic: z
        .enum(['overview', 'body-class-scoping', 'shared-header-footer', 'promote-inline-metadata', 'production-recommendation', 'all'])
        .default('all')
        .describe('Which multi-brand theming topic to get guidance on'),
      brandName: z.string().optional().describe('Brand name to substitute into the examples, e.g. "nippon"'),
    },
      annotations: {
      title: 'EDS Multi-Brand Theming Guide',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    },
    async ({ topic, brandName }) => {
      const brand = brandName ?? 'nippon';
      const sections: string[] = [];
      const shouldInclude = (t: string) => topic === 'all' || topic === t;

      if (shouldInclude('overview')) {
        sections.push(`## Overview

A single EDS repo can serve multiple brands by scoping design tokens under a body class, rather than by branching code paths. Page metadata declares a \`theme\` key; the shared runtime turns it into a class on \`<body>\`; CSS scopes brand-specific tokens under that class.

This keeps blocks brand-agnostic — a block never checks "which brand am I" itself, it just reads CSS custom properties that resolve differently depending on the ancestor body class.`);
      }

      if (shouldInclude('body-class-scoping')) {
        sections.push(`## Body-class scoping

1. Author sets page metadata: \`theme: ${brand}\`.
2. \`decorateMain()\` / metadata decoration adds \`${brand}\` as a class on \`document.body\`.
3. All \`${brand}\`-specific tokens live under that selector — never edit the project's global \`:root\` tokens for a single brand:

\`\`\`css
/* styles/styles.css or a brand-scoped stylesheet */
body.${brand} {
  --accent-color: #d31329;
  --background-color: #f2f2f2;
}
\`\`\`

New blocks introduced for the brand (e.g. \`inav-table\`, \`fund-cards\`) should use the shared token names (\`var(--accent-color)\`, etc.) so they automatically pick up the right brand when placed under \`body.${brand}\` — never hardcode brand colors inside a block's own CSS.`);
      }

      if (shouldInclude('shared-header-footer')) {
        sections.push(`## Shared header.js / footer.js brand checks

The shared \`header.js\` and \`footer.js\` blocks stay generic and branch only on the body class when brand-specific markup or links are required:

\`\`\`javascript
export default async function decorate(block) {
  const isBrand = document.body.classList.contains('${brand}');
  // load the brand's nav/footer fragment if it differs, otherwise reuse the default
  const fragmentPath = isBrand ? '/${brand}/nav.plain.html' : '/nav.plain.html';
  // ...loadFragment(fragmentPath)
}
\`\`\`

Prefer conditional **fragment paths** over conditional **markup branches** inside the JS — keeps the decorate() function simple and puts brand content ownership back with the author.`);
      }

      if (shouldInclude('promote-inline-metadata')) {
        sections.push(`## promoteInlineMetadata() in scripts.js

Page metadata (\`theme: ${brand}\`) is only available as a \`<meta>\` tag on the rendered page — it needs to be promoted to a body class early, in \`loadEager\`, so both the live site AND the local preview server pick up the brand before first paint:

\`\`\`javascript
// scripts/scripts.js
function promoteInlineMetadata(doc) {
  const theme = doc.querySelector('meta[name="theme"]')?.content;
  if (theme) doc.body.classList.add(theme);
}

async function loadEager(doc) {
  promoteInlineMetadata(doc);
  // ...existing eager-phase decoration
}
\`\`\`

Call this before any block decoration runs, since blocks may read computed styles that depend on the brand class.`);
      }

      if (shouldInclude('production-recommendation')) {
        sections.push(`## Production-scale recommendation

Body-class scoping in a single repo is fine for a demo or a fast proof-of-concept. For real multi-brand production:

- Prefer **separate sites or repos** per brand, sharing a common **block library** (published package or git submodule) rather than one repo with per-brand CSS branches.
- This avoids one brand's page metadata / content authors accidentally landing in the wrong theme, and lets each brand deploy, roll back, and scale independently.
- Keep the shared block library brand-agnostic (token-driven, as above) so it can be dropped into either arrangement without changes.`);
      }

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}
