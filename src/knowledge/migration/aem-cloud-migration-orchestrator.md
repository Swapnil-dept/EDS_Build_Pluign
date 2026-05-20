---
name: aem-cloud-migration-orchestrator
description: >
  Orchestrates a full AEM to AEMaaCS cloud migration engagement. Use this skill
  when someone is starting a cloud migration, planning the full migration workflow,
  asking how to migrate an AEM project to AEM as a Cloud Service, or needs to
  understand the end-to-end sequence of migration activities. Trigger phrases:
  "migrate to cloud", "start a cloud migration", "AEM cloud migration plan",
  "how do I migrate my AEM project to AEMaaCS", "cloud migration roadmap",
  "what does a full AEM migration involve".
---

# AEM Cloud Migration Orchestrator

This skill coordinates the end-to-end cloud migration workflow. It does not
duplicate content from the specialist tools — instead it sequences them and
tells you when to apply each one.

**Specialist tools used during migration:**
- `aem-bpa-review` — Best Practices Analyzer report triage
- `aem-best-practices` — codebase anti-pattern audit
- `aem-migration-pattern` — per-component cloud compatibility updates
- `scaffold-aem-component` — component scaffolding for cloud patterns
- `aem-dispatcher-config` — Dispatcher config updates for AEMaaCS

---

## Migration Phases Overview

```
Phase 1: Assess    → BPA report + code audit
Phase 2: Remediate → Fix code, configs, and components
Phase 3: Migrate   → Transfer content to cloud
Phase 4: Validate  → Cloud Manager pipeline + smoke testing
Phase 5: Go Live   → Cutover and monitoring
```

Work through phases in order. Phases 1 and 2 are iterative — remediation findings
often reveal additional issues that need another audit pass.

---

## Phase 1: Assess

**Goal**: Understand the full scope of work before writing a single line of code.

### Step 1a — Run the BPA

Install and run the Best Practices Analyzer on the source AEM instance.

→ Apply the **`aem-bpa-review`** tool for:
- How to read and filter BPA output
- Effort estimation by finding type
- Linking BPA findings to source code
- Generating a migration plan summary

**Output from this step**: prioritised list of findings with T-shirt-size effort estimates.

### Step 1b — Audit the Codebase

With the BPA findings in hand, run a code audit against the actual source tree.

→ Apply the **`aem-best-practices`** tool for:
- All 11 audit categories (admin sessions, OSGi configs, deprecated APIs, Oak indexes, etc.)
- Severity-rated findings table
- Recommended fixes per category

**Output from this step**: a code-level findings report, separate from BPA (BPA
is runtime data; the code audit is static analysis).

### Phase 1 Deliverable

Combine BPA findings and code audit findings into a migration backlog. Group items by:
1. **Blockers** — must fix before any deployment to AEMaaCS
2. **High priority** — fix before go-live
3. **Low priority** — can address post-migration

---

## Phase 2: Remediate

**Goal**: Fix all blockers and high-priority findings from Phase 1.

### Code Remediation

Work through findings category by category:

| Finding Type | Tool to Apply |
|---|---|
| JSP components, scriptlet logic | `aem-migration-pattern` |
| Per-component cloud compatibility | `aem-migration-pattern` |
| Dialog modernization (Coral 2, style options) | `scaffold-aem-component` |
| Dispatcher config for AEMaaCS | `aem-dispatcher-config` |
| Sling mappings / URL resolution | `aem-best-practices` |
| Component sprawl / duplication | `scaffold-aem-component` |

### Remediation Order (Recommended)

1. Fix admin session / service user issues first (security blockers)
2. Fix deprecated API usage (compile-time blockers)
3. Fix OSGi configs (runmode and secret handling)
4. Fix Oak indexes (pipeline blockers — AEMaaCS rejects invalid indexes)
5. Migrate JSP components to HTL
6. Update Dispatcher config
7. Fix Sling mappings

### Validation Gate Before Phase 3

Before moving to content migration:
- [ ] `mvn clean install` passes with no errors
- [ ] Cloud Manager Build Images step passes (Dispatcher SDK validates)
- [ ] Deploy to AEMaaCS Dev environment succeeds
- [ ] No ERROR-level log messages on startup related to OSGi/Sling resolution
- [ ] Basic smoke test: homepage loads, DAM accessible, author login works

---

## Phase 3: Migrate Content

**Goal**: Transfer content from the source AEM instance to AEMaaCS.

### Content Transfer Tool (CTool)

- Extraction from source environment
- Ingestion into AEMaaCS target environment
- Delta top-up strategy for reducing cutover downtime
- Pre-migration content cleanup checklist
- Mutable vs immutable path planning

**Key sequencing decisions**:
- Run an initial "full" ingestion to AEMaaCS Dev/Stage first to validate
- Perform delta top-ups on each subsequent environment promotion
- Cutover ingestion to Production happens at go-live (Phase 5)

---

## Phase 4: Validate

**Goal**: Confirm the migrated environment works correctly end-to-end.

### Technical Validation

- [ ] Cloud Manager full-stack pipeline passes (Build + Deploy + Smoke Tests)
- [ ] All content transferred — spot-check key pages in Author and Publish
- [ ] Dispatcher filter rules block expected paths (use DOT and manual curl tests)
- [ ] CDN and cache headers correct (`curl -I {url}` and inspect Cache-Control, Age)
- [ ] Adobe Target / Analytics tags firing (check browser network panel)
- [ ] Forms and interactive components functional
- [ ] DAM processing complete — check `dam:assetState` is `processed` on sample assets
- [ ] Search returning expected results

### Performance Baseline

Compare key metrics against the source environment:
- Time to First Byte for top 10 pages
- Lighthouse performance score
- Image delivery format (WebP/AVIF via Smart Imaging if DM is in use)

---

## Phase 5: Go Live

**Goal**: Cut over production traffic to AEMaaCS.

### Cutover Checklist

- [ ] Final delta content ingestion complete
- [ ] DNS TTLs lowered (24–48 hrs before cutover)
- [ ] SSL certificates provisioned in Cloud Manager CDN
- [ ] Custom domain added in Cloud Manager (via Adobe I/O / Cloud Manager API)
- [ ] Smoke test against the new Production AEMaaCS hostname
- [ ] DNS records updated to point to AEMaaCS CDN
- [ ] Monitor error rates and Dispatcher logs for 1–2 hrs post-cutover
- [ ] Rollback plan documented (DNS revert + source AEM still live)

### Post-Go-Live

- Decommission source AEM only after 2–4 weeks of stable production operation
- Schedule regular review of Cloud Manager pipeline health
- Transition to ongoing AEMaaCS operational practices (log monitoring, index
  management, content release workflows)

---

## Common Migration Failure Modes

| Failure | When it Surfaces | Prevention |
|---|---|---|
| Oak index pipeline failure | Cloud Manager Build step | Run `aem-best-practices` on index definitions before deploying |
| OSGi bundles not resolving | Startup after deployment | Audit for removed/changed APIs; check `system/console/bundles` |
| Dispatcher validation failure | Build Images step | Run `./validator full .` locally before every Dispatcher commit |
| Content not migrating | CTool ingestion | Verify source `dam:assetState`, check CTool logs for skipped paths |
| Missing service user permissions | Runtime 403/500 errors | Map all `ResourceResolver.getServiceResourceResolver()` calls to service users |
| Hardcoded hostnames | Wrong URLs in content | Search codebase for hardcoded environment URLs; use Externalizer service |
