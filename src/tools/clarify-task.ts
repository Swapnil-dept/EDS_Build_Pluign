import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * `clarify_task` — return the logical clarifying questions an AI coding agent
 * (Copilot / Cursor / Cline / Continue / etc.) MUST ask the user before
 * generating code for a given intent.
 *
 * MCP servers can't ask questions on their own — they only respond to tool
 * calls. So we centralise the canonical question set per intent and leave
 * the agent responsible for asking. The agent should call this tool the
 * moment a user sends a request that maps to one of the supported intents,
 * BEFORE calling any scaffold / generate / migrate tool.
 *
 * Pair with `component_interview` for component-specific questions and the
 * project-summary first-trigger gate (see `detect_project_type`).
 */

type Intent =
  | 'new-block'
  | 'new-component'
  | 'new-storefront-block'
  | 'add-dropin'
  | 'style-or-theme'
  | 'fix-bug'
  | 'migrate-page'
  | 'add-feature'
  | 'refactor'
  | 'performance'
  | 'configure-project'
  | 'unknown';

interface QuestionSet {
  summary: string;
  preflight: string[];
  required: { id: string; question: string; hint?: string }[];
  optional: { id: string; question: string; hint?: string }[];
  nextTool: string;
  notes: string[];
}

const QUESTION_SETS: Record<Intent, QuestionSet> = {
  'new-block': {
    summary: 'User wants a new EDS block (Universal Editor authored).',
    preflight: [
      'Call `detect_project_type` and confirm the result is `eds`. If it is `storefront`, switch intent to `new-storefront-block`. If it is `aemaacs` or `aem65lts`, switch to `new-component`.',
      'Call `lookup_block` with the user-described purpose to see if a block already exists in this project.',
      'Call `search_block_collection` with the user-described purpose to see if Adobe Block Collection / Block Party already ships one.',
      'Run `component_interview` with `projectType: "eds"` for the canonical question set, then ask the user one question per turn.',
    ],
    required: [
      { id: 'blockName',  question: 'Block name in kebab-case (e.g. `hero`, `promo-card`)?' },
      { id: 'purpose',    question: 'What does it do, in one sentence?' },
      { id: 'fields',     question: 'Which authoring fields? List name (camelCase) + label + type (text / textarea / richtext / reference / aem-content / select / multiselect / boolean / number).' },
    ],
    optional: [
      { id: 'variants',   question: 'Any visual variants you want as CSS class modifiers? (Common: dark, light, wide, centered, compact, reversed.)' },
      { id: 'layout',     question: 'CSS layout: grid, flex, or stack?' },
      { id: 'hasMedia',   question: 'Does the block have an image / video column?' },
      { id: 'interactive',question: 'Any JS event handlers (accordion / tabs / carousel / etc.)?' },
      { id: 'container',  question: 'Is it a container with repeating items (cards → card)? If yes, what is the child item id and its fields?' },
    ],
    nextTool: 'scaffold_block (and scaffold_model for container blocks)',
    notes: [
      'Pass through ONLY fields the user named. Never auto-add description / image / CTA fields.',
      'After scaffolding, run `validate_block` and (for above-the-fold blocks) `check_performance`.',
    ],
  },

  'new-component': {
    summary: 'User wants a new AEM component (AEMaaCS or AEM 6.5 LTS / AMS).',
    preflight: [
      'Call `detect_project_type`. If `aemaacs` → use `scaffold_aem_component`. If `aem65lts` → use `scaffold_aem65_component`. Anything else → switch intent.',
      'AEMaaCS only: ensure `AGENTS.md` and `.aem-skills-config.yaml` (with `configured: true`) exist. If missing, call `ensure_agents_md` first.',
      'Run `component_interview` with the matching projectType for the field-type catalog and question list.',
    ],
    required: [
      { id: 'componentName', question: 'Component name in kebab-case?' },
      { id: 'title',         question: 'Editor-visible title?' },
      { id: 'project',       question: 'AEM project name?', hint: 'AEMaaCS: read from `.aem-skills-config.yaml` `project:`. 6.5 LTS: read from root `pom.xml` `<artifactId>`. NEVER guess.' },
      { id: 'javaPackage',   question: 'Java base package?', hint: 'AEMaaCS: `.aem-skills-config.yaml` `javaPackage:`. 6.5 LTS: `core/pom.xml` or existing `core/src/main/java/`.' },
      { id: 'group',         question: 'Component group (SidePanel category)?' },
      { id: 'fields',        question: 'Granite UI dialog fields? Name + label + type (textfield / textarea / richtext / pathfield / image / fileupload / multifield / checkbox / select / numberfield / datepicker).' },
    ],
    optional: [
      { id: 'extendsCore', question: 'Extend a Core Component (teaser / list / navigation / image / button / etc.)?' },
      { id: 'hasServlet',  question: 'Need a Sling Servlet (dynamic data, external API, form submission)?' },
      { id: 'styleSystem', question: 'Use Style System (cq:styleGroups) for visual variants?' },
    ],
    nextTool: 'scaffold_aem_component (Cloud) or scaffold_aem65_component (6.5 LTS)',
    notes: [
      'NEVER invent project / javaPackage / group — read from the canonical source file.',
      'After scaffolding, run the Maven build and verify the component appears in the SidePanel.',
    ],
  },

  'new-storefront-block': {
    summary: 'User wants a new EDS Commerce Storefront block (mounting a drop-in).',
    preflight: [
      'Call `detect_project_type` and confirm `storefront`.',
      'Call `lookup_dropin` to see the catalog of available drop-ins (cart, checkout, pdp, product-discovery, recommendations, account, auth, wishlist, quick-order, order, payment-services, personalization).',
    ],
    required: [
      { id: 'blockName', question: 'Block name in kebab-case (e.g. `commerce-cart`, `commerce-product-details`)?' },
      { id: 'dropin',    question: 'Which drop-in does it mount?', hint: 'Required if blockName is not in the canonical catalog.' },
    ],
    optional: [
      { id: 'container',     question: 'Container override (e.g. `MiniCart` instead of default `Cart`)?' },
      { id: 'variant',       question: 'CSS variant (compact / wide / minimal / with-rail)?' },
      { id: 'authorFields',  question: 'Any author-editable fields around the drop-in (heading, intro copy, CTA target)?' },
      { id: 'slotOverrides', question: 'Any slot overrides? (e.g. EmptyCart, ProductAttributes, PaymentMethods)' },
      { id: 'styling',       question: 'Brand colours / fonts / radius? (Used for `style_dropin`.)' },
    ],
    nextTool: 'scaffold_commerce_block, then customize_dropin_slot per slot, then style_dropin',
    notes: [
      'After scaffolding, run `validate_storefront` to confirm dropin wiring and pre-LCP discipline.',
    ],
  },

  'add-dropin': {
    summary: 'User wants to install / wire a single Adobe Commerce drop-in.',
    preflight: [
      'Call `detect_project_type` and confirm `storefront`. If `eds`, prompt the user to convert with `scaffold_storefront_project` first.',
      'Call `lookup_dropin` to see the catalog and current install status.',
    ],
    required: [
      { id: 'dropin', question: 'Which drop-in? (cart / checkout / order / pdp / product-discovery / product-recommendations / personalization / payment-services / account / auth / wishlist / quick-order)' },
    ],
    optional: [
      { id: 'container', question: 'Container override (e.g. MiniCart instead of Cart)?' },
    ],
    nextTool: 'add_dropin',
    notes: ['After install, remind the user to run `npm run postinstall` to sync `scripts/__dropins__/`.'],
  },

  'style-or-theme': {
    summary: 'User wants to update theme / colours / fonts / spacing.',
    preflight: [
      'Call `detect_project_type`.',
      'For storefront: theme via `style_dropin` (per drop-in or global) using @dropins/tools design tokens.',
      'For EDS: edit `styles/styles.css` CSS variables directly.',
      'For AEMaaCS / 6.5 LTS: edit clientlib CSS or component CSS.',
    ],
    required: [
      { id: 'scope', question: 'Scope: global theme, a specific block / component, or a specific drop-in?' },
    ],
    optional: [
      { id: 'brandPrimary',     question: 'Brand primary colour (hex)?' },
      { id: 'brandPrimaryDark', question: 'Brand primary dark / hover shade (hex)?' },
      { id: 'neutralBase',      question: 'Base neutral / surface colour (hex)?' },
      { id: 'headingFont',      question: 'Heading font family (CSS family list)?' },
      { id: 'bodyFont',         question: 'Body font family?' },
      { id: 'radius',           question: 'Corner style: sharp (2px), soft (8px), or pill (9999px)?' },
    ],
    nextTool: 'style_dropin (storefront) OR direct CSS edits (EDS / AEM)',
    notes: [
      'Tokens > hex literals — wire colours to `var(--color-*)`, fonts to `var(--type-*-font-family)`.',
      'For EDS: never style `.<block>-wrapper` or `.<block>-container` (auto-generated).',
    ],
  },

  'fix-bug': {
    summary: 'User reports something is broken in a block / component.',
    preflight: [
      'Call `detect_project_type` so the right validator is used.',
    ],
    required: [
      { id: 'symptom', question: 'What is broken? Describe the visible symptom (DOM looks wrong, JS error, layout off, etc.).' },
      { id: 'where',   question: 'Which block / component / drop-in / page is affected? Path or name.' },
      { id: 'when',    question: 'When does it happen? (Always / on resize / on click / on a specific viewport / specific browser.)' },
    ],
    optional: [
      { id: 'console',     question: 'Any browser-console errors or warnings? Paste the message.' },
      { id: 'recentEdits', question: 'Any recent edits or commits that might have caused it?' },
      { id: 'expected',    question: 'What should it look / behave like instead?' },
    ],
    nextTool: 'validate_block (EDS) / validate_storefront (storefront) / `fix-block` prompt',
    notes: ['Read the block files BEFORE proposing a fix. Diagnose first; never patch blindly.'],
  },

  'migrate-page': {
    summary: 'User wants to migrate one URL into the EDS project.',
    preflight: [
      'Call `detect_project_type` and confirm `eds`.',
      'Confirm Microsoft Playwright MCP is installed (`@playwright/mcp`). If not, instruct install of `npx @playwright/mcp@latest`.',
      'Use the `migrate-page-to-eds` prompt for the full Adobe page-import workflow.',
    ],
    required: [
      { id: 'sourceUrl',    question: 'Source URL to migrate?' },
      { id: 'htmlFilePath', question: 'Output path for `.plain.html` (e.g. `us/en/about.plain.html`, or `index.plain.html` for homepage)?' },
    ],
    optional: [
      { id: 'authoritative', question: 'Do you own the source content, or is this a structural reverse-engineering exercise (replace text / images with placeholders)?' },
      { id: 'reuseBlocks',   question: 'Prefer to reuse existing blocks where possible, or scaffold new ones?' },
    ],
    nextTool: 'migrate-page-to-eds prompt → eds_page_import_skills_index, eds_block_html_structure, eds_generate_import_html',
    notes: [
      'One URL per session. For multi-page migrations, run the prompt once per URL.',
      'Reverse-engineer structure + theme, not copyrighted content.',
    ],
  },

  'add-feature': {
    summary: 'User wants to add new functionality to an existing block / component.',
    preflight: [
      'Read the existing block / component files first to understand current shape.',
      'Call `lookup_block` to see if the requested feature already exists as a separate block (could be a reuse).',
    ],
    required: [
      { id: 'target',  question: 'Which block / component is being extended? Path or name.' },
      { id: 'feature', question: 'What feature do you need? Describe the user-visible behaviour.' },
    ],
    optional: [
      { id: 'newFields',     question: 'Any new authoring fields needed? Name + label + type.' },
      { id: 'newVariants',   question: 'Any new variants?' },
      { id: 'breakingChange',question: 'Is it OK to break existing authored content, or must this stay backward-compatible?' },
    ],
    nextTool: 'Direct edits + `validate_block` / `check_performance`. For UE field changes, regenerate via `scaffold_model`.',
    notes: ['Backward compatibility matters — existing pages may have authored content using the old model.'],
  },

  refactor: {
    summary: 'User wants to refactor / clean up an existing block or piece of code.',
    preflight: [
      'Read the file fully before proposing a refactor.',
      'Run `check_performance` and `validate_block` (EDS) on the current file as a baseline.',
    ],
    required: [
      { id: 'target', question: 'What file / block / component is being refactored?' },
      { id: 'goal',   question: 'What is the refactor goal? (Performance, readability, testability, removing a dependency, …)' },
    ],
    optional: [
      { id: 'breakingChange', question: 'Is it OK to break existing authoring contracts (UE model, dialog), or must they stay stable?' },
      { id: 'scope',          question: 'Single block, or a cross-cutting change (theme tokens, scripts.js, initializers)?' },
    ],
    nextTool: 'Direct edits + revalidate after.',
    notes: ['Refactor with measurements — capture before/after `check_performance` numbers.'],
  },

  performance: {
    summary: 'User reports slow / heavy page or block, or wants to hit pre-LCP budget.',
    preflight: [
      'Call `check_performance` on the suspect block(s) — pass js + css contents and `isAboveFold: true` if applicable.',
      'Run a Lighthouse / PageSpeed report locally if possible and capture LCP / TBT / CLS.',
    ],
    required: [
      { id: 'target',      question: 'Which page / block is slow?' },
      { id: 'whatMetric',  question: 'Which metric needs improvement? (LCP, TBT, CLS, total JS size, image weight, …)' },
    ],
    optional: [
      { id: 'baseline', question: 'Current measurement (LCP / TBT / CLS values)?' },
      { id: 'target',   question: 'Target value (e.g. LCP < 2.5s)?' },
    ],
    nextTool: 'check_performance + targeted CSS / JS edits.',
    notes: ['EDS pre-LCP budget = 100KB total above-the-fold JS+CSS. Lazy-load anything below the fold.'],
  },

  'configure-project': {
    summary: 'User wants to add / change project-level config (head.html, fstab, redirects, headers, sitemap, robots, helix-config).',
    preflight: ['Call `detect_project_type` so the right config templates are recommended.'],
    required: [
      { id: 'configType', question: 'Which config? (fstab / head-html / redirects / headers / robots / sitemap / helix-config / metadata / repoless)' },
    ],
    optional: [
      { id: 'domain',        question: 'Production domain?' },
      { id: 'contentSource', question: 'Google Drive or SharePoint?' },
      { id: 'folderId',      question: 'Drive folder ID or SharePoint path?' },
    ],
    nextTool: 'eds_config (EDS) / eds_storefront_config (storefront)',
    notes: [],
  },

  unknown: {
    summary: 'Intent is unclear — first job is to figure out what the user actually wants.',
    preflight: [],
    required: [
      { id: 'goal',         question: 'What do you want to build, fix, or change?' },
      { id: 'category',     question: 'Is this: a new block, a new component, a fix, a style change, a page migration, a performance issue, a project config change, or something else?' },
      { id: 'scope',        question: 'Single block / page, or a project-wide change?' },
    ],
    optional: [
      { id: 'projectType',  question: 'What kind of project is this? (EDS / EDS Commerce Storefront / AEMaaCS / AEM 6.5 LTS / not sure — I can run `detect_project_type`.)' },
      { id: 'design',       question: 'Do you have a design? Figma URL, screenshot, or live URL?' },
    ],
    nextTool: 'Re-call `clarify_task` with the now-known intent.',
    notes: ['Start broad, narrow down. Once intent is clear, switch to the specific question set.'],
  },
};

