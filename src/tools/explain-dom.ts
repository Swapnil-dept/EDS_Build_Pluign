import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BLOCK_DOM_PIPELINE } from '../knowledge/eds-conventions.js';

export function registerExplainDom(server: McpServer) {
  server.tool(
    'explain_dom',
    `Explain how an EDS block's authored content (table in Google Docs/Word) transforms into DOM structure. Provide a block name and number of rows/columns, and this tool shows the exact HTML that EDS generates before your decorate() function runs. Essential for understanding what your decorate function receives.`,
    {
      blockName: z.string().describe('Block name (e.g. "hero", "cards")'),
      variant: z.string().optional().describe('Block variant (e.g. "dark", "wide")'),
      rows: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(2)
        .describe('Number of content rows in the authoring table'),
      columns: z
        .number()
        .int()
        .min(1)
        .max(6)
        .default(2)
        .describe('Number of columns per row'),
      cellContents: z
        .array(z.array(z.string()))
        .optional()
        .describe('Optional: specific cell contents as 2D array [row][col]. Uses "Content R{r}C{c}" if omitted.'),
    },
    {
      title: 'Explain Block DOM',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ blockName, variant, rows, columns, cellContents }) => {
      const variantClass = variant
        ? ` ${variant.split(/[\s,]+/).map((v) => v.toLowerCase().replace(/\s+/g, '-')).join(' ')}`
        : '';

      // Build the authored table representation
      const titleCase = blockName
        .split('-')
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ');
      const tableHeader = variant ? `${titleCase} (${variant})` : titleCase;

      let authorTable = `| ${tableHeader} |\n| ${Array(columns).fill('---').join(' | ')} |\n`;
      for (let r = 0; r < rows; r++) {
        const cells: string[] = [];
        for (let c = 0; c < columns; c++) {
          cells.push(cellContents?.[r]?.[c] || `Content R${r + 1}C${c + 1}`);
        }
        authorTable += `| ${cells.join(' | ')} |\n`;
      }

      // Build the DOM representation
      let dom = `<div class="${blockName}-wrapper">\n`;
      dom += `  <div class="${blockName}${variantClass}">\n`;
      for (let r = 0; r < rows; r++) {
        dom += `    <div><!-- row ${r + 1} -->\n`;
        for (let c = 0; c < columns; c++) {
          const content = cellContents?.[r]?.[c] || `Content R${r + 1}C${c + 1}`;
          const isImage = content.includes('image') || content.includes('.jpg') || content.includes('.png');
          const isLink = content.startsWith('http') || content.includes('://');

          let cellHtml: string;
          if (isImage) {
            cellHtml = `<picture><source type="image/webp" srcset="/media_hash.webp"><img src="/media_hash.jpeg" alt="${content}" loading="lazy" width="800" height="600"></picture>`;
          } else if (isLink) {
            cellHtml = `<a href="${content}">${content}</a>`;
          } else {
            cellHtml = `<p>${content}</p>`;
          }

          dom += `      <div><!-- cell ${c + 1} -->${cellHtml}</div>\n`;
        }
        dom += `    </div>\n`;
      }
      dom += `  </div>\n`;
      dom += `</div>`;

      // Build the decorate function scaffold
      const decorateHint = `export default function decorate(block) {
  // block.className === "${blockName}${variantClass}"
  // block.children.length === ${rows}  (${rows} row divs)
  // block.children[0].children.length === ${columns}  (${columns} cell divs per row)

  const rows = [...block.children];
  rows.forEach((row, rowIndex) => {
    const cells = [...row.children];
    // cells[0] = first column content
${columns > 1 ? `    // cells[1] = second column content` : ''}
${columns > 2 ? `    // cells[2..${columns - 1}] = additional columns` : ''}
  });
}`;

      return {
        content: [
          {
            type: 'text' as const,
            text:
              `## Authored Table (Google Docs / Word)\n\`\`\`\n${authorTable}\`\`\`\n\n` +
              `## Generated DOM (what decorate() receives)\n\`\`\`html\n${dom}\n\`\`\`\n\n` +
              `## Decorate Function Starting Point\n\`\`\`javascript\n${decorateHint}\n\`\`\`\n\n` +
              `---\n\n${BLOCK_DOM_PIPELINE}`,
          },
        ],
      };
    }
  );
}
