import { z } from 'zod';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// ─── Inline knowledge (loaded at startup so the tool works in npx mode) ─────
const PIPELINE_SECTIONS = {
    overview: `
## AEM Cloud Service vs EDS — Security Model Overview

| Dimension | AEM as a Cloud Service | EDS |
|---|---|---|
| **Runtime** | Java / OSGi (server-side) | Static HTML + client JS (no server) |
| **Auth model** | IMS (Adobe Identity) / SAML | GitHub auth for publish; no auth on public pages |
| **Attack surface** | Larger (JCR, Java, Dispatcher, OSGi) | Narrow (CDN, JS, headers) |
| **SAST** | SonarQube via Cloud Manager | CodeQL (GitHub Actions) |
| **Dependency scanning** | OWASP Maven plugin + BPA | npm audit + Dependabot |
| **Secrets management** | Cloud Manager env vars (\`$[secret:...]\`) | GitHub Secrets / \`.env\` (never committed) |
| **CDN / WAF** | Adobe Fastly + Dispatcher | Adobe Fastly (lighter config) |
| **Security headers** | Dispatcher vhost (\`conf.d/\`) | \`head.html\` + \`.helix/headers\` |
| **XSS prevention** | HTL auto-escaping + XSSAPI | Avoid innerHTML; use textContent / createElement |
| **Compliance** | ISO 27001, SOC 2, GDPR via Adobe | CDN-layer + GitHub compliance (simpler model) |

### AEM Cloud Pipeline (7 gates)
\`\`\`
Commit → 1.SAST/SonarQube → 2.Dependency Scan → 3.Functional Tests
       → 4.Security Smoke → 5.BPA/Stage → 6.Cloud Manager Deploy
       → 7.Dispatcher + Fastly CDN enforcement
\`\`\`

### EDS Pipeline (7 gates)
\`\`\`
Commit → 1.Content Source Security (Git/Drive/SharePoint)
       → 2.GitHub Actions (secret scan + npm audit + CodeQL)
       → 3.Edge Delivery CDN (Fastly, DDoS, TLS)
       → 4.HTTP Headers & CSP (head.html / .helix/headers)
       → 5.Client-side JS (block code XSS / supply chain)
       → 6.Forms & API security
       → 7.RUM Monitoring + Dependabot alerts
\`\`\`
`,
    aem_sast: `
## AEM Cloud — Gate 1: SAST / Code Quality (Cloud Manager)

**Tool:** Cloud Manager built-in SonarQube scanner.

| Category | What is checked |
|---|---|
| Security hotspots | Hardcoded credentials, SQL injection, XXE, unsafe deserialization |
| Code smells | Cyclomatic complexity > 10, duplicated blocks |
| Coverage | Configurable line/branch thresholds |
| Critical bugs | Null pointer dereferences, resource leaks |

**Enforcement:** Pipeline fails if quality gate is not met. Set thresholds in Cloud Manager → Program → Pipelines → Code Quality.

**Developer actions:**
- Fix all SonarQube \`BLOCKER\` and \`CRITICAL\` security hotspots before merging.
- Never suppress (\`@SuppressWarnings\`) security findings without documented justification.
- Run locally before pushing:
\`\`\`bash
mvn sonar:sonar -Dsonar.host.url=http://localhost:9000
\`\`\`
`,
    aem_deps: `
## AEM Cloud — Gate 2: Dependency Scanning (Maven / OSGi)

\`\`\`bash
# Run OWASP dependency check
mvn org.owasp:dependency-check-maven:check

# Find where a vulnerable transitive dep comes from
mvn dependency:tree | grep <artifact-id>
\`\`\`

**AEM-specific rules:**
- Never bundle older \`jackson-databind\`, \`commons-collections\`, \`log4j\` — critical CVEs.
- Pin transitive dependency versions in \`<dependencyManagement>\` when CVEs are found.
- OSGi bundles must use \`Import-Package\` scoped to the AEM SDK API version.
- Never embed third-party JARs that duplicate AEM's bundles (Sling, Jackrabbit) — leads to class-loading exploits.

**GitHub Actions integration:**
\`\`\`yaml
- name: OWASP Dependency Check
  uses: dependency-check/Dependency-Check_Action@main
  with:
    project: 'AEM Cloud Project'
    path: '.'
    format: 'HTML'
    args: '--failOnCVSS 7'
\`\`\`
`,
    aem_secrets: `
## AEM Cloud — Secrets Management (Cloud Manager)

**Set secrets in Cloud Manager → Environment → Variables → toggle "Secret".**

Reference in OSGi config (\`ui.config/\`):
\`\`\`json
{
  "apiKey": "$[env:MY_API_KEY;default=]",
  "apiSecret": "$[secret:MY_API_SECRET]"
}
\`\`\`

**Rules:**
- \`$[env:VAR]\` — plain environment variable (visible in logs).
- \`$[secret:VAR]\` — masked secret (never appears in logs).
- **Never** commit real values to Git — always use \`$[..]\` placeholders.
- Service user passwords → AEM Crypto Support, never plaintext in configs.
`,
    aem_dispatcher: `
## AEM Cloud — Gate 7: Dispatcher + CDN Enforcement

**Dispatcher filters (\`dispatcher.any\`):**
\`\`\`apache
/filter {
  /0001 { /type "deny"  /url "/system/*" }
  /0002 { /type "deny"  /url "/crx/*" }
  /0003 { /type "deny"  /url "/bin/*" }
  /0004 { /type "deny"  /url "*.json" }
  /0005 { /type "deny"  /url "*.1.json" }
  /0100 { /type "allow" /url "/content/*" }
  /0101 { /type "allow" /url "/etc.clientlibs/*" }
}
\`\`\`

**Security headers (\`conf.d/available_vhosts/\`):**
\`\`\`apache
<IfModule mod_headers.c>
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'"
</IfModule>
\`\`\`

**Security smoke tests (run after every deploy):**
\`\`\`bash
curl -I https://<publish>/system/console   # expect 403
curl -I https://<publish>/crx/de           # expect 403
curl -I https://<publish>/.json            # expect 403/404
\`\`\`
`,
    aem_checklist: `
## AEM Cloud — Security Checklist

\`\`\`
Auth & Access Control
[ ] CRXDE Lite disabled on publish (Adobe default — verify)
[ ] /system/console returns 403 on publish
[ ] Service users used (not admin) for all Sling Model resource access
[ ] ACLs set on /content nodes for correct user groups
[ ] OAuth / SAML IMS integration (no local admin accounts in prod)

Code Security
[ ] No hardcoded credentials in Java, OSGi configs, or scripts
[ ] All user input sanitized via XSSAPI before rendering in HTL
[ ] ResourceResolver closed in finally blocks
[ ] JCR query parameters bound (no string concatenation → injection)

Infrastructure
[ ] All secrets in Cloud Manager env vars ($[secret:...])
[ ] Dispatcher filters block .json, /system/*, /crx/*, /bin/*
[ ] Security headers set in Dispatcher vhost
[ ] TLS 1.2+ enforced (Adobe manages — verify via SSL Labs)
[ ] BPA run against stage before production promotion
[ ] SonarQube BLOCKER/CRITICAL issues resolved
\`\`\`
`,
    eds_ci: `
## EDS — Gate 2: GitHub Actions Security Pipeline

\`\`\`yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]

permissions:
  contents: read
  security-events: write

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env: { GITHUB_TOKEN: "\${{ secrets.GITHUB_TOKEN }}" }

  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm audit --audit-level=high
      - uses: actions/dependency-review-action@v4
        if: github.event_name == 'pull_request'

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: javascript }
      - uses: github/codeql-action/analyze@v3

  validate-blocks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx eds-validate ./blocks --strict
\`\`\`
`,
    eds_headers: `
## EDS — Gate 4: HTTP Security Headers

**In \`.helix/headers\` (or SharePoint/Drive-connected config):**
\`\`\`
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
\`\`\`

**In \`scripts/head.html\` (CSP meta tag):**
\`\`\`html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
           script-src 'self' https://www.googletagmanager.com;
           style-src 'self' 'unsafe-inline';
           img-src 'self' data: https:;
           connect-src 'self' https://api.example.com;
           frame-ancestors 'self'">
\`\`\`

| Header | Risk if missing |
|---|---|
| \`Strict-Transport-Security\` | Downgrade / MITM attacks |
| \`X-Content-Type-Options\` | MIME sniffing attacks |
| \`X-Frame-Options\` | Clickjacking |
| \`Content-Security-Policy\` | XSS |
| \`Referrer-Policy\` | Referrer leakage |
`,
    eds_blocks: `
## EDS — Gate 5: Client-side JS Block Code Security

\`\`\`javascript
// ✅ SAFE — textContent for any authored text
element.textContent = authoredText;

// ✅ SAFE — create DOM nodes explicitly
const link = document.createElement('a');
link.href = sanitizeUrl(url);   // validate: no javascript:, data:
link.textContent = label;

// ✅ SAFE — allowlisted API origins only
const ALLOWED = ['https://api.example.com'];
if (!ALLOWED.some(o => url.startsWith(o))) throw new Error('Blocked');
const data = await fetch(url).then(r => r.json());

// ❌ NEVER — direct innerHTML with authored/external content (XSS)
element.innerHTML = block.querySelector('p').innerHTML;

// ❌ NEVER — eval() or new Function()
eval(someCode);
\`\`\`

**Third-party scripts — always use SRI and load in delayed.js:**
\`\`\`javascript
// scripts/delayed.js (never scripts.js — that's above the fold)
const s = document.createElement('script');
s.src = 'https://cdn.example.com/lib.min.js';
s.integrity = 'sha384-<hash>';  // from https://www.srihash.org/
s.crossOrigin = 'anonymous';
document.head.appendChild(s);
\`\`\`
`,
    eds_checklist: `
## EDS — Security Checklist

\`\`\`
Source & CI
[ ] Branch protection on main (require PR review + status checks)
[ ] GitHub Secret Scanning enabled (automatic on public repos)
[ ] Gitleaks / git-secrets pre-commit hook installed
[ ] npm audit passes with --audit-level=high
[ ] GitHub Dependabot alerts enabled
[ ] CodeQL SAST scan in CI
[ ] eds-validate ./blocks --strict passes

CDN & Headers
[ ] Strict-Transport-Security header set
[ ] X-Content-Type-Options: nosniff
[ ] X-Frame-Options: SAMEORIGIN
[ ] Content-Security-Policy restricts script/style sources
[ ] No wildcard CORS (Access-Control-Allow-Origin: *)
[ ] Validate at https://securityheaders.com

Block Code
[ ] No innerHTML with authored/external content (use textContent)
[ ] No eval() or new Function()
[ ] All fetch() calls target allowlisted origins
[ ] Third-party scripts use SRI hashes and load in delayed.js
[ ] Form submissions rate-limited and validated server-side

Monitoring
[ ] RUM enabled (aem.live/developer/rum)
[ ] CDN log anomaly alerts configured
[ ] Dependabot auto-merge for patch updates
\`\`\`
`,
};
export function registerAemSecurityPipeline(server) {
    server.tool('aem_security_pipeline', `End-to-end security pipeline reference for AEM as a Cloud Service and EDS (Edge Delivery Services). Returns gate-by-gate guidance on SAST/SonarQube, dependency scanning (OWASP Maven / npm audit), secrets management (Cloud Manager env vars), Dispatcher security filters, HTTP security headers, GitHub Actions security workflows, client-side JS XSS prevention, and security checklists. Covers both stacks side-by-side. Query by platform (aem | eds | both) and section (overview | sast | deps | secrets | dispatcher | headers | blocks | ci | checklist | all).`, {
        platform: z
            .enum(['aem', 'eds', 'both'])
            .optional()
            .default('both')
            .describe('Which platform: "aem" (Cloud Service), "eds" (Edge Delivery Services), or "both".'),
        section: z
            .enum(['overview', 'sast', 'deps', 'secrets', 'dispatcher', 'headers', 'blocks', 'ci', 'checklist', 'all'])
            .optional()
            .default('overview')
            .describe('Section to return:\n' +
            '  overview — side-by-side comparison + pipeline diagrams\n' +
            '  sast — SAST/SonarQube (AEM) or CodeQL (EDS)\n' +
            '  deps — dependency scanning (Maven OWASP / npm audit)\n' +
            '  secrets — secrets management (Cloud Manager / GitHub Secrets)\n' +
            '  dispatcher — Dispatcher filters + CDN rules (AEM)\n' +
            '  headers — HTTP security headers (both)\n' +
            '  blocks — client-side JS block code security (EDS)\n' +
            '  ci — GitHub Actions security workflow (EDS)\n' +
            '  checklist — full security checklist for deployment readiness\n' +
            '  all — full guide'),
    }, {
        title: 'AEM / EDS Security Pipeline',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ platform = 'both', section = 'overview' }) => {
        const parts = [];
        parts.push(`# Security Pipeline — ${platform === 'both' ? 'AEM Cloud Service & EDS' : platform === 'aem' ? 'AEM as a Cloud Service' : 'Edge Delivery Services (EDS)'}`);
        const want = (s) => section === 'all' || section === s;
        // ── Overview ────────────────────────────────────────────────────────
        if (want('overview')) {
            parts.push(PIPELINE_SECTIONS.overview);
        }
        // ── AEM sections ─────────────────────────────────────────────────────
        if (platform !== 'eds') {
            if (want('sast'))
                parts.push(PIPELINE_SECTIONS.aem_sast);
            if (want('deps'))
                parts.push(PIPELINE_SECTIONS.aem_deps);
            if (want('secrets'))
                parts.push(PIPELINE_SECTIONS.aem_secrets);
            if (want('dispatcher'))
                parts.push(PIPELINE_SECTIONS.aem_dispatcher);
            if (want('checklist'))
                parts.push(PIPELINE_SECTIONS.aem_checklist);
        }
        // ── EDS sections ─────────────────────────────────────────────────────
        if (platform !== 'aem') {
            if (want('ci'))
                parts.push(PIPELINE_SECTIONS.eds_ci);
            if (want('headers'))
                parts.push(PIPELINE_SECTIONS.eds_headers);
            if (want('blocks'))
                parts.push(PIPELINE_SECTIONS.eds_blocks);
            if (want('checklist'))
                parts.push(PIPELINE_SECTIONS.eds_checklist);
        }
        // ── AEM headers (both platforms share header guidance) ───────────────
        if (platform === 'aem' && want('headers')) {
            parts.push(PIPELINE_SECTIONS.eds_headers.replace('## EDS', '## AEM Cloud'));
        }
        if (parts.length <= 1) {
            parts.push(`No content matched platform="${platform}" section="${section}".\n\n` +
                `Available sections: overview | sast | deps | secrets | dispatcher | headers | blocks | ci | checklist | all\n` +
                `Available platforms: aem | eds | both`);
        }
        return {
            content: [{ type: 'text', text: parts.join('\n') }],
        };
    });
}
//# sourceMappingURL=aem-security-pipeline.js.map