import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  generateBlockJS,
  generateBlockCSS,
  generateBlockReadme,
  generateTestHtml,
  generateSampleContent,
} from '../knowledge/block-templates.js';
import {
  CDD_WORKFLOW,
  ANALYZE_AND_PLAN_TEMPLATE,
  CONTENT_MODEL_RULES,
  BUILDING_BLOCKS_PATTERNS,
  UE_COMPONENT_MODEL_RULES,
  CODE_REVIEW_CHECKLIST,
  TESTING_MATRIX,
} from '../knowledge/adobe-skills.js';

const BLOCK_NAME_REGEX = /^[a-z][a-z0-9-]*$/;

/**
 * generate_block_from_design
 *
 * Multimodal block generation: accepts any combination of
 *  - text description
 *  - image (local path or URL of a design/screenshot)
 *  - Figma file URL (+ optional node id / personal access token)
 *
 * The tool itself does NOT call an LLM or Figma. It composes:
 *  1. Adobe's Content-Driven-Development workflow (condensed)
 *  2. A vision-analysis prompt for the IDE LLM to extract structure
 *     from the provided image(s) / Figma frames
 *  3. A Figma-fetch recipe (only emitted when a figmaUrl is provided)
 *  4. Scaffold output identical to scaffold_block so the LLM has a
 *     concrete starting point to edit.
 *
 * This keeps the server LLM-agnostic and MCP-pure while giving the
 * IDE model everything it needs to turn a design into an EDS block.
 */
