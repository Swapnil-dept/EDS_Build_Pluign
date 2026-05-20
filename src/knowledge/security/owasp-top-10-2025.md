---
name: owasp-top-10-2025
description: >
  OWASP Top 10:2025 reference checklist for application security reviews.
  Use this skill when reviewing code for security vulnerabilities, performing
  threat modeling, auditing authentication/authorization, or assessing
  dependency risk. Covers A01-A10 with specific check items per category,
  CWE mappings, and severity guidance.
---

# OWASP Top 10:2025 — Security Review Checklist

## How to Use This Skill

This is a reference checklist for systematic security review. When reviewing code, work through each category (A01-A10) and check for the specific patterns listed. Not every category applies to every codebase — skip categories that don't match the stack or attack surface, but document why you skipped them.

## Severity Levels

- **Critical** — Exploitable with severe impact (auth bypass, remote code execution, data breach). Fix immediately.
- **High** — Likely exploitable with significant impact. Fix in current sprint.
- **Medium** — Exploitable under specific conditions. Address in near-term roadmap.
- **Low** — Defense-in-depth improvement. Reduces attack surface but not directly exploitable.
- **Informational** — Best practice recommendation. Improves security posture.

---

## A01: Broken Access Control

The #1 risk. Users acting outside their intended permissions.

**Check for:**
- Insecure Direct Object References (IDOR) — can a user access another user's resources by changing an ID in the URL or request body?
- Missing function-level access control — are admin endpoints protected, or just hidden?
- CORS misconfiguration — are `Access-Control-Allow-Origin` headers overly permissive (wildcard or reflecting arbitrary origins)?
- Path traversal — can user input reach file system paths without sanitization?
- Privilege escalation — can a regular user reach admin functionality by manipulating roles, tokens, or request parameters?
- Missing authorization checks on state-changing operations (DELETE, PUT, PATCH)
- CSRF — are state-changing requests protected with tokens or SameSite cookies?
- SSRF — can user-supplied URLs cause the server to make requests to internal services?
- JWT issues — is the algorithm enforced server-side? Are tokens validated for expiry and audience? Can `alg: none` bypass signature checks?

## A02: Security Misconfiguration

Insecure defaults, incomplete configurations, open cloud storage, unnecessary features, verbose errors.

**Check for:**
- Default credentials still enabled (admin/admin, test accounts)
- Unnecessary features, services, or ports exposed
- Verbose error messages in production leaking stack traces, SQL queries, or internal paths
- Missing security headers: HSTS, X-Content-Type-Options, X-Frame-Options, Content-Security-Policy, Permissions-Policy, Referrer-Policy
- Directory listing enabled on web servers
- Debug mode or development tools active in production (e.g., Laravel debug bar, Django debug=True, Spring Boot Actuator endpoints exposed)
- Cloud storage buckets or blob containers with public access
- Permissive firewall rules or security group configurations
- Sample applications or documentation endpoints left deployed

## A03: Software Supply Chain Failures

Compromises in the ecosystem of dependencies, build systems, and distribution infrastructure.

**Check for:**
- Dependencies with known CVEs (cross-reference with dependency scanning)
- Pinned vs floating dependency versions — are lockfiles committed and used in CI?
- Integrity checks — are package checksums or signatures verified during install?
- Build pipeline security — can a compromised dependency inject code into the build output?
- Typosquatting risk — any dependencies with names suspiciously similar to popular packages?
- Private registry security — are credentials for private registries stored securely?
- Post-install scripts — do any dependencies run scripts that could modify the build environment?

## A04: Cryptographic Failures

Missing, weak, or misused cryptography. Sensitive data exposed through inadequate encryption.

**Check for:**
- Sensitive data transmitted over HTTP instead of HTTPS (including internal services where applicable)
- Weak or deprecated algorithms: MD5, SHA1 for security purposes, DES, RC4, RSA with small key sizes
- Hardcoded encryption keys, IVs, or salts in source code
- Predictable randomness — using `Math.random()`, `rand()`, or language-equivalent non-cryptographic PRNGs for security-sensitive operations
- Missing encryption at rest for sensitive data (PII, credentials, payment data)
- Certificate validation disabled or bypassed (`verify=False`, `rejectUnauthorized: false`)
- Password storage — are passwords hashed with bcrypt, scrypt, or Argon2? Or are they using fast hashes (SHA256) or, worse, plaintext?
- Key management — are keys rotated? Stored separately from encrypted data? Never logged?

