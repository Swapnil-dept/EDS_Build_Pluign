export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  // Build card items from rows
  const cards = rows.map((row, index) => {
    const cells = [...row.children];
    // Expected cells: [image, tags, title, benefits, primaryCta, secondaryCta]
    const imageCell = cells[0];
    const tagsCell = cells[1];
    const titleCell = cells[2];
    const benefitsCell = cells[3];
    const primaryCtaCell = cells[4];
    const secondaryCtaCell = cells[5];

    const card = document.createElement('div');
    card.className = 'card-showcase-item';
    if (index === 0) card.classList.add('active');
    card.dataset.index = index;

    // Image
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'card-showcase-image';
    const picture = imageCell?.querySelector('picture');
    if (picture) imageWrapper.append(picture);
    card.append(imageWrapper);

    // Content area
    const content = document.createElement('div');
    content.className = 'card-showcase-content';

    // Tags
    if (tagsCell?.textContent.trim()) {
      const tagsRow = document.createElement('div');
      tagsRow.className = 'card-showcase-tags';
      const tagTexts = tagsCell.textContent.split(',').map((t) => t.trim()).filter(Boolean);
      tagTexts.forEach((text) => {
        const tag = document.createElement('span');
        tag.className = 'card-showcase-tag';
        tag.textContent = text;
        tagsRow.append(tag);
      });
      content.append(tagsRow);
    }

    // Title
    if (titleCell?.textContent.trim()) {
      const title = document.createElement('h3');
      title.className = 'card-showcase-title';
      title.textContent = titleCell.textContent.trim();
      content.append(title);
    }

    // Benefits
    if (benefitsCell) {
      const benefitsList = document.createElement('ul');
      benefitsList.className = 'card-showcase-benefits';
      const items = benefitsCell.innerHTML.split(/<br\s*\/?>/).map((b) => b.trim()).filter(Boolean);
      items.forEach((item) => {
        const li = document.createElement('li');
        li.innerHTML = item;
        benefitsList.append(li);
      });
      content.append(benefitsList);
    }

    // CTAs
    const ctaRow = document.createElement('div');
    ctaRow.className = 'card-showcase-ctas';
    const primaryLink = primaryCtaCell?.querySelector('a');
    const secondaryLink = secondaryCtaCell?.querySelector('a');
    if (primaryLink) {
      primaryLink.className = 'card-showcase-cta card-showcase-cta-primary';
      ctaRow.append(primaryLink);
    }
    if (secondaryLink) {
      secondaryLink.className = 'card-showcase-cta card-showcase-cta-secondary';
      ctaRow.append(secondaryLink);
    }
    content.append(ctaRow);

    card.append(content);
    return { card, title: titleCell?.textContent.trim() || `Card ${index + 1}` };
  });

  // Clear original DOM
  block.textContent = '';

  // Cards container
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'card-showcase-cards';
  cards.forEach(({ card }) => cardsContainer.append(card));
  block.append(cardsContainer);

  // Tab navigation
  if (cards.length > 1) {
    const nav = document.createElement('nav');
    nav.className = 'card-showcase-tabs';
    cards.forEach(({ title }, index) => {
      const tab = document.createElement('button');
      tab.className = 'card-showcase-tab';
      if (index === 0) tab.classList.add('active');
      tab.textContent = title;
      tab.setAttribute('aria-label', `Show ${title}`);
      tab.addEventListener('click', () => {
        block.querySelectorAll('.card-showcase-item').forEach((item) => item.classList.remove('active'));
        block.querySelectorAll('.card-showcase-tab').forEach((t) => t.classList.remove('active'));
        block.querySelector(`.card-showcase-item[data-index="${index}"]`)?.classList.add('active');
        tab.classList.add('active');
      });
      nav.append(tab);
    });
    block.append(nav);
  }
}