export function registerGenerateBlockFromDesign(server: McpServer) {
  server.tool(
    'generate_block_from_design',
    `Generate an AEM EDS block from any combination of text description, image/screenshot, and/or Figma URL. Applies Adobe's Content-Driven-Development workflow (analyze-and-plan → content-modeling → building-blocks → code-review) and emits a scaffold (JS/CSS/README/test.html/sample-content) plus a vision-analysis prompt the IDE LLM should execute against the supplied design inputs.`,
    {
      blockName: z
        .string()
        .regex(BLOCK_NAME_REGEX, 'Must be lowercase, hyphenated (e.g. "hero", "product-card")')
        .describe('Block name in kebab-case'),
      text: z
        .string()
        .optional()
        .describe('Natural-language description of the block (what it does, content fields, behavior)'),
      imageRefs: z
        .array(z.string())
        .optional()
        .describe('Local file paths or URLs of design screenshots/mockups. The IDE LLM will analyze these with vision.'),
      figmaUrl: z
        .string()
        .url()
        .optional()
        .describe('Figma file or frame URL (e.g. https://www.figma.com/file/<key>/...?node-id=123%3A456)'),
      figmaToken: z
        .string()
        .optional()
        .describe('Optional Figma Personal Access Token (only used to build the fetch recipe; never sent anywhere by this server)'),
      variant: z.string().optional().describe('Optional CSS variant name (e.g. "dark", "wide")'),
      layout: z.enum(['grid', 'flex', 'stack']).default('stack'),
      hasMedia: z.boolean().default(false),
      interactive: z.boolean().default(false),
    },
    {
      title: 'Generate EDS block from design (text / image / Figma)',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({
      blockName,
      text,
      imageRefs,
      figmaUrl,
      figmaToken,
      variant,
      layout,
      hasMedia,
      interactive,
    }) => {
      if (!text && !imageRefs?.length && !figmaUrl) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'Provide at least one input: `text`, `imageRefs`, or `figmaUrl`.',
            },
          ],
        };
      }

      const figma = figmaUrl ? parseFigmaUrl(figmaUrl) : null;

      // ── 1. Vision / design-analysis prompt for the IDE LLM ───────
      const visionPrompt = buildVisionPrompt({
        blockName,
        text,
        imageRefs,
        figma,
      });

      // ── 2. Figma fetch recipe (only if figmaUrl provided) ────────
      const figmaRecipe = figma ? buildFigmaRecipe(figma, figmaToken) : null;

      // ── 3. Baseline scaffold (concrete starting point) ───────────
      const js = generateBlockJS(blockName, {
        variant,
        interactive,
        hasMedia: hasMedia || Boolean(imageRefs?.length),
        description: text,
      });
      const css = generateBlockCSS(blockName, { variant, hasMedia, layout });
      const readme = generateBlockReadme(blockName, text, variant, undefined);
      const sampleContent = generateSampleContent(
        blockName,
        [{ name: 'content', type: 'richtext', label: 'Content' }],
        variant,
      );
      const testHtml = generateTestHtml(blockName, sampleContent);

      const files = [
        { path: `blocks/${blockName}/${blockName}.js`, content: js, lang: 'javascript' },
        { path: `blocks/${blockName}/${blockName}.css`, content: css, lang: 'css' },
        { path: `blocks/${blockName}/README.md`, content: readme, lang: 'markdown' },
        { path: `blocks/${blockName}/test.html`, content: testHtml, lang: 'html' },
        { path: `blocks/${blockName}/sample-content.md`, content: sampleContent, lang: 'markdown' },
      ];

      const filesBlock = files
        .map((f) => `### ${f.path}\n\`\`\`${f.lang}\n${f.content}\n\`\`\``)
        .join('\n\n');

      // ── 4. Compose output ────────────────────────────────────────
      const sections: string[] = [];

      sections.push(`# 🎨 generate_block_from_design → **${blockName}**`);

      const inputSummary = [
        text ? `text (${text.length} chars)` : null,
        imageRefs?.length ? `${imageRefs.length} image ref(s)` : null,
        figma ? `Figma: ${figma.fileKey}${figma.nodeId ? ` @ node ${figma.nodeId}` : ''}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      sections.push(`**Inputs:** ${inputSummary}`);

      sections.push(`---\n## Step 0 — Follow Content-Driven Development\n\n${CDD_WORKFLOW}`);

      sections.push(
        `---\n## Step 1 — Analyze the design (LLM action)\n\n` +
          `Execute the following vision/analysis prompt against the inputs above, then **fill in the acceptance-criteria template** before modifying the scaffold.\n\n` +
          `<details><summary>Vision analysis prompt</summary>\n\n\`\`\`text\n${visionPrompt}\n\`\`\`\n</details>\n\n` +
          `<details><summary>Acceptance-criteria template</summary>\n\n\`\`\`markdown\n${ANALYZE_AND_PLAN_TEMPLATE}\n\`\`\`\n</details>`,
      );

      if (figmaRecipe) {
        sections.push(`---\n## Step 1b — Fetch Figma data\n\n${figmaRecipe}`);
      }

      sections.push(
        `---\n## Step 2 — Design the content model\n\n` +
          `${CONTENT_MODEL_RULES}\n\n` +
          `Output a table like:\n\n` +
          '| ' + blockName + ' |\n|---|\n| <content cell 1> |\n| <content cell 2> |\n',
      );

      sections.push(`---\n## Step 3 — Implementation patterns\n\n${BUILDING_BLOCKS_PATTERNS}`);

      sections.push(
        `---\n## Step 4 — Baseline scaffold\n\n` +
          `Create these files, then edit them to match the analysis from Step 1:\n\n${filesBlock}`,
      );

      sections.push(`---\n## Step 5 — Universal Editor model (if needed)\n\n${UE_COMPONENT_MODEL_RULES}\n\nCall \`scaffold_model\` with the fields you derived from the design.`);

      sections.push(`---\n## Step 6 — Test\n\n${TESTING_MATRIX}`);

      sections.push(`---\n## Step 7 — Self-review before commit\n\n${CODE_REVIEW_CHECKLIST}`);

      sections.push(
        `---\n## Next tool calls\n` +
          `1. After editing the scaffold, call \`validate_block\` with the final JS/CSS.\n` +
          `2. Call \`check_performance\` to confirm the 100 KB pre-LCP budget.\n` +
          `3. If the block has authored fields, call \`scaffold_model\` with the derived field list.`,
      );

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}

// ─── Helpers ────────────────────────────────────────────────────

