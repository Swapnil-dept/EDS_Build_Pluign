---
name: aem-eds-security-pipeline
description: >
  End-to-end security pipeline reference for AEM as a Cloud Service and
  Edge Delivery Services (EDS). Covers every gate, scan type, enforcement
  point, and hardening practice from code commit to production delivery.
  Use when reviewing CI/CD security posture, configuring Cloud Manager
  quality gates, writing Dispatcher rules, setting security headers, or
  auditing secrets management.
---

# Security Pipeline — AEM Cloud Service & EDS

---

## Part 1: AEM as a Cloud Service Security Pipeline

The AEM Cloud Service security pipeline layers **seven gates** from code commit to live CDN delivery. Adobe manages the infrastructure; teams own the code and configuration layers.

```
Developer Commit
       │
       ▼
  1. SAST / Code Quality (Cloud Manager)
       │
       ▼
  2. Dependency Scanning (Maven / OSGi)
       │
       ▼
  3. Functional & Integration Tests
       │
       ▼
  4. Security Smoke Tests
       │
       ▼
  5. Stage Deployment → BPA / Smoke
       │
       ▼
  6. Production Deployment (Cloud Manager)
       │
       ▼
  7. CDN + Dispatcher Enforcement (Fastly)
```

---

### Gate 1 — SAST / Code Quality (Cloud Manager)

**What runs:** Cloud Manager's built-in SonarQube-based code quality scanner.

**What it checks:**

| Category | Examples |
|---|---|
| Security hotspots | Hardcoded credentials, SQL injection patterns, XXE, unsafe deserialization |
| Code smells | Cyclomatic complexity > 10, duplicated blocks |
| Coverage | Configurable line/branch coverage thresholds |
| Critical bugs | Null pointer dereferences, resource leaks |

**Enforcement:** Pipeline fails if the quality gate is not met. Thresholds are set in Cloud Manager → Program → Pipelines → Code Quality.

**Developer actions:**
- Fix all SonarQube `BLOCKER` and `CRITICAL` security hotspots before merging.
- Never suppress (`@SuppressWarnings`) security findings without documented justification.
- Run SonarQube locally before pushing: `mvn sonar:sonar -Dsonar.host.url=<url>`.

---

### Gate 2 — Dependency Scanning (Maven / OSGi)

**What to check:**

```bash
# Check for known CVEs in all Maven dependencies
mvn dependency-check:check

# Or with OWASP Maven plugin (add to pom.xml):
# <plugin>
#   <groupId>org.owasp</groupId>
#   <artifactId>dependency-check-maven</artifactId>
#   <version>9.x</version>
# </plugin>
```

**AEM-specific rules:**
- Never bundle older versions of `jackson-databind`, `commons-collections`, `log4j` — these have critical CVEs.
- Pin transitive dependency versions explicitly in `<dependencyManagement>` when CVEs are found.
- Use `mvn dependency:tree` to find where a vulnerable transitive dep originates.
- OSGi bundles must use `Import-Package` headers scoped to the AEM SDK API version.
- Never embed third-party JARs that duplicate AEM's own bundles (Sling, Jackrabbit, etc.) — version conflicts lead to class-loading exploits.

**GitHub Actions integration:**

```yaml
- name: OWASP Dependency Check
  uses: dependency-check/Dependency-Check_Action@main
  with:
    project: 'AEM Cloud Project'
    path: '.'
    format: 'HTML'
    args: '--failOnCVSS 7'
```

---

### Gate 3 — Functional & Integration Tests

**What to cover from a security perspective:**

| Test type | Security focus |
|---|---|
| Sling Model unit tests | Ensure no direct JCR path injection via user input |
| Integration tests (AEM IT) | Access control — verify content is not readable by anonymous users when it shouldn't be |
| UI automation (Selenium / Playwright) | Verify auth redirects, CSRF tokens, and session expiry |
| HTTP smoke tests | Ensure admin endpoints (`/system/console`, `/crx/de`) return `403` on publish |

