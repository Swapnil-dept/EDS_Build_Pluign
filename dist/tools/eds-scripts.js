import { z } from 'zod';
export function registerEdsScripts(server) {
    server.tool('eds_scripts_guide', `Guide for customizing EDS global scripts: scripts.js (loading lifecycle, auto-blocking, metadata), delayed.js (analytics, third-party scripts), and aem.js usage patterns. Returns templates and examples for common customization needs like adding analytics, custom fonts, auto-blocking, header/footer loading, and metadata processing.`, {
        topic: z
            .enum([
            'scripts-js-overview',
            'load-eager',
            'load-lazy',
            'load-delayed',
            'auto-blocking',
            'metadata',
            'header-footer',
            'custom-fonts',
            'analytics',
            'third-party',
            'decorateMain',
            'all',
        ])
            .describe('Which scripts topic to get guidance on'),
    }, {
        title: 'EDS Scripts Guide',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ topic }) => {
        const sections = [];
        const shouldInclude = (t) => topic === 'all' || topic === t;
        if (shouldInclude('scripts-js-overview')) {
            sections.push(`## scripts.js Overview

The three exported functions control EDS's loading lifecycle:

\`\`\`javascript
// scripts/scripts.js
import { loadHeader, loadFooter, decorateBlocks,
         loadBlocks, loadCSS, sampleRUM } from './aem.js';

// Phase 1: Before LCP — keep fast!
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateMain(doc.querySelector('main'));
  await loadSection(doc.querySelector('main .section'), waitForFirstImage);
}

// Phase 2: After first section — load remaining content
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);
  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));
  loadCSS('/styles/lazy-styles.css');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
}

// Phase 3: 3+ seconds after LCP — analytics & third-party
function loadDelayed() {
  import('./delayed.js');
}
\`\`\``);
        }
        if (shouldInclude('load-eager')) {
            sections.push(`## loadEager — Pre-LCP Phase

This runs BEFORE the page is visually complete. Keep it minimal.

\`\`\`javascript
async function loadEager(doc) {
  // 1. Set language (affects font rendering)
  document.documentElement.lang = 'en';

  // 2. Decorate main (sections, blocks, buttons, icons)
  decorateMain(doc.querySelector('main'));

  // 3. Load ONLY the first section's blocks
  //    waitForFirstImage ensures LCP image starts loading
  await loadSection(doc.querySelector('main .section'), waitForFirstImage);
}
\`\`\`

**Rules:**
- No fetch() or async operations beyond loadSection
- No DOM measurements (getBoundingClientRect, offsetHeight)
- No dynamic imports
- Total JS execution time < 50ms`);
        }
        if (shouldInclude('load-lazy')) {
            sections.push(`## loadLazy — Post-First-Section

Runs after the first section renders. Load everything else here.

\`\`\`javascript
async function loadLazy(doc) {
  const main = doc.querySelector('main');

  // Load all remaining sections (blocks within them load automatically)
  await loadSections(main);

  // Load header and footer fragments
  const { loadHeader, loadFooter } = await import('./aem.js');
  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  // Load non-critical CSS
  loadCSS(\`\${window.hlx.codeBasePath}/styles/lazy-styles.css\`);

  // Start RUM observation
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));

  // Good place to add:
  // - Custom font loading
  // - Service worker registration
  // - Non-critical feature initialization
}
\`\`\``);
        }
        if (shouldInclude('load-delayed') || shouldInclude('analytics') || shouldInclude('third-party')) {
            sections.push(`## loadDelayed / delayed.js — Third-Party Scripts

Runs 3+ seconds after LCP. All analytics and third-party code goes here.

\`\`\`javascript
// scripts/delayed.js

// Google Analytics 4
function loadGoogleAnalytics() {
  const script = document.createElement('script');
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
  script.async = true;
  document.head.append(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args) { window.dataLayer.push(args); }
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
}

// Adobe Analytics / Launch
function loadAdobeAnalytics() {
  const script = document.createElement('script');
  script.src = 'https://assets.adobedtm.com/xxxxxxxx/launch-xxxxxxxx.min.js';
  script.async = true;
  document.head.append(script);
}

// Chat widget, social embeds, etc.
function loadChatWidget() {
  // Load only on specific pages
  if (document.querySelector('.contact-page')) {
    import('https://cdn.example.com/chat-widget.js');
  }
}

// Execute
loadGoogleAnalytics();
// loadAdobeAnalytics();
// loadChatWidget();
\`\`\`

**Rule:** NEVER put analytics in scripts.js or block JS — it will tank your Lighthouse score.`);
        }
        if (shouldInclude('auto-blocking')) {
            sections.push(`## Auto-Blocking

Auto-blocking converts specific content patterns into blocks automatically,
without authors needing to use table syntax.

\`\`\`javascript
// In decorateMain() or a helper function called from it:
function buildAutoBlocks(main) {
  // Auto-block: standalone YouTube links become embed blocks
  main.querySelectorAll('a[href*="youtube.com/watch"]').forEach((link) => {
    if (link.parentElement.tagName === 'P' && link.parentElement.children.length === 1) {
      const section = link.closest('.section');
      const block = buildBlock('embed', [[link.cloneNode(true)]]);
      section.append(block);
      link.parentElement.remove();
    }
  });

  // Auto-block: hero pattern (first section with h1 + picture)
  const firstSection = main.querySelector('.section');
  if (firstSection) {
    const h1 = firstSection.querySelector('h1');
    const picture = firstSection.querySelector('picture');
    if (h1 && picture && !firstSection.querySelector('.hero')) {
      const block = buildBlock('hero', [[picture, h1]]);
      firstSection.prepend(block);
    }
  }
}
\`\`\`

Add \`buildAutoBlocks(main)\` call inside \`decorateMain()\` before \`decorateSections()\`.`);
        }
        if (shouldInclude('metadata')) {
            sections.push(`## Metadata Processing

EDS reads the "Metadata" section table at the bottom of each page:

\`\`\`javascript
// Reading metadata (aem.js provides getMetadata helper)
import { getMetadata } from './aem.js';

// In your block or scripts.js:
const title = getMetadata('title');       // <meta name="title">
const description = getMetadata('description');
const image = getMetadata('image');       // OG image path
const template = getMetadata('template'); // Page template

// Use template metadata for page-level behavior:
async function loadEager(doc) {
  const template = getMetadata('template');
  if (template) {
    // Load template-specific CSS/JS
    await loadCSS(\`/templates/\${template}/\${template}.css\`);
    const mod = await import(\`/templates/\${template}/\${template}.js\`);
    if (mod.default) await mod.default(doc);
  }
  // ... rest of loadEager
}
\`\`\`

**Authoring format** (bottom of Google Doc / Word page):

| Metadata |         |
| --- | --- |
| Title | My Page Title |
| Description | SEO description |
| Image | /media/og-image.jpg |
| Template | blog |`);
        }
        if (shouldInclude('header-footer')) {
            sections.push(`## Header & Footer Fragments

Header and footer are loaded as HTML fragments from /nav and /footer paths.

\`\`\`javascript
// Loaded automatically by loadHeader/loadFooter in loadLazy()
// To customize, create blocks/header/header.js and blocks/footer/footer.js

// blocks/header/header.js
export default async function decorate(block) {
  // Fragment content is already loaded into block
  const nav = document.createElement('nav');
  nav.id = 'nav';

  // First section = brand/logo
  // Second section = nav links
  // Third section = tools (search, login, etc.)
  const sections = [...block.children];

  // Brand
  const brand = sections[0];
  brand.className = 'nav-brand';
  nav.append(brand);

  // Links
  if (sections[1]) {
    const links = sections[1];
    links.className = 'nav-links';
    // Convert to accessible navigation
    nav.append(links);
  }

  // Mobile hamburger
  const hamburger = document.createElement('button');
  hamburger.className = 'nav-hamburger';
  hamburger.setAttribute('aria-label', 'Toggle navigation');
  hamburger.innerHTML = '<span></span>';
  hamburger.addEventListener('click', () => {
    nav.classList.toggle('nav-open');
  });
  nav.prepend(hamburger);

  block.textContent = '';
  block.append(nav);
}
\`\`\``);
        }
        if (shouldInclude('custom-fonts')) {
            sections.push(`## Custom Fonts

Load fonts in loadLazy() to avoid blocking LCP:

\`\`\`javascript
// Option 1: CSS @font-face in styles/lazy-styles.css
@font-face {
  font-family: 'Custom Font';
  src: url('/fonts/custom-font.woff2') format('woff2');
  font-display: swap;          /* critical: prevents FOIT */
  unicode-range: U+0000-00FF;  /* optional: subset */
}

// Option 2: Google Fonts (in loadLazy)
async function loadLazy(doc) {
  // ...existing code...

  // Preconnect + load Google Fonts
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://fonts.googleapis.com';
  document.head.append(preconnect);

  const fontCSS = document.createElement('link');
  fontCSS.rel = 'stylesheet';
  fontCSS.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap';
  document.head.append(fontCSS);
}
\`\`\`

**Rules:**
- Always use \`font-display: swap\` (prevents invisible text)
- Prefer .woff2 format (best compression)
- Host fonts locally when possible (avoids external connection)
- Define fallback font stack: \`font-family: 'Custom', system-ui, sans-serif\``);
        }
        if (shouldInclude('decorateMain')) {
            sections.push(`## decorateMain — Central DOM Decoration

The heart of page setup. Runs on the <main> element before blocks load.

\`\`\`javascript
function decorateMain(main) {
  if (!main) return;

  // 1. Decorate buttons — wraps standalone <a> in button classes
  decorateButtons(main);

  // 2. Decorate icons — converts :icon-name: to SVG sprite references
  decorateIcons(main);

  // 3. Auto-blocking — converts content patterns into blocks
  buildAutoBlocks(main);

  // 4. Decorate sections — adds section metadata as classes
  decorateSections(main);

  // 5. Decorate blocks — marks blocks for lazy loading
  decorateBlocks(main);
}
\`\`\`

All these helper functions come from aem.js. Override decorateMain to add
custom decoration steps (e.g. auto-blocking, custom button patterns).`);
        }
        return {
            content: [{ type: 'text', text: sections.join('\n\n---\n\n') }],
        };
    });
}
//# sourceMappingURL=eds-scripts.js.map