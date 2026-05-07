export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  // Row 1 = block config: [sectionTitle]
  const configCells = [...rows[0].children];
  const sectionTitle = configCells[0]?.textContent.trim() || '';

  // Remaining rows = card items: [image, title, subtitle, variant, primaryCtaText, primaryCtaLink, secondaryCtaText, secondaryCtaLink]
  const cards = rows.slice(1).map((row) => {
    const cells = [...row.children];
    return {
      image: cells[0]?.querySelector('picture') || cells[0]?.querySelector('img'),
      title: cells[1]?.textContent.trim() || '',
      subtitle: cells[2]?.innerHTML.trim() || '',
      variant: (cells[3]?.textContent.trim().toLowerCase() || 'standard'),
      primaryCtaText: cells[4]?.textContent.trim() || '',
      primaryCtaLink: cells[5]?.querySelector('a')?.href || cells[5]?.textContent.trim() || '',
      secondaryCtaText: cells[6]?.textContent.trim() || '',
      secondaryCtaLink: cells[7]?.querySelector('a')?.href || cells[7]?.textContent.trim() || '',
    };
  });

  block.textContent = '';
  block.classList.add('card-gallery');

  // Section title
  if (sectionTitle) {
    const titleEl = document.createElement('h2');
    titleEl.className = 'card-gallery-title';
    titleEl.textContent = sectionTitle;
    block.append(titleEl);
  }

  // Grid
  const grid = document.createElement('div');
  grid.className = 'card-gallery-grid';

  cards.forEach((card) => {
    const cardEl = document.createElement('article');
    cardEl.className = 'card-gallery-card card-gallery-' + card.variant;

    // Background image
    if (card.image) {
      const bg = document.createElement('div');
      bg.className = 'card-gallery-bg';
      bg.append(card.image);
      cardEl.append(bg);
    }

    // Content overlay
    const content = document.createElement('div');
    content.className = 'card-gallery-content';

    if (card.title) {
      const titleEl = document.createElement('h3');
      titleEl.className = 'card-gallery-card-title';
      titleEl.textContent = card.title;
      content.append(titleEl);
    }

    if (card.subtitle) {
      const subtitleEl = document.createElement('div');
      subtitleEl.className = 'card-gallery-card-subtitle';
      subtitleEl.innerHTML = card.subtitle;
      content.append(subtitleEl);
    }

    // CTAs (mainly for wide variant)
    if (card.primaryCtaText || card.secondaryCtaText) {
      const ctaWrap = document.createElement('div');
      ctaWrap.className = 'card-gallery-ctas';

      if (card.primaryCtaText) {
        const cta = document.createElement('a');
        cta.className = 'card-gallery-cta card-gallery-cta-primary';
        cta.href = card.primaryCtaLink || '#';
        cta.innerHTML = card.primaryCtaText;
        ctaWrap.append(cta);
      }

      if (card.secondaryCtaText) {
        const cta = document.createElement('a');
        cta.className = 'card-gallery-cta card-gallery-cta-secondary';
        cta.href = card.secondaryCtaLink || '#';
        cta.innerHTML = card.secondaryCtaText + ' <span aria-hidden="true">›</span>';
        ctaWrap.append(cta);
      }

      content.append(ctaWrap);
    }

    cardEl.append(content);
    grid.append(cardEl);
  });

  block.append(grid);
}
