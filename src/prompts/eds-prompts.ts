import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HARD_CONSTRAINTS } from '../knowledge/eds-conventions.js';

/**
 * Register MCP Prompts — pre-built templates for common EDS development tasks.
 * These appear as slash commands in IDEs (e.g., /mcp.eds.new-block).
 *
 * All prompts target the Universal Editor boilerplate
 * (https://github.com/adobe-rnd/aem-boilerplate-xwalk). Each block ships a
 * single combined config file at `blocks/<name>/_<name>.json` containing
 * `definitions` + `models` + `filters` together; these are aggregated into
 * the project-root `component-definitions.json` / `component-models.json` /
 * `component-filters.json` at build/deploy time. The in-repo
 * `blocks/tabs-card` and `blocks/carousel` samples are the canonical
 * references for container blocks (block → item pattern).
 */
export function registerPrompts(server: McpServer) {
  // ─── New Block Prompt ───────────────────────────────────
  server.prompt(
    'new-block',
    'Step-by-step guide for creating a new EDS block (aligned with aem-boilerplate-xwalk Universal Editor)',
    {
      blockName: z.string().describe('Block name in kebab-case (e.g. "product-card")'),
      description: z.string().describe('What this block should do and look like'),
      container: z
        .string()
        .optional()
        .describe('If the block has repeating children, comma-separated item ids (e.g. "card" or "tab")'),
    },
    ({ blockName, description, container }) => {
      const items = container?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      const isContainer = items.length > 0;

      const lines: string[] = [];
      lines.push(`Create an AEM EDS block named "${blockName}" that ${description}.`);
      lines.push('');
      lines.push('Target: aem-boilerplate-xwalk (Universal Editor authoring).');
      lines.push('');
      lines.push('Requirements:');
      lines.push('- Vanilla JS, `export default function decorate(block)`');
      lines.push(`- Scope CSS to \`main .${blockName}\` — never style \`.${blockName}-wrapper\` / \`.${blockName}-container\` (EDS auto-generates those)`);
      lines.push('- Mobile-first; breakpoints 600 / 900 / 1200 px (min-width only)');
      lines.push('- Reuse platform `<picture>` / `<a>` nodes — do not recreate them');
      lines.push('- No npm / frameworks / build step');
      if (isContainer) {
        lines.push(`- Container block: iterate \`block.children\` as ${items.join(' / ')} items (UE block/item pattern, like \`blocks/tabs-card\` / \`blocks/carousel\`)`);
      }
      lines.push('- Expose CSS variants via a `multiselect` field named `classes` (grouped options)');
      lines.push('');
      lines.push('How data becomes HTML (keep in mind while writing `decorate`):');
      lines.push('1. Author fills UE fields (or writes a doc table). UE/Helix serializes each block (or item) into a row-of-cells DOM that EDS serves in `<path>.plain.html`.');
      lines.push('2. Field naming drives the shape: `image`+`imageAlt` → `<picture><img alt>` cell, `link`+`linkText` → `<a>` cell, `title`+`titleType` → `<hN>` cell, `classes` multiselect → classes on the block root.');
      lines.push('3. `aem.js` finds the block div, loads this block\u2019s JS+CSS, then calls `decorate(block)`.');
      lines.push('4. Your `decorate()` reads those rows/cells and rewrites them into the final semantic DOM (reusing the existing `<picture>`/`<a>` nodes).');
      lines.push('');
      lines.push('Steps:');
      lines.push('1. Call `scaffold_block` with `blockName` and (optionally) `hasMedia` / `interactive` / `layout`.');
      lines.push(
        `2. Call \`scaffold_model\` with the field list${
          isContainer ? ` and \`items: [${items.map((id) => `{ id: "${id}", fields: [...] }`).join(', ')}]\`` : ''
        } to produce the combined \`_${blockName}.json\` (definitions + models + filters in one file).`,
      );
      lines.push('3. Implement `decorate(block)` per the analysis, then run `validate_block` + `check_performance`.');
      lines.push('');
      lines.push('Return these files:');
      lines.push(`1. \`blocks/${blockName}/${blockName}.js\``);
      lines.push(`2. \`blocks/${blockName}/${blockName}.css\``);
      lines.push(`3. \`blocks/${blockName}/_${blockName}.json\` — combined definitions + models + filters`);
      lines.push(`4. \`blocks/${blockName}/README.md\``);

      return {
        messages: [
          {
            role: 'user' as const,
            content: { type: 'text' as const, text: lines.join('\n') },
          },
        ],
      };
    },
  );

  // ─── Fix Block Prompt ───────────────────────────────────
  server.prompt(
    'fix-block',
    'Diagnose and fix issues with an existing EDS block',
    {
      blockName: z.string().describe('Block name'),
      issue: z.string().describe('What is going wrong (e.g. "styles leak to other blocks", "Lighthouse dropped to 85")'),
    },
    ({ blockName, issue }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Fix this EDS block issue for "${blockName}": ${issue}\n\n` +
              `Check against core EDS rules and Universal Editor conventions ` +
              `(aem-boilerplate-xwalk):\n` +
              `${HARD_CONSTRAINTS.slice(0, 6).map((c) => `- ${c}`).join('\n')}\n` +
              `- Field types use UE canonical names: \`text\` / \`textarea\` (not \`text-input\` / \`text-area\`)\n` +
              `- Container blocks use the block → item pattern with a matching filter entry in the block's combined \`_<block>.json\`\n` +
              `- Each block has ONE combined config at \`blocks/<name>/_<name>.json\` containing \`definitions\` + \`models\` + \`filters\`\n` +
              `- Variants are authored via a \`multiselect\` field named \`classes\`\n` +
              `- Remember: field names drive the DOM shape your \`decorate()\` receives — \`image\`+\`imageAlt\` → \`<picture>\` cell, \`link\`+\`linkText\` → \`<a>\` cell, \`classes\` → classes on block root\n\n` +
              `Return:\n` +
              `1. Root cause\n` +
              `2. Corrected code (JS / CSS / JSON as needed)\n` +
              `3. Short explanation`,
          },
        },
      ],
    }),
  );

  // ─── Design-to-Block Prompt (text / image / Figma) ──────
  server.prompt(
    'design-to-block',
    "Turn a text description, a design screenshot, and/or a Figma URL into an EDS block using Adobe's Content-Driven-Development workflow (Universal Editor aligned)",
    {
      blockName: z.string().describe('Block name in kebab-case (e.g. "hero", "product-card")'),
      text: z.string().optional().describe('What the block should do / look like'),
      imageRefs: z.string().optional().describe('Comma-separated image paths or URLs of the design'),
      figmaUrl: z.string().optional().describe('Figma file or frame URL'),
    },
    ({ blockName, text, imageRefs, figmaUrl }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Build an AEM EDS block named "${blockName}" from the following design inputs. ` +
              `Target: aem-boilerplate-xwalk (Universal Editor).\n\n` +
              (text ? `**Description:** ${text}\n` : '') +
              (imageRefs ? `**Images:** ${imageRefs}\n` : '') +
              (figmaUrl ? `**Figma:** ${figmaUrl}\n` : '') +
              `\n` +
              `Steps to follow (Adobe CDD workflow):\n` +
              `1. Call \`generate_block_from_design\` with the same inputs to get the workflow outline, vision-analysis prompt, Figma-fetch recipe (if any), and a baseline scaffold.\n` +
              `2. Execute the vision-analysis prompt against the image(s) / Figma export — produce structure, fields, variants, responsive behavior, interactivity, design tokens, and acceptance criteria.\n` +
              `3. Decide authoring shape:\n` +
              `   • If there are repeating children (cards, tabs, slides, accordion items) → model as a **container block with item children** (UE block/item pattern, see \`blocks/tabs-card\` and \`blocks/carousel\`).\n` +
              `   • Otherwise → leaf block with fields on the block itself.\n` +
              `4. Edit \`blocks/${blockName}/${blockName}.{js,css}\` to match the analysis; reuse platform \`<picture>\` / \`<a>\` nodes; keep every selector scoped to \`main .${blockName}\`.\n` +
              `5. Call \`scaffold_model\` with the derived field list. For container blocks pass \`items: [{ id, fields }]\`; for CSS variants add a \`multiselect\` field named \`classes\`. Output is a combined \`blocks/${blockName}/_${blockName}.json\` (definitions + models + filters in one file).\n` +
              `6. Call \`validate_block\` and \`check_performance\`; fix any findings.\n` +
              `7. Self-review against the code-review checklist before opening a PR.\n\n` +
              `Data → HTML render pipeline (so \`decorate()\` aligns with the model):\n` +
              `• UE/Helix serializes each block (and each item) into a row-of-cells DOM.\n` +
              `• Field names shape the cells: \`image\`+\`imageAlt\` → \`<picture>\`, \`link\`+\`linkText\` → \`<a>\`, \`title\`+\`titleType\` → \`<hN>\`, \`classes\` → classes on block root.\n` +
              `• \`aem.js\` lazy-loads this block's JS/CSS and calls \`export default decorate(block)\` with the block's root div.\n` +
              `• Your \`decorate()\` reads those rows/cells and rewrites them into the final semantic DOM — reuse existing nodes, don't recreate \`<picture>\`/\`<a>\`.\n\n` +
              `Hard constraints:\n` +
              `${HARD_CONSTRAINTS.slice(0, 8).map((c) => `- ${c}`).join('\n')}\n`,
          },
        },
      ],
    }),
  );

  // NOTE: migrate-to-eds and review-block prompts are available
  // in the premium tier only.

  // ─── Storefront Prompts ─────────────────────────────────

  server.prompt(
    'new-storefront-project',
    'Bootstrap a new EDS + Adobe Commerce storefront from the boilerplate, install drop-ins, and wire up scripts/initializers.js + scripts/scripts.js.',
    {
      siteName: z.string().describe('Project / site name'),
      backend: z.string().optional().describe('Backend variant: paas (default), accs, or aco'),
      dropins: z.string().optional().describe('Comma-separated dropin ids to install initially (cart, checkout, pdp, …)'),
    },
    ({ siteName, backend, dropins }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Bootstrap a new EDS + Adobe Commerce storefront named "${siteName}".\n\n` +
              `Steps:\n` +
              `1. Call \`scaffold_storefront_project\` with siteName="${siteName}", backend="${backend ?? 'paas'}"${dropins ? `, dropins=[${dropins.split(',').map((s) => `"${s.trim()}"`).join(', ')}]` : ''}.\n` +
              `2. Execute the install + postinstall steps it returns.\n` +
              `3. Call \`eds_storefront_config\` with configType="all" to generate default-site.json, default-config.json, demo-config.json, default-query.yaml, default-sitemap.yaml, head.html, and scripts/configs.js.\n` +
              `4. Call \`commerce_events_guide\` (topic="bootstrap" then "collector") to wire ACDL.\n` +
              `5. For each drop-in to install on a page, call \`scaffold_commerce_block\`.\n` +
              `6. Run \`validate_storefront\` once everything is in place and resolve all errors.\n\n` +
              `Hard rules:\n` +
              `- Never edit files in scripts/__dropins__/ (they are regenerated by \`npm run postinstall\`).\n` +
              `- All commerce config flows through scripts/configs.js → getConfigValue(); never hardcode endpoints/api keys.\n` +
              `- Heavy drop-ins (PDP, Checkout) live in lazy blocks, not in scripts.js, to protect the pre-LCP budget.\n`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'add-and-customize-dropin',
    'Install a single drop-in, scaffold its block, and customize selected slots with brand-specific content/styles.',
    {
      dropin: z.string().describe('Drop-in id (e.g. "cart", "pdp")'),
      slots: z.string().optional().describe('Comma-separated slot names to override (e.g. "EmptyCart,OrderSummaryFooter")'),
      brandPrimary: z.string().optional().describe('Brand primary color (hex)'),
    },
    ({ dropin, slots, brandPrimary }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Add the **${dropin}** drop-in to this storefront and brand it.\n\n` +
              `Steps:\n` +
              `1. \`lookup_dropin\` with query="${dropin}" — review containers, slots, and events.\n` +
              `2. \`add_dropin\` with dropin="${dropin}" — install + wire initializer.\n` +
              `3. \`scaffold_commerce_block\` with blockName="commerce-${dropin}" — generate the block files.\n` +
              (slots
                ? slots.split(',').map((s, i) => `${4 + i}. \`customize_dropin_slot\` with dropin="${dropin}", slot="${s.trim()}" — write the override.`).join('\n')
                : '4. (Optional) \`customize_dropin_slot\` for each slot you need to override.') +
              '\n' +
              (brandPrimary
                ? `${4 + (slots?.split(',').length ?? 1)}. \`style_dropin\` with dropin="${dropin}", brandPrimary="${brandPrimary}" — apply brand tokens.\n`
                : `5. (Optional) \`style_dropin\` to apply your brand tokens.\n`) +
              `\nFinish with \`validate_storefront\` to confirm postinstall + wiring.\n`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'storefront-from-design',
    'Translate a design (Figma / screenshot / description) into commerce blocks composed from drop-ins, with slot overrides and brand tokens.',
    {
      pageType: z.string().describe('Which page: pdp, plp, cart, checkout, account, home'),
      text: z.string().optional().describe('Design description'),
      imageRefs: z.string().optional().describe('Comma-separated image paths/URLs'),
      figmaUrl: z.string().optional().describe('Figma URL'),
    },
    ({ pageType, text, imageRefs, figmaUrl }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Build the **${pageType}** page from this design using Adobe Commerce drop-ins.\n\n` +
              (text ? `**Description:** ${text}\n` : '') +
              (imageRefs ? `**Images:** ${imageRefs}\n` : '') +
              (figmaUrl ? `**Figma:** ${figmaUrl}\n` : '') + '\n' +
              `Steps:\n` +
              `1. Identify which drop-in(s) the page needs (cart, checkout, pdp, product-discovery, …) — call \`lookup_dropin\` for each candidate.\n` +
              `2. For each drop-in, decide between **slot overrides** (small UI tweaks inside the dropin layout) and **container composition** (custom layout assembled from individual containers like ProductGallery + ProductPrice + custom CTA).\n` +
              `3. \`scaffold_commerce_block\` for each block.\n` +
              `4. \`customize_dropin_slot\` for each slot the design changes (empty states, badges, CTAs, trust marks, footers).\n` +
              `5. \`style_dropin\` with the brand colors / fonts / radius extracted from the design — output goes into the block CSS or styles/styles.css.\n` +
              `6. \`validate_storefront\` and \`check_performance\` for each block.\n\n` +
              `Rules:\n` +
              `- Customize via slots before composition; compose individual containers only if slot overrides are insufficient.\n` +
              `- Override design via CSS custom properties (--color-*, --type-*, --spacing-*); never !important; never edit scripts/__dropins__/.\n` +
              `- Heavy commerce blocks load lazily — keep them out of scripts.js.\n`,
          },
        },
      ],
    }),
  );
}
