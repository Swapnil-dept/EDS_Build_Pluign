import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { KARPATHY_GUIDELINES } from '../knowledge/karpathy-guidelines.js';

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
  | 'style-or-theme'
  | 'fix-bug'
  | 'migrate-page'
  | 'add-feature'
  | 'refactor'
  | 'performance'
  | 'configure-project'
  | 'warm-up'
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
    summary: 'User wants a new EDS block (Universal Editor or document authored).',
    preflight: [
      'Call `detect_project_type` and confirm the result is `eds`. If it is `aemaacs` or `aem65lts`, switch to `new-component`.',
      '**VARIANT CHECK (do this before any other question):** Call `lookup_block` with the block name / purpose. Also scan the `blocks/` directory for existing block folders. Then ask the user: _"Could this be achieved as a CSS class variant of an existing block?"_ If YES → call `scaffold_block(variantOf: "<parent>")` to emit a CSS-only override (no new JS or JSON file needed). If NO → proceed and pass `confirmedNewBlock: true` to `scaffold_block`.',
      'Call `search_block_collection` with the user-described purpose to see if Adobe Block Collection / Block Party already ships one.',
      'If the user provides a Figma URL, screenshot, or image → use `generate_block_from_design` (NOT `scaffold_block`). The design tool includes a vision-analysis prompt + pattern classifier + pixel-perfect scaffold.',
      'Run `component_interview` with `projectType: "eds"` for the full question set, then ask the user one question per turn.',
    ],
    required: [
      { id: 'variantCheck', question: 'Could this be a CSS variant of an existing block? (run `lookup_block` + scan `blocks/` first)', hint: 'If YES → use variantOf param in scaffold_block. If NO → set confirmedNewBlock: true. This must be answered before asking anything else.' },
      { id: 'blockName',    question: 'Block name in kebab-case (e.g. `hero`, `promo-card`)?' },
      { id: 'purpose',      question: 'What does this block do? One sentence — used in README and code comments.' },
      { id: 'pattern',      question: 'Which pattern best describes this block?', hint: 'hero (full-width media+text) / cards (repeating grid) / accordion (expand/collapse) / carousel (scrolling slides) / columns (side-by-side) / tabs (switchable panels) / custom (unique layout). This drives the JS+CSS archetype.' },
      { id: 'fields',       question: 'Which authoring fields are needed? For each: name (camelCase) + label + type.', hint: 'Types: text / textarea / richtext / reference (image) / aem-content (link) / select / multiselect / boolean / number. Example: title (text), body (richtext), image (reference), cta (aem-content).' },
    ],
    optional: [
      { id: 'design',     question: 'Do you have a design file? Figma URL, screenshot, or image path?', hint: 'If yes, use `generate_block_from_design` — it runs vision analysis and produces a pixel-perfect scaffold matched to the design.' },
      { id: 'modelType',  question: 'Which of Adobe’s 4 canonical content model types does this use?', hint: 'standalone (single table, one unit — hero, banner) / collection (repeating rows — cards, carousel) / configuration (key-value config rows — blog listing, search) / auto-blocked (default content transformed by JS — YouTube embed, tabs from a list). Usually inferred from `pattern` — only needed when `pattern` is `custom` or ambiguous.' },
      { id: 'variants',   question: 'Any visual variants as CSS class modifiers? (Common: dark, light, wide, centered, compact, reversed.)' },
      { id: 'naming',     question: 'CSS class naming convention: flat (`.block-element`, default) or BEM (`.block__element--modifier`)?', hint: 'flat = Vitamix/Ingredion style. BEM = Volvo Trucks style.' },
      { id: 'aboveFold',  question: 'Is this block above the fold (LCP-critical, first viewport)?', hint: 'If yes, it counts against the 100 KB pre-LCP budget. Images in the first slide/hero must use `loading="eager"` + `fetchpriority="high"`.' },
      { id: 'container',  question: 'Is it a container with repeating items (e.g. cards → card)? If yes: child item id + its fields.', hint: 'Container blocks need a separate model + filter entry in `_block.json`.' },
      { id: 'hasMedia',   question: 'Does the block have an image / video column?' },
      { id: 'interactive',question: 'Any JS event handlers needed? (click, hover, IntersectionObserver, etc.)' },
      { id: 'thirdParty', question: 'Any third-party library required? (e.g. map SDK, video player, chart lib)', hint: 'Load via `IntersectionObserver` inside `decorate()` — never in `head.html`.' },
    ],
    nextTool: 'generate_block_from_design (if design input) OR scaffold_block (no design). Then scaffold_model for container blocks.',
    notes: [
      'Pass through ONLY the fields the user named. Never auto-add image / CTA / description fields.',
      'After scaffolding, run `validate_block` and (for above-the-fold blocks) `check_performance`.',
      'Always include a `classes` multiselect field (variants) in the UE model — auto-injected by scaffold_block.',
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

  'style-or-theme': {
    summary: 'User wants to update theme / colours / fonts / spacing.',
    preflight: [
      'Call `detect_project_type`.',
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
    nextTool: 'Direct CSS edits in the matching EDS or AEM styling surface',
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
    nextTool: 'validate_block (EDS) / direct diagnosis for AEM / `fix-block` prompt',
    notes: ['Read the block files BEFORE proposing a fix. Diagnose first; never patch blindly.'],
  },

  'migrate-page': {
    summary: 'User wants to build one page into the EDS project from a URL, a design image/screenshot, or a Figma frame.',
    preflight: [
      'Call `detect_project_type` and confirm `eds`.',
      'For `sourceType: "url"`: confirm Microsoft Playwright MCP is installed (`@playwright/mcp`). If not, instruct install of `npx @playwright/mcp@latest`.',
      'For `sourceType: "figma"`: confirm a Figma MCP tool is installed; otherwise fall back to `sourceType: "image"` with an exported PNG.',
      'Use the `migrate-page-to-eds` prompt for the full Adobe page-import workflow — pass `sourceType: url|image|figma` plus the matching source param (`sourceUrl` / `imageRefs` / `figmaUrl`).',
      'For image/Figma sources, or one introducing a new brand/theme, consider `scaffold_migration_plan` first (advisory, writes to `.migration/plans/`) before the build prompt.',
    ],
    required: [
      { id: 'sourceType', question: 'Source: a live URL, a design image/screenshot, or a Figma frame?' },
      { id: 'source',     question: 'The source URL, image path(s), or Figma URL (matching the sourceType above)?' },
      { id: 'htmlFilePath', question: 'Output path for `.plain.html` (e.g. `us/en/about.plain.html`, or `index.plain.html` for homepage)? For image/Figma sources, also confirm `pageName` (kebab-case) to derive this from.' },
    ],
    optional: [
      { id: 'authoritative', question: 'Do you own the source content, or is this a structural reverse-engineering exercise (replace text / images with placeholders)?' },
      { id: 'reuseBlocks',   question: 'Prefer to reuse existing blocks where possible, or scaffold new ones?' },
    ],
    nextTool: 'migrate-page-to-eds prompt (sourceType: url|image|figma) → eds_page_import_skills_index, eds_block_html_structure, generate_block_from_design (new blocks for image/figma), eds_generate_import_html',
    notes: [
      'One page per session. For multi-page builds, run the prompt once per page.',
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
    nextTool: 'eds_config',
    notes: [],
  },

  'warm-up': {
    summary: 'Session warm-up — loads project context before any work begins. No user questions needed; the agent reads docs and reports back.',
    preflight: [
      'Read **AGENTS.md** at the workspace root. If missing, call `ensure_agents_md` to generate it.',
      'Read **.project-summary.md** at the workspace root. If missing, call `project_summary` and write the result to that file.',
      'Read the project config: `.aem-skills-config.yaml` (AEMaaCS), OR root `pom.xml` + `core/pom.xml` (AEM 6.5 LTS / AMS), OR `package.json` + `head.html` + `fstab.yaml` (EDS).',
      'If a file named `INSTRUCTIONS.md`, `.instructions.md`, or `CONTEXT.md` exists at the project root, read it — it contains project-specific rules that override general guidance.',
      'List all folders under `blocks/` to count existing blocks.',
      'Quick-grep for open TODO / FIXME comments across JS and CSS files.',
    ],
    required: [],
    optional: [],
    nextTool: 'Report findings to the user, then ask: “What would you like to work on today?”',
    notes: [
      'Report back: project type, block count, any brand/naming conventions found in INSTRUCTIONS.md or AGENTS.md, and any open TODOs.',
      'Context window note (from Adobe’s Experience Modernization Agent guide): over long sessions earlier instructions may be forgotten. If the agent loses context, ask it to re-read `.project-summary.md` and restart with a fresh warm-up prompt.',
      'Design token order: site-wide design (global CSS custom properties in `styles/styles.css`) must be complete before styling individual blocks — block CSS references those tokens.',
    ],
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
      { id: 'projectType',  question: 'What kind of project is this? (EDS / AEMaaCS / AEM 6.5 LTS / not sure — I can run `detect_project_type`.)' },
      { id: 'design',       question: 'Do you have a design? Figma URL, screenshot, or live URL?' },
    ],
    nextTool: 'Re-call `clarify_task` with the now-known intent.',
    notes: ['Start broad, narrow down. Once intent is clear, switch to the specific question set.'],
  },
};

const INTENT_KEYWORDS: { intent: Intent; keywords: RegExp }[] = [
  { intent: 'warm-up',              keywords: /\b(warm.?up|load.?context|read.?project|start.?session|begin.?session|hello|good\s*(morning|afternoon|evening|day))\b/i },
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
        .enum(['new-block', 'new-component', 'style-or-theme', 'fix-bug', 'migrate-page', 'add-feature', 'refactor', 'performance', 'configure-project', 'warm-up', 'unknown'])
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

      out.push(KARPATHY_GUIDELINES);

      return { content: [{ type: 'text' as const, text: out.join('\n\n') }] };
    },
  );
}
