import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  CORAL_PATTERNS,
  SLING_SERVLET_PATTERNS,
  SERVICE_USER_PATTERNS,
  SEO_OPTIMIZER_PATTERNS,
  ALL_PATTERNS,
} from '../knowledge/aem-admin-ui.js';

const KNOWLEDGE_ROOT =
  'https://github.com/Swapnil-dept/EDS_Build_Pluign/blob/dev/src/knowledge/aem-admin-ui.ts';

const SECTION_LABELS: Record<string, string> = {
  'coral-ui':       'Coral UI 3',
  'sling-servlet':  'Sling Servlets',
  'service-user':   'Service Users & UserMapper',
  'seo-optimizer':  'SEO / GEO AI Optimizer',
};

export function registerAemAdminUi(server: McpServer) {
  server.tool(
    'aem_admin_ui',
    [
      'Look up patterns for building AEM admin tooling — Coral UI 3 pages, Sling Servlets, and Service User / UserMapper config.',
      '',
      'SECTIONS:',
      '  coral-ui       — coral-tab icons, coral-select dynamic items, Coral.commons.ready(), CQ Link Checker workaround,',
      '                   admin page HTML skeleton, IIFE JS pattern, parsing AI JSON responses in the browser',
      '  sling-servlet  — @Component registration, JSON responses with javax.json, JCR read/write,',
      '                   ResourceResolver usage, dispatcher security for /bin/ endpoints',
      '  service-user   — UserMapper OSGi config, repo-init scripts, service ResourceResolver (getServiceResourceResolver),',
      '                   ACL patterns (read-only, read-write, DAM), when NOT to use a service user in a servlet',
      '  seo-optimizer  — JCR recursive text extraction for AI prompts, GEO meta tags (geo.region / ICBM / hreflang),',
      '                   AI chat servlet prompt structure (system + page context + user message)',
      '',
      'Pass a section name or keyword (e.g. "coral-tab", "service-user", "servlet", "json", "resolver", "repoinit",',
      '"geo", "hreflang", "link-checker", "dynamic items", "iife") to get matching patterns.',
      'Empty query returns the full index.',
      '',
      'PRECONDITION: for AEMaaCS projects (detect_project_type returns "aemaacs").',
    ].join('\n'),
    {
      query: z
        .string()
        .optional()
        .describe(
          'Section name (coral-ui | sling-servlet | service-user | seo-optimizer) or keyword ' +
          '(e.g. coral-tab, dynamic-items, cq-link-checker, iife, servlet-registration, json-response, ' +
          'jcr-write, service-user-mapping, repoinit, acl, service-resolver, geo-meta-tags, ai-prompt, page-text). ' +
          'Empty = full index.',
        ),
    },
    {
      title: 'AEM Admin UI — Coral UI / Servlet / Service User Patterns',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ query }) => {
      const q = (query ?? '').trim().toLowerCase();
      const sections: string[] = [];

      sections.push(
        `# AEM Admin UI Development Patterns\n\n` +
        `**Source:** [aem-admin-ui knowledge base](${KNOWLEDGE_ROOT})\n\n` +
        `Verified patterns for Coral UI 3, Sling Servlets, and Service Users on AEM as a Cloud Service.`,
      );

      // ── No query → full index ─────────────────────────────────────────────
      if (!q) {
        for (const [sectionId, label] of Object.entries(SECTION_LABELS)) {
          const patterns = ALL_PATTERNS.filter(p => p.section === sectionId);
          sections.push(
            `## ${label} (${patterns.length} patterns)\n\n` +
            patterns.map(p => `- **\`${p.id}\`** — ${p.title}`).join('\n') +
            `\n\nQuery **${sectionId}** to see all ${label} patterns.`,
          );
        }
        sections.push(
          `## Quick-start keywords\n\n` +
          `| Goal | Query |\n|---|---|\n` +
          `| Build a Coral UI admin tab page | \`coral-ui\` |\n` +
          `| Write a JSON GET/POST servlet | \`sling-servlet\` |\n` +
          `| Create a service user + ACL | \`service-user\` |\n` +
          `| Add AI-powered SEO suggestions | \`seo-optimizer\` |\n` +
          `| Fix CQ Link Checker layout bug | \`link-checker\` |\n` +
          `| Dynamic coral-select items | \`dynamic-items\` |\n` +
          `| Repo-init ACL script | \`repoinit\` |\n` +
          `| GEO meta tags for international SEO | \`geo-meta-tags\` |`,
        );
        return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
      }

      // ── Section shortcut ──────────────────────────────────────────────────
      const isSectionQuery = Object.keys(SECTION_LABELS).some(s => s === q || s.includes(q) || q.includes(s));

      // ── Keyword search across all sections ───────────────────────────────
      const matched = ALL_PATTERNS.filter(p =>
        p.id.includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.section.includes(q),
      );

      if (!matched.length) {
        sections.push(
          `No pattern matched **"${query}"**.\n\n` +
          `Available sections: ${Object.keys(SECTION_LABELS).join(', ')}\n\n` +
          `Pattern ids: ${ALL_PATTERNS.map(p => p.id).join(', ')}`,
        );
        return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
      }

      // ── Render matched patterns ───────────────────────────────────────────
      // Group by section for readability
      const bySec = new Map<string, typeof matched>();
      for (const p of matched) {
        if (!bySec.has(p.section)) bySec.set(p.section, []);
        bySec.get(p.section)!.push(p);
      }

      for (const [sectionId, patterns] of bySec.entries()) {
        sections.push(`## ${SECTION_LABELS[sectionId] ?? sectionId}`);
        for (const p of patterns) {
          const lines: string[] = [];
          lines.push(`### \`${p.id}\` — ${p.title}\n\n${p.description}`);
          lines.push(`**Pattern / Code:**\n\`\`\`\n${'code' in p ? p.code : ''}\n\`\`\``);

          if ('correct' in p && p.correct) {
            lines.push(`**✅ Do this:**\n\`\`\`\n${p.correct}\n\`\`\``);
          }
          if ('wrong' in p && p.wrong) {
            lines.push(`**❌ Not this:**\n\`\`\`\n${p.wrong}\n\`\`\``);
          }
          if ('notes' in p && p.notes?.length) {
            lines.push(`**Notes:**\n${p.notes.map(n => `- ${n}`).join('\n')}`);
          }
          if ('antiPatterns' in p && (p as any).antiPatterns?.length) {
            lines.push(`**Anti-patterns:**\n${(p as any).antiPatterns.map((a: string) => `- ⚠️ ${a}`).join('\n')}`);
          }
          if ('files' in p && (p as any).files?.length) {
            lines.push(
              `**Required files:**\n` +
              (p as any).files.map((f: { path: string; content: string }) =>
                `- \`${f.path}\`\n\`\`\`xml\n${f.content}\n\`\`\``,
              ).join('\n'),
            );
          }
          sections.push(lines.join('\n\n'));
        }
      }

      // ── Workflow reminder for each section ────────────────────────────────
      if (isSectionQuery || matched.length > 2) {
        const workflowBySection: Record<string, string> = {
          'coral-ui':
            '1. Include `coralui3` clientlib in your HTL page.\n' +
            '2. Wrap all JS in a single IIFE — validate with `node --check`.\n' +
            '3. Use `Coral.commons.ready()` before manipulating coral-select / coral-datepicker.\n' +
            '4. Replace `<a href>` nav links with `<button onclick>` to avoid CQ Link Checker injection.\n' +
            '5. Deploy: `mvn clean install -pl ui.apps -PautoInstallPackage -DskipTests`',
          'sling-servlet':
            '1. Extend `SlingAllMethodsServlet` (GET+POST) or `SlingSafeMethodsServlet` (GET only).\n' +
            '2. Register with `sling.servlet.paths=/bin/...` + `extensions=json`.\n' +
            '3. Always set `Content-Type: application/json` before writing.\n' +
            '4. Use `javax.json` builders — never string-concat JSON.\n' +
            '5. Validate all parameters at the top; return 400 on missing required params.\n' +
            '6. Deploy: `mvn clean install -pl core,ui.apps -PautoInstallPackage -DskipTests`',
          'service-user':
            '1. Write repo-init script (create service user + set ACL) in `ui.config`.\n' +
            '2. Write `ServiceUserMapperImpl.amended-<app>.xml` in `ui.config`.\n' +
            '3. In the OSGi service: inject `ResourceResolverFactory`, call `getServiceResourceResolver(SUBSERVICE_MAP)`.\n' +
            '4. Use try-with-resources — never cache the resolver.\n' +
            '5. Deploy: `mvn clean install -pl core,ui.apps,ui.config -PautoInstallPackage -DskipTests`',
          'seo-optimizer':
            '1. Extract page body text recursively from `jcr:content` — cap at 5000 chars.\n' +
            '2. Build AI prompt: system (role + brand) | user (metadata + body + question).\n' +
            '3. Strip markdown fences from AI JSON responses before JSON.parse.\n' +
            '4. Map AI response fields to form fields — handle both flat and nested key formats.\n' +
            '5. Output GEO meta tags: geo.region, geo.placename, geo.position, ICBM, canonical, og:*, hreflang.',
        };

        for (const [sectionId, workflow] of Object.entries(workflowBySection)) {
          if (bySec.has(sectionId)) {
            sections.push(`## ${SECTION_LABELS[sectionId]} — Workflow\n\n${workflow}`);
          }
        }
      }

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}
