/**
 * Insurance Plan Card block.
 * Two-column layout: left = promotional section (image + headline + benefits),
 * right = product plan card (badge + title + pricing + features + CTA).
 *
 * Authoring table shape (Google Docs / Word):
 * | Insurance Plan Card       |                                      |
 * |---------------------------|--------------------------------------|
 * | [promo image]             | BEST SELLER                          |
 * | ## Can't decide on a...   | ### Tata AIA Sampoorna Raksha Promise |
 * | Share your needs and get  | Get ₹1 Crore Life cover @ ₹826/month |
 * | - Personalized suggestions| Age: 25  Cover till age: 60 yrs ...  |
 * | - Customizable quotes     | [feature icon 1] [icon 2] [icon 3]   |
 * |                           | [Customize plans for you]            |
 *
 * @param {HTMLElement} block - The block element
 */
export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;

  const cells = [...row.children];
  const [promoCell, planCell] = cells;

  // ── Left: promo panel ───────────────────────────────────────────
  const promoPanel = document.createElement('div');
  promoPanel.className = 'ipc-promo';

  // Move background picture into its own div so it can be positioned absolutely
  const picture = promoCell?.querySelector('picture');
  if (picture) {
    const bgDiv = document.createElement('div');
    bgDiv.className = 'ipc-promo-bg';
    bgDiv.append(picture);
    promoPanel.append(bgDiv);
  }

  // Remaining promo content (heading, subtext, list)
  const promoContent = document.createElement('div');
  promoContent.className = 'ipc-promo-content';
  while (promoCell?.firstChild) {
    promoContent.append(promoCell.firstChild);
  }
  promoPanel.append(promoContent);

  // ── Right: plan details panel ────────────────────────────────────
  const planPanel = document.createElement('div');
  planPanel.className = 'ipc-plan';

  if (planCell) {
    const children = [...planCell.children];

    children.forEach((child) => {
      const tag = child.tagName?.toLowerCase();

      // Detect "Best Seller" badge — first <p> with short text or <strong>
      if (tag === 'p' && !child.querySelector('strong, a') && child.textContent.trim().length < 30
        && planPanel.querySelector('.ipc-badge') === null) {
        child.className = 'ipc-badge';
        planPanel.append(child);
        return;
      }

      // Plan title (h2/h3/h4 in the plan cell)
      if (['h2', 'h3', 'h4'].includes(tag) && !planPanel.querySelector('.ipc-plan-title')) {
        child.className = 'ipc-plan-title';
        planPanel.append(child);
        return;
      }

      // Pricing headline — look for ₹ symbol or strong pricing text
      if (tag === 'p' && child.textContent.includes('₹') && !planPanel.querySelector('.ipc-pricing')) {
        child.className = 'ipc-pricing';
        planPanel.append(child);
        return;
      }

      // Metadata row (Age / Cover / Payment) — paragraph with pipe-separated values or labels
      if (tag === 'p' && (child.textContent.toLowerCase().includes('age')
        || child.textContent.toLowerCase().includes('cover')
        || child.textContent.toLowerCase().includes('payment'))
        && !planPanel.querySelector('.ipc-meta')) {
        child.className = 'ipc-meta';
        planPanel.append(child);
        return;
      }

      // Feature icons — unordered list or a <ul>/<ol>
      if ((tag === 'ul' || tag === 'ol') && !planPanel.querySelector('.ipc-features')) {
        child.className = 'ipc-features';
        [...child.querySelectorAll('li')].forEach((li) => li.classList.add('ipc-feature-item'));
        planPanel.append(child);
        return;
      }

      // CTA button — <p> containing an <a>
      if (tag === 'p' && child.querySelector('a')) {
        child.className = 'ipc-cta-wrapper';
        const link = child.querySelector('a');
        link.className = 'button ipc-cta';
        link.setAttribute('rel', 'noopener noreferrer');
        planPanel.append(child);
        return;
      }

      // Fallback: append as-is
      planPanel.append(child);
    });
  }

  // ── Replace block children with the two panels ───────────────────
  block.replaceChildren(promoPanel, planPanel);
}
