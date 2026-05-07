import { z } from 'zod';
/**
 * crawl_url — fetch a public URL and extract design / structural signals
 * usable as input to a block scaffold workflow.
 *
 * Zero new dependencies: uses built-in `fetch` and regex extraction.
 * The LLM only needs structural hints (palette, fonts, headings, repeating
 * component patterns, image/CTA counts) — not a perfect DOM.
 *
 * For SPA / JS-rendered sites, the prompt instructs the user to install
 * Microsoft's Playwright MCP (`@microsoft/playwright-mcp`) and run the
 * page through that first, then feed the rendered HTML back here via
 * the `html` parameter.
 */
const HEX_RE = /#([0-9a-f]{3}|[0-9a-f]{6})\b/gi;
const RGB_RE = /rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*[\d.]+)?\s*\)/gi;
const FONT_RE = /font-family\s*:\s*([^;}{]+)/gi;
const CLASS_RE = /class="([^"]+)"/g;
function topN(items, n, by = String) {
    const counts = new Map();
    for (const it of items) {
        const k = by(it).trim();
        if (!k)
            continue;
        counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([value, count]) => ({ value, count }));
}
function decodeEntities(s) {
    return s
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)));
}
function stripTags(html) {
    return decodeEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}
function extractMeta(html, name) {
    const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i');
    return html.match(re)?.[1];
}
function extractAll(html, tag) {
    const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
    const out = [];
    let m;
    while ((m = re.exec(html)) !== null)
        out.push(stripTags(m[1]));
    return out.filter(Boolean);
}
function findRepeatingClasses(html) {
    // Find classes that appear 3+ times — strong hint at a repeating component (cards, slides, list items).
    const all = [];
    let m;
    while ((m = CLASS_RE.exec(html)) !== null) {
        for (const c of m[1].split(/\s+/)) {
            if (c && c.length >= 3 && !/^[0-9]/.test(c))
                all.push(c);
        }
    }
    const counts = new Map();
    for (const c of all)
        counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()]
        .filter(([, n]) => n >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)
        .map(([className, count]) => ({ className, count }));
}
function detectFramework(html) {
    const hits = [];
    if (/wp-content|wp-includes/i.test(html))
        hits.push('WordPress');
    if (/<meta[^>]+drupal/i.test(html))
        hits.push('Drupal');
    if (/cq:template|wcm-content|hlx\.page|aem\.live/i.test(html))
        hits.push('AEM / Helix');
    if (/__next_data__|"buildId"/i.test(html))
        hits.push('Next.js');
    if (/__nuxt|nuxt-link/i.test(html))
        hits.push('Nuxt');
    if (/data-react(?:-helmet|root)/i.test(html))
        hits.push('React (SSR)');
    if (/bootstrap(?:\.min)?\.css/i.test(html))
        hits.push('Bootstrap CSS');
    if (/tailwind/i.test(html))
        hits.push('Tailwind');
    return hits;
}
function detectComponentCandidates(html) {
    const out = [];
    const tally = (type, signal, re) => {
        const matches = html.match(re);
        if (matches && matches.length)
            out.push({ type, signal, count: matches.length });
    };
    tally('hero', '<section class*="hero">', /<section[^>]*class="[^"]*\bhero\b[^"]*"/gi);
    tally('carousel', 'class*="carousel|slider|swiper"', /class="[^"]*\b(?:carousel|slider|swiper)\b[^"]*"/gi);
    tally('cards', 'class*="card"', /class="[^"]*\bcard(?:s|-item)?\b[^"]*"/gi);
    tally('tabs', 'role="tab" or class*="tab"', /role="tab"|class="[^"]*\btabs?\b[^"]*"/gi);
    tally('accordion', 'class*="accordion|collapse"', /class="[^"]*\b(?:accordion|collapse)\b[^"]*"/gi);
    tally('form', '<form>', /<form\b/gi);
    tally('cta', '<a class*="btn|cta|button">', /<a[^>]*class="[^"]*\b(?:btn|cta|button)\b[^"]*"/gi);
    tally('video', '<video> or YouTube/Vimeo iframe', /<video\b|youtube\.com\/embed|player\.vimeo\.com/gi);
    tally('navigation', '<nav> tag', /<nav\b/gi);
    tally('footer', '<footer> tag', /<footer\b/gi);
    tally('table', '<table> tag', /<table\b/gi);
    return out.sort((a, b) => b.count - a.count);
}
export function registerCrawlUrl(server) {
    server.tool('crawl_url', `Fetch a public URL (or analyze pre-fetched HTML) and extract design + structural signals usable as input to block scaffolding. Returns: page meta, color palette (top hex/rgb), font stacks, headings (h1/h2/h3), framework hints (WordPress / AEM / Next / Bootstrap / Tailwind), component candidates with confidence (hero/carousel/cards/tabs/accordion/form/cta/video/nav/footer/table), repeating CSS classes (3+ occurrences = likely component children), and image / link / form counts. Static analysis only — for SPA / JS-rendered sites, render the page first with Microsoft's Playwright MCP (\`@microsoft/playwright-mcp\`) and pass the rendered HTML via the \`html\` parameter.`, {
        url: z.string().url().optional().describe('Public URL to fetch. Either `url` or `html` must be supplied.'),
        html: z.string().optional().describe('Pre-fetched HTML (e.g. from Playwright MCP after JS rendering). Overrides `url` if both are given.'),
        userAgent: z.string().optional().describe('Custom User-Agent header (some sites block default node fetch).'),
        maxBytes: z.number().int().positive().max(5_000_000).default(2_000_000).describe('Max bytes to read from a fetched URL (default 2 MB).'),
    }, {
        title: 'Crawl URL',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
    }, async ({ url, html: providedHtml, userAgent, maxBytes }) => {
        let html = providedHtml;
        let finalUrl = url;
        let status = 200;
        let contentType = 'text/html';
        if (!html) {
            if (!url) {
                return { content: [{ type: 'text', text: 'Either `url` or `html` must be provided.' }], isError: true };
            }
            try {
                const res = await fetch(url, {
                    redirect: 'follow',
                    headers: {
                        'User-Agent': userAgent ?? 'Mozilla/5.0 (compatible; eds-mcp-server/1.0; +https://github.com/Swapnil-dept/EDS_Build_Pluign)',
                        'Accept': 'text/html,application/xhtml+xml,*/*',
                    },
                });
                status = res.status;
                contentType = res.headers.get('content-type') ?? 'text/html';
                finalUrl = res.url;
                if (!res.ok) {
                    return { content: [{ type: 'text', text: `Fetch failed: ${res.status} ${res.statusText} for ${url}` }], isError: true };
                }
                if (!/html|xml/i.test(contentType)) {
                    return { content: [{ type: 'text', text: `Refusing to parse non-HTML content-type: ${contentType}` }], isError: true };
                }
                const reader = res.body?.getReader();
                if (!reader) {
                    html = await res.text();
                }
                else {
                    const chunks = [];
                    let total = 0;
                    while (total < maxBytes) {
                        const { done, value } = await reader.read();
                        if (done)
                            break;
                        chunks.push(value);
                        total += value.length;
                    }
                    try {
                        await reader.cancel();
                    }
                    catch { /* ignore */ }
                    html = new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
                }
            }
            catch (e) {
                return { content: [{ type: 'text', text: `Network error: ${e?.message ?? e}` }], isError: true };
            }
        }
        if (!html || html.length < 50) {
            return { content: [{ type: 'text', text: 'No usable HTML content.' }], isError: true };
        }
        // ─── Extraction ───────────────────────────────────────
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? stripTags(titleMatch[1]) : '';
        const description = extractMeta(html, 'description') ?? extractMeta(html, 'og:description') ?? '';
        const ogImage = extractMeta(html, 'og:image') ?? '';
        const h1 = extractAll(html, 'h1').slice(0, 5);
        const h2 = extractAll(html, 'h2').slice(0, 10);
        const h3 = extractAll(html, 'h3').slice(0, 10);
        // Pull <style> blocks + inline style attrs to scan colors / fonts.
        const styleBlocks = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? []).join('\n');
        const inlineStyles = (html.match(/style="([^"]+)"/gi) ?? []).join('\n');
        const cssCorpus = `${styleBlocks}\n${inlineStyles}`;
        const hexColors = (cssCorpus.match(HEX_RE) ?? []).map((c) => c.toLowerCase());
        const rgbColors = (cssCorpus.match(RGB_RE) ?? []).map((c) => c.replace(/\s+/g, ''));
        const palette = [...topN(hexColors, 8), ...topN(rgbColors, 4)];
        const fontFamilies = [];
        let fm;
        while ((fm = FONT_RE.exec(cssCorpus)) !== null)
            fontFamilies.push(fm[1].replace(/['"]/g, '').trim());
        const fonts = topN(fontFamilies, 6);
        // Linked stylesheets and Google Fonts hint
        const stylesheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 15);
        const googleFonts = stylesheets.filter((s) => /fonts\.googleapis\.com/i.test(s));
        const imageCount = (html.match(/<img\b/gi) ?? []).length + (html.match(/<picture\b/gi) ?? []).length;
        const linkCount = (html.match(/<a\b/gi) ?? []).length;
        const formCount = (html.match(/<form\b/gi) ?? []).length;
        const sectionCount = (html.match(/<section\b/gi) ?? []).length;
        const repeatingClasses = findRepeatingClasses(html);
        const components = detectComponentCandidates(html);
        const frameworks = detectFramework(html);
        // ─── Output ───────────────────────────────────────────
        const sections = [];
        sections.push(`# Crawl: ${finalUrl ?? '(provided HTML)'}\n\n- HTTP: ${status}\n- Content-Type: ${contentType}\n- HTML size: ${html.length.toLocaleString()} chars`);
        sections.push(`## Page meta\n\n- **Title:** ${title || '(none)'}\n- **Description:** ${description || '(none)'}\n- **og:image:** ${ogImage || '(none)'}\n- **Frameworks:** ${frameworks.length ? frameworks.join(', ') : '(none detected)'}`);
        sections.push(`## Headings\n\n- **H1 (${h1.length}):** ${h1.map((s) => `"${s.slice(0, 80)}"`).join(' · ') || '(none)'}\n- **H2 (${h2.length}):** ${h2.slice(0, 5).map((s) => `"${s.slice(0, 60)}"`).join(' · ') || '(none)'}\n- **H3 (${h3.length}):** ${h3.slice(0, 5).map((s) => `"${s.slice(0, 60)}"`).join(' · ') || '(none)'}`);
        sections.push(`## Counts\n\n| What | Count |\n|---|---|\n| \`<section>\` | ${sectionCount} |\n| \`<img>\` / \`<picture>\` | ${imageCount} |\n| \`<a>\` | ${linkCount} |\n| \`<form>\` | ${formCount} |`);
        sections.push(`## Color palette (top by frequency)\n\n${palette.length ? palette.map((c) => `- \`${c.value}\` ×${c.count}`).join('\n') : '_No colors found in inline / `<style>` CSS — page likely uses external stylesheets. Consider passing the rendered HTML from Playwright MCP, or fetch the linked CSS files separately._'}`);
        sections.push(`## Fonts\n\n- **font-family declarations:** ${fonts.length ? fonts.map((f) => `\`${f.value}\` (×${f.count})`).join(', ') : '(none in inline CSS)'}\n- **Linked stylesheets:** ${stylesheets.length} (${googleFonts.length} from Google Fonts)`);
        sections.push(`## Component candidates (regex heuristic)\n\n${components.length ? components.map((c) => `- **${c.type}** — ${c.count} match(es) [${c.signal}]`).join('\n') : '_No common component patterns detected._'}`);
        sections.push(`## Repeating CSS classes (≥3 occurrences — likely repeating items)\n\n${repeatingClasses.length ? repeatingClasses.map((r) => `- \`.${r.className}\` ×${r.count}`).join('\n') : '_None._'}`);
        sections.push(`## Suggested next step\n\n1. Pick the component to build from the candidates above (e.g. the \`hero\` if it dominates the fold, or \`cards\` if there are 3+ sibling \`.card\` elements).\n2. If repeating classes show ≥3 sibling items, model it as a **container block** with item children.\n3. Use the palette + fonts as design tokens in the block CSS.\n4. Hand off to the platform-appropriate prompt:\n   - EDS / Universal Editor → \`new-block\` (or \`design-to-block\` if you also have a screenshot)\n   - EDS Storefront (Adobe Commerce) → \`storefront-from-design\`\n   - AEM as a Cloud Service → \`new-aem-component\`\n   - AEM 6.5 LTS / AMS → \`new-aem65-component\``);
        sections.push(`## Limits of this static crawl\n\n- JS-rendered content (SPAs, hydration) is NOT executed — counts and components reflect the initial HTML only.\n- External CSS files are NOT fetched (only \`<style>\` and inline \`style="…"\`).\n- For SPAs / dynamic sites, install **Microsoft Playwright MCP** (\`npx @microsoft/playwright-mcp\`) and use its \`browser_navigate\` + \`browser_snapshot\` (or \`browser_evaluate\` to grab \`document.documentElement.outerHTML\`), then re-call \`crawl_url\` with the rendered HTML in the \`html\` parameter.`);
        return { content: [{ type: 'text', text: sections.join('\n\n') }] };
    });
}
//# sourceMappingURL=crawl-url.js.map