---

### Gate 4 — Security Smoke Tests

Run as part of the post-deployment validation pipeline stage.

**Mandatory checks after every deploy:**

```bash
# Admin consoles must return 403 on publish
curl -I https://<publish-url>/system/console          # expect 403
curl -I https://<publish-url>/crx/de/index.jsp        # expect 403
curl -I https://<publish-url>/crx/packmgr/index.jsp   # expect 403
curl -I https://<publish-url>/.json                   # expect 404 or 403
curl -I https://<publish-url>/.1.json                 # expect 404 or 403

# Security headers must be present
curl -I https://<publish-url>/ | grep -i "strict-transport-security"
curl -I https://<publish-url>/ | grep -i "x-content-type-options"
curl -I https://<publish-url>/ | grep -i "x-frame-options"
curl -I https://<publish-url>/ | grep -i "content-security-policy"
```

---

### Gate 5 — BPA (Best Practices Analyzer)

Run against stage environment before production promotion.

```bash
# Download BPA from Software Distribution
# Upload to AEM via /system/console/bundles
# Run: /apps/best-practices-analyzer/content/BestPracticesReport.html
```

**Security patterns BPA flags:**
- Hardcoded admin credentials in OSGi configs
- `/var/classes` write access
- Sling GET servlet enabled without suffix restrictions
- Default replication agent credentials
- Missing ACL restrictions on `/content`

---

### Gate 6 — Cloud Manager Deployment Pipeline

**Pipeline types and their security impact:**

| Pipeline type | When to use | Security gate included |
|---|---|---|
| Full stack pipeline | All changes (Java + frontend + config) | Code quality + tests ✓ |
| Frontend pipeline | CSS/JS only | Lighthouse + bundle size |
| Config pipeline | Dispatcher / CDN rules only | Dispatcher lint ✓ |
| Web tier pipeline | Dispatcher config only | Config validation ✓ |

**Secret management in Cloud Manager:**
- Environment variables: Cloud Manager UI → Environment → Variables.
- Secrets (masked): same UI, toggle `Secret` — these never appear in logs.
- Access in OSGi: inject via `@Activate` with `@ObjectClassDefinition` where the value is `$[env:MY_SECRET]`.
- **Never** commit secrets to `ui.config/` OSGi configs in Git — always use `$[env:...]` placeholders.

```xml
<!-- ui.config/src/main/content/jcr_root/apps/myproject/osgiconfig/config/
     com.myproject.core.services.MyService.cfg.json -->
{
  "apiKey": "$[env:MY_API_KEY;default=]",
  "apiSecret": "$[secret:MY_API_SECRET]"
}
```

---

### Gate 7 — CDN + Dispatcher Enforcement (Fastly)

**Dispatcher security rules (dispatcher.any / `conf.d/`):**

```apache
# Block access to admin paths on publish
/filter {
  /0001 { /type "deny"  /url "/system/*" }
  /0002 { /type "deny"  /url "/crx/*" }
  /0003 { /type "deny"  /url "/bin/*" }
  /0004 { /type "deny"  /url "/etc/replication*" }
  /0005 { /type "deny"  /url "*.json" }
  /0006 { /type "deny"  /url "*.1.json" }
  /0007 { /type "deny"  /url "*.tidy.json" }
  /0008 { /type "deny"  /url "*.-1.json" }
  /0009 { /type "deny"  /glob "* /libs/wcm/core/content/siteadmin.html*" }
  /0100 { /type "allow" /url "/content/*" }
  /0101 { /type "allow" /url "/etc.clientlibs/*" }
}
```

**Security headers (vhost / `conf.d/available_vhosts/`):**

```apache
<IfModule mod_headers.c>
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; style-src 'self' 'unsafe-inline'"
</IfModule>
```

