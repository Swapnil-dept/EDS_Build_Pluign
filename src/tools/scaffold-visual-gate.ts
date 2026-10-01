import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * `scaffold_visual_gate` — generate the `gate:visual` script the
 * migration-runbook's stage 6 "keep going until exact" loop depends on:
 * render a block's test-harness page with Playwright, screenshot at
 * desktop/mobile widths, pixelmatch-diff against the original section
 * screenshot, and write a pass/fail report.json.
 *
 * Read-only — returns the script content + the package.json wiring to add.
 * This tool does not run the script itself (no rendering/browser capability
 * in this MCP server) — the caller writes it into the target EDS project
 * and runs it via `npm run gate:visual -- <block>`.
 */

export function registerScaffoldVisualGate(server: McpServer) {
  server.registerTool(
    'scaffold_visual_gate',
    {
      description: 'Generate the `gate:visual` script (Node + Playwright + pixelmatch) for the migration-runbook stage 6 block-build loop: renders a block\'s test-harness page, screenshots at 1440/375, diffs against `migration-work/<page>/sections/<sectionId>/{desktop,mobile}.png`, masks declared dynamic regions, and writes `migration-work/<page>/diffs/<block>/<iter>/{rendered-*.png, diff-*.png, report.json}`. Exits 0 under threshold (desktop ≤3%, mobile ≤5% by default), 1 otherwise. Read-only — returns the script + package.json wiring + install command; does not execute anything.',
      inputSchema: {
        desktopThresholdPct: z.number().positive().optional().default(3).describe('Max allowed desktop (1440px) pixel-diff percentage to pass (default 3)'),
        mobileThresholdPct: z.number().positive().optional().default(5).describe('Max allowed mobile (375px) pixel-diff percentage to pass (default 5)'),
        scriptPath: z.string().optional().default('tools/importer/gates/gate-visual.mjs').describe('Where to write the script (default tools/importer/gates/gate-visual.mjs)'),
      },
      annotations: {
        title: 'Scaffold Visual Gate Script',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ desktopThresholdPct, mobileThresholdPct, scriptPath }) => {
      try {
        const script = `#!/usr/bin/env node
/**
 * gate:visual — renders a block's test-harness page, screenshots it at
 * desktop (1440) and mobile (375), diffs against the original section's
 * screenshot with pixelmatch, and writes a pass/fail report.
 *
 * Usage:
 *   node ${scriptPath} --block <blockName> --section <sectionId> --page <pageSlug> --url <testHarnessUrl> [--iter <n>] [--mask x,y,w,h ...]
 *
 * Exit code 0 = pass (desktop ≤ ${desktopThresholdPct}%, mobile ≤ ${mobileThresholdPct}%), 1 = fail, 2 = usage/setup error.
 *
 * Requires (devDependencies): playwright, pixelmatch, pngjs
 *   npm i -D playwright pixelmatch pngjs
 *   npx playwright install chromium   # once, to fetch the browser binary
 */
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const THRESHOLDS = { desktop: ${desktopThresholdPct}, mobile: ${mobileThresholdPct} };
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } };
const PIXELMATCH_OPTS = { threshold: 0.1, includeAA: false };

function parseArgs(argv) {
  const out = { masks: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--block') out.block = argv[++i];
    else if (a === '--section') out.section = argv[++i];
    else if (a === '--page') out.page = argv[++i];
    else if (a === '--url') out.url = argv[++i];
    else if (a === '--iter') out.iter = Number(argv[++i]);
    else if (a === '--mask') out.masks.push(argv[++i].split(',').map(Number)); // x,y,w,h
  }
  return out;
}

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

/** Crop a PNG buffer to the given dimensions (top-left aligned) so renders taller/shorter than the original still diff cleanly over the shared region. */
function cropTo(png, width, height) {
  const out = new PNG({ width, height });
  PNG.bitblt(png, out, 0, 0, Math.min(width, png.width), Math.min(height, png.height), 0, 0);
  return out;
}

/** Zero out masked regions in both images so declared dynamic content (carousels, live API values) never fails the gate. */
function applyMasks(png, masks) {
  for (const [mx, my, mw, mh] of masks) {
    for (let y = my; y < my + mh && y < png.height; y += 1) {
      for (let x = mx; x < mx + mw && x < png.width; x += 1) {
        const idx = (png.width * y + x) << 2;
        png.data[idx] = png.data[idx + 1] = png.data[idx + 2] = 128;
        png.data[idx + 3] = 255;
      }
    }
  }
}

async function screenshotViewport(url, viewport, outPath) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: outPath });
  } finally {
    await browser.close();
  }
}

async function diffOne(vpName, originalPath, renderedPath, diffPath, masks) {
  const original = readPng(originalPath);
  let rendered = readPng(renderedPath);
  const width = Math.min(original.width, rendered.width);
  const height = Math.min(original.height, rendered.height);
  const a = cropTo(original, width, height);
  const b = cropTo(rendered, width, height);
  applyMasks(a, masks);
  applyMasks(b, masks);

  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(a.data, b.data, diff.data, width, height, PIXELMATCH_OPTS);
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const diffPct = (diffPixels / (width * height)) * 100;
  return { viewport: vpName, width, height, diffPixels, diffPct: Number(diffPct.toFixed(2)) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.block || !args.section || !args.page || !args.url) {
    console.error('Usage: gate-visual.mjs --block <name> --section <sectionId> --page <pageSlug> --url <testHarnessUrl> [--iter n] [--mask x,y,w,h]');
    process.exit(2);
  }
  const iter = Number.isFinite(args.iter) ? args.iter : 0;

  const sectionDir = path.join('migration-work', args.page, 'sections', args.section);
  const outDir = path.join('migration-work', args.page, 'diffs', args.block, String(iter));
  fs.mkdirSync(outDir, { recursive: true });

  const results = [];
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    const originalPath = path.join(sectionDir, \`\${vpName === 'desktop' ? 'desktop' : 'mobile'}.png\`);
    if (!fs.existsSync(originalPath)) {
      console.error(\`Missing original screenshot: \${originalPath} (did stage 2 run?)\`);
      process.exit(2);
    }
    const renderedPath = path.join(outDir, \`rendered-\${vpName}.png\`);
    const diffPath = path.join(outDir, \`diff-\${vpName}.png\`);
    await screenshotViewport(args.url, viewport, renderedPath);
    results.push(await diffOne(vpName, originalPath, renderedPath, diffPath, args.masks));
  }

  const report = {
    block: args.block,
    section: args.section,
    page: args.page,
    iter,
    thresholds: THRESHOLDS,
    results,
    pass: results.every((r) => r.diffPct <= THRESHOLDS[r.viewport]),
  };
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
`;

        const packageJsonSnippet = `{
  "scripts": {
    "gate:visual": "node ${scriptPath}"
  },
  "devDependencies": {
    "playwright": "^1.48.0",
    "pixelmatch": "^5.3.0",
    "pngjs": "^7.0.0"
  }
}`;

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `## gate:visual script\n\n` +
                `Thresholds: desktop ≤ ${desktopThresholdPct}%, mobile ≤ ${mobileThresholdPct}% (pixelmatch, threshold 0.1, antialiasing ignored).\n\n` +
                `### ${scriptPath}\n\`\`\`javascript\n${script}\`\`\`\n\n` +
                `### Install + wire up\n\`\`\`bash\nnpm i -D playwright pixelmatch pngjs\nnpx playwright install chromium\n\`\`\`\n\n` +
                `Merge into \`package.json\`:\n\`\`\`json\n${packageJsonSnippet}\n\`\`\`\n\n` +
                `### Run it (stage 6 of the migration runbook)\n\`\`\`bash\nnpm run gate:visual -- --block cards-price --section 07 --page term-insurance --url http://localhost:3000/test/cards-price.html\n\`\`\`\n\n` +
                `Add \`--mask x,y,w,h\` (repeatable) for any region declared in STATUS.md → Masks (carousels, live API values, autoplay video) so dynamic content never fails the gate.\n\n` +
                `**Prerequisite:** the test-harness URL (\`--url\`) must already be reachable \u2014 point it at a local \`test/tmp/<block>.test.html\` served by \`aem up\`, or any dev server rendering the block with real sample content.\n\n` +
                `**Next:** \`gate:crawl\`, \`gate:sections\`, \`gate:analysis\`, \`gate:parser\`, and \`gate:page\` (runbook §8) still need to be written by hand \u2014 this tool only covers the stage-6 visual loop.`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Visual gate script generation failed: ${(error as Error).message}` }],
        };
      }
    },
  );
}
