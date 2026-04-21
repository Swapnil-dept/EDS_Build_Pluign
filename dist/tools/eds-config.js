import { z } from 'zod';
import { CONFIG_TEMPLATES, SITEMAP_SEO, REPOLESS_GUIDE } from '../knowledge/eds-conventions.js';
export function registerEdsConfig(server) {
    server.tool('eds_config', `Get configuration templates and guidance for AEM EDS project files. Covers: fstab.yaml (content source mounts), head.html (meta/scripts), redirects (URL redirects spreadsheet), headers (custom HTTP headers), robots.txt, sitemap, .helix/config.xlsx (CDN/indexing), repoless setup, and metadata. Returns ready-to-use templates with inline documentation.`, {
        configType: z
            .enum([
            'fstab',
            'fstab-sharepoint',
            'fstab-repoless',
            'head-html',
            'redirects',
            'headers',
            'robots',
            'sitemap',
            'helix-config',
            'metadata',
            'repoless',
            'all',
        ])
            .describe('Which configuration to generate'),
        domain: z.string().optional().describe('Your site domain (e.g. "www.example.com") — used in templates'),
        contentSource: z
            .enum(['google-drive', 'sharepoint'])
            .optional()
            .default('google-drive')
            .describe('Content source type'),
        folderId: z.string().optional().describe('Google Drive folder ID or SharePoint path'),
    }, {
        title: 'EDS Configuration Templates',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ configType, domain, contentSource, folderId }) => {
        const siteDomain = domain || '<your-domain>';
        const sections = [];
        const shouldInclude = (type) => configType === 'all' || configType === type;
        // ─── fstab.yaml ──────────────────────────────────────
        if (shouldInclude('fstab') || shouldInclude('fstab-sharepoint') || shouldInclude('fstab-repoless')) {
            let template;
            let description;
            if (configType === 'fstab-sharepoint' || contentSource === 'sharepoint') {
                template = CONFIG_TEMPLATES.fstabSharePoint;
                description = 'SharePoint content source';
            }
            else if (configType === 'fstab-repoless') {
                template = CONFIG_TEMPLATES.fstabRepoless;
                description = 'Repoless architecture (content site pointing to shared code repo)';
            }
            else {
                template = CONFIG_TEMPLATES.fstab;
                description = 'Google Drive content source';
            }
            if (folderId) {
                template = template.replace('<folder-id>', folderId);
            }
            sections.push(`## fstab.yaml — ${description}\n` +
                `This file lives at your project root and tells EDS where to find content.\n\n` +
                `\`\`\`yaml\n${template}\n\`\`\`\n\n` +
                `**Setup steps:**\n` +
                `1. Share the Google Drive folder with \`helix@adobe.com\` (viewer access)\n` +
                `2. Copy the folder ID from the URL: drive.google.com/drive/folders/{THIS-PART}\n` +
                `3. Replace \`<folder-id>\` in fstab.yaml\n` +
                `4. Commit and push — EDS will index content within minutes`);
        }
        // ─── head.html ───────────────────────────────────────
        if (shouldInclude('head-html')) {
            sections.push(`## head.html — Injected into <head>\n` +
                `EDS injects this into every page's <head>. Use for meta tags, favicons, preloads.\n\n` +
                `\`\`\`html\n${CONFIG_TEMPLATES.headHtml}\n\`\`\`\n\n` +
                `**Common additions:**\n` +
                `- \`<link rel="preload" as="image" href="/path/to/hero.webp">\` for LCP image\n` +
                `- \`<link rel="preconnect" href="https://fonts.googleapis.com">\` for external fonts\n` +
                `- Custom favicon: \`<link rel="icon" href="/icons/favicon.ico">\`\n` +
                `- Open Graph defaults: \`<meta property="og:type" content="website">\``);
        }
        // ─── Redirects ───────────────────────────────────────
        if (shouldInclude('redirects')) {
            sections.push(`## redirects.xlsx — URL Redirect Rules\n` +
                `Create as a Google Sheet named "redirects" in your content folder.\n\n` +
                `\`\`\`\n${CONFIG_TEMPLATES.redirectsFormat}\n\`\`\`\n\n` +
                `**Rules:**\n` +
                `- Wildcards: \`*\` matches any path segment, \`:path\` captures for reuse\n` +
                `- Default status: 301 (permanent) — use 302 for temporary redirects\n` +
                `- Order matters: first match wins\n` +
                `- Publish the sheet to activate redirects`);
        }
        // ─── Headers ─────────────────────────────────────────
        if (shouldInclude('headers')) {
            sections.push(`## headers.xlsx — Custom HTTP Headers\n` +
                `Create as a Google Sheet named "headers" in your content folder.\n\n` +
                `\`\`\`\n${CONFIG_TEMPLATES.headersFormat}\n\`\`\`\n\n` +
                `**Common headers:**\n` +
                `- CORS: \`Access-Control-Allow-Origin: *\`\n` +
                `- Security: \`X-Frame-Options: SAMEORIGIN\`\n` +
                `- Caching: \`Cache-Control: public, max-age=31536000\` for static assets\n` +
                `- CSP: \`Content-Security-Policy: default-src 'self'\``);
        }
        // ─── Robots ──────────────────────────────────────────
        if (shouldInclude('robots')) {
            const robotsTxt = CONFIG_TEMPLATES.robotsTxt.replace('<your-domain>', siteDomain);
            sections.push(`## robots.txt — Search Engine Rules\n` +
                `Place in your content source root.\n\n` +
                `\`\`\`\n${robotsTxt}\n\`\`\`\n\n` +
                `**For staging/preview (block all crawling):**\n` +
                `\`\`\`\nUser-agent: *\nDisallow: /\n\`\`\``);
        }
        // ─── Sitemap & SEO ───────────────────────────────────
        if (shouldInclude('sitemap') || shouldInclude('metadata')) {
            sections.push(SITEMAP_SEO);
        }
        // ─── Helix Config ────────────────────────────────────
        if (shouldInclude('helix-config')) {
            sections.push(`## .helix/config.xlsx — CDN & Indexing Configuration\n\n` +
                `\`\`\`\n${CONFIG_TEMPLATES.helixConfig}\n\`\`\`\n\n` +
                `**Sheets:**\n` +
                `- \`cdn\`: Set custom CDN headers by URL pattern\n` +
                `- \`index\`: Define which page properties are indexed for search\n` +
                `- Use the "index" sheet to make page metadata available via /.helix/query/index.json`);
        }
        // ─── Repoless Architecture ───────────────────────────
        if (shouldInclude('repoless')) {
            sections.push(REPOLESS_GUIDE);
        }
        // ─── All ─────────────────────────────────────────────
        if (configType === 'all') {
            sections.unshift(`# AEM EDS Project Configuration Guide\n` +
                `Complete configuration reference for domain: **${siteDomain}**\n` +
                `Content source: **${contentSource}**\n`);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: sections.join('\n\n---\n\n'),
                },
            ],
        };
    });
}
//# sourceMappingURL=eds-config.js.map