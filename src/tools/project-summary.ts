import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { detectProjectType, type DetectionInput } from '../knowledge/project-detection.js';

type SummaryInput = DetectionInput & {
  stylesCss?: string;
  scriptsJs?: string;
  initializersJs?: string;
  existingSummary?: string;
  sessionChanges?: string;
  summaryPath?: string;
};

function listLines(s?: string): string[] {
  return (s ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function extractCssVariables(stylesCss?: string): string[] {
  if (!stylesCss) return [];
  return unique([...stylesCss.matchAll(/--([a-z0-9-]+)\s*:/gi)].map((match) => `--${match[1]}`)).slice(0, 12);
}

function extractFontHints(stylesCss?: string, headHtml?: string): string[] {
  const hints: string[] = [];
  if (stylesCss) {
    for (const match of stylesCss.matchAll(/font-family\s*:\s*([^;]+);/gi)) {
      hints.push(match[1].replace(/\s+/g, ' ').trim());
    }
  }
  if (headHtml) {
    if (/fonts\.googleapis/i.test(headHtml)) hints.push('Google Fonts linked in head.html');
    if (/typekit|adobe-fonts/i.test(headHtml)) hints.push('Adobe Fonts linked in head.html');
  }
  return unique(hints).slice(0, 6);
}

function extractConfigKeys(configJson?: string): string[] {
  if (!configJson) return [];
  try {
    const data = JSON.parse(configJson) as Record<string, unknown>;
    return Object.keys(data).sort();
  } catch {
    return [];
  }
}

function summarizeFunctionality(input: SummaryInput, projectType: ReturnType<typeof detectProjectType>): string[] {
  const root = listLines(input.rootDirListing);
  const blocks = listLines(input.blocksDirListing);
  const scripts = listLines(input.scriptsDirListing);
  const items: string[] = [];

  if (projectType.type === 'storefront') {
    if (projectType.installedDropins.length) {
      items.push(`Commerce storefront with drop-ins: ${projectType.installedDropins.join(', ')}`);
    } else {
      items.push('Commerce storefront patterns detected, but no specific drop-ins were provided in the input.');
    }
    if (scripts.includes('initializers.js')) items.push('Drop-ins are likely mounted through scripts/initializers.js.');
    if (blocks.some((name) => name.startsWith('commerce-'))) {
      items.push(`Commerce block wrappers present: ${blocks.filter((name) => name.startsWith('commerce-')).join(', ')}`);
    }
  } else if (projectType.type === 'eds') {
    if (blocks.length) items.push(`EDS block library present: ${blocks.slice(0, 10).join(', ')}`);
    if (root.includes('fstab.yaml')) items.push('Content is mounted through fstab.yaml.');
    if (scripts.length) items.push(`Global script surface: ${scripts.join(', ')}`);
  } else if (projectType.type === 'aemaacs' || projectType.type === 'aem65lts') {
    if (projectType.detectedAemModules.length) {
      items.push(`AEM modules detected: ${projectType.detectedAemModules.join(', ')}`);
    }
    if (root.includes('pom.xml')) items.push('Build and packaging are Maven-based.');
    if (listLines(input.dispatcherDirListing).length) items.push('Dispatcher configuration is part of the project.');
  }

  if (!items.length) {
    items.push('No strong functional surface was provided beyond the detected project type.');
  }
  return items;
}

function summarizeGlobalDefinitions(input: SummaryInput): { theme: string[]; security: string[]; runtime: string[] } {
  const theme: string[] = [];
  const security: string[] = [];
  const runtime: string[] = [];
  const scripts = listLines(input.scriptsDirListing);
  const configKeys = extractConfigKeys(input.configJson);
  const cssVars = extractCssVariables(input.stylesCss);
  const fontHints = extractFontHints(input.stylesCss, input.headHtml);

  if (cssVars.length) theme.push(`Theme tokens / CSS variables detected: ${cssVars.join(', ')}`);
  if (fontHints.length) theme.push(`Typography hints: ${fontHints.join('; ')}`);
  if (/adobeDataLayer\s*=/.test(input.headHtml ?? '')) runtime.push('Adobe Client Data Layer bootstrap detected in head.html.');
  if (/preconnect/i.test(input.headHtml ?? '')) runtime.push('head.html includes preconnect hints for global network setup.');
  if (scripts.includes('scripts.js')) runtime.push('scripts.js is the global runtime entrypoint.');
  if (scripts.includes('initializers.js')) runtime.push('initializers.js handles shared storefront container mounts.');
  if (scripts.includes('configs.js')) runtime.push('configs.js centralizes runtime configuration lookups.');

  const securityKeys = configKeys.filter((key) => /(auth|token|secret|key|encrypt|csrf|credential|password)/i.test(key));
  if (securityKeys.length) {
    security.push(`Security-sensitive config keys are present: ${securityKeys.join(', ')}. Capture names only, never values.`);
  }
  if (/content-security-policy|csp/i.test(input.headHtml ?? '')) {
    security.push('CSP-related markup appears in head.html.');
  }
  if (/https?:\/\//i.test(input.configJson ?? '')) {
    runtime.push('External endpoints are configured in config.json/default-config.json.');
  }

  if (!theme.length) theme.push('No explicit theme CSS input was provided. Pass styles/styles.css or equivalent for better theme extraction.');
  if (!security.length) security.push('No explicit auth / encryption / secret-management signal was found in the provided inputs.');
  if (!runtime.length) runtime.push('No global runtime files were provided beyond the detection inputs.');

  return { theme, security, runtime };
}

function summarizeSession(existingSummary?: string, sessionChanges?: string): string[] {
  const items: string[] = [];
  if (existingSummary) items.push('Previous summary was provided and should be treated as the baseline state.');
  if (sessionChanges) {
    const changes = listLines(sessionChanges.replace(/^[-*]\s*/gm, ''));
    for (const change of changes) items.push(change);
  }
  if (!items.length) items.push('No session delta was provided yet. Add completed changes before ending the session.');
  return items;
}

export function registerProjectSummary(server: McpServer) {
  server.tool(
    'project_summary',
    'Generate or refresh a workspace summary that captures project type, functional scope, global definitions (theme CSS, runtime scripts, auth/encryption/config signals), and the latest session delta. Use it at the start of a session to create `.project-summary.md` or `PROJECT_SUMMARY.md`, and at the end with `existingSummary` + `sessionChanges` to refresh that file.',
    {
      packageJson: z.string().optional().describe('Contents of package.json'),
      rootDirListing: z.string().optional().describe('`ls` of the project root (one name per line)'),
      scriptsDirListing: z.string().optional().describe('`ls scripts/`'),
      blocksDirListing: z.string().optional().describe('`ls blocks/`'),
      dropinsDirListing: z.string().optional().describe('`ls scripts/__dropins__/` — pass empty string if directory does not exist'),
      headHtml: z.string().optional().describe('Contents of head.html'),
      configJson: z.string().optional().describe('Contents of config.json or default-config.json'),
      fstabYaml: z.string().optional().describe('Contents of fstab.yaml'),
      pomXml: z.string().optional().describe('Contents of root pom.xml'),
      aemSkillsConfigYaml: z.string().optional().describe('Contents of .aem-skills-config.yaml'),
      uiAppsDirListing: z.string().optional().describe('`ls ui.apps/` if the directory exists'),
      coreDirListing: z.string().optional().describe('`ls core/` if the directory exists'),
      dispatcherDirListing: z.string().optional().describe('`ls dispatcher/` if the directory exists'),
      stylesCss: z.string().optional().describe('Contents of a global stylesheet such as styles/styles.css or theme.css'),
      scriptsJs: z.string().optional().describe('Contents of scripts/scripts.js if present'),
      initializersJs: z.string().optional().describe('Contents of scripts/initializers.js if present'),
      existingSummary: z.string().optional().describe('Current contents of .project-summary.md / PROJECT_SUMMARY.md when refreshing'),
      sessionChanges: z.string().optional().describe('Bullet list or plain text summary of what changed in this session'),
      summaryPath: z.string().optional().describe('Target summary path, e.g. `.project-summary.md` or `PROJECT_SUMMARY.md`'),
    },
    {
      title: 'Project Summary',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async (input) => {
      const provided = Object.values(input).some((value) => value != null && value !== '');
      if (!provided) {
        return {
          content: [{
            type: 'text' as const,
            text:
              '# Project summary — no inputs provided\n\n' +
              'Pass the same workspace snapshots used by `detect_project_type`, plus optional global files such as styles/styles.css, scripts/scripts.js, scripts/initializers.js, and an existing summary when you want to refresh it.',
          }],
          isError: true,
        };
      }

      const detection = detectProjectType(input);
      const functionality = summarizeFunctionality(input, detection);
      const globals = summarizeGlobalDefinitions(input);
      const session = summarizeSession(input.existingSummary, input.sessionChanges);
      const summaryPath = input.summaryPath ?? '.project-summary.md';

      const lines: string[] = [];
      lines.push('# Project Summary');
      lines.push('');
      lines.push(`_Suggested file: ${summaryPath}_`);
      lines.push('');
      lines.push('## Identity');
      lines.push(`- Project type: ${detection.type}`);
      lines.push(`- Confidence: ${detection.confidence}`);
      lines.push(`- Scores: storefront ${detection.score >= 0 ? '+' : ''}${detection.score}, aemaacs +${detection.aemScore}, aem65lts +${detection.aem65Score}`);
      if (detection.installedDropins.length) lines.push(`- Installed drop-ins: ${detection.installedDropins.join(', ')}`);
      if (detection.detectedAemModules.length) lines.push(`- Detected AEM modules: ${detection.detectedAemModules.join(', ')}`);
      lines.push('');
      lines.push('## Functional Scope');
      for (const item of functionality) lines.push(`- ${item}`);
      lines.push('');
      lines.push('## Global Definitions');
      lines.push('### Theme / Styling');
      for (const item of globals.theme) lines.push(`- ${item}`);
      lines.push('');
      lines.push('### Security / Auth / Encryption');
      for (const item of globals.security) lines.push(`- ${item}`);
      lines.push('');
      lines.push('### Runtime / Shared Configuration');
      for (const item of globals.runtime) lines.push(`- ${item}`);
      lines.push('');
      lines.push('## Session Delta');
      for (const item of session) lines.push(`- ${item}`);
      lines.push('');
      lines.push('## Recommended Operating Rule');
      lines.push('- Refresh this file at session start after running `detect_project_type`.');
      lines.push('- Refresh it again at session end with `existingSummary` + `sessionChanges`.');
      lines.push('- Record key names, architecture, and conventions only. Never store secret values, tokens, passwords, or private keys here.');
      if (detection.warnings.length) {
        lines.push('');
        lines.push('## Warnings');
        for (const warning of detection.warnings) lines.push(`- ${warning}`);
      }
      if (detection.recommendedTools.length) {
        lines.push('');
        lines.push('## Suggested Next Tools');
        for (const tool of detection.recommendedTools) lines.push(`- ${tool}`);
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );
}