function buildVisionPrompt(args: {
  blockName: string;
  text?: string;
  imageRefs?: string[];
  figma: FigmaRef | null;
}): string {
  const { blockName, text, imageRefs, figma } = args;
  const lines: string[] = [];
  lines.push(`You are analyzing a design to implement an AEM Edge Delivery Services block called "${blockName}".`);
  lines.push('');
  lines.push('Inputs:');
  if (text) lines.push(`- Description: ${text}`);
  if (imageRefs?.length) {
    lines.push(`- Images to analyze (load each one):`);
    imageRefs.forEach((r) => lines.push(`    • ${r}`));
  }
  if (figma) {
    lines.push(`- Figma file key: ${figma.fileKey}${figma.nodeId ? ` (node ${figma.nodeId})` : ''}`);
    lines.push('  → Fetch via Figma API (see recipe) and treat the exported PNG + node JSON as design input.');
  }
  lines.push('');
  lines.push('Produce a structured analysis with these sections:');
  lines.push('1. **Structure** — list the content sequences top-to-bottom (heading, paragraph, image, CTA, card grid, etc.)');
  lines.push('2. **Authoring shape** — leaf block OR container block with item children (UE block/item pattern, like `blocks/tabs-card`). If container, name the item type(s).');
  lines.push('3. **Authoring fields** — for each authorable input: name (camelCase), UE component type (`text` / `textarea` / `richtext` / `reference` / `aem-content` / `select` / `multiselect` / `boolean` / `number`), required?, example value. Use shared prefixes to collapse related fields: `image`+`imageAlt`, `link`+`linkText`+`linkTitle`+`linkType`, `title`+`titleType`.');
  lines.push('4. **Variants** — expose CSS variants as a `multiselect` field named `classes` with grouped options (dark, wide, centered, …).');
  lines.push('5. **Responsive behavior** — mobile / tablet / desktop layout differences, any breakpoint-specific changes');
  lines.push('6. **Interactivity** — hover, focus, click-to-expand, carousel, etc. (otherwise "none")');
  lines.push('7. **Design tokens** — colors, typography scale, spacing; map to existing CSS custom properties (var(--link-color), var(--heading-font-family), etc.) where possible');
  lines.push('8. **Acceptance criteria** — fill in the Adobe analyze-and-plan template');
  lines.push('');
  lines.push('Constraints you MUST respect when translating the design into code:');
  lines.push('- Vanilla ES6+, no frameworks, no build step, no npm runtime deps');
  lines.push('- Block JS exports `default function decorate(block)` and reuses platform-delivered <picture>/<a> nodes');
  lines.push('- CSS scoped to `main .' + blockName + '` with mobile-first breakpoints at 600 / 900 / 1200 px');
  lines.push('- Aggregate pre-LCP payload must remain under 100 KB');
  lines.push('- Prefer content-authored text over hardcoded strings');
  lines.push('');
  lines.push('Return the analysis in Markdown. After the analysis, emit the final block.js, block.css, and a proposed component-models.json field list.');
  return lines.join('\n');
}

interface FigmaRef {
  fileKey: string;
  nodeId?: string;
}

function parseFigmaUrl(url: string): FigmaRef | null {
  try {
    const u = new URL(url);
    // Supported forms: figma.com/file/<key>/... and figma.com/design/<key>/...
    const m = u.pathname.match(/\/(?:file|design|proto)\/([a-zA-Z0-9]+)/);
    if (!m) return null;
    const fileKey = m[1];
    const nodeId = u.searchParams.get('node-id') ?? undefined;
    return { fileKey, nodeId: nodeId ? decodeURIComponent(nodeId) : undefined };
  } catch {
    return null;
  }
}

function buildFigmaRecipe(ref: FigmaRef, token?: string): string {
  const tokenLine = token
    ? `export FIGMA_TOKEN="${maskToken(token)}"   # provided token (masked in output)`
    : `export FIGMA_TOKEN="<your Figma Personal Access Token>"   # https://www.figma.com/developers/api#access-tokens`;
  const nodeQuery = ref.nodeId ? `&ids=${encodeURIComponent(ref.nodeId)}` : '';
  const imagesQuery = ref.nodeId ? `?ids=${encodeURIComponent(ref.nodeId)}&format=png&scale=2` : '?format=png&scale=2';

  return [
    'Run these commands (shell) to pull the node JSON + a PNG render, then feed both into the vision analysis above:',
    '',
    '```bash',
    tokenLine,
    `FILE_KEY="${ref.fileKey}"`,
    ref.nodeId ? `NODE_ID="${ref.nodeId}"` : `# (no node id supplied — the whole file will be fetched)`,
    '',
    '# 1. Node metadata (frames, auto-layout, text styles, colors)',
    `curl -sS -H "X-Figma-Token: $FIGMA_TOKEN" \\`,
    `  "https://api.figma.com/v1/files/$FILE_KEY/nodes?ids=$NODE_ID" \\`,
    `  -o figma-node.json`,
    '',
    '# 2. PNG export (2x) for vision analysis',
    `curl -sS -H "X-Figma-Token: $FIGMA_TOKEN" \\`,
    `  "https://api.figma.com/v1/images/$FILE_KEY${imagesQuery}" \\`,
    `  | jq -r '.images[]' | head -1 | xargs curl -sSL -o figma-frame.png`,
    '```',
    '',
    '**Then attach `figma-frame.png` to this chat** and re-run the analysis — the vision prompt will treat it as another entry in `imageRefs`.',
    '',
    '> Security: this server never stores or transmits your Figma token; the recipe runs locally in your terminal.',
  ].join('\n') + (nodeQuery ? '' : '');
}

function maskToken(t: string): string {
  if (t.length <= 8) return '***';
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}