## A05: Injection

Untrusted data sent to an interpreter as part of a command or query.

**Check for:**
- SQL injection — are queries parameterized? Watch for string concatenation in raw SQL, ORM raw query methods, and dynamic table/column names
- NoSQL injection — are MongoDB/DynamoDB queries built from unsanitized user input?
- OS command injection — does user input reach `exec()`, `system()`, `child_process`, or similar? Use parameterized APIs instead of shell strings
- XSS (Cross-Site Scripting) — is user input rendered in HTML without encoding? Check for `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, `| safe`, and unescaped template variables
- Template injection (SSTI) — can user input reach server-side template rendering (Jinja2, Twig, Freemarker, Thymeleaf)?
- LDAP injection — is LDAP query input escaped?
- Header injection — can user input reach HTTP response headers (CRLF injection)?
- Expression Language injection — in Java (SpEL), .NET, or similar frameworks

## A06: Insecure Design

Architectural and design flaws that can't be fixed by better implementation alone.

**Check for:**
- Missing rate limiting on authentication, password reset, or other abuse-prone endpoints
- Business logic flaws — can steps be skipped, repeated, or reordered in multi-step workflows (checkout, registration, approval chains)?
- Unprotected storage of credentials (CWE-256)
- Unrestricted file upload (CWE-434) — can users upload executable files, oversized files, or files that bypass type checks?
- Trust boundary violations (CWE-501) — is data from untrusted sources treated as trusted without validation?
- Missing security controls that should exist by design: account lockout, transaction limits, audit logging for sensitive operations
- Insufficient separation of privileges

## A07: Authentication Failures

Weaknesses that allow attackers to assume other users' identities.

**Check for:**
- Weak password policies (no minimum length, no complexity, no breach-list check)
- Missing MFA on sensitive operations (admin access, financial transactions, account recovery)
- Session management issues: long-lived sessions without re-authentication, session tokens in URLs, missing session invalidation on logout or password change
- Credential stuffing exposure — no rate limiting or CAPTCHA on login endpoints
- Insecure "remember me" implementations
- Password reset flaws: predictable tokens, tokens that don't expire, user enumeration through reset responses
- OAuth/OIDC misconfigurations: missing state parameter, overly broad scopes, token leakage through redirects
- Credentials in logs, error messages, or URLs

## A08: Software or Data Integrity Failures

Code and infrastructure that doesn't verify the integrity of data, updates, or configurations before trusting them.

**Check for:**
- Deserialization of untrusted data — Java's `ObjectInputStream`, Python's `pickle`, PHP's `unserialize()`, .NET's `BinaryFormatter` — without validation or using known-safe alternatives (JSON, protobuf)
- Unsigned or unverified software updates
- CI/CD pipeline integrity — can a pull request or build step inject arbitrary code that reaches production without review?
- Configuration loaded from untrusted sources without validation
- Plugin or extension loading without integrity verification
- Data from external APIs or webhooks processed without signature validation

## A09: Security Logging & Alerting Failures

Missing visibility into security-relevant events.

**Check for:**
- Missing logging for authentication events (logins, failures, lockouts), authorization failures, input validation failures, and sensitive data access
- Logs that don't include enough context (who, what, when, from where) to investigate incidents
- Sensitive data in logs — passwords, tokens, PII, credit card numbers in log output
- Logs stored insecurely — local-only without forwarding, no tamper protection, accessible to application-level attackers
- No alerting on anomalous patterns (burst of auth failures, privilege escalation attempts, unusual data access volumes)
- Missing audit trails for regulatory-sensitive operations

## A10: Mishandling of Exceptional Conditions

Applications that break unsafely when faced with unexpected inputs, resource shortages, timeouts, or internal failures.

**Check for:**
- Fail-open logic — does the system grant access or skip validation when an error occurs?
- Stack traces, internal paths, database details, or keys leaked in error responses
- Uncaught exceptions that crash the application or leave it in an inconsistent state
- Resource exhaustion — no limits on file upload size, request body size, query complexity, or recursion depth
- Timeout handling — do missing or infinite timeouts allow denial of service through slow requests?
- Error messages that differ between valid and invalid inputs (enabling user enumeration, timing attacks)
- Empty catch blocks that silently swallow errors, masking security-relevant failures
