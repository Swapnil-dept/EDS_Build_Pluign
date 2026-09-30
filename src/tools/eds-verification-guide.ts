import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * `eds_visual_verification_guide` — guidance for verifying a built/migrated
 * page section-by-section (DOM snapshot + computed styles) and with a final
 * pixel-diff against a reference screenshot, mirroring the verification step
 * of Adobe's Experience Modernization Console. Guidance only — this server
 * has no browser automation of its own; pair with an available browser
 * automation MCP (e.g. Playwright MCP) when one is installed.
 */
export function registerEdsVerificationGuide(server: McpServer) {
  server.registerTool(
    'eds_visual_verification_guide',
    {
      description: 'Guidance for verifying a built or migrated EDS page/section: DOM-snapshot checks, computed-style checks against design tokens, and a final pixel-diff against a reference screenshot at desktop + mobile widths. Guidance only (no browser automation) — pair with an installed browser automation MCP such as Playwright MCP when available.',
      inputSchema: {
      topic: z
        .enum(['overview', 'dom-snapshot', 'computed-style-checks', 'pixel-diff', 'checklist', 'all'])
        .default('all')
        .describe('Which verification topic to get guidance on'),
    },
      annotations: {
      title: 'EDS Visual Verification Guide',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    },
    async ({ topic }) => {
      const sections: string[] = [];
      const shouldInclude = (t: string) => topic === 'all' || topic === t;

      if (shouldInclude('overview')) {
        sections.push(`## Overview

Verify **per section, while building** — not only once at the end. Three checks, increasing in cost:

1. DOM snapshot — does the expected structure/classes exist?
2. Computed styles — do colors/spacing/fonts resolve to the right tokens?
3. Pixel-diff — does the rendered section visually match the reference?

Run 1 and 2 after every section; run 3 once at the end (it's the slowest and most brittle check).`);
      }

      if (shouldInclude('dom-snapshot')) {
        sections.push(`## DOM-snapshot checks

After decorating a section, assert the structure you expect exists — not just that no error was thrown:

- The block root has \`data-block-name\` matching the block folder.
- Expected child classes are present (e.g. \`.hero-content\`, \`.cards-card-image\`) — see the block's own CSS-selector-best-practices notes for which classes it relies on.
- No leftover authoring artifacts (empty \`<div>\`s, unprocessed \`<p><a>\` where a button was expected).
- Section-metadata resolved to the expected section class (\`dark\`, \`accent\`, \`secondary\`, \`narrow\`, \`center\`).

With Playwright MCP available: \`browser_snapshot\` (accessibility tree) or \`browser_evaluate(() => document.querySelector('.block-name').outerHTML)\`.
Without it: \`curl http://localhost:3000/path.plain.html\` for authored content, browser DevTools for decorated DOM.`);
      }

      if (shouldInclude('computed-style-checks')) {
        sections.push(`## Computed-style checks

Confirm styles resolve to the **token**, not just "looks right":

\`\`\`javascript
// via Playwright MCP browser_evaluate, or manually in DevTools console
const el = document.querySelector('.hero');
getComputedStyle(el).backgroundColor;   // should match var(--accent-color), not a hardcoded hex
getComputedStyle(el).fontFamily;        // should match the project's heading/body font token
\`\`\`

For multi-brand pages, verify the check under the correct \`body.<brand>\` class — a token that resolves correctly without the brand class present is a false pass (see \`eds_multibrand_theming_guide\`).`);
      }

      if (shouldInclude('pixel-diff')) {
        sections.push(`## Pixel-diff against the reference

Once every section passes DOM + computed-style checks:

1. Take a full-page screenshot at the primary reference width (commonly desktop, e.g. 1512px or 1280px) and at a mobile width (375px).
2. Compare side-by-side against the reference screenshot/image, section by section — spacing, type scale, and color are the highest-value things to catch; pixel-perfect anti-aliasing differences are not worth chasing.
3. With Playwright MCP: \`browser_navigate\` → \`browser_take_screenshot\` (full-page) at each viewport width via \`browser_resize\`.
4. Iterate CSS for any section that visibly diverges, then re-check.

Note: pixel-diff is the step most likely to stall on font-loading races or lazy-loaded images — re-run after confirming fonts/images are loaded (\`waitForFirstImage\` / network idle), not on first paint.`);
      }

      if (shouldInclude('checklist')) {
        sections.push(`## Checklist

- [ ] Every section: DOM snapshot matches expected structure/classes
- [ ] Every section: computed styles resolve to tokens (not hardcoded values)
- [ ] Multi-brand pages: style checks re-run under the correct \`body.<brand>\` class
- [ ] Full-page screenshot at desktop width compared against the reference
- [ ] Full-page screenshot at mobile width (375px) compared against the reference
- [ ] No browser console errors
- [ ] \`npm run lint\` passes`);
      }

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}
