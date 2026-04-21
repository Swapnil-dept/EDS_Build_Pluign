/**
 * Block Template Generators
 *
 * Pure functions that generate EDS-compliant block files.
 * No LLM calls — deterministic scaffolding.
 */

// ─── Block JS Template ──────────────────────────────────────────

export function generateBlockJS(blockName: string, options?: {
  variant?: string;
  interactive?: boolean;
  hasMedia?: boolean;
  description?: string;
}): string {
  const className = blockName;
  const desc = options?.description || `${toTitleCase(blockName)} block`;

  return `/**
 * ${desc}
 * @param {HTMLElement} block - The block element
 */
export default function decorate(block) {
  // Extract rows and cells from authored content
  const rows = [...block.children];

  rows.forEach((row) => {
    const cells = [...row.children];
${options?.hasMedia ? `
    // Handle media (images/videos) in first cell
    const mediaCell = cells[0];
    const picture = mediaCell?.querySelector('picture');
    if (picture) {
      mediaCell.className = '${className}-media';
    }

    // Handle content in second cell
    const contentCell = cells[1];
    if (contentCell) {
      contentCell.className = '${className}-content';
    }
` : `
    cells.forEach((cell) => {
      // Process each cell's content
      const links = cell.querySelectorAll('a');
      links.forEach((link) => {
        // Style CTA links
        if (link.closest('p')?.children.length === 1) {
          link.className = 'button';
          link.closest('p').className = 'button-container';
        }
      });
    });
`}  });
${options?.interactive ? `
  // Interactive behavior
  block.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    // Handle interaction
  });
` : ''}${options?.variant ? `
  // Variant-specific behavior
  if (block.classList.contains('${options.variant}')) {
    // Apply variant-specific logic
  }
` : ''}}
`;
}

// ─── Block CSS Template ─────────────────────────────────────────

export function generateBlockCSS(blockName: string, options?: {
  variant?: string;
  hasMedia?: boolean;
  layout?: 'grid' | 'flex' | 'stack';
}): string {
  const layout = options?.layout || 'stack';

  const layoutCSS = {
    grid: `  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-m, 1rem);`,
    flex: `  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-m, 1rem);`,
    stack: `  display: flex;
  flex-direction: column;
  gap: var(--spacing-m, 1rem);`,
  };

  return `/* stylelint-disable no-descending-specificity */

/* Block: ${blockName} */
.${blockName} {
${layoutCSS[layout]}
  padding: var(--spacing-l, 2rem) 0;
}

.${blockName} > div {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-s, 0.5rem);
}

.${blockName} > div > div {
  flex: 1;
}
${options?.hasMedia ? `
.${blockName}-media {
  overflow: hidden;
}

.${blockName}-media picture {
  display: block;
}

.${blockName}-media img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;
}

.${blockName}-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-s, 0.5rem);
}
` : ''}
/* Button styling */
.${blockName} .button-container {
  margin: 0;
}

.${blockName} .button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius, 4px);
  background-color: var(--link-color, #035fe6);
  color: var(--background-color, #fff);
  text-decoration: none;
  font-weight: 600;
  transition: background-color 0.2s;
}

.${blockName} .button:hover {
  background-color: var(--link-hover-color, #024bb5);
}
${options?.variant ? `
/* Variant: ${options.variant} */
.${blockName}.${options.variant} {
  /* Variant-specific styles */
}
` : ''}
/* Desktop */
@media (min-width: 900px) {
  .${blockName} > div {
    flex-direction: row;
    align-items: center;
  }
}
`;
}

// ─── Component Model JSON ───────────────────────────────────────

export function generateComponentModel(
  blockName: string,
  fields: Array<{ name: string; type: string; label: string; required?: boolean }>
): string {
  const modelFields = fields.map((f) => {
    const field: Record<string, unknown> = {
      component: f.type,
      name: f.name,
      label: f.label,
      valueType: getValueType(f.type),
    };
    if (f.required) field.required = true;
    return field;
  });

  const model = {
    id: blockName,
    fields: modelFields,
  };

  return JSON.stringify(model, null, 2);
}

// ─── Component Definition JSON ──────────────────────────────────

export function generateComponentDefinition(
  blockName: string,
  title?: string,
  group?: string
): string {
  const def = {
    title: title || toTitleCase(blockName),
    id: blockName,
    plugins: {
      xwalk: {
        page: {
          resourceType: 'core/franklin/components/block/v1/block',
          template: {
            name: toTitleCase(blockName),
            model: blockName,
          },
        },
      },
    },
  };

  if (group) {
    (def as Record<string, unknown>).group = group;
  }

  return JSON.stringify(def, null, 2);
}

// ─── Component Filter JSON ──────────────────────────────────────

export function generateComponentFilter(
  blockName: string,
  allowedChildren?: string[]
): string {
  const filter = {
    id: `${blockName}-filter`,
    components: allowedChildren || ['text', 'image', 'button'],
  };

  return JSON.stringify(filter, null, 2);
}

// ─── Sample Content (Authoring Table) ───────────────────────────

export function generateSampleContent(
  blockName: string,
  fields: Array<{ name: string; type: string; label: string }>,
  variant?: string
): string {
  const displayName = toTitleCase(blockName) + (variant ? ` (${variant})` : '');
  const separator = '| --- |';

  // Build sample rows from fields
  const sampleRows = fields
    .filter((f) => f.type !== 'boolean' && f.type !== 'number')
    .reduce<Array<{ col1: string; col2?: string }>>((acc, field, i, arr) => {
      // Group image + content fields into rows
      if (field.type === 'reference') {
        const nextField = arr[i + 1];
        acc.push({
          col1: `![${field.label}](https://example.com/media_sample.jpeg)`,
          col2: nextField && nextField.type !== 'reference'
            ? getSampleValue(nextField)
            : undefined,
        });
      } else if (i === 0 || arr[i - 1]?.type !== 'reference') {
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

export function generateBlockReadme(
  blockName: string,
  description?: string,
  variant?: string,
  fields?: Array<{ name: string; type: string; label: string }>
): string {
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

export function generateTestHtml(
  blockName: string,
  sampleContent: string
): string {
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

function toTitleCase(str: string): string {
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getValueType(componentType: string): string {
  switch (componentType) {
    case 'boolean': return 'boolean';
    case 'number': return 'number';
    case 'multiselect': return 'string[]';
    default: return 'string';
  }
}

function getSampleValue(field: { name: string; type: string; label: string }): string {
  switch (field.type) {
    case 'richtext': return `<p>Sample ${field.label.toLowerCase()} content with <strong>formatting</strong></p>`;
    case 'text-input':
    case 'text-area': return `Sample ${field.label}`;
    case 'reference': return `![${field.label}](https://example.com/media_sample.jpeg)`;
    case 'boolean': return 'true';
    case 'number': return '42';
    case 'select': return 'option-1';
    default: return `Sample ${field.label}`;
  }
}
