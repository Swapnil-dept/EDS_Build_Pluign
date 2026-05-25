/**
 * Block Template Generators
 *
 * Pure functions that generate EDS-compliant block files.
 * No LLM calls — deterministic scaffolding.
 *
 * Patterns derived from production EDS repos:
 *  - aemsites/vitamix    (hero, cards, carousel)
 *  - aemsites/ingredion  (accordion, columns)
 *  - Netcentric/vg-volvotrucks-us-rd  (BEM naming, v2 blocks)
 */
// ─── Pattern-based JS generators ───────────────────────────────
function generateHeroJS(blockName, opts) {
    const { naming, variant } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    const mod = (part) => naming === 'bem' ? `${blockName}--${part}` : part;
    const variantBlock = variant
        ? `
  // Variant: ${variant}
  if (block.classList.contains('${mod(variant)}')) {
    // Apply ${variant}-specific adjustments
  }
` : '';
    return `import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Detects whether a cell contains only media (picture / video link) with no text.
 * @param {HTMLElement} cell
 * @returns {boolean}
 */
function isMediaCell(cell) {
  if (!cell.querySelector('picture') && !cell.querySelector('a[href*=".mp4"]')) return false;
  return [...cell.children].every((child) => {
    if (child.tagName === 'PICTURE') return true;
    if (child.tagName !== 'P') return false;
    return child.querySelector('picture') !== null || child.querySelector('a[href*=".mp4"]') !== null;
  });
}

/**
 * Detects split (two-column) vs full-width layout, adds .split class and
 * labels img-wrapper / text-wrapper children accordingly.
 * @param {HTMLElement} block
 */
function detectLayout(block) {
  const row = block.firstElementChild;
  if (!row) return;
  const cells = [...row.children];
  if (cells.length >= 2) {
    block.classList.add('split');
    cells.forEach((cell) => {
      if (isMediaCell(cell)) {
        cell.className = '${cls('img-wrapper')}';
        const bgPicture = cell.querySelector('picture');
        if (bgPicture) bgPicture.dataset.bg = '';
      } else {
        cell.className = '${cls('text-wrapper')}';
      }
    });
    const imgIndex = cells.findIndex((c) => c.classList.contains('${cls('img-wrapper')}'));
    block.classList.add(imgIndex === 0 ? 'left-text' : 'right-text');
  } else {
    const cell = row.firstElementChild;
    if (!cell) return;
    const [picture] = [...cell.querySelectorAll('picture')];
    if (picture) picture.dataset.bg = '';
  }
}

/**
 * ${toTitleCase(blockName)} block — full-width or split hero with background media.
 *
 * Authoring table (single row):
 * | ${toTitleCase(blockName)}             |
 * | [bg image / video link] | Eyebrow / h1 / CTA |
 *
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  detectLayout(block);

  // Optimise the background picture
  const bgPicture = block.querySelector('picture[data-bg]');
  if (bgPicture) {
    const bgImg = bgPicture.querySelector('img');
    const optimized = createOptimizedPicture(bgImg.src, bgImg.alt, false, [{ width: '2000' }]);
    optimized.dataset.bg = '';
    bgPicture.replaceWith(optimized);
  }

  // No h1 → treat as sub-hero
  if (!block.querySelector('h1')) {
    block.classList.add('sub');
    const wrapper = block.closest('.${blockName}-wrapper');
    if (wrapper) wrapper.classList.add('sub');
  }

  // Detect colour variant from block classes and apply tint
  const colorOverride = [...block.classList].find(
    (c) => getComputedStyle(document.documentElement).getPropertyValue(\`--color-\${c}\`).trim(),
  );
  if (colorOverride) {
    block.style.setProperty('--image-color', \`var(--color-\${colorOverride})\`);
    block.classList.add('image-tint');
  }
${variantBlock}}
`;
}
function generateCardsJS(blockName, opts) {
    const { naming, variant } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    const variantBlock = variant
        ? `
  // Variant: ${variant}
  if (variants.includes('${variant}')) {
    // Apply ${variant}-specific logic
  }
` : '';
    return `import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Returns the largest even factor of n (2–4), used to set cards-per-row.
 * @param {number} n
 * @returns {number}
 */
function getLargestFactor(n) {
  const factor = [4, 3, 2].find((f) => n % f === 0);
  if (factor) return factor;
  return n > 4 ? (n % 2 === 0 ? 4 : 3) : 1;
}

/**
 * Makes every card in the list clickable if it contains exactly one unique link.
 * @param {HTMLElement} ul
 */
function enableClick(ul) {
  ul.querySelectorAll('li').forEach((card) => {
    const links = card.querySelectorAll('a[href]');
    if (!links.length) return;
    const sameLink = links.length === 1 || [...links].every((a) => a.href === links[0].href);
    if (sameLink) {
      card.classList.add('card-click');
      card.addEventListener('click', (e) => {
        if (e.target.closest('a[href]')) return;
        links[0].click();
      });
    }
  });
}

/**
 * ${toTitleCase(blockName)} block — transforms authored table rows into a \`<ul>\` card grid.
 *
 * Authoring table:
 * | ${toTitleCase(blockName)} |              |
 * | [image]   | ## Title\\n\\nBody text\\n[CTA] |
 *
 * Variants (add to block header): articles, grid, knockout, linked
 *
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const variants = [...block.classList].filter((c) => c !== 'block' && c !== '${blockName}');

  const ul = document.createElement('ul');

  // Set cards-per-row from a \`rows-N\` class or auto-detect from item count
  const definedRows = [...block.classList].find((c) => c.startsWith('rows-'));
  if (!definedRows) {
    ul.classList.add(\`rows-\${getLargestFactor(block.children.length)}\`);
  } else {
    ul.classList.add(definedRows);
    block.classList.remove(definedRows);
  }

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);

    // Optimize images
    li.querySelectorAll('picture > img').forEach((img) =>
      img.closest('picture').replaceWith(
        createOptimizedPicture(img.src, img.alt, false, [{ width: '900' }]),
      ),
    );

    // Classify cells: image-only → card-image, otherwise → card-body
    [...li.children].forEach((child) => {
      const hasOnlyPicture = child.children.length === 1 && child.querySelector('picture');
      child.className = hasOnlyPicture ? '${cls('card-image')}' : '${cls('card-body')}';
    });

    ul.append(li);
  });

  if (variants.some((v) => ['linked', 'articles', 'knockout'].includes(v))) {
    enableClick(ul);
  }
${variantBlock}
  block.replaceChildren(ul);
}
`;
}
function generateAccordionJS(blockName, opts) {
    const { naming } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    return `/**
 * ${toTitleCase(blockName)} block — transforms table rows into \`<details>\`/\`<summary>\` accordion items.
 *
 * Authoring table:
 * | ${toTitleCase(blockName)} |
 * | Question / label |
 * | Answer / body    |
 * (repeat rows for each item — two cells per row: label + body)
 *
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [labelCell, bodyCell] = [...row.children];

    // Build <summary> from first cell
    const summary = document.createElement('summary');
    summary.className = '${cls('label')}';
    summary.append(...labelCell.childNodes);

    // Build body from second cell
    const body = bodyCell || document.createElement('div');
    body.className = '${cls('body')}';

    // Wrap in <details>
    const details = document.createElement('details');
    details.className = '${cls('item')}';
    details.append(summary, body);

    row.replaceWith(details);
  });

  // Close other items when one opens (single-open mode)
  block.addEventListener('toggle', (e) => {
    if (!e.target.open) return;
    block.querySelectorAll('details[open]').forEach((d) => {
      if (d !== e.target) d.removeAttribute('open');
    });
  }, { capture: true });
}
`;
}
function generateCarouselJS(blockName, opts) {
    const { naming, variant } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    const mod = (part) => naming === 'bem' ? `${blockName}--${part}` : part;
    const variantBlock = variant
        ? `
  if (block.classList.contains('${mod(variant)}')) {
    // Apply ${variant}-specific logic (e.g. different slide sizes)
  }
` : '';
    return `import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Advances the carousel to the next slide.
 * @param {HTMLElement} track  — the \`<ul>\` containing \`<li>\` slides
 */
function nextSlide(track) {
  const slides = [...track.children];
  const current = slides.findIndex((s) => s.hasAttribute('data-active'));
  const next = slides[(current + 1) % slides.length];
  slides.forEach((s) => s.removeAttribute('data-active'));
  next.setAttribute('data-active', '');
  track.scrollTo({ left: next.offsetLeft, behavior: 'smooth' });
}

/**
 * Builds prev/next arrow buttons and dot navigation.
 * @param {HTMLElement} block
 * @param {HTMLElement} track
 */
function buildNav(block, track) {
  const slides = [...track.children];
  if (slides.length <= 1) return;

  // Dot indicators
  const dots = document.createElement('div');
  dots.className = '${cls('dots')}';
  dots.setAttribute('role', 'radiogroup');
  slides.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = '${cls('dot')}';
    btn.setAttribute('aria-label', \`Slide \${i + 1}\`);
    btn.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
    btn.addEventListener('click', () => {
      slides.forEach((s) => s.removeAttribute('data-active'));
      slides[i].setAttribute('data-active', '');
      track.scrollTo({ left: slides[i].offsetLeft, behavior: 'smooth' });
      dots.querySelectorAll('button').forEach((d, j) =>
        d.setAttribute('aria-checked', j === i ? 'true' : 'false'),
      );
    });
    dots.append(btn);
  });

  // Prev / Next arrows
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = '${cls('nav')} ${cls('nav')}--prev';
  prev.setAttribute('aria-label', 'Previous slide');
  prev.innerHTML = '&#8249;';
  prev.addEventListener('click', () => {
    const idx = [...track.children].findIndex((s) => s.hasAttribute('data-active'));
    const newIdx = (idx - 1 + slides.length) % slides.length;
    slides.forEach((s) => s.removeAttribute('data-active'));
    slides[newIdx].setAttribute('data-active', '');
    track.scrollTo({ left: slides[newIdx].offsetLeft, behavior: 'smooth' });
    dots.querySelectorAll('button').forEach((d, j) =>
      d.setAttribute('aria-checked', j === newIdx ? 'true' : 'false'),
    );
  });

  const next = document.createElement('button');
  next.type = 'button';
  next.className = '${cls('nav')} ${cls('nav')}--next';
  next.setAttribute('aria-label', 'Next slide');
  next.innerHTML = '&#8250;';
  next.addEventListener('click', () => nextSlide(track));

  block.append(prev, next, dots);
}

/**
 * ${toTitleCase(blockName)} block — horizontal scrolling carousel with nav dots and arrows.
 *
 * Authoring table (each row = one slide):
 * | ${toTitleCase(blockName)}              |             |
 * | [slide image]      | ## Title\\n\\nBody\\n[CTA] |
 *
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const variants = [...block.classList].filter((c) => c !== 'block' && c !== '${blockName}');
  const track = document.createElement('ul');
  track.className = '${cls('track')}';

  [...block.children].forEach((row, i) => {
    const slide = document.createElement('li');
    slide.className = '${cls('slide')}';
    if (i === 0) slide.setAttribute('data-active', '');

    [...row.children].forEach((cell) => {
      const pic = cell.querySelector('picture');
      if (pic && cell.textContent.trim() === '') {
        cell.className = '${cls('media')}';
        // Optimise slide image
        const img = pic.querySelector('img');
        if (img) {
          pic.replaceWith(createOptimizedPicture(img.src, img.alt, i === 0, [
            { media: '(min-width: 900px)', width: '1200' },
            { width: '600' },
          ]));
        }
      } else {
        cell.className = '${cls('body')}';
      }
      slide.append(cell);
    });

    track.append(slide);
  });

  block.replaceChildren(track);
  buildNav(block, track);
${variantBlock}
  // Auto-rotate (pause on hover)
  let autoTimer = setInterval(() => nextSlide(track), 6000);
  block.addEventListener('mouseenter', () => clearInterval(autoTimer));
  block.addEventListener('mouseleave', () => {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => nextSlide(track), 6000);
  });
}
`;
}
function generateColumnsJS(blockName, opts) {
    const { naming, variant } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    const variantBlock = variant
        ? `
  // Variant: ${variant}
  if (variants.includes('${variant}')) {
    block.classList.add('${variant}');
  }
` : '';
    return `import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * ${toTitleCase(blockName)} block — side-by-side column layout, responsive stacking on mobile.
 *
 * Authoring table (each row = one set of columns):
 * | ${toTitleCase(blockName)} |             |
 * | [image]   | ## Title\\n\\nBody\\n[CTA] |
 *
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const variants = [...block.classList].filter((c) => c !== 'block' && c !== '${blockName}');

  [...block.children].forEach((row) => {
    row.className = '${cls('row')}';
    [...row.children].forEach((cell) => {
      const pic = cell.querySelector('picture');
      if (pic) {
        cell.className = '${cls('media')}';
        const img = pic.querySelector('img');
        if (img) {
          pic.replaceWith(
            createOptimizedPicture(img.src, img.alt, false, [
              { media: '(min-width: 900px)', width: '900' },
              { width: '600' },
            ]),
          );
        }
      } else {
        cell.className = '${cls('text')}';
        // Promote single-link paragraphs to CTA buttons
        cell.querySelectorAll('p > a').forEach((a) => {
          if (a.parentElement.children.length === 1) {
            a.classList.add('button');
            a.parentElement.classList.add('button-container');
          }
        });
      }
    });
  });
${variantBlock}}
`;
}
function generateTabsJS(blockName, opts) {
    const { naming, variant } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    const variantBlock = variant
        ? `
  if (block.classList.contains('${variant}')) {
    // ${variant} tab styling
  }
` : '';
    return `/**
 * ${toTitleCase(blockName)} block — tab navigation with panel switching.
 *
 * Authoring table (each row = one tab):
 * | ${toTitleCase(blockName)} |             |
 * | Tab label  | Panel content (richtext) |
 *
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const tabList = document.createElement('div');
  tabList.className = '${cls('list')}';
  tabList.setAttribute('role', 'tablist');

  const panels = document.createElement('div');
  panels.className = '${cls('panels')}';

  [...block.children].forEach((row, i) => {
    const [labelCell, bodyCell] = [...row.children];

    // Tab button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = '${cls('tab')}';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    btn.setAttribute('aria-controls', \`${blockName}-panel-\${i}\`);
    btn.id = \`${blockName}-tab-\${i}\`;
    btn.append(...labelCell.childNodes);
    tabList.append(btn);

    // Tab panel
    const panel = bodyCell || document.createElement('div');
    panel.className = '${cls('panel')}';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', \`${blockName}-tab-\${i}\`);
    panel.id = \`${blockName}-panel-\${i}\`;
    if (i !== 0) panel.hidden = true;
    panels.append(panel);
  });

  // Click handler — activate selected tab / panel
  tabList.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (!tab) return;
    tabList.querySelectorAll('[role="tab"]').forEach((t) => t.setAttribute('aria-selected', 'false'));
    panels.querySelectorAll('[role="tabpanel"]').forEach((p) => { p.hidden = true; });
    tab.setAttribute('aria-selected', 'true');
    const panelId = tab.getAttribute('aria-controls');
    panels.querySelector(\`#\${panelId}\`).hidden = false;
  });
${variantBlock}
  block.replaceChildren(tabList, panels);
}
`;
}
function generateCustomJS(blockName, opts) {
    const { variant, interactive, hasMedia, naming, description } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    const desc = description || `${toTitleCase(blockName)} block`;
    return `/**
 * ${desc}
 * @param {HTMLElement} block - The block element
 */
export default function decorate(block) {
  // Detect variants from block classes
  const variants = [...block.classList].filter((c) => c !== 'block' && c !== '${blockName}');

  [...block.children].forEach((row) => {
    const cells = [...row.children];
${hasMedia ? `
    // Cell 0: media (picture / video)
    const mediaCell = cells[0];
    if (mediaCell) {
      mediaCell.className = '${cls('media')}';
      const picture = mediaCell.querySelector('picture');
      if (picture) picture.closest('p')?.replaceWith(picture);
    }

    // Cell 1: text content
    const textCell = cells[1];
    if (textCell) {
      textCell.className = '${cls('content')}';
      textCell.querySelectorAll('p > a').forEach((a) => {
        if (a.parentElement.children.length === 1) {
          a.classList.add('button');
          a.parentElement.classList.add('button-container');
        }
      });
    }
` : `    cells.forEach((cell) => {
      // Promote single-link paragraphs to CTA buttons
      cell.querySelectorAll('p > a').forEach((a) => {
        if (a.parentElement.children.length === 1) {
          a.classList.add('button');
          a.parentElement.classList.add('button-container');
        }
      });
    });
`}  });
${interactive ? `
  // Interactive behaviour
  block.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-action]');
    if (!trigger) return;
    // Handle interaction based on trigger.dataset.action
  });