**Fastly / CDN layer (AEM Cloud):**
- Adobe manages DDoS protection at the CDN layer.
- IP allowlisting: Cloud Manager → Environment → Advanced Networking → IP Allowlist.
- HTTP request filtering: Cloud Manager CDN rules (`cdn.yaml` in config pipeline).
- Rate limiting: configurable via CDN rules (max RPS per IP).

---

### AEM Cloud Service Security Checklist

```
Auth & Access Control
[ ] CRXDE Lite disabled on publish (Adobe does this by default — verify)
[ ] /system/console returns 403 on publish
[ ] Service users used (not admin) for all Sling Model resource access
[ ] ACLs set on /content nodes for user groups (not just /home/users)
[ ] OAuth / SAML IMS integration configured (no local admin accounts in prod)

Code Security
[ ] No hardcoded credentials in Java, OSGi configs, or scripts
[ ] All user input sanitized via XSSAPI before rendering in HTL
[ ] ResourceResolver closed in finally blocks (no resource leaks)
[ ] SlingHttpServletRequest.getParameter() validated server-side
[ ] SQL/JCR query parameters bound (no string concatenation)

Infrastructure
[ ] All secrets in Cloud Manager environment variables ($[secret:...])
[ ] Dispatcher filters block .json, .1.json, /system/*, /crx/*, /bin/*
[ ] Security headers set in Dispatcher vhost
[ ] TLS 1.2+ enforced (Adobe manages — verify via SSL Labs)
[ ] Replication agent credentials changed from default
[ ] CDN WAF rules enabled for common attack signatures

Supply Chain
[ ] No vulnerable transitive Maven dependencies (CVSS >= 7)
[ ] BPA run against stage before production promotion
[ ] SonarQube BLOCKER/CRITICAL issues resolved
[ ] Third-party JS loaded from trusted CDNs or self-hosted
```

---

## Part 2: EDS (Edge Delivery Services) Security Pipeline

EDS has a fundamentally different threat model: **no server-side Java, no JCR, no Dispatcher**. Content is served as static HTML from a global CDN. The attack surface is narrower but different risks apply.

```
Content Author (SharePoint / Google Drive)
       │
       ▼
  1. Content Source Security (Git / Drive / SharePoint)
       │
       ▼
  2. CI/CD Pipeline (GitHub Actions)
       │
       ▼
  3. Edge Delivery CDN (Fastly / Akamai)
       │
       ▼
  4. HTTP Headers & CSP Enforcement
       │
       ▼
  5. Client-side JS Security (Block code)
       │
       ▼
  6. Forms & API Security
       │
       ▼
  7. Monitoring & Incident Response
```

---

### Gate 1 — Content Source Security

**SharePoint / Google Drive:**
- Restrict edit access to content folders to authenticated authors only.
- Enable audit logging in SharePoint/Drive to track content changes.
- Never store credentials, API keys, or connection strings in content documents.

**Git (code):**
- Branch protection: require PR reviews + status checks before merging to `main`.
- Enable `git-secrets` or GitHub secret scanning to prevent credential leaks.
- Use signed commits for high-security projects.

```bash
# Block common secret patterns
git secrets --install
git secrets --register-aws
# Or use pre-commit hooks with gitleaks:
brew install gitleaks
gitleaks detect --source . --verbose
```

---

### Gate 2 — CI/CD Pipeline (GitHub Actions)

**Secure workflow configuration:**

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

permissions:
  contents: read          # least-privilege: never write unless needed
  security-events: write  # for SARIF upload to GitHub Security tab

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # full history for gitleaks

      - name: Gitleaks Secret Scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci

      - name: npm audit
        run: npm audit --audit-level=high

      - name: Dependency Review (PR only)
        uses: actions/dependency-review-action@v4
        if: github.event_name == 'pull_request'

  sast-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: CodeQL Analysis
        uses: github/codeql-action/init@v3
        with:
          languages: javascript

      - uses: github/codeql-action/analyze@v3
