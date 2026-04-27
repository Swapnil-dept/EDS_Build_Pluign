import { z } from 'zod';
import { COMMERCE_BLOCKS, findCommerceBlock } from '../knowledge/storefront-blocks.js';
import { findDropin, buildMountSnippet } from '../knowledge/storefront-dropins.js';
export function registerScaffoldCommerceBlock(server) {
    server.tool('scaffold_commerce_block', `Scaffold a complete EDS commerce block (JS + CSS + README + sample-content + _<block>.json UE config). Generates the canonical drop-in mount inside decorate(), uses Drop-in SDK design tokens for CSS, and includes Universal Editor config so authors can drop the block in pages. Pick from the catalog (commerce-cart, commerce-checkout, commerce-product-details, commerce-product-list-page, commerce-recommendations, …) or pass a custom block name with explicit dropin id.`, {
        blockName: z.string().describe('Block name in kebab-case (e.g. "commerce-cart"). If it matches the catalog, all defaults are pre-filled.'),
        dropin: z.string().optional().describe('Drop-in id to mount (required if blockName is not in the catalog).'),
        container: z.string().optional().describe('Optional dropin container override (e.g. "MiniCart")'),
        variant: z.string().optional().describe('Optional CSS variant (e.g. "compact", "wide")'),
    }, {
        title: 'Scaffold Commerce Block',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ blockName, dropin, container, variant }) => {
        const known = findCommerceBlock(blockName);
        const dropinId = known?.dropins[0] ?? dropin;
        if (!dropinId) {
            return {
                content: [{
                        type: 'text',
                        text: `"${blockName}" is not in the catalog. Pass an explicit \`dropin\` argument.\n\n` +
                            `Catalog blocks:\n${COMMERCE_BLOCKS.map((b) => `- **${b.name}** → ${b.dropins.join(', ')}`).join('\n')}`,
                    }],
                isError: true,
            };
        }
        const spec = findDropin(dropinId);
        if (!spec) {
            return { content: [{ type: 'text', text: `Unknown drop-in "${dropinId}".` }], isError: true };
        }
        const cont = spec.containers.find((c) => c.name === container) ?? spec.containers[0];
        // ─── block.js ────────────────────────────────────────
        const js = buildMountSnippet(spec, cont).replace(`blocks/${spec.blockName}/${spec.blockName}.js`, `blocks/${blockName}/${blockName}.js`);
        // ─── block.css ───────────────────────────────────────
        const css = `/* blocks/${blockName}/${blockName}.css */
main .${blockName} {
  display: block;
  padding: var(--spacing-large) var(--spacing-medium);
  font-family: var(--type-base-font-family);
  color: var(--color-neutral-800);
}

main .${blockName} h1,
main .${blockName} h2 {
  font-family: var(--type-headline-font-family);
}

${variant ? `main .${blockName}.${variant} {\n  /* variant: ${variant} */\n}\n` : ''}
@media (min-width: 768px) {
  main .${blockName} {
    padding: var(--spacing-xlarge) var(--spacing-large);
    max-width: 1200px;
    margin: 0 auto;
  }
}`;
        // ─── README.md ───────────────────────────────────────
        const readme = `# ${blockName}

Mounts the **${spec.title}** drop-in (\`${spec.package}\`) on the page.

## Container
\`${cont.name}\` — ${cont.purpose}
Imported from \`${cont.importPath}\`.

${cont.slots?.length ? `## Customizable slots\n\n${cont.slots.map((s) => `- \`${s.name}\` — ${s.purpose}`).join('\n')}\n\nUse \`customize_dropin_slot\` to generate slot snippets.` : ''}

## Events emitted
${spec.events.map((e) => `- \`${e.name}\` — \`${e.payload}\``).join('\n')}

## Authoring
Add the block in a Google Doc / SharePoint Word doc:
\`\`\`
| ${blockName}${variant ? ` (${variant})` : ''} |
| --- |
\`\`\`

## Prereqs
\`\`\`bash
npm install ${spec.package}
npm run postinstall
\`\`\`
And register the dropin initializer in \`scripts/initializers.js\` (use \`add_dropin\` for the snippet).
`;
        // ─── sample-content.md ──────────────────────────────
        const sample = `# ${blockName} sample

| ${blockName}${variant ? ` (${variant})` : ''} |
| --- |
`;
        // ─── _<block>.json — UE combined config ─────────────
        const ueId = blockName;
        const ueModel = {
            definitions: [
                {
                    title: known?.title ?? spec.title,
                    id: ueId,
                    plugins: { xwalk: { page: { template: { name: ueId, model: ueId } } } },
                },
            ],
            models: [
                {
                    id: ueId,
                    fields: [
                        { component: 'select', name: 'classes', value: '', label: 'Variant',
                            values: variant
                                ? [{ name: 'Default', value: '' }, { name: variant, value: variant }]
                                : [{ name: 'Default', value: '' }] },
                    ],
                },
            ],
            filters: [],
        };
        // ─── test.html ──────────────────────────────────────
        const testHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${blockName} — preview</title>
  <link rel="stylesheet" href="../../styles/styles.css" />
  <link rel="stylesheet" href="${blockName}.css" />
</head>
<body>
  <main>
    <div class="${blockName}${variant ? ` ${variant}` : ''} block" data-block-name="${blockName}" data-block-status="initialized">
      <div><div>Replace at runtime by ${blockName}.js</div></div>
    </div>
  </main>
  <script type="module">
    import decorate from './${blockName}.js';
    decorate(document.querySelector('.${blockName}'));
  </script>
</body>
</html>`;
        const sections = [
            `# Scaffold for **${blockName}**\n\nMounts \`${cont.name}\` from \`${spec.package}\`.\n\nCreate the following files under \`blocks/${blockName}/\`:`,
            `## \`blocks/${blockName}/${blockName}.js\`\n\n\`\`\`js\n${js}\n\`\`\``,
            `## \`blocks/${blockName}/${blockName}.css\`\n\n\`\`\`css\n${css}\n\`\`\``,
            `## \`blocks/${blockName}/README.md\`\n\n\`\`\`md\n${readme}\n\`\`\``,
            `## \`blocks/${blockName}/sample-content.md\`\n\n\`\`\`md\n${sample}\n\`\`\``,
            `## \`blocks/${blockName}/_${blockName}.json\` (Universal Editor combined config)\n\n\`\`\`json\n${JSON.stringify(ueModel, null, 2)}\n\`\`\``,
            `## \`blocks/${blockName}/test.html\`\n\n\`\`\`html\n${testHtml}\n\`\`\``,
            `## Next steps\n\n1. \`add_dropin\` with \`dropin="${spec.id}"\` if not already installed\n2. \`customize_dropin_slot\` to override any of: ${cont.slots?.map((s) => s.name).join(', ') || '(no slots on this container)'}\n3. \`style_dropin\` with \`dropin="${spec.id}"\` to brand the look\n4. \`validate_storefront\` once your project is wired up`,
        ];
        return { content: [{ type: 'text', text: sections.join('\n\n') }] };
    });
}
//# sourceMappingURL=scaffold-commerce-block.js.map