` : ''}${variant ? `
  if (variants.includes('${variant}')) {
    // Apply ${variant}-specific logic
  }
` : ''}}
`;
}
// ─── Block JS Template (public entry) ──────────────────────────
export function generateBlockJS(blockName, options) {
    const naming = options?.naming ?? 'flat';
    const variant = options?.variant;
    switch (options?.pattern) {
        case 'hero': return generateHeroJS(blockName, { naming, variant });
        case 'cards': return generateCardsJS(blockName, { naming, variant });
        case 'accordion': return generateAccordionJS(blockName, { naming });
        case 'carousel': return generateCarouselJS(blockName, { naming, variant });
        case 'columns': return generateColumnsJS(blockName, { naming, variant });
        case 'tabs': return generateTabsJS(blockName, { naming, variant });
        default: return generateCustomJS(blockName, {
            variant,
            interactive: options?.interactive,
            hasMedia: options?.hasMedia || false,
            naming,
            description: options?.description,
        });
    }
}
// ─── Pattern-based CSS generators ──────────────────────────────
function generateHeroCSS(blockName, opts) {
    const { variant, naming } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    const mod = (part) => naming === 'bem' ? `${blockName}--${part}` : part;
    return `/* =================================================================
   Block: ${blockName}
   Full-width hero with background image/video overlay.
   Mobile-first breakpoints: 600px / 900px / 1200px
   ================================================================= */

.${blockName}-wrapper {
  margin: 0;
  padding: 0;
}

.${blockName},
.${blockName} > div {
  align-items: center;
  display: flex;
  position: relative;
  min-height: 500px;
  width: 100%;
}

.${blockName} {
  overflow: hidden;
  text-align: center;
  z-index: 1;
}

/* Background media */
.${blockName} picture[data-bg] img,
.${blockName} video {
  position: absolute;
  inset: 0;
  z-index: -1;
  height: 100%;
  width: 100%;
  object-fit: cover;
}

/* Colour tint overlay */
.${blockName}::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background-color: var(--image-color, transparent);
  pointer-events: none;
  opacity: 0.65;
}

/* Text region */
.${blockName} > div > div {
  margin: 0 auto;
  max-width: 600px;
  width: 100%;
  padding: clamp(2rem, 6vw, 4rem) var(--horizontal-spacing, 1.5rem);
  color: var(--color-gray-100, #f5f5f5);
}

.${blockName} h1 {
  font-family: var(--heading-font-family, 'helvetica neue', helvetica, sans-serif);
  font-size: clamp(2rem, 6vw, 4rem);
  font-weight: 700;
  line-height: 1.1;
  margin: 0 0 1rem;
}

.${blockName} p {
  font-size: clamp(1rem, 2vw, 1.25rem);
  margin: 0.5rem 0;
}

/* CTA button */
.${blockName} .button-container {
  margin-top: clamp(1rem, 3vw, 2rem);
  display: flex;
  justify-content: center;
}

.${blockName} .button {
  display: inline-block;
  padding: 0.85rem 2rem;
  background: var(--link-color, #035fe6);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  text-decoration: none;
  border-radius: var(--border-radius, 4px);
  transition: background-color 0.2s, transform 0.1s;
}

.${blockName} .button:hover {
  background: var(--link-hover-color, #024bb5);
  transform: translateY(-2px);
}

/* ── Split variant ───────────────────────────────────────────── */
.${blockName}.split,
.${blockName}.split > div {
  min-height: unset;
}

.${blockName}.split::after { content: none; }

.${blockName}.split .${cls('img-wrapper')} {
  position: relative;
  min-height: 260px;
  width: 100%;
  overflow: hidden;
}

.${blockName}.split .${cls('img-wrapper')} img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.${blockName}.split .${cls('text-wrapper')} {
  padding: clamp(2rem, 5vw, 3rem) var(--horizontal-spacing, 1.5rem);
  text-align: left;
}

.${blockName}.split .${cls('text-wrapper')} .button-container { justify-content: flex-start; }
${variant ? `
/* Variant: ${variant} */
.${blockName}.${mod(variant)} {
  /* variant-specific overrides */
}
` : ''}
/* Sub-hero (no h1) */
.${blockName}.sub,
.${blockName}.sub > div {
  min-height: 360px;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (width >= 900px) {
  .${blockName}.split,
  .${blockName}.split > div {
    min-height: 500px;
  }

  .${blockName}.split > div {
    flex-direction: row;
    align-items: center;
  }

  .${blockName}.split .${cls('img-wrapper')} {
    position: absolute;
    inset: 0;
    min-height: unset;
    width: unset;
  }

  .${blockName}.split .${cls('text-wrapper')} {
    max-width: 50%;
    position: relative;
    z-index: 2;
  }

  .${blockName} > div > div {
    max-width: 800px;
  }
}

@media (width >= 1200px) {
  .${blockName} > div > div {
    max-width: 1000px;
  }
}
`;
}
function generateCardsCSS(blockName, opts) {
    const { variant, naming } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    return `/* =================================================================
   Block: ${blockName}
   Responsive card grid — mobile stack → 2-col → N-col.
   ================================================================= */

.${blockName} ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(1rem, 3vw, 1.5rem);
}

/* rows-N classes emitted by decorate() control column count */
@media (width >= 600px) {
  .${blockName} ul.rows-2,
  .${blockName} ul.rows-4 { grid-template-columns: repeat(2, 1fr); }

  .${blockName} ul.rows-3 { grid-template-columns: repeat(3, 1fr); }
}

@media (width >= 900px) {
  .${blockName} ul.rows-4 { grid-template-columns: repeat(4, 1fr); }
}

/* Card item */
.${blockName} li {
  display: flex;
  flex-direction: column;
  border-radius: var(--border-radius, 8px);
  overflow: hidden;
  box-shadow: 0 2px 12px rgb(0 0 0 / 8%);
  background: var(--background-color, #fff);
  transition: box-shadow 0.2s;
}

.${blockName} li:hover {
  box-shadow: 0 4px 24px rgb(0 0 0 / 14%);
}

/* Card image */
.${blockName} .${cls('card-image')} {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.${blockName} .${cls('card-image')} picture {
  display: block;
  height: 100%;
}

.${blockName} .${cls('card-image')} img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.${blockName} li:hover .${cls('card-image')} img {
  transform: scale(1.04);
}

/* Card body */
.${blockName} .${cls('card-body')} {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: clamp(1rem, 3vw, 1.5rem);
  flex: 1;
}

.${blockName} .${cls('card-body')} h2,
.${blockName} .${cls('card-body')} h3 {
  font-family: var(--heading-font-family, 'helvetica neue', helvetica, sans-serif);
  font-size: clamp(1.1rem, 2.5vw, 1.35rem);
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
}

.${blockName} .${cls('card-body')} p {
  margin: 0;
  font-size: clamp(0.9rem, 1.5vw, 1rem);
  color: var(--text-color-secondary, #555);
  line-height: 1.5;
  flex: 1;
}

/* CTA */
.${blockName} .button-container { margin: auto 0 0; }

.${blockName} .button {
  display: inline-block;
  padding: 0.6rem 1.25rem;
  background: var(--link-color, #035fe6);
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  border-radius: var(--border-radius, 4px);
  transition: background-color 0.2s;
}

.${blockName} .button:hover { background: var(--link-hover-color, #024bb5); }

/* Clickable card (single link) */
.${blockName} li.card-click { cursor: pointer; }
${variant ? `
/* Variant: ${variant} */
.${blockName}.${variant} li {
  /* variant-specific card styles */
}
` : ''}`;
}
function generateAccordionCSS(blockName, opts) {
    const { naming } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    return `/* =================================================================
   Block: ${blockName}
   Native <details>/<summary> accordion, mobile-first.
   ================================================================= */

.${blockName} details {
  border-bottom: 1px solid var(--border-color, #e5e5e5);
}

.${blockName} details + details {
  margin-top: 0.25rem;
}

.${blockName} details summary {
  position: relative;
  padding: 1rem 3rem 1rem 0;
  cursor: pointer;
  list-style: none;
  font-weight: 600;
  font-size: clamp(0.95rem, 1.5vw, 1.1rem);
  line-height: 1.4;
  transition: color 0.2s;
  color: var(--text-color, #1a1a1a);
}

.${blockName} details summary::-webkit-details-marker { display: none; }

/* Animated +/× icon */
.${blockName} details summary::after {
  content: '';
  position: absolute;
  right: 0.75rem;
  top: 50%;
  width: 1rem;
  height: 1rem;
  transform: translateY(-50%);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-size: contain;
  transition: transform 0.25s ease;
}

.${blockName} details[open] > summary::after {
  transform: translateY(-50%) rotate(180deg);
}

.${blockName} details[open] > summary {
  color: var(--link-color, #035fe6);
}

/* Body */
.${blockName} .${cls('body')} {
  padding: 0.75rem 0 1.25rem;
  font-size: clamp(0.9rem, 1.5vw, 1rem);
  line-height: 1.6;
  color: var(--text-color-secondary, #444);
}

.${blockName} .${cls('body')} p { margin: 0 0 0.75rem; }
.${blockName} .${cls('body')} p:last-child { margin: 0; }

.${blockName} .${cls('body')} a {
  color: var(--link-color, #035fe6);
  text-decoration: underline;
}

@media (width >= 900px) {
  .${blockName} details summary {
    padding-top: 1.25rem;
    padding-bottom: 1.25rem;
  }
}
`;
}
function generateCarouselCSS(blockName, opts) {
    const { variant, naming } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    return `/* =================================================================
   Block: ${blockName}
   Horizontal scrolling carousel with nav dots and arrows.
   ================================================================= */

.${blockName} {
  position: relative;
  overflow: hidden;
}

/* Track */
.${cls('track')} {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  /* hide scrollbar */
  scrollbar-width: none;
}

.${cls('track')}::-webkit-scrollbar { display: none; }

/* Slides */
.${cls('slide')} {
  flex: 0 0 100%;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
}

.${cls('media')} {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.${cls('media')} picture { display: block; height: 100%; }

.${cls('media')} img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.${cls('body')} {
  padding: clamp(1rem, 3vw, 2rem);
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.${cls('body')} h2,
.${cls('body')} h3 {
  font-family: var(--heading-font-family, 'helvetica neue', helvetica, sans-serif);
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  font-weight: 700;
  margin: 0;
}

.${cls('body')} p { margin: 0; line-height: 1.5; }

/* CTA button */
.${blockName} .button {
  display: inline-block;
  padding: 0.7rem 1.5rem;
  background: var(--link-color, #035fe6);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  border-radius: var(--border-radius, 4px);
  transition: background 0.2s;
  align-self: flex-start;
}

.${blockName} .button:hover { background: var(--link-hover-color, #024bb5); }

/* Navigation arrows */
.${cls('nav')} {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgb(255 255 255 / 85%);
  border: none;
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
  transition: background 0.2s;
}

.${cls('nav')}:hover { background: #fff; }
.${cls('nav')}--prev { left: 0.75rem; }
.${cls('nav')}--next { right: 0.75rem; }

/* Dot indicators */
.${cls('dots')} {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 0;
}

.${cls('dot')} {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--border-color, #ccc);
  border: none;
  padding: 0;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.${cls('dot')}[aria-checked="true"] {
  background: var(--link-color, #035fe6);
  transform: scale(1.3);
}
${variant ? `
/* Variant: ${variant} */
.${blockName}.${variant} .${cls('slide')} {
  /* variant-specific slide styles */
}
` : ''}
@media (width >= 900px) {
  .${cls('slide')} {
    flex-direction: row;
  }

  .${cls('media')} {
    flex: 0 0 50%;
    aspect-ratio: unset;
  }

  .${cls('body')} {
    flex: 1;
    justify-content: center;
  }
}
`;
}
function generateColumnsCSS(blockName, opts) {
    const { variant, naming } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    return `/* =================================================================
   Block: ${blockName}
   Side-by-side columns, stacks on mobile.
   ================================================================= */

.${blockName} {
  display: flex;
  flex-direction: column;
  gap: clamp(2rem, 5vw, 4rem);
}

.${cls('row')} {
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 3vw, 2rem);
  align-items: flex-start;
}

/* Media cell */
.${cls('media')} {
  width: 100%;
  overflow: hidden;
  border-radius: var(--border-radius, 8px);
}

.${cls('media')} picture { display: block; }

.${cls('media')} img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

/* Text cell */
.${cls('text')} {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.${cls('text')} h2,
.${cls('text')} h3 {
  font-family: var(--heading-font-family, 'helvetica neue', helvetica, sans-serif);
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
}

.${cls('text')} p {
  font-size: clamp(0.95rem, 1.5vw, 1.1rem);
  line-height: 1.6;
  margin: 0;
  color: var(--text-color-secondary, #444);
}

/* CTA */
.${blockName} .button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: var(--link-color, #035fe6);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  border-radius: var(--border-radius, 4px);
  transition: background-color 0.2s;
}

.${blockName} .button:hover { background: var(--link-hover-color, #024bb5); }
${variant ? `
/* Variant: ${variant} */
.${blockName}.${variant} .${cls('row')} {
  /* variant-specific styles */
}
` : ''}
/* ── Responsive ──────────────────────────────────────────────── */
@media (width >= 600px) {
  .${cls('media')} img { aspect-ratio: 16 / 9; }
}

@media (width >= 900px) {
  .${cls('row')} {
    flex-direction: row;
    align-items: center;
    gap: clamp(2rem, 5vw, 4rem);
  }

  /* Alternate image left/right on even rows */
  .${cls('row')}:nth-child(even) { flex-direction: row-reverse; }

  .${cls('media')},
  .${cls('text')} {
    flex: 1;
  }
}

@media (width >= 1200px) {
  .${blockName} {
    gap: clamp(3rem, 6vw, 5rem);
  }
}
`;
}
function generateTabsCSS(blockName, opts) {
    const { variant, naming } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    return `/* =================================================================
   Block: ${blockName}
   Tab navigation with keyboard-accessible panel switching.
   ================================================================= */

.${cls('list')} {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  border-bottom: 2px solid var(--border-color, #e5e5e5);
  margin: 0 0 1.5rem;
}

.${cls('tab')} {
  padding: 0.75rem 1.25rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  font-size: clamp(0.9rem, 1.5vw, 1rem);
  font-weight: 600;
  cursor: pointer;
  color: var(--text-color-secondary, #555);
  transition: color 0.2s, border-color 0.2s;
  line-height: 1;
}

.${cls('tab')}:hover {
  color: var(--link-color, #035fe6);
}

.${cls('tab')}[aria-selected="true"] {
  color: var(--link-color, #035fe6);
  border-bottom-color: var(--link-color, #035fe6);
}

.${cls('tab')}:focus-visible {
  outline: 2px solid var(--link-color, #035fe6);
  outline-offset: 2px;
  border-radius: 2px;
}

/* Panels */
.${cls('panels')} {
  min-height: 200px;
}

.${cls('panel')} {
  animation: ${blockName}-fade 0.2s ease;
}

@keyframes ${blockName}-fade {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.${cls('panel')} > * { margin-top: 0; }
${variant ? `
/* Variant: ${variant} */
.${blockName}.${variant} .${cls('tab')} {
  /* variant-specific tab button styles */
}
` : ''}
@media (width >= 600px) {
  .${cls('tab')} {
    padding: 0.85rem 1.5rem;
    font-size: 1rem;
  }
}
`;
}
function generateCustomCSS(blockName, opts) {
    const { variant, hasMedia, layout = 'stack', naming } = opts;
    const cls = (part) => naming === 'bem' ? `${blockName}__${part}` : `${blockName}-${part}`;
    const layoutCSS = {
        grid: `  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));\n  gap: clamp(1rem, 3vw, 1.5rem);`,
        flex: `  display: flex;\n  flex-wrap: wrap;\n  gap: clamp(1rem, 3vw, 1.5rem);`,
        stack: `  display: flex;\n  flex-direction: column;\n  gap: clamp(1rem, 3vw, 1.5rem);`,
    };
    return `/* =================================================================
   Block: ${blockName}
   Mobile-first. Breakpoints: 600px / 900px / 1200px
   ================================================================= */

.${blockName} {
${layoutCSS[layout]}
  padding: clamp(2rem, 5vw, 4rem) 0;
}

.${blockName} > div {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
${hasMedia ? `
.${cls('media')} {
  overflow: hidden;
  border-radius: var(--border-radius, 8px);
}

.${cls('media')} picture { display: block; }

.${cls('media')} img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.${cls('content')} {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
` : ''}
.${blockName} h2,
.${blockName} h3 {
  font-family: var(--heading-font-family, 'helvetica neue', helvetica, sans-serif);
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
}

.${blockName} p {
  font-size: clamp(0.95rem, 1.5vw, 1.1rem);
  line-height: 1.6;
  margin: 0;
}

/* CTA button */
.${blockName} .button-container { margin: 0; }

.${blockName} .button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius, 4px);
  background: var(--link-color, #035fe6);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.2s;
}

.${blockName} .button:hover { background: var(--link-hover-color, #024bb5); }
${variant ? `
/* Variant: ${variant} */
.${blockName}.${variant} {
  /* variant-specific overrides */
}
` : ''}
/* ── Responsive ──────────────────────────────────────────────── */
@media (width >= 600px) {
  .${blockName} > div {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

@media (width >= 900px) {
  .${blockName} > div {
    align-items: center;
    gap: clamp(2rem, 5vw, 4rem);
  }
}

@media (width >= 1200px) {
  .${blockName} {
    padding: clamp(3rem, 6vw, 5rem) 0;
  }
}
`;
}
// ─── Block CSS Template (public entry) ──────────────────────────
export function generateBlockCSS(blockName, options) {
    const naming = options?.naming ?? 'flat';
    const variant = options?.variant;
    switch (options?.pattern) {
        case 'hero': return generateHeroCSS(blockName, { variant, naming });
        case 'cards': return generateCardsCSS(blockName, { variant, naming });
        case 'accordion': return generateAccordionCSS(blockName, { naming });
        case 'carousel': return generateCarouselCSS(blockName, { variant, naming });
        case 'columns': return generateColumnsCSS(blockName, { variant, naming });
        case 'tabs': return generateTabsCSS(blockName, { variant, naming });
        default: return generateCustomCSS(blockName, {
            variant,
            hasMedia: options?.hasMedia,
            layout: options?.layout,
            naming,
        });
    }
}
/** Pattern → default variant options emitted in the `classes` multiselect. */
const PATTERN_VARIANT_OPTIONS = {
    hero: [{ name: 'Split', value: 'split' }, { name: 'Dark', value: 'dark' }, { name: 'Sub', value: 'sub' }],
    cards: [{ name: 'Grid', value: 'grid' }, { name: 'Articles', value: 'articles' }, { name: 'Knockout', value: 'knockout' }],
    accordion: [{ name: 'Footer', value: 'footer' }],
    carousel: [{ name: 'Videos', value: 'videos' }, { name: 'Testimonial', value: 'testimonial' }],
    columns: [{ name: 'Reversed', value: 'reversed' }, { name: 'Dark', value: 'dark' }],
    tabs: [{ name: 'Underline', value: 'underline' }, { name: 'Pill', value: 'pill' }],
    custom: [{ name: 'Dark', value: 'dark' }, { name: 'Wide', value: 'wide' }],
};
/**
 * Builds the standard `classes` multiselect field every block should have.
 * Merges pattern defaults with any caller-supplied extra options.
 */
function buildClassesField(pattern = 'custom', extraVariants) {
    const options = [
        ...PATTERN_VARIANT_OPTIONS[pattern],
        ...(extraVariants ?? []),
    ];
    return {
        component: 'multiselect',
        name: 'classes',
        label: 'Variants',
        options,
    };
}
function fieldToModelEntry(f) {
    const entry = {
        component: normalizeType(f.type),
        // domPath fields always serialize as plain strings; skip redundant valueType
        ...(f.domPath ? {} : { valueType: getValueType(f.type) }),
        name: f.name,
        label: f.label,
    };
    if (f.required)
        entry.required = true;
    if (f.multi !== undefined)
        entry.multi = f.multi;
    if (f.defaultValue !== undefined)
        entry.value = f.defaultValue;
    return entry;
}
/**
 * Generate a single entry for component-models.json.
 *
 * Automatically prepends `image`+`imageAlt` for reference fields and
 * appends a `classes` multiselect (variants) unless the caller already
 * included one.  This mirrors real-world production repos (vitamix, ingredion).
 *
 * @param blockName  - Block id (kebab-case)
 * @param fields     - Caller-supplied fields (without `classes`)
 * @param options
 *   - pattern        - Block archetype; drives default variant options in `classes`
 *   - extraVariants  - Extra variant options merged into `classes`
 *   - omitClasses    - Set true to suppress the auto-appended `classes` field
 */
export function generateComponentModel(blockName, fields, options) {
    const hasClasses = fields.some((f) => f.name === 'classes');
    const allFields = fields.map(fieldToModelEntry);
    if (!hasClasses && !options?.omitClasses) {
        allFields.push(buildClassesField(options?.pattern, options?.extraVariants));
    }
    const model = { id: blockName, fields: allFields };
    return JSON.stringify(model, null, 2);
}
/**
 * Generate a single component entry for component-definition.json.
 *
 * Emits both `plugins.xwalk` (Universal Editor) and `plugins.da`
 * (Document Authoring) when row/column hints are provided.
 *
 * The canonical file shape is:
 *   { "groups": [ { "title": "Blocks", "id": "blocks", "components": [ ... ] } ] }
 */
export function generateComponentDefinition(blockName, titleOrOptions, group) {
    const opts = typeof titleOrOptions === 'string' || titleOrOptions === undefined
        ? { title: titleOrOptions, group }
        : titleOrOptions;
    const title = opts.title || toTitleCase(blockName);
    const resourceType = opts.isItem
        ? 'core/franklin/components/block/v1/block/item'
        : 'core/franklin/components/block/v1/block';
    const template = { name: title };
    const model = opts.model === undefined ? blockName : opts.model;
    if (model)
        template.model = model;
    if (opts.filter)
        template.filter = opts.filter;
    const plugins = {
        xwalk: { page: { resourceType, template } },
    };
    // DA editor hints (row/column count for initial table scaffold)
    if (opts.daRows !== undefined || opts.daColumns !== undefined) {
        plugins.da = {
            name: title.toLowerCase().replace(/\s+/g, '-'),
            ...(opts.daRows !== undefined ? { rows: opts.daRows } : {}),
            ...(opts.daColumns !== undefined ? { columns: opts.daColumns } : {}),
        };
    }
    const component = {
        title,
        id: blockName,
        plugins,
    };
    return JSON.stringify(component, null, 2);
}
// ─── Component Filter JSON ──────────────────────────────────────
/**
 * Generate an entry for component-filters.json.
 * The filter `id` equals the block id (UE convention) — NOT `<block>-filter`.
 */
export function generateComponentFilter(blockName, allowedChildren) {
    const filter = {
        id: blockName,
        components: allowedChildren && allowedChildren.length > 0
            ? allowedChildren
            : ['text', 'image', 'button', 'title'],
    };
    return JSON.stringify(filter, null, 2);
}
// ─── Combined `blocks/<name>/_<name>.json` (UE canonical) ──────
/**
 * Generate the **single** block-scoped UE config file at
 * `blocks/<blockName>/_<blockName>.json`.
 *
 * Each block ships ONE JSON file bundling `definitions`, `models`, and
 * `filters`.  The project build aggregates these into the project-root
 * `component-definitions.json` / `component-models.json` /
 * `component-filters.json` — authors never edit those root files by hand.
 *
 * Enhancement: auto-injects `classes` multiselect (variants) and `da`
 * plugin hints derived from the block pattern.
 */
export function generateBlockJsonFile(blockName, fields, options) {
    const items = options?.items ?? [];
    const isContainer = items.length > 0;
    const pattern = options?.pattern;
    // Default DA hints derived from pattern
    const defaultDaRows = (() => {
        switch (pattern) {
            case 'hero': return 1;
            case 'accordion': return 3;
            case 'carousel': return 3;
            default: return 1;
        }
    })();
    const defaultDaCols = (() => {
        switch (pattern) {
            case 'accordion': return 2;
            case 'columns': return 2;
            case 'cards': return 2;
            default: return isContainer ? 0 : 2;
        }
    })();
    const daRows = options?.daRows ?? defaultDaRows;
    const daColumns = options?.daColumns ?? defaultDaCols;
    const definitions = [
        JSON.parse(generateComponentDefinition(blockName, {
            title: options?.title,
            group: options?.group,
            model: fields.length > 0 ? blockName : null,
            filter: isContainer ? blockName : undefined,
            daRows,
            daColumns,
        })),
    ];
    for (const item of items) {
        definitions.push(JSON.parse(generateComponentDefinition(item.id, {
            title: item.title,
            group: options?.group,
            model: item.id,
            isItem: true,
        })));
    }
    const models = [];
    if (fields.length > 0) {
        models.push(JSON.parse(generateComponentModel(blockName, fields, {
            pattern,
            extraVariants: options?.extraVariants,
        })));
    }
    for (const item of items) {
        models.push(JSON.parse(generateComponentModel(item.id, item.fields, { omitClasses: true })));
    }
    const filters = [];
    if (isContainer) {
        filters.push(JSON.parse(generateComponentFilter(blockName, items.map((i) => i.id))));
    }
    else if (options?.allowedChildren && options.allowedChildren.length > 0) {
        filters.push(JSON.parse(generateComponentFilter(blockName, options.allowedChildren)));
    }
    const file = { definitions };
    if (models.length > 0)
        file.models = models;
    if (filters.length > 0)
        file.filters = filters;
    return `${JSON.stringify(file, null, 2)}\n`;
}
// ─── Sample Content (Authoring Table) ───────────────────────────
export function generateSampleContent(blockName, fields, variant) {
    const displayName = toTitleCase(blockName) + (variant ? ` (${variant})` : '');
    const separator = '| --- |';
    // Build sample rows from fields
    const sampleRows = fields
        .filter((f) => f.type !== 'boolean' && f.type !== 'number')
        .reduce((acc, field, i, arr) => {
        // Group image + content fields into rows
        if (field.type === 'reference') {
            const nextField = arr[i + 1];
            acc.push({
                col1: `![${field.label}](https://example.com/media_sample.jpeg)`,
                col2: nextField && nextField.type !== 'reference'
                    ? getSampleValue(nextField)
                    : undefined,
            });
        }
        else if (i === 0 || arr[i - 1]?.type !== 'reference') {
            acc.push({ col1: getSampleValue(field) });
        }
        return acc;
    }, []);
    const rows = sampleRows
        .map((r) => r.col2 ? `| ${r.col1} | ${r.col2} |` : `| ${r.col1} |`)
        .join('\n');
    return `| ${displayName} |
${separator}
${rows}
`;
}
// ─── README Template ────────────────────────────────────────────
export function generateBlockReadme(blockName, description, variant, fields) {
    const title = toTitleCase(blockName);
    const desc = description || `The ${title} block.`;
    return `# ${title}

${desc}

## Usage

Add a "${title}" table to your document:

| ${title}${variant ? ` (${variant})` : ''} |
| --- |
| Your content here |

## Variants

${variant ? `- **${variant}**: ${variant} variant styling` : '- Default: standard layout'}

## Authoring

${fields
        ? fields.map((f) => `- **${f.label}** (${f.type}): ${f.name}`).join('\n')
        : '- Content is placed in table cells'}

## CSS Variables

This block respects the following CSS custom properties from \`styles/styles.css\`:

- \`--link-color\`: CTA button background
- \`--link-hover-color\`: CTA button hover state
- \`--background-color\`: Block background
- \`--spacing-s\`, \`--spacing-m\`, \`--spacing-l\`: Spacing scale

## Performance

- JS: Loaded lazily when block enters viewport
- CSS: Loaded in parallel with JS
- Images: Lazy-loaded with explicit dimensions
`;
}
// ─── Test HTML Template ─────────────────────────────────────────
export function generateTestHtml(blockName, sampleContent) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${toTitleCase(blockName)} Block Test</title>
  <style>
    /* Minimal EDS reset for local testing */
    :root {
      --link-color: #035fe6;
      --link-hover-color: #024bb5;
      --background-color: #fff;
      --text-color: #2c2c2c;
      --spacing-s: 0.5rem;
      --spacing-m: 1rem;
      --spacing-l: 2rem;
      --border-radius: 4px;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      color: var(--text-color);
      margin: 2rem;
      /* EDS hides body until .appear is added */
      opacity: 0;
      transition: opacity 0.3s;
    }
    body.appear {
      opacity: 1;
    }
  </style>
  <link rel="stylesheet" href="${blockName}.css">
</head>
<body>
  <h1>${toTitleCase(blockName)} Block — Local Test</h1>
  <p>This page simulates the EDS DOM structure for local testing.</p>
  <hr>

  <!--
    EDS Block DOM Contract:
    - .{block}-wrapper is auto-generated by EDS (never style as custom class)
    - block element has data-block-name and data-block-status attributes
    - Rows are direct children of the block element
    - Cells are direct children of rows
  -->
  <div class="${blockName}-wrapper">
    <div class="${blockName}" data-block-name="${blockName}" data-block-status="loading">
      <div>
        <div><p>Sample content row 1, cell 1</p></div>
        <div><p>Sample content row 1, cell 2</p></div>
      </div>
      <div>
        <div><p>Sample content row 2, cell 1</p></div>
        <div><p>Sample content row 2, cell 2</p></div>
      </div>
    </div>
  </div>

  <script type="module">
    // Simulate EDS loading sequence:
    // 1. body.appear must be set before block loads (otherwise page stays hidden)
    // 2. data-block-name must be set on block element
    // 3. Call decorate(), then set data-block-status="loaded"
    document.body.classList.add('appear');

    import decorate from './${blockName}.js';
    const block = document.querySelector('.${blockName}');
    if (block) {
      await decorate(block);
      block.dataset.blockStatus = 'loaded';
    }
  </script>
</body>
</html>
`;
}
// ─── Helpers ────────────────────────────────────────────────────
function toTitleCase(str) {
    return str
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}
function getValueType(componentType) {
    switch (normalizeType(componentType)) {
        case 'boolean': return 'boolean';
        case 'number': return 'number';
        case 'multiselect': return 'string[]';
        default: return 'string';
    }
}
function normalizeType(t) {
    if (t === 'text-input')
        return 'text';
    if (t === 'text-area')
        return 'textarea';
    return t;
}
function getSampleValue(field) {
    switch (normalizeType(field.type)) {
        case 'richtext': return `<p>Sample ${field.label.toLowerCase()} content with <strong>formatting</strong></p>`;
        case 'text':
        case 'textarea': return `Sample ${field.label}`;
        case 'reference': return `![${field.label}](https://example.com/media_sample.jpeg)`;
        case 'boolean': return 'true';
        case 'number': return '42';
        case 'select': return 'option-1';
        default: return `Sample ${field.label}`;
    }
}
//# sourceMappingURL=block-templates.js.map