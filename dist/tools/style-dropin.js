import { z } from 'zod';
import { SDK_DESIGN_TOKENS, SDK_HARD_RULES } from '../knowledge/storefront-sdk.js';
import { findDropin, DROPIN_CATALOG } from '../knowledge/storefront-dropins.js';
export function registerStyleDropin(server) {
    server.tool('style_dropin', `Generate brand-aligned CSS overrides for an Adobe Commerce drop-in using @dropins/tools design tokens (--color-*, --type-*, --spacing-*, --shape-*). Returns a scoped stylesheet that re-themes the dropin without forking it. Pass brand colors, font, and radius — and optionally per-component tweaks.`, {
        dropin: z.string().describe('Drop-in id to style (e.g. "cart", "pdp", "checkout") or "global" for app-wide tokens'),
        brandPrimary: z.string().optional().describe('Brand primary color (hex). Maps to --color-brand-500.'),
        brandPrimaryDark: z.string().optional().describe('Optional darker shade for hover/active states. Maps to --color-brand-700.'),
        neutralBase: z.string().optional().describe('Base neutral / surface color (hex). Maps to --color-neutral-50.'),
        headingFont: z.string().optional().describe('Heading font family (CSS family list). Maps to --type-headline-font-family.'),
        bodyFont: z.string().optional().describe('Body font family (CSS family list). Maps to --type-base-font-family.'),
        radius: z.enum(['sharp', 'soft', 'pill']).optional().describe('Corner style: sharp (2px), soft (8px), pill (9999px)'),
    }, {
        title: 'Style Drop-in',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async (args) => {
        const { dropin, brandPrimary, brandPrimaryDark, neutralBase, headingFont, bodyFont, radius } = args;
        const isGlobal = dropin === 'global';
        const spec = isGlobal ? null : findDropin(dropin);
        if (!isGlobal && !spec) {
            return {
                content: [{
                        type: 'text',
                        text: `Unknown drop-in "${dropin}". Available: global, ${DROPIN_CATALOG.map((d) => d.id).join(', ')}`,
                    }],
                isError: true,
            };
        }
        const radiusMap = { sharp: '2px', soft: '8px', pill: '9999px' };
        const tokens = [];
        if (brandPrimary) {
            tokens.push(`  --color-brand-500: ${brandPrimary};`);
            tokens.push(`  --color-brand-600: color-mix(in srgb, ${brandPrimary} 88%, black);`);
        }
        if (brandPrimaryDark)
            tokens.push(`  --color-brand-700: ${brandPrimaryDark};`);
        if (neutralBase)
            tokens.push(`  --color-neutral-50: ${neutralBase};`);
        if (headingFont)
            tokens.push(`  --type-headline-font-family: ${headingFont};`);
        if (bodyFont)
            tokens.push(`  --type-base-font-family: ${bodyFont};`);
        if (radius)
            tokens.push(`  --shape-radius-2: ${radiusMap[radius]};\n  --shape-radius-3: ${radiusMap[radius]};`);
        if (!tokens.length) {
            tokens.push(`  /* No overrides specified — see ${SDK_DESIGN_TOKENS.split('\n')[0]} */`);
        }
        const scope = isGlobal ? ':root' : `main .${spec.blockName}`;
        const fileHint = isGlobal ? 'styles/styles.css (or a new tokens file imported early)' : `blocks/${spec.blockName}/${spec.blockName}.css`;
        const css = `/* ${fileHint} */
${scope} {
${tokens.join('\n')}
}

/* Examples of further per-component overrides:
${scope} .ds-button-primary { --ds-button-primary-background: var(--color-brand-500); }
${scope} .ds-input          { --ds-input-border-color: var(--color-neutral-300); }
${scope} .ds-card           { --ds-card-shadow: var(--shadow-2); }
*/`;
        const sections = [
            `# Theming **${dropin}** with Drop-in SDK design tokens\n\nFile: \`${fileHint}\``,
            `## Generated CSS\n\n\`\`\`css\n${css}\n\`\`\``,
            `## Token reference\n\n${SDK_DESIGN_TOKENS}`,
            `## Rules\n\n${SDK_HARD_RULES.map((r) => `- ${r}`).join('\n')}`,
        ];
        return { content: [{ type: 'text', text: sections.join('\n\n') }] };
    });
}
//# sourceMappingURL=style-dropin.js.map