```

**Block code security checks in CI:**

```yaml
  validate-blocks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx eds-validate ./blocks --strict  # uses this MCP server's CLI
      # Checks: XSS safety, no eval/innerHTML, no hardcoded URLs/secrets
```

---

### Gate 3 — Edge Delivery CDN Security

EDS content is served through **Fastly CDN** (Adobe-managed).

**What Adobe provides automatically:**
- DDoS mitigation at CDN layer
- TLS 1.2+ termination (TLS 1.0/1.1 disabled)
- HTTPS redirect (HTTP → HTTPS)
- Automatic certificate management (via AEM as a Cloud)
- Edge-side caching with `Surrogate-Control` / `Cache-Control`

**What teams configure via `headers` config (`/.helix/headers` or `heads.html`):**

```
# .helix/headers  (or configure in your fstab-connected SharePoint/Drive)
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**CDN rules (advanced — `cdn.yaml` if using AEM Cloud integration):**
```yaml
kind: CDN
version: 1
data:
  rules:
    - name: block-admin-paths
      when:
        reqProperty: path
        matches: '^/(system|crx|bin|admin).*'
      action: block
    - name: rate-limit
      when:
        reqProperty: clientIp
      rateLimit:
        limit: 100
        window: 10
        count: all
      action: throttle
```

---

### Gate 4 — HTTP Security Headers & CSP

**`head.html` security headers (EDS):**

```html
<!-- scripts/head.html (loaded on every page) -->
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
           script-src 'self' 'nonce-{NONCE}' https://www.googletagmanager.com;
           style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
           img-src 'self' data: https:;
           font-src 'self' https://fonts.gstatic.com;
           connect-src 'self' https://api.example.com;
           frame-ancestors 'self'">
```

