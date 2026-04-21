import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ValidationIssue } from '../validator.js';
import { validateBlock } from '../validator.js';

function formatIssue(issue: ValidationIssue): string {
  const prefix = issue.severity.toUpperCase();
  const line = issue.line ? `:${issue.line}` : '';
  const fix = issue.fix ? `\n   -> Fix: ${issue.fix}` : '';
  return `[${prefix}] ${issue.file}${line} (${issue.rule}) ${issue.message}${fix}`;
}

export function registerValidateBlock(server: McpServer) {
  server.tool(
    'validate_block',
    'Validate an AEM EDS block against coding standards and best practices. Checks JS, CSS, JSON model, and sample content. Returns errors, warnings, and suggested fixes.',
    {
      blockName: z.string().describe('Block name in kebab-case'),
      js: z.string().optional().describe('Contents of block.js'),
      css: z.string().optional().describe('Contents of block.css'),
      json: z.string().optional().describe('Contents of component-models.json entry for this block'),
      content: z.string().optional().describe('Contents of sample-content.md'),
      readme: z.string().optional().describe('Contents of README.md'),
    },
    {
      title: 'Validate EDS Block',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ blockName, js, css, json, content, readme }) => {
      const result = validateBlock(blockName, { js, css, json, content, readme });

      if (result.issues.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `OK ${blockName} passed all checks (score: ${result.score}/100).`,
            },
          ],
        };
      }

      const summary =
        `${blockName}: ${result.errors.length} error(s), ` +
        `${result.warnings.length} warning(s), ${result.infos.length} info - score ${result.score}/100`;

      const ordered = [
        ...result.errors,
        ...result.warnings,
        ...result.infos,
      ];

      const details = ordered.map(formatIssue).join('\n\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: `${summary}\n\n${details}`,
          },
        ],
      };
    }
  );
}
