import { z } from 'zod';
import { BLOCK_PATTERNS } from '../knowledge/eds-conventions.js';
export function registerLookupBlock(server) {
    server.tool('lookup_block', `Look up EDS block patterns, implementation guidance, and references. Returns common patterns with field definitions, CSS hints, and JS strategies. Also provides links to Adobe's Block Collection and community Block Party for existing implementations. Use before building a block to check if a pattern already exists.`, {
        query: z.string().describe('Block name or description to search for (e.g. "hero", "tabbed content", "image carousel")'),
    }, {
        title: 'Look Up Block Patterns',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
    }, async ({ query }) => {
        const searchTerm = query.toLowerCase().trim();
        const matches = [];
        // Score each known pattern against the query
        for (const [name, pattern] of Object.entries(BLOCK_PATTERNS)) {
            let score = 0;
            // Exact name match
            if (name === searchTerm)
                score += 100;
            // Partial name match
            if (name.includes(searchTerm) || searchTerm.includes(name))
                score += 50;
            // Description match
            if (pattern.description.toLowerCase().includes(searchTerm))
                score += 30;
            // Field name match
            if (pattern.fields.some((f) => f.name.toLowerCase().includes(searchTerm)))
                score += 20;
            // Keyword matches
            const keywords = pattern.description.toLowerCase().split(/\s+/);
            const queryWords = searchTerm.split(/\s+/);
            for (const word of queryWords) {
                if (keywords.includes(word))
                    score += 10;
            }
            if (score > 0) {
                matches.push({ name, score, pattern });
            }
        }
        matches.sort((a, b) => b.score - a.score);
        const sections = [];
        if (matches.length > 0) {
            sections.push(`## Found ${matches.length} matching block pattern(s) for "${query}"\n`);
            for (const match of matches) {
                const p = match.pattern;
                sections.push(`### ${match.name}\n` +
                    `${p.description}\n\n` +
                    `**Fields:**\n` +
                    p.fields.map((f) => `- \`${f.name}\` (${f.type}): ${f.label}`).join('\n') +
                    `\n\n**CSS approach:** ${p.cssHint}` +
                    `\n**JS approach:** ${p.jsHint}` +
                    `\n\n→ Use \`scaffold_block\` with blockName="${match.name}" to generate files`);
            }
        }
        else {
            sections.push(`No built-in pattern found for "${query}". This is a custom block — here's how to approach it:\n\n` +
                `1. Use \`explain_dom\` to understand the authored content → DOM mapping\n` +
                `2. Use \`scaffold_block\` to generate the file structure\n` +
                `3. Use \`validate_block\` to check your implementation\n`);
        }
        // Always include external search references
        sections.push(`---\n\n## External Block Libraries\n\n` +
            `**Adobe Block Collection** (official examples):\n` +
            `https://www.aem.live/developer/block-collection\n\n` +
            `Browse the source code of official blocks from Adobe's own sites.\n\n` +
            `**Block Party** (community blocks):\n` +
            `https://github.com/aem-block-collection/block-party\n\n` +
            `Community-contributed blocks with full source and documentation.\n\n` +
            `**AEM Boilerplate** (starter project):\n` +
            `https://github.com/adobe/aem-boilerplate\n\n` +
            `Official starter with default blocks (hero, cards, columns, etc.)\n\n` +
            `**Search GitHub:**\n` +
            `\`site:github.com "export default function decorate" "${query}"\`\n\n` +
            `---\n\n## Programmatic Search Scripts\n\n` +
            `To check if a block already exists in Adobe's official repositories before building from scratch:\n\n` +
            `**1. Search Block Collection via GitHub API (folder names):**\n` +
            `\`\`\`bash\n` +
            `# Lists all block folder names in Adobe's block collection\n` +
            `curl -s "https://api.github.com/repos/adobe/aem-block-collection/contents/blocks" | \\\n` +
            `  python3 -c "import sys,json; [print(x['name']) for x in json.loads(sys.stdin.read()) if x['type']=='dir']"\n` +
            `\`\`\`\n\n` +
            `**2. Search Block Collection nav page (display names):**\n` +
            `\`\`\`bash\n` +
            `# Queries the Block Collection navigation for human-friendly block names\n` +
            `curl -s "https://www.aem.live/developer/block-collection/nav.plain.html" | \\\n` +
            `  grep -oP '(?<=href=")[^"]*' | grep block-collection | sed 's|.*/||'\n` +
            `\`\`\`\n\n` +
            `**3. Search Block Party community blocks:**\n` +
            `\`\`\`bash\n` +
            `curl -s "https://api.github.com/repos/aem-block-collection/block-party/contents" | \\\n` +
            `  python3 -c "import sys,json; [print(x['name']) for x in json.loads(sys.stdin.read()) if x['type']=='dir']"\n` +
            `\`\`\`\n\n` +
            `Run both GitHub API and nav page searches for maximum coverage — folder names and display names don't always match.`);
        return {
            content: [{ type: 'text', text: sections.join('\n\n') }],
        };
    });
}
//# sourceMappingURL=lookup-block.js.map