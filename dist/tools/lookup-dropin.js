import { z } from 'zod';
import { DROPIN_CATALOG, findDropin } from '../knowledge/storefront-dropins.js';
export function registerLookupDropin(server) {
    server.tool('lookup_dropin', `Look up an Adobe Commerce drop-in. Returns: package name, purpose, all containers (mountable Preact components) with import paths and slots, all ACDL events emitted, the suggested EDS block name, and a quick start mount snippet. Use before customizing a dropin to discover what's available. Pass no query to list every drop-in.`, {
        query: z
            .string()
            .optional()
            .describe('Drop-in id, package name, or partial title (e.g. "cart", "@dropins/storefront-pdp", "checkout"). Omit to list all.'),
    }, {
        title: 'Look Up Drop-in',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ query }) => {
        if (!query) {
            const sections = [
                `# All Adobe Commerce drop-ins (${DROPIN_CATALOG.length})\n`,
                '## B2C',
                DROPIN_CATALOG.filter((d) => d.category === 'b2c').map((d) => `- **${d.id}** — ${d.title} · \`${d.package}\` · block: \`${d.blockName}\``).join('\n'),
            ];
            const b2b = DROPIN_CATALOG.filter((d) => d.category === 'b2b');
            if (b2b.length) {
                sections.push('## B2B');
                sections.push(b2b.map((d) => `- **${d.id}** — ${d.title} · \`${d.package}\` · block: \`${d.blockName}\``).join('\n'));
            }
            sections.push('---\nUse `lookup_dropin` with `query="<id>"` for full details.');
            return { content: [{ type: 'text', text: sections.join('\n\n') }] };
        }
        const spec = findDropin(query);
        if (!spec) {
            return {
                content: [{
                        type: 'text',
                        text: `No drop-in matched "${query}". Run \`lookup_dropin\` with no arguments to list all 12 drop-ins.`,
                    }],
                isError: true,
            };
        }
        const sections = [];
        sections.push(`# ${spec.title}\n\n${spec.purpose}\n\n- **Package:** \`${spec.package}\`\n- **API import:** \`${spec.apiImport}\`\n- **Suggested block:** \`${spec.blockName}\`\n- **Category:** ${spec.category.toUpperCase()}${spec.notes?.length ? `\n\n> ${spec.notes.join(' · ')}` : ''}`);
        sections.push(`## Containers (${spec.containers.length})\n\n` +
            spec.containers.map((c) => `### ${c.name}\n` +
                `\`import ${c.name} from '${c.importPath}';\`\n\n` +
                `${c.purpose}\n\n` +
                (c.slots?.length
                    ? `**Slots:**\n${c.slots.map((s) => `- \`${s.name}\` — ${s.purpose}`).join('\n')}`
                    : '_No customizable slots._')).join('\n\n'));
        sections.push(`## Events emitted\n\n` +
            '| Event | Payload |\n|---|---|\n' +
            spec.events.map((e) => `| \`${e.name}\` | \`${e.payload}\` |`).join('\n'));
        sections.push(`## Quick start\n\n` +
            '```bash\n' +
            `npm install ${spec.package} && npm run postinstall\n` +
            '```\n\n' +
            `Then run \`add_dropin\` with \`dropin="${spec.id}"\` to get the full mount snippet, or \`customize_dropin_slot\` to override a slot.`);
        return { content: [{ type: 'text', text: sections.join('\n\n') }] };
    });
}
//# sourceMappingURL=lookup-dropin.js.map