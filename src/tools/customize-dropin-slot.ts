import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DROPIN_CATALOG, findDropin } from '../knowledge/storefront-dropins.js';
import { CONTAINER_SLOT_PATTERN } from '../knowledge/storefront-sdk.js';

export function registerCustomizeDropinSlot(server: McpServer) {
  server.tool(
    'customize_dropin_slot',
    `Generate a slot-override snippet for an Adobe Commerce drop-in. Returns a complete decorate() function with the slot wired up using the SlotContext API (appendChild / replaceWith / onChange). Validates the slot exists on the chosen container. Use after add_dropin when you need to inject custom UI (empty state, badges, custom CTAs, trust signals) into a drop-in.`,
    {
      dropin: z.string().describe('Drop-in id (e.g. "cart", "pdp", "checkout")'),
      container: z.string().optional().describe('Container name (e.g. "Cart" or "MiniCart"). Defaults to primary container.'),
      slot: z.string().describe('Slot name from the container (e.g. "EmptyCart", "ProductAttributes", "PaymentMethods")'),
      mode: z
        .enum(['append', 'replace'])
        .default('append')
        .describe('append = add to default slot DOM; replace = replace the default DOM entirely'),
      description: z
        .string()
        .optional()
        .describe('What the override should do (e.g. "show low-stock badge", "render brand-aligned empty cart"). Used in code comments.'),
    },
    {
      title: 'Customize Drop-in Slot',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ dropin, container, slot, mode, description }) => {
      const spec = findDropin(dropin);
      if (!spec) {
        return {
          content: [{
            type: 'text' as const,
            text: `Unknown drop-in "${dropin}". Available: ${DROPIN_CATALOG.map((d) => d.id).join(', ')}`,
          }],
          isError: true,
        };
      }
      const cont = spec.containers.find((c) => c.name === container) ?? spec.containers[0];
      const slotSpec = cont.slots?.find((s) => s.name === slot);
      if (!slotSpec) {
        return {
          content: [{
            type: 'text' as const,
            text:
              `Slot "${slot}" does not exist on **${cont.name}** in dropin **${spec.id}**.\n\n` +
              `Available slots on ${cont.name}: ${cont.slots?.map((s) => s.name).join(', ') || '(none — pick a different container)'}\n\n` +
              `Other containers in this drop-in: ${spec.containers.map((c) => c.name).join(', ')}`,
          }],
          isError: true,
        };
      }

      const snippet = `// blocks/${spec.blockName}/${spec.blockName}.js
import { events } from '@dropins/tools/event-bus.js';
import { render as provider } from '@dropins/tools/render.js';
import ${cont.name} from '${cont.importPath}';

export default async function decorate(block) {
  block.textContent = '';

  await provider.render(${cont.name}, {
    slots: {
      ${slot}: (ctx${cont.name === 'Cart' && slot === 'ProductAttributes' ? ', { item }' : ''}) => {
        // ${description ?? slotSpec.purpose}
        const node = document.createElement('div');
        node.className = '${spec.blockName}__${slot.toLowerCase()}';
        node.innerHTML = ${slot === 'EmptyCart'
          ? `\`
          <h2>Your bag is empty</h2>
          <p>Browse our latest arrivals to find something you love.</p>
          <a class="button" href="/">Continue shopping</a>
        \``
          : '\'<!-- TODO: build your custom DOM here -->\''};

        ctx.${mode === 'replace' ? 'replaceWith' : 'appendChild'}(node);

        // Optional: react to context updates (cart changes, locale, etc.)
        ctx.onChange?.((next) => {
          // re-render based on next state
        });
      },
    },
  })(block);
}`;

      const css = `/* blocks/${spec.blockName}/${spec.blockName}.css */
main .${spec.blockName} .${spec.blockName}__${slot.toLowerCase()} {
  padding: var(--spacing-medium);
  text-align: center;
  background: var(--color-neutral-50);
  border-radius: var(--shape-radius-2);
}

main .${spec.blockName} .${spec.blockName}__${slot.toLowerCase()} .button {
  margin-top: var(--spacing-medium);
}`;

      const sections = [
        `# Customizing **${slot}** on **${cont.name}** (${spec.id})\n\n${slotSpec.purpose}\n\n**Mode:** ${mode === 'replace' ? 'replace default slot DOM' : 'append to default slot DOM'}`,
        `## Block JS\n\n\`\`\`js\n${snippet}\n\`\`\``,
        `## Block CSS (uses Drop-in SDK design tokens)\n\n\`\`\`css\n${css}\n\`\`\``,
        `## Slot context API\n\n- \`ctx.appendChild(node)\` — append to default slot content\n- \`ctx.replaceWith(node)\` — replace default slot content\n- \`ctx.onChange(cb)\` — react to slot context updates (cart/product/etc.)\n- \`ctx.dictionary\` — access localized strings (from \`langDefinitions\`)`,
        `## Reference\n\n${CONTAINER_SLOT_PATTERN}`,
      ];

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}