const INTENT_KEYWORDS: { intent: Intent; keywords: RegExp }[] = [
  { intent: 'new-storefront-block', keywords: /\b(commerce|cart|checkout|pdp|product\s*details|product\s*list|recommendations|wishlist|drop-?in)\b/i },
  { intent: 'add-dropin',           keywords: /\b(add|install|wire)\b.*\b(drop-?in)\b/i },
  { intent: 'migrate-page',         keywords: /\b(migrate|import|scrape)\b.*\b(page|url|site)\b/i },
  { intent: 'fix-bug',              keywords: /\b(fix|bug|broken|not working|error|crash|wrong)\b/i },
  { intent: 'style-or-theme',       keywords: /\b(theme|colou?r|font|brand|style|palette|spacing|tokens?)\b/i },
  { intent: 'performance',          keywords: /\b(slow|performance|lcp|tbt|cls|bundle|size|lazy)\b/i },
  { intent: 'refactor',             keywords: /\b(refactor|clean ?up|simplify|extract|rename)\b/i },
  { intent: 'add-feature',          keywords: /\b(add|extend|enhance)\b.*\b(feature|behaviour|behavior|functionality)\b/i },
  { intent: 'new-component',        keywords: /\b(component|aem(aacs|\s*65|\s*lts)?)\b/i },
  { intent: 'new-block',            keywords: /\b(new|create|scaffold|build)\b.*\bblock\b/i },
  { intent: 'configure-project',    keywords: /\b(fstab|head\.html|redirect|sitemap|robots|helix-config|metadata)\b/i },
];

