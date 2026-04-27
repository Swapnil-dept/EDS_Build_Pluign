import { z } from 'zod';
import { DROPIN_CATALOG, findDropin, buildMountSnippet } from '../knowledge/storefront-dropins.js';
export function registerAddDropin(server) {
    server.tool('add_dropin', `Install and wire a single Adobe Commerce drop-in into an existing EDS storefront. PRECONDITION: only call this on an EDS Commerce Storefront project — run \`detect_project_type\` first if you're unsure. On a vanilla EDS project, run \`scaffold_storefront_project\` first. Returns: npm install command, postinstall reminder, scripts/initializers.js wiring, the canonical block scaffold (blocks/<commerce-X>/<commerce-X>.js), and the list of slots & events you can customize. Pick from the 12 official drop-ins (cart, checkout, order, pdp, product-discovery, product-recommendations, personalization, payment-services, account, auth, wishlist, quick-order).`, {
        dropin: z
            .string()
            .describe('Drop-in id (e.g. "cart", "pdp", "checkout") or package name. Use lookup_dropin to discover.'),
        container: z
            .string()
            .optional()
            .describe('Optional container name within the dropin (e.g. "MiniCart" instead of "Cart"). Defaults to the primary container.'),
    }, {
        title: 'Add Drop-in',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ dropin, container }) => {
        const spec = findDropin(dropin);
        if (!spec) {
            return {
                content: [{
                        type: 'text',
                        text: `❌ Unknown drop-in "${dropin}". Available drop-ins:\n\n` +
                            DROPIN_CATALOG.map((d) => `- **${d.id}** (${d.package}) — ${d.title}`).join('\n') +
                            `\n\nUse \`lookup_dropin\` for full details on any drop-in.`,
                    }],
                isError: true,
            };
        }
        const chosenContainer = spec.containers.find((c) => c.name === container) ?? spec.containers[0];
        const sections = [];
        sections.push(`# Adding the **${spec.title}** drop-in\n\nPackage: \`${spec.package}\` · Block: \`${spec.blockName}\` · Category: ${spec.category.toUpperCase()}\n\n${spec.purpose}${spec.notes?.length ? `\n\n> ⚠️ ${spec.notes.join(' · ')}` : ''}`);
        sections.push(`## 1 · Install\n\n` +
            '```bash\n' +
            `npm install ${spec.package}\n` +
            'npm run postinstall   # required — copies dropin into scripts/__dropins__/\n' +
            '```');
        sections.push(`## 2 · Initialize (scripts/initializers.js)\n\n` +
            '```js\n' +
            `import { initializers } from '@dropins/tools/initializer.js';\n` +
            `import * as ${spec.id.replace(/-/g, '')}Api from '${spec.apiImport}';\n\n` +
            `// Inside initializeDropins():\n` +
            `await initializers.mountImmediately(${spec.id.replace(/-/g, '')}Api.initialize, {\n` +
            `  langDefinitions,\n` +
            `});\n` +
            '```');
        sections.push(`## 3 · Mount in a block (\`blocks/${spec.blockName}/${spec.blockName}.js\`)\n\n` +
            '```js\n' + buildMountSnippet(spec, chosenContainer) + '```');
        if (chosenContainer.slots?.length) {
            sections.push(`## 4 · Slots you can customize on **${chosenContainer.name}**\n\n` +
                '| Slot | Purpose |\n|---|---|\n' +
                chosenContainer.slots.map((s) => `| \`${s.name}\` | ${s.purpose} |`).join('\n') +
                `\n\n→ Use \`customize_dropin_slot\` for ready-made slot snippets.`);
        }
        sections.push(`## 5 · Containers in this drop-in\n\n` +
            spec.containers.map((c) => `- **${c.name}** — ${c.purpose}\n  \`import ${c.name} from '${c.importPath}';\``).join('\n'));
        sections.push(`## 6 · Events emitted (Adobe Client Data Layer)\n\n` +
            '| Event | Payload |\n|---|---|\n' +
            spec.events.map((e) => `| \`${e.name}\` | \`${e.payload}\` |`).join('\n') +
            `\n\nListen with \`events.on(name, handler, { eager: true })\` from \`@dropins/tools/event-bus.js\`.`);
        sections.push(`## 7 · Verify\n\n` +
            '- Run `aem up` and visit a page that mounts this block\n' +
            `- Open DevTools → \`window.adobeDataLayer\` should contain \`${spec.events[0]?.name ?? 'dropin events'}\`\n` +
            '- Run `validate_storefront` to confirm postinstall + wiring is correct');
        return { content: [{ type: 'text', text: sections.join('\n\n') }] };
    });
}
//# sourceMappingURL=add-dropin.js.map