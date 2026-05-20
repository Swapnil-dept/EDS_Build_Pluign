import { z } from 'zod';
import { DIALOG_PRINCIPLES, DIALOG_FIELD_TYPES, DIALOG_PATTERNS, NAMING_CONVENTIONS, } from '../knowledge/aem-dialog-design.js';
const DIALOG_DESIGN_GUIDE_ROOT = 'https://github.com/Swapnil-dept/EDS_Build_Pluign/blob/dev/src/knowledge/aem-dialog-design.ts';
export function registerAemDialogDesign(server) {
    server.tool('aem_dialog_design', `Look up AEM component dialog design best practices. Returns guidance on naming conventions, tab organization, field types, validation, tooltips, CoralUI compliance, policy-driven configuration, and AEMaaCS compatibility. Pass a query to search by keyword (e.g., "naming", "coralui", "tooltip", "simplicity", "show-hide", "validation") or a field type (e.g., "switch", "radio", "select", "textfield", "pathpicker"). Empty query returns overview. PRECONDITION: primarily for AEMaaCS component authors.`, {
        query: z.string().optional().describe('Keyword or principle id (naming-consistency, dialog-simplicity, tab-organization, policy-driven-config, style-system, show-hide-logic, in-context-editing, coralui-compliance, tooltips-and-help, validation-and-defaults, multiselect-option-modeling, path-picker-context, aeaacs-compatibility). Field types: switch-toggle, radio-button, select-dropdown, select-list, tag-list, text-input, text-area, rich-text-editor, number-input, datepicker, path-picker-pages, path-picker-assets, path-picker-content-fragments, multifield, image-crop, color-picker. Empty = overview.'),
    }, {
        title: 'AEM Dialog Design Best Practices',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ query }) => {
        const q = query?.trim().toLowerCase() ?? '';
        // ─── Overview (no query) ────────────────────────────────────────
        if (!q) {
            const sections = [];
            sections.push(`# AEM Component Dialog Design Best Practices\n\n` +
                `**Source:** [AEM Dialog Design Knowledge Base](${DIALOG_DESIGN_GUIDE_ROOT})\n\n` +
                `A comprehensive guide to designing usable, maintainable, performant dialogs for AEM as a Cloud Service components.`);
            sections.push(`## Core Principles (${DIALOG_PRINCIPLES.length})\n\n` +
                DIALOG_PRINCIPLES.map((p) => `- **${p.id}** — ${p.title}: ${p.description.substring(0, 80)}...`).join('\n') +
                `\n\nUse a principle keyword to dive deeper, e.g., **naming-consistency**, **coralui-compliance**, **tooltips-and-help**.`);
            sections.push(`## Field Types (${DIALOG_FIELD_TYPES.length})\n\n` +
                `Guidance on **14 CoralUI field types** for different authoring scenarios:\n\n` +
                `- **Toggles/Selection:** switch-toggle, radio-button, select-dropdown, select-list, tag-list\n` +
                `- **Text:** text-input, text-area, rich-text-editor\n` +
                `- **Numeric & Date:** number-input, datepicker\n` +
                `- **Path Pickers:** path-picker-pages, path-picker-assets, path-picker-content-fragments\n` +
                `- **Advanced:** multifield, image-crop, color-picker\n\n` +
                `Use a field-type keyword to get detailed guidance, e.g., **switch-toggle**, **path-picker-assets**, **multifield**.`);
            sections.push(`## Dialog Patterns (${DIALOG_PATTERNS.length})\n\n` +
                `Common component structures with recommended tab layouts and policy config:\n\n` +
                DIALOG_PATTERNS.map((p) => `- ${p.name}`).join('\n'));
            sections.push(`## Naming Conventions\n\n` +
                `System for consistent component names, field labels, and property names across your project.\n\n` +
                `Query **naming-consistency** for sorting codes, alphabetical grouping, field naming rules.`);
            return {
                content: [{ type: 'text', text: sections.join('\n\n') }],
            };
        }
        // ─── Search: Principles ─────────────────────────────────────────
        const matchedPrinciples = DIALOG_PRINCIPLES.filter((p) => p.id.includes(q) || p.title.toLowerCase().includes(q));
        if (matchedPrinciples.length > 0) {
            const sections = [];
            sections.push(`# AEM Dialog Design — Principles\n\n` +
                `**Matching Principles:** ${matchedPrinciples.map((p) => `\`${p.id}\``).join(', ')}`);
            matchedPrinciples.forEach((p) => {
                sections.push(`## ${p.title}\n`);
                sections.push(`**ID:** \`${p.id}\``);
                sections.push(`**Description:** ${p.description}`);
                sections.push(`**Rationale:** ${p.rationale}`);
                if (p.examples.length > 0) {
                    sections.push(`\n**Examples:**\n${p.examples.map((e) => `- ${e}`).join('\n')}`);
                }
                if (p.antiPatterns.length > 0) {
                    sections.push(`\n**Anti-Patterns (avoid):**\n${p.antiPatterns.map((a) => `- ❌ ${a}`).join('\n')}`);
                }
            });
            return {
                content: [{ type: 'text', text: sections.join('\n\n') }],
            };
        }
        // ─── Search: Field Types ────────────────────────────────────────
        const matchedFields = DIALOG_FIELD_TYPES.filter((f) => f.id.includes(q) ||
            f.coralUiClass.toLowerCase().includes(q) ||
            f.use.toLowerCase().includes(q));
        if (matchedFields.length > 0) {
            const sections = [];
            sections.push(`# AEM Dialog Design — Field Types\n\n` +
                `**Matching Field Types:** ${matchedFields.map((f) => `\`${f.id}\``).join(', ')}`);
            matchedFields.forEach((f) => {
                sections.push(`## ${f.id}\n`);
                sections.push(`**CoralUI Class:** \`${f.coralUiClass}\``);
                sections.push(`**Use Case:** ${f.use}`);
                if (f.examples.length > 0) {
                    sections.push(`\n**Examples:**\n${f.examples.map((e) => `- ${e}`).join('\n')}`);
                }
                if (f.validation.length > 0) {
                    sections.push(`\n**Validation Rules:**\n${f.validation.map((v) => `- ✓ ${v}`).join('\n')}`);
                }
                sections.push(`\n**Default Properties:**\n\`\`\`json\n${JSON.stringify(f.defaultProperties, null, 2)}\n\`\`\``);
                if (f.antiPatterns.length > 0) {
                    sections.push(`\n**Anti-Patterns (avoid):**\n${f.antiPatterns.map((a) => `- ❌ ${a}`).join('\n')}`);
                }
            });
            return {
                content: [{ type: 'text', text: sections.join('\n\n') }],
            };
        }
        // ─── Search: Naming Conventions ──────────────────────────────────
        if (q.includes('naming')) {
            const sections = [];
            sections.push(`# Naming Conventions\n`);
            sections.push(`## Component Sorting Codes\n\n` +
                `Use hierarchical code prefixes to ensure consistent alphabetical ordering:\n\n` +
                `| Code | Category | Examples |\n` +
                `|------|----------|----------|\n` +
                Object.entries(NAMING_CONVENTIONS.codePrefix)
                    .map(([code, category]) => `| \`${code}\` | ${category.split(' ')[0]} | ${category.substring(category.indexOf('('))} |`)
                    .join('\n'));
            sections.push(`## Component Naming Pattern\n\n` +
                `**Core Concept First → Variant Last**\n\n` +
                `| Pattern | ✓ Correct | ❌ Incorrect | Rationale |\n` +
                `|---------|-----------|--------------|----------|\n` +
                `| Teaser variants | Teaser Large, Teaser Feature, Teaser Landing | Large Teaser, Feature Teaser | Groups all teasers together under "T" |\n` +
                `| List variants | List Default, List Compact | Compact List, Default List | Groups all lists under "L" |\n` +
                `| Hero variants | Hero Image, Hero Video | Image Hero, Video Hero | All heroes grouped under "H" |`);
            sections.push(`## Field Naming Pattern (Substance First)\n\n` +
                `| Category | ✓ Correct | ❌ Avoid | Reason |\n` +
                `|----------|-----------|---------|--------|\n` +
                `| Text fields | Heading Text, CTA Label | Enter Heading, Label for CTA | Describes what the field IS, not what to do |\n` +
                `| Media | Image Alt Text, Image Caption | Alt for Image, Image Description Text | Substance (Image) + Detail (Alt Text) |\n` +
                `| Styling | Background Color, Text Alignment | Color Option, Pick Alignment | Clear, actionable, consistent |\n` +
                `| Logic | Show CTA, Enable Comments | Display CTA?, Comments Enabled | Concise, predictable |\n` +
                `| Numbers | Max Items, Image Width | Item Limit, Width (px) | Substance first, unit in tooltip |`);
            sections.push(`## Property Name Convention (camelCase)\n\n` +
                `Map dialog field labels to HTL/Java property names:\n\n` +
                `| Field Label | Property Name | Usage in HTL |\n` +
                `|-------------|---------------|-------------|\n` +
                Object.entries(NAMING_CONVENTIONS.propertyNameConvention.examples)
                    .map(([label, prop]) => `| ${label} | \`${prop}\` | \\\${model.${prop}} |`)
                    .join('\n'));
            return {
                content: [{ type: 'text', text: sections.join('\n\n') }],
            };
        }
        // ─── Search: Dialog Patterns ─────────────────────────────────────
        if (q.includes('pattern') || q.includes('grid') || q.includes('hero') || q.includes('card')) {
            const matchedPatterns = DIALOG_PATTERNS.filter((p) => p.name.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q));
            if (matchedPatterns.length > 0) {
                const sections = [];
                sections.push(`# Dialog Patterns\n`);
                matchedPatterns.forEach((p) => {
                    sections.push(`## ${p.name}\n`);
                    sections.push(`**Description:** ${p.description}`);
                    sections.push(`\n**Tab Structure:**\n`);
                    p.tabStructure.forEach((tab) => {
                        sections.push(`- **${tab.title}:** ${tab.fields.join(', ')}`);
                    });
                    sections.push(`\n**Policy Configuration:**\n`);
                    p.policyConfig.forEach((pc) => {
                        sections.push(`- ${pc}`);
                    });
                    if (p.showHideLogic && p.showHideLogic !== 'None (simple reference)') {
                        sections.push(`\n**Conditional Visibility:** ${p.showHideLogic}`);
                    }
                });
                return {
                    content: [{ type: 'text', text: sections.join('\n\n') }],
                };
            }
        }
        // ─── No matches ──────────────────────────────────────────────────
        return {
            content: [
                {
                    type: 'text',
                    text: `No matches for "${query}". Try:\n\n**Principles:** naming-consistency, simplicity, tabs, policies, style-system, show-hide, in-context, coralui, tooltips, validation, multiselect, path-picker, aeaacs\n\n**Field Types:** switch-toggle, radio-button, select, select-list, tag-list, text, textarea, richtext, number, datepicker, pathpicker, multifield, color\n\n**Other:** naming, pattern, grid, hero, card`,
                },
            ],
        };
    });
}
//# sourceMappingURL=aem-dialog-design.js.map