function inferIntent(userPrompt?: string): Intent {
  if (!userPrompt) return 'unknown';
  for (const { intent, keywords } of INTENT_KEYWORDS) {
    if (keywords.test(userPrompt)) return intent;
  }
  return 'unknown';
}

export function registerClarifyTask(server: McpServer) {
  server.tool(
    'clarify_task',
    `Return the **logical clarifying questions** an AI coding agent (Copilot / Cursor / Cline / Continue) MUST ask the user before generating code. Call this the moment a user sends a request that touches scaffolding / migration / theming / fixing / refactoring — BEFORE calling any scaffold / generate / migrate tool. Pass either an explicit \`intent\` or the raw \`userPrompt\` and the tool will infer one. Returns: pre-flight checks, required questions (must be answered before proceeding), optional questions (improve quality), and the next tool to call once answers are collected. Pair with \`component_interview\` for component-specific deep-dives, and with \`detect_project_type\` for the project-summary first-trigger gate.`,
    {
      intent: z
        .enum(['new-block', 'new-component', 'new-storefront-block', 'add-dropin', 'style-or-theme', 'fix-bug', 'migrate-page', 'add-feature', 'refactor', 'performance', 'configure-project', 'unknown'])
        .optional()
        .describe('Explicit intent. If omitted, the tool tries to infer from `userPrompt`.'),
      userPrompt: z.string().optional().describe('The user\'s raw request — used to infer intent when `intent` is omitted.'),
    },
    {
      title: 'Clarify Task',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ intent, userPrompt }) => {
      const resolved: Intent = intent ?? inferIntent(userPrompt);
      const set = QUESTION_SETS[resolved];

      const out: string[] = [];
      out.push(`# Clarify task — intent: \`${resolved}\`\n\n${set.summary}`);

      if (resolved === 'unknown' && userPrompt) {
        out.push(`_Could not infer intent from:_ "${userPrompt}". Ask the broad questions below first to narrow it down, then re-call \`clarify_task\` with the now-known \`intent\`.`);
      }

      out.push(`## 🚨 Turn-by-turn rule\n\nThis is a **strict interactive interview**:\n\n1. Run the pre-flight steps below silently (these are setup, not user-facing).\n2. Ask the **required** questions ONE AT A TIME.\n3. After each question, **end the turn** and wait for the user's reply. Do not pre-draft the next question. Do not assume answers.\n4. Use \`vscode_askQuestions\` (or the IDE\'s structured-question UI) when available so the user gets a proper input field.\n5. Skip the optional questions unless the user invites elaboration or quality demands it.\n6. Only call the next tool (\`${set.nextTool}\`) once all required answers are collected and confirmed.`);

      if (set.preflight.length) {
        out.push(`## Pre-flight (silent)\n\n${set.preflight.map((p, i) => `${i + 1}. ${p}`).join('\n')}`);
      }

      if (set.required.length) {
        out.push(`## Required questions (must be answered)\n\n${set.required.map((q, i) => `${i + 1}. **${q.id}** — ${q.question}${q.hint ? `\n   - _Hint:_ ${q.hint}` : ''}`).join('\n')}`);
      }

      if (set.optional.length) {
        out.push(`## Optional questions (ask when relevant)\n\n${set.optional.map((q, i) => `${i + 1}. **${q.id}** — ${q.question}${q.hint ? `\n   - _Hint:_ ${q.hint}` : ''}`).join('\n')}`);
      }

      out.push(`## Next tool\n\n\`${set.nextTool}\``);

      if (set.notes.length) {
        out.push(`## Notes\n\n${set.notes.map((n) => `- ${n}`).join('\n')}`);
      }

      out.push(`---\n\n**After the user responds**, update the project summary file (\`.project-summary.md\`) per the first-trigger gate \u2014 see the project-summary rule.`);

      return { content: [{ type: 'text' as const, text: out.join('\n\n') }] };
    },
  );
}
