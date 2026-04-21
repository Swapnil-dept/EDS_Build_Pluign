import { z } from 'zod';
/**
 * Search Adobe Block Collection and Block Party for existing EDS block implementations.
 * Queries the GitHub API to find blocks before building from scratch.
 */
export function registerSearchBlockCollection(server) {
    server.tool('search_block_collection', `Search Adobe's official Block Collection and community Block Party repositories for existing EDS block implementations. Use before building a block from scratch — an official implementation may already exist. Queries the GitHub API for folder names and returns matching blocks with source URLs.`, {
        query: z.string().describe('Block name or type to search for (e.g. "accordion", "carousel", "tabs")'),
        source: z
            .enum(['collection', 'party', 'both'])
            .default('both')
            .describe('Which repository to search: Adobe Block Collection, community Block Party, or both'),
    }, {
        title: 'Search Block Collection',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
    }, async ({ query, source }) => {
        const searchTerm = query.toLowerCase().trim();
        const results = [];
        const errors = [];
        // ─── Search Adobe Block Collection ────────────────────
        if (source === 'collection' || source === 'both') {
            try {
                const resp = await fetch('https://api.github.com/repos/adobe/aem-block-collection/contents/blocks', { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'eds-mcp-server/1.0.0' } });
                if (resp.ok) {
                    const items = await resp.json();
                    for (const item of items) {
                        if (item.type !== 'dir')
                            continue;
                        const name = item.name.toLowerCase();
                        if (name === searchTerm) {
                            results.push({ name: item.name, source: 'Adobe Block Collection', url: item.html_url, match: 'exact' });
                        }
                        else if (name.includes(searchTerm) || searchTerm.includes(name)) {
                            results.push({ name: item.name, source: 'Adobe Block Collection', url: item.html_url, match: 'partial' });
                        }
                    }
                }
                else if (resp.status === 403) {
                    errors.push('GitHub API rate limit reached for Block Collection. Try again in a few minutes or use a GitHub token.');
                }
                else {
                    errors.push(`Block Collection search returned HTTP ${resp.status}`);
                }
            }
            catch (e) {
                errors.push(`Block Collection search failed: ${e.message}. Check your network connection.`);
            }
        }
        // ─── Search Block Party ───────────────────────────────
        if (source === 'party' || source === 'both') {
            try {
                const resp = await fetch('https://api.github.com/repos/aem-block-collection/block-party/contents', { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'eds-mcp-server/1.0.0' } });
                if (resp.ok) {
                    const items = await resp.json();
                    for (const item of items) {
                        if (item.type !== 'dir')
                            continue;
                        if (item.name.startsWith('.'))
                            continue;
                        const name = item.name.toLowerCase();
                        if (name === searchTerm) {
                            results.push({ name: item.name, source: 'Block Party (community)', url: item.html_url, match: 'exact' });
                        }
                        else if (name.includes(searchTerm) || searchTerm.includes(name)) {
                            results.push({ name: item.name, source: 'Block Party (community)', url: item.html_url, match: 'partial' });
                        }
                    }
                }
                else if (resp.status === 403) {
                    errors.push('GitHub API rate limit reached for Block Party. Try again in a few minutes.');
                }
                else {
                    errors.push(`Block Party search returned HTTP ${resp.status}`);
                }
            }
            catch (e) {
                errors.push(`Block Party search failed: ${e.message}. Check your network connection.`);
            }
        }
        // ─── Build Response ───────────────────────────────────
        const sections = [];
        if (results.length > 0) {
            // Sort: exact matches first
            results.sort((a, b) => (a.match === 'exact' ? -1 : 1) - (b.match === 'exact' ? -1 : 1));
            sections.push(`## Found ${results.length} existing block(s) for "${query}"\n`);
            for (const r of results) {
                sections.push(`### ${r.name} ${r.match === 'exact' ? '✅ (exact match)' : '🔍 (partial match)'}\n` +
                    `**Source:** ${r.source}\n` +
                    `**Browse code:** ${r.url}\n` +
                    `\n→ Consider using or adapting this existing implementation before building from scratch.`);
            }
        }
        else {
            sections.push(`No existing block found for "${query}" in the searched repositories.\n\n` +
                `**Next steps:**\n` +
                `1. Use \`lookup_block\` to check built-in patterns and get implementation guidance\n` +
                `2. Use \`scaffold_block\` to generate a new block from scratch\n` +
                `3. Use \`validate_block\` to verify your implementation follows EDS standards`);
        }
        if (errors.length > 0) {
            sections.push(`\n---\n\n⚠️ **Search issues:**\n${errors.map((e) => `- ${e}`).join('\n')}`);
        }
        sections.push(`\n---\n\n**Manual search:**\n` +
            `- Block Collection: https://www.aem.live/developer/block-collection\n` +
            `- Block Party: https://github.com/aem-block-collection/block-party\n` +
            `- AEM Boilerplate: https://github.com/adobe/aem-boilerplate/tree/main/blocks`);
        return {
            content: [{ type: 'text', text: sections.join('\n\n') }],
        };
    });
}
//# sourceMappingURL=search-block-collection.js.map