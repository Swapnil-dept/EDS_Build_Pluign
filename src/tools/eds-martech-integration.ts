import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * `eds_martech_integration_guide` — guidance for vendoring and instrumenting
 * Adobe's `aem-martech` plugin (https://github.com/adobe-rnd/aem-martech)
 * into an EDS project: phased WebSDK/ACDL loading (eager/lazy/delayed),
 * head.html preload hints, scripts.js wiring, consent management, and the
 * Launch container self-hosted-alloy configuration it requires.
 *
 * Guidance only — this server never runs git commands (including
 * `git subtree`), so installation stays a copy/paste step the user runs
 * themselves.
 */
export function registerEdsMartechIntegration(server: McpServer) {
  server.registerTool(
    'eds_martech_integration_guide',
    {
      description: 'Guidance for integrating the Adobe aem-martech plugin (WebSDK/alloy.js + Adobe Client Data Layer + Target/AJO + Analytics + Launch) into an EDS project: git subtree vendoring, Launch container self-hosted-alloy configuration, head.html preload hints, scripts.js instrumentation (eager/lazy/delayed phases), consent management wiring (AEM Consent Banner Block / OneTrust / Cookiebot), SPA/dynamic-content personalization, and the full API reference. Guidance only — never runs git commands; installation commands are returned for the user to run themselves.',
      inputSchema: {
      topic: z
        .enum([
          'overview',
          'prerequisites',
          'installation',
          'head-html',
          'instrumentation',
          'consent-management',
          'spa-dynamic-content',
          'api-reference',
          'checklist',
          'all',
        ])
        .default('all')
        .describe('Which aem-martech integration topic to get guidance on'),
      datastreamId: z.string().optional().describe('AEP datastream ID to substitute into the config example'),
      orgId: z.string().optional().describe('IMS org ID (e.g. "XXXXXXXXXXXXXXX@AdobeOrg") to substitute into the config example'),
      edgeDomain: z.string().optional().describe('First-party CNAME edge domain (e.g. "edge.your-site.com")'),
      launchUrls: z.array(z.string()).optional().describe('Launch (AEP Tags) script URLs to load via the plugin'),
    },
      annotations: {
      title: 'aem-martech Integration Guide',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    },
    async ({ topic, datastreamId, orgId, edgeDomain, launchUrls }) => {
      const ds = datastreamId ?? 'YOUR_DATASTREAM_ID';
      const org = orgId ?? 'XXXXXXXXXXXXXXX@AdobeOrg';
      const edge = edgeDomain ?? 'edge.your-domain.com';
      const launchUrlsLiteral = launchUrls?.length
        ? `[${launchUrls.map((u) => `'${u}'`).join(', ')}]`
        : `[/* your Launch script URLs here */]`;

      const sections: string[] = [];
      const shouldInclude = (t: string) => topic === 'all' || topic === t;

      if (shouldInclude('overview')) {
        sections.push(`## Overview

[aem-martech](https://github.com/adobe-rnd/aem-martech) replaces a monolithic Adobe Launch script with a phased loader for the Adobe Experience Platform WebSDK (\`alloy.js\`) and the Adobe Client Data Layer (ACDL), aligned with EDS's own eager/lazy/delayed lifecycle:

- **Eager phase** — personalization (Target/AJO), before first paint, to avoid content flicker.
- **Lazy phase** — analytics + data layer, after main content renders, so it never delays LCP.
- **Delayed phase** — Launch script + non-essential tags, after the page is interactive.

It wraps AEP WebSDK + ACDL and integrates Adobe Target/AJO, Adobe Analytics, and Adobe Experience Platform Tags (Launch) — same official Adobe APIs as a normal Launch install, just sequenced for Core Web Vitals.`);
      }

      if (shouldInclude('prerequisites')) {
        sections.push(`## Prerequisites

- Access to Adobe Experience Platform (basic data-collection permissions), Adobe Analytics, and Adobe Target or AJO.
- **Launch container configuration** (do this before instrumenting the project):
  1. Open your Launch property → Extensions.
  2. Install/configure the **Adobe Experience Platform Web SDK** extension, **v2.34.0+**.
  3. Under Build Options, select **"Use a self-hosted alloy.js instance"**.
  4. Set the instance name to \`alloy\`.
  5. Save and publish.
  6. Ensure the **Adobe Client Data Layer** extension is also configured.

This tells Launch to hook into the alloy instance this plugin creates instead of bundling its own copy — Launch data elements, rules, and Web SDK event types keep working normally.

> ⚠️ The library defaults consent to \`pending\`. Pair it with a consent management system (see the consent-management topic) rather than setting consent to \`in\` by default.`);
      }

      if (shouldInclude('installation')) {
        sections.push(`## Installation (run these yourself — this tool does not execute git commands)

Vendor the plugin into your EDS repo with \`git subtree\` (no package manager needed, code stays self-contained):

\`\`\`bash
git subtree add --squash --prefix plugins/martech git@github.com:adobe-rnd/aem-martech.git main
\`\`\`

To pull later updates:

\`\`\`bash
git subtree pull --squash --prefix plugins/martech git@github.com:adobe-rnd/aem-martech.git main
\`\`\`

If \`subtree pull\` fails, delete \`plugins/martech\` and re-run \`git subtree add\`.

If you lint the repo, ignore the vendored minified files in \`.eslintignore\`:

\`\`\`
plugins/martech/src/*.min.js
\`\`\`

(The library also vendors \`alloy.min.js\` (WebSDK) and \`acdl.min.js\` (Adobe Client Data Layer); use the plugin's own \`npm run update:vendor\` inside \`plugins/martech\` to refresh those.)`);
      }

      if (shouldInclude('head-html')) {
        sections.push(`## head.html — preload hints

Append to the end of your project's \`head.html\` so the browser starts fetching the plugin and alloy.js early:

\`\`\`html
<link rel="preload" as="script" crossorigin="anonymous" href="/plugins/martech/src/index.js"/>
<link rel="preload" as="script" crossorigin="anonymous" href="/plugins/martech/src/alloy.min.js"/>
<link rel="preconnect" href="https://edge.adobedc.net"/>
<!-- Change to adobedc.demdex.net if you enable third-party cookies -->
\`\`\`

Use \`eds_config\` (configType: \`head-html\`) for the rest of your project's head.html conventions.`);
      }

      if (shouldInclude('instrumentation')) {
        sections.push(`## scripts.js instrumentation

**1. Import the plugin's methods** at the top of \`scripts.js\`:

\`\`\`javascript
import {
  initMartech,
  updateUserConsent,
  martechEager,
  martechLazy,
  martechDelayed,
} from '../plugins/martech/src/index.js';
\`\`\`

**2. Call \`initMartech\`** at the top of \`loadEager\`, before content decoration:

\`\`\`javascript
async function loadEager(doc) {
  const isConsentGiven = true; /* wire up your real consent check */

  const martechLoadedPromise = initMartech(
    // 1. WebSDK configuration
    {
      datastreamId: '${ds}',
      orgId: '${org}',
      edgeDomain: '${edge}',
      // debugEnabled auto-true on localhost/.page; defaultConsent auto-"pending"
      onBeforeEventSend: (payload) => {
        // mutate payload here; return false to cancel the send
      },
    },
    // 2. Library configuration
    {
      personalization: !!getMetadata('target') && isConsentGiven,
      launchUrls: ${launchUrlsLiteral},
      // decisionScopes: ['my-scope-name'],
    },
  );

  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await Promise.all([
      martechLoadedPromise.then(martechEager),
      loadSection(main.querySelector('.section'), waitForFirstImage),
    ]);
  }
}
\`\`\`

Waiting on \`martechEager\` before/alongside first-section render prevents content flicker from personalized content.

**3. Call \`martechLazy\`** right after \`loadFooter(...)\` in \`loadLazy\`:

\`\`\`javascript
async function loadLazy(doc) {
  // ...
  loadFooter(doc.querySelector('footer'));
  await martechLazy();
  // ...
}
\`\`\`

**4. Call \`martechDelayed\`** inside \`loadDelayed\`:

\`\`\`javascript
function loadDelayed() {
  window.setTimeout(() => {
    martechDelayed();
    import('./delayed.js');
  }, 3000);
}
\`\`\``);
      }

      if (shouldInclude('consent-management')) {
        sections.push(`## Consent management

Call \`updateUserConsent({ collect, marketing, personalize, share })\` (Adobe standard v2.0 consent categories) whenever your CMP fires a consent event.

**AEM Consent Banner Block:**

\`\`\`javascript
function consentEventHandler(ev) {
  const collect = ev.detail.categories.includes('CC_ANALYTICS');
  const marketing = ev.detail.categories.includes('CC_MARKETING');
  const personalize = ev.detail.categories.includes('CC_TARGETING');
  const share = ev.detail.categories.includes('CC_SHARING');
  updateUserConsent({ collect, marketing, personalize, share });
}
window.addEventListener('consent', consentEventHandler);
window.addEventListener('consent-updated', consentEventHandler);
\`\`\`

**OneTrust:**

\`\`\`javascript
function consentEventHandler(ev) {
  const groups = ev.detail;
  const collect = groups.includes('C0002');       // Performance Cookies
  const personalize = groups.includes('C0003');   // Functional Cookies
  const share = groups.includes('C0008');         // Targeted Advertising
  updateUserConsent({ collect, personalize, share });
}
window.addEventListener('consent.onetrust', consentEventHandler);
\`\`\`

**Cookiebot:**

\`\`\`javascript
function handleCookiebotConsent() {
  const { statistics, marketing, preferences } = window.Cookiebot?.consent || {};
  updateUserConsent({ collect: statistics, marketing, personalize: preferences, share: marketing });
}
window.addEventListener('CookiebotOnConsentReady', handleCookiebotConsent);
window.addEventListener('CookiebotOnAccept', handleCookiebotConsent);
\`\`\``);
      }

      if (shouldInclude('spa-dynamic-content')) {
        sections.push(`## SPA / dynamic content

For blocks that render dynamic views (carousels, tabs, client-rendered widgets), manage personalization manually to avoid concurrency issues:

1. Define matching [views in Adobe Target](https://experienceleague.adobe.com/en/docs/target/using/experiences/spa-visual-experience-composer).
2. Import the helpers:

\`\`\`javascript
import {
  isPersonalizationEnabled,
  getPersonalizationForView,
  applyPersonalization,
} from '../plugins/martech/src/index.js';
\`\`\`

3. Fetch personalization when the view renders:

\`\`\`javascript
if (isPersonalizationEnabled()) {
  await getPersonalizationForView('my-view-name');
}
\`\`\`

4. Re-apply it after every significant DOM update:

\`\`\`javascript
applyPersonalization('my-view-name');
\`\`\``);
      }

      if (shouldInclude('api-reference')) {
        sections.push(`## API reference

| Function | Purpose |
|---|---|
| \`initMartech(webSDKConfig, martechConfig)\` | One-time init, called in \`loadEager\`. \`webSDKConfig\` requires \`datastreamId\` + \`orgId\`. \`martechConfig\` covers \`analytics\`, \`dataLayer\`, \`launchUrls\`, \`personalization\`, \`performanceOptimized\`, \`personalizationTimeout\`, \`trackPageView\`, \`shouldProcessEvent\`, \`decisionScopes\`, etc. |
| \`updateUserConsent(consent)\` | Set consent via Adobe standard v2.0 (\`collect\`/\`marketing\`/\`personalize\`/\`share\`). |
| \`pushToDataLayer(payload)\` | Push a generic payload to the Adobe Client Data Layer. |
| \`pushEventToDataLayer(event, xdm, data, configOverrides)\` | Push a standardized event to the data layer. |
| \`sendEvent(payload)\` | Proxy for \`alloy('sendEvent', ...)\` — raw WebSDK event. |
| \`sendAnalyticsEvent(xdmData, dataMapping, configOverrides)\` | Send an analytics event directly. |
| \`initRumTracking(sampleRUM, options)\` | Wire up RUM tracking. |
| \`isPersonalizationEnabled()\` | Returns whether personalization is configured and enabled. |
| \`getPersonalizationForView(viewName)\` / \`applyPersonalization(viewName)\` | SPA/dynamic-content personalization (see spa-dynamic-content topic). |
| \`martechEager()\` / \`martechLazy()\` / \`martechDelayed()\` | Phase entry points called from \`loadEager\`/\`loadLazy\`/\`loadDelayed\`. |`);
      }

      if (shouldInclude('checklist')) {
        sections.push(`## Checklist

- [ ] Launch container: Web SDK extension v2.34.0+, "self-hosted alloy.js instance", instance name \`alloy\`; ACDL extension configured; published.
- [ ] \`git subtree add --squash --prefix plugins/martech ...\` run, \`plugins/martech\` committed.
- [ ] \`.eslintignore\` updated for vendored \`*.min.js\`.
- [ ] \`head.html\` has the preload + preconnect hints.
- [ ] \`scripts.js\` imports the plugin, calls \`initMartech\` in \`loadEager\` with real \`datastreamId\`/\`orgId\`/\`edgeDomain\`.
- [ ] \`loadEager\` awaits \`martechLoadedPromise.then(martechEager)\` before/alongside first-section render.
- [ ] \`loadLazy\` calls \`await martechLazy()\` after \`loadFooter\`.
- [ ] \`loadDelayed\` calls \`martechDelayed()\`.
- [ ] Consent events wired to \`updateUserConsent\` for your CMP.
- [ ] \`check_performance\` re-run after wiring, to confirm LCP budget is unaffected.`);
      }

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}