**Minimum required headers (validate with [securityheaders.com](https://securityheaders.com)):**

| Header | Recommended value | Risk if missing |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Downgrade / MITM attacks |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing attacks |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking |
| `Content-Security-Policy` | Restrict script/style sources | XSS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=()` | Feature abuse |

---

### Gate 5 — Client-side JS Security (Block Code)

EDS blocks run entirely in the browser. Key risks: **XSS**, **supply chain attacks**, **insecure third-party scripts**.

**Secure block authoring patterns:**

```javascript
// ✅ SAFE — use textContent for plain text
element.textContent = authoredText;

// ✅ SAFE — create DOM nodes, never inject raw HTML
const link = document.createElement('a');
link.href = sanitizeUrl(url);       // validate scheme (no javascript:)
link.textContent = label;

// ❌ NEVER — direct innerHTML with authored content (XSS)
element.innerHTML = block.querySelector('p').innerHTML;

// ❌ NEVER — eval() or new Function()
eval(someCode);

// ✅ SAFE — fetch from allowlisted origins only
const ALLOWED_ORIGINS = ['https://api.example.com'];
if (!ALLOWED_ORIGINS.some(o => url.startsWith(o))) throw new Error('Blocked');
const data = await fetch(url).then(r => r.json());
```

**Third-party script loading:**

```javascript
// scripts/delayed.js — load non-critical third-party scripts here
// Never load third-party scripts in scripts.js (above the fold)
// Always use Subresource Integrity (SRI) for CDN-hosted scripts

const script = document.createElement('script');
script.src = 'https://cdn.example.com/lib.min.js';
// SRI hash from https://www.srihash.org/
script.integrity = 'sha384-abc123...';
script.crossOrigin = 'anonymous';
document.head.appendChild(script);
```

---

### Gate 6 — Forms & API Security

**Helix Forms / AEM Forms:**
- CSRF protection built into Helix Forms via hidden token fields.
- Validate all form submissions server-side (never trust client validation alone).
- Use `action` pointing to a trusted endpoint only (no open redirects).
- Rate-limit form submission endpoints.

**API calls from blocks:**
```javascript
// Always validate API responses before rendering
async function fetchProducts(query) {
  // Sanitize query parameters
  const params = new URLSearchParams({ q: query.slice(0, 100) });

  const response = await fetch(`/api/products?${params}`, {
    headers: { 'Accept': 'application/json' },
    credentials: 'same-origin',  // never 'include' for cross-origin
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  // Validate shape before using
  if (!Array.isArray(data.items)) throw new Error('Unexpected response shape');
  return data;
}
```

---

### Gate 7 — Monitoring & Incident Response

**EDS:**
- Enable [RUM (Real User Monitoring)](https://www.aem.live/developer/rum) for detecting anomalous traffic patterns.
- Monitor CDN access logs for unusual request patterns (path scanning, auth brute-force).
- Set up GitHub Dependabot for automatic dependency vulnerability alerts.
- GitHub Secret Scanning alerts (enabled by default on public repos).

**AEM Cloud:**
- New Relic APM (included with AEM Cloud) — set alerts on error rates and slow queries.
- Cloud Manager environment logs → filter for `WARN` and `ERROR`.
- AEM Security Notifications via Adobe Admin Console.
- Adobe Support for incident escalation: Sev 1 (production down), Sev 2 (degraded).

---

## Comparison: AEM Cloud vs EDS Security Model

| Dimension | AEM as a Cloud Service | EDS |
|---|---|---|
| **Runtime** | Java / OSGi (server-side) | Static HTML + client JS (no server) |
| **Auth model** | IMS (Adobe Identity) / SAML | GitHub auth for publish; no auth on public pages |
| **Attack surface** | Larger (JCR, Java, Dispatcher, OSGi) | Narrow (CDN, JS, headers) |
| **SAST** | SonarQube via Cloud Manager | CodeQL (GitHub Actions) |
| **Dependency scanning** | OWASP Maven plugin + BPA | npm audit + Dependabot |
| **Secrets management** | Cloud Manager environment variables (`$[secret:...]`) | GitHub Secrets / `.env` (never committed) |
| **CDN / WAF** | Adobe Fastly + Dispatcher | Adobe Fastly (lighter config) |
| **Security headers** | Dispatcher vhost (`conf.d/`) | `head.html` + `.helix/headers` |
| **XSS prevention** | HTL auto-escaping + XSSAPI | Avoid innerHTML; use textContent / createElement |
| **Pen testing** | Required before go-live (Adobe provides tooling) | Automated scans + manual review |
| **Compliance** | ISO 27001, SOC 2, GDPR via Adobe | CDN-layer + GitHub compliance (simpler model) |
| **Incident response** | Adobe Managed Services + Customer | CDN rollback + GitHub revert |

---

## Quick Reference: Security Pipeline Commands

### AEM Cloud Service
```bash
# Run code quality locally (SonarQube)
mvn sonar:sonar -Dsonar.host.url=http://localhost:9000

# Run OWASP dependency check
mvn org.owasp:dependency-check-maven:check

# Verify dispatcher rules
docker run -it --rm \
  -v $(pwd)/dispatcher:/etc/httpd \
  adobe/aem-cloud-service-dispatcher-sdk:latest

# Validate no admin paths exposed
curl -I https://publish-xxx.adobeaemcloud.com/system/console  # expect 403
curl -I https://publish-xxx.adobeaemcloud.com/crx/de          # expect 403
```

### EDS
```bash
# Secret scan (before push)
gitleaks detect --source . --verbose

# npm dependency audit
npm audit --audit-level=high

# Block code security validation (uses this MCP server CLI)
npx eds-validate ./blocks --strict

# Validate security headers (requires live URL)
curl -I https://your-eds-site.hlx.page/ | grep -iE "strict-transport|x-content|x-frame|content-security"

# Lighthouse security audit
npx lighthouse https://your-eds-site.hlx.page/ \
  --only-categories=best-practices \
  --output=json | jq '.categories["best-practices"].score'
```
