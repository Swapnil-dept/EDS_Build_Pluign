export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  // First row = block config: [sectionTitle]
  const configCells = [...rows[0].children];
  const sectionTitle = configCells[0]?.textContent.trim() || 'Project Details';

  // Remaining rows = detail items: [label, value]
  const items = rows.slice(1).map((row) => {
    const cells = [...row.children];
    return {
      label: cells[0]?.textContent.trim() || '',
      value: cells[1]?.innerHTML.trim() || '',
    };
  });

  block.textContent = '';
  block.classList.add('project-details');

  // Title
  const titleEl = document.createElement('h2');
  titleEl.className = 'project-details-title';
  titleEl.textContent = sectionTitle;
  block.append(titleEl);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'project-details-grid';

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'project-details-card';

    const label = document.createElement('h3');
    label.className = 'project-details-label';
    label.textContent = item.label;

    const value = document.createElement('div');
    value.className = 'project-details-value';
    value.innerHTML = item.value;

    card.append(label, value);
    grid.append(card);
  });

  block.append(grid);
}
