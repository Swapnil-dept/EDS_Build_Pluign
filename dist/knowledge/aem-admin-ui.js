/**
 * AEM Admin UI Development Knowledge Base
 *
 * Covers three interconnected topics essential for building AEM backend tooling:
 *   1. Coral UI 3  — building admin-grade HTML/JS using the Granite/CoralUI component library
 *   2. Sling Servlets — writing GET/POST Sling servlets correctly for AEMaaCS
 *   3. Service Users & UserMapper — mapping system users and reading/writing JCR safely
 *
 * All patterns verified against AEM SDK 2026.5.x (AEM as a Cloud Service).
 *
 * Source of truth: first-hand implementation of the DAM Value Add SEO Optimizer
 * (multi-tab admin page, AI-powered GEO suggestions, Brand Context chat).
 */
export const CORAL_PATTERNS = [
    {
        id: 'coral-tab-icon',
        title: 'Tab icon alignment — use native icon= attribute',
        description: 'coral-tab supports a native icon= attribute that renders the icon inline with the label. ' +
            'Adding a child <coral-icon> element causes the icon to stack vertically above the label text.',
        correct: '<coral-tab icon="viewDetail" selected>Analysis</coral-tab>\n' +
            '<coral-tab icon="globe">GEO &amp; Open Graph</coral-tab>\n' +
            '<coral-tab icon="chat">AI Consultant</coral-tab>',
        wrong: '<!-- WRONG — icon stacks above label -->\n' +
            '<coral-tab><coral-icon icon="globe"></coral-icon> GEO</coral-tab>',
        notes: [
            'Icon names come from the Coral icon library (viewDetail, globe, chat, save, download, etc.).',
            'The icon= attribute is also available on coral-button.',
        ],
    },
    {
        id: 'coral-select-dynamic-items',
        title: 'Adding items to coral-select dynamically',
        description: 'Coral custom elements need to be fully initialised before items can be appended. ' +
            'Using innerHTML / insertAdjacentHTML does NOT trigger Coral\'s internal MutationObserver. ' +
            'Use document.createElement("coral-select-item") + appendChild instead.',
        correct: 'Coral.commons.ready(selectEl, function () {\n' +
            '  items.forEach(function (item) {\n' +
            '    var opt = document.createElement("coral-select-item");\n' +
            '    opt.setAttribute("value", item.id);\n' +
            '    opt.textContent = item.title;\n' +
            '    selectEl.appendChild(opt);\n' +
            '  });\n' +
            '});',
        wrong: '// WRONG — Coral\'s MutationObserver never fires for innerHTML\n' +
            'selectEl.insertAdjacentHTML("beforeend", `<coral-select-item value="${id}">${title}</coral-select-item>`);',
        notes: [
            'Coral.commons.ready(element, callback) waits for the Coral custom element to be fully upgraded.',
            'Add a setTimeout fallback (600ms) for cases where the page loads the element late.',
            'Always add a default "— any —" item in the HTML; Coral resets it if items array is empty on init.',
        ],
    },
    {
        id: 'coral-dom-ready',
        title: 'Waiting for Coral element initialisation',
        description: '$(document).ready() fires before Coral custom elements finish their async upgrade cycle. ' +
            'Always guard coral-select, coral-datepicker, coral-multifield setup with Coral.commons.ready().',
        correct: 'Coral.commons.ready(dom.brandSelect, function () {\n' +
            '  loadBrandsFromApi();  // safe — element fully initialised\n' +
            '});\n\n' +
            '// Fallback for cases where element was rendered after DOMContentLoaded\n' +
            'setTimeout(function () {\n' +
            '  if (!brandsLoaded) loadBrandsFromApi();\n' +
            '}, 600);',
        wrong: '$(document).ready(function () {\n' +
            '  loadBrandsFromApi();  // WRONG — coral-select may not be upgraded yet\n' +
            '});',
    },
    {
        id: 'cq-link-checker',
        title: 'CQ Link Checker — avoid <a href> in admin pages',
        description: 'CQ\'s Link Checker servlet wraps every <a href="..."> element with ' +
            '<img class="cq-LinkChecker--prefix cq-LinkChecker--invalid"> and ' +
            '<img class="cq-LinkChecker--suffix"> images. This breaks layout (images appear inline ' +
            'next to the link, creating visual overlap). The attribute data-cq-linkchecker="skip" ' +
            'does NOT reliably prevent this in admin pages.',
        correct: '<!-- Use a button with onclick for navigation -->\n' +
            '<button onclick="history.back()" is="coral-button" variant="quiet" icon="arrowLeft">\n' +
            '  Back\n' +
            '</button>\n\n' +
            '<!-- Or with an explicit path -->\n' +
            '<button onclick="window.location.href=\'/tools.html\'" is="coral-button">\n' +
            '  Back to Tools\n' +
            '</button>',
        wrong: '<!-- WRONG — CQ Link Checker injects <img> tags around this -->\n' +
            '<a href="/tools.html" class="back-btn">Back</a>\n\n' +
            '<!-- ALSO WRONG — data-cq-linkchecker="skip" is unreliable in admin pages -->\n' +
            '<a href="/tools.html" data-cq-linkchecker="skip">Back</a>',
        notes: [
            'history.back() is the safest choice — always navigates correctly regardless of how the user arrived.',
            'Buttons are never processed by the CQ Link Checker servlet.',
            'For external links in admin pages, use target="_blank" with rel="noopener noreferrer".',
        ],
    },
    {
        id: 'coral-admin-page-structure',
        title: 'Admin page HTML skeleton (Coral Shell)',
        description: 'An AEM admin page served under /apps/.../content/*.html should include the Coral Shell ' +
            'clientlib and follow the standard shell layout so it renders correctly in the admin console.',
        correct: '<!DOCTYPE html>\n' +
            '<html>\n' +
            '<head>\n' +
            '  <meta charset="UTF-8"/>\n' +
            '  <title>My Tool</title>\n' +
            '  <sly data-sly-use.clientlib="/libs/granite/sightly/templates/clientlib.html"\n' +
            '       data-sly-call="${clientlib.css @ categories=[\'coralui3\',\'my.clientlib\']}"/>\n' +
            '</head>\n' +
            '<body class="coral--light">\n' +
            '  <coral-shell>\n' +
            '    <coral-shell-header>...</coral-shell-header>\n' +
            '    <coral-shell-content>\n' +
            '      <!-- page content -->\n' +
            '    </coral-shell-content>\n' +
            '  </coral-shell>\n' +
            '  <sly data-sly-call="${clientlib.js @ categories=[\'coralui3\',\'my.clientlib\']}"/>\n' +
            '</body>\n' +
            '</html>',
        notes: [
            'Include coralui3 clientlib category — this loads Coral.commons, coral-tab, coral-select, etc.',
            'class="coral--light" on <body> activates the standard Coral light theme.',
            'Load JS clientlibs at the bottom (after body) so DOM is available when scripts run.',
        ],
    },
    {
        id: 'coral-iife-js-pattern',
        title: 'JavaScript IIFE pattern for admin clientlibs',
        description: 'Wrap all admin page JS in a single IIFE to avoid polluting the global scope. ' +
            'When using replace_string_in_file to edit a large JS file, always check the file for ' +
            'duplicate IIFEs — a common mistake where old code is left appended after the new IIFE, ' +
            'causing a SyntaxError: Unexpected token \'}\'.',
        correct: '(function (jQuery, document, window) {\n' +
            '  "use strict";\n\n' +
            '  var API = {\n' +
            '    ANALYZE: "/bin/my-app/api/analyze.json",\n' +
            '    SAVE:    "/bin/my-app/api/save.json"\n' +
            '  };\n\n' +
            '  // ... all code here ...\n\n' +
            '  $(document).ready(init);\n\n' +
            '})(jQuery, document, window);\n' +
            '// ← file ends here. Nothing after this closing line.',
        wrong: '})(jQuery, document, window);\n\n' +
            '// WRONG — old code left below the closing IIFE:\n' +
            'var SEVERITY_COLORS = { ... };\n' +
            '$(document).ready(function() { ... });',
        notes: [
            'Run: node --check path/to/file.js to validate syntax before deploying.',
            'To truncate a file at the first IIFE close: node -e "const fs=require(\'fs\'); const lines=fs.readFileSync(f,\'utf8\').split(\'\\n\'); const i=lines.findIndex(l=>l.trim()===\'})(jQuery, document, window);\'); fs.writeFileSync(f, lines.slice(0,i+1).join(\'\\n\')+\'\\n\')"',
        ],
    },
    {
        id: 'coral-ai-json-parsing',
        title: 'Parsing AI JSON responses in admin JS',
        description: 'AI models (Gemini, GPT) often wrap JSON responses in markdown code fences (```json ... ```). ' +
            'Always strip fences before JSON.parse, and fall back to regex extraction.',
        correct: 'function parseAiJson(reply) {\n' +
            '  // Strip ```json ... ``` fences\n' +
            '  var cleaned = reply.replace(/^```(?:json)?\\s*/i, "").replace(/```\\s*$/g, "").trim();\n' +
            '  try { return JSON.parse(cleaned); } catch (e) { /* try harder */ }\n' +
            '  // Regex fallback: find first {...} block\n' +
            '  var m = cleaned.match(/\\{[\\s\\S]*\\}/);\n' +
            '  if (m) { try { return JSON.parse(m[0]); } catch (e2) {} }\n' +
            '  return null;\n' +
            '}',
        notes: [
            'Log the raw reply to console.warn when parsing fails — never silently swallow the error.',
            'Some models return arrays wrapped in fences (```json [ ... ] ```) — the same stripping applies.',
        ],
    },
];
export const SLING_SERVLET_PATTERNS = [
    {
        id: 'servlet-registration',
        title: 'Registering a path-based servlet (GET + POST)',
        description: 'Use @Component with sling.servlet.paths for a fixed-path API endpoint. ' +
            'Extend SlingAllMethodsServlet for POST support, or SlingSafeMethodsServlet for read-only.',
        code: '@Component(service = Servlet.class, property = {\n' +
            '    "sling.servlet.paths=/bin/myapp/api/my-resource",\n' +
            '    "sling.servlet.methods=GET",\n' +
            '    "sling.servlet.methods=POST",\n' +
            '    "sling.servlet.extensions=json",\n' +
            '    "service.ranking:Integer=100"\n' +
            '})\n' +
            'public class MyServlet extends SlingAllMethodsServlet {\n\n' +
            '    @Override\n' +
            '    protected void doGet(SlingHttpServletRequest req, SlingHttpServletResponse res)\n' +
            '            throws IOException {\n' +
            '        res.setContentType("application/json");\n' +
            '        res.setCharacterEncoding("UTF-8");\n' +
            '        // ... read JCR, build JSON ...\n' +
            '        res.getWriter().write(Json.createObjectBuilder()\n' +
            '            .add("success", true)\n' +
            '            .build().toString());\n' +
            '    }\n\n' +
            '    @Override\n' +
            '    protected void doPost(SlingHttpServletRequest req, SlingHttpServletResponse res)\n' +
            '            throws IOException {\n' +
            '        String param = req.getParameter("myParam");\n' +
            '        if (param == null || param.isBlank()) {\n' +
            '            res.setStatus(400);\n' +
            '            res.getWriter().write("{\\\"error\\\":\\\"myParam is required\\\"}");\n' +
            '            return;\n' +
            '        }\n' +
            '        // ... modify JCR ...\n' +
            '    }\n' +
            '}',
        notes: [
            'sling.servlet.paths is a fixed path — use for internal APIs (/bin/...).',
            'sling.servlet.resourceTypes is for component-scoped servlets.',
            'Always set Content-Type and charset before writing the response.',
            'Use service.ranking to override existing servlets at the same path.',
        ],
        antiPatterns: [
            'Returning HTML from an API path servlet — always return JSON.',
            'Omitting extensions=json — requests without .json suffix will 404.',
            'Using request.getSession() in AEMaaCS — session state is stateless in Cloud Service.',
        ],
    },
    {
        id: 'servlet-json-response',
        title: 'Building JSON responses with javax.json',
        description: 'Use javax.json (bundled in AEM) to build type-safe JSON responses. ' +
            'Never string-concatenate JSON — use Json.createObjectBuilder / Json.createArrayBuilder.',
        code: 'import javax.json.Json;\n' +
            'import javax.json.JsonArrayBuilder;\n' +
            'import javax.json.JsonObjectBuilder;\n\n' +
            '// Simple object\n' +
            'response.getWriter().write(\n' +
            '    Json.createObjectBuilder()\n' +
            '        .add("success", true)\n' +
            '        .add("title", pageTitle)\n' +
            '        .add("count", items.size())\n' +
            '        .build().toString()\n' +
            ');\n\n' +
            '// Array of objects\n' +
            'JsonArrayBuilder arr = Json.createArrayBuilder();\n' +
            'for (MyItem item : items) {\n' +
            '    arr.add(Json.createObjectBuilder()\n' +
            '        .add("id",    item.getId())\n' +
            '        .add("title", item.getTitle())\n' +
            '    );\n' +
            '}\n' +
            'response.getWriter().write(\n' +
            '    Json.createObjectBuilder()\n' +
            '        .add("items", arr)\n' +
            '        .build().toString()\n' +
            ');',
        notes: [
            'javax.json is part of the AEM SDK — no extra dependencies needed.',
            'For reading incoming JSON body: Json.createReader(request.getReader()).readObject()',
            'Escape user-supplied strings in error messages: s.replace("\\\\","\\\\\\\\").replace("\\"","\\\\\\"")',
        ],
    },
    {
        id: 'servlet-jcr-write',
        title: 'Writing JCR properties from a servlet',
        description: 'Use the request\'s ResourceResolver to get/create nodes and set properties, then commit with session.save(). ' +
            'Always use a try-finally to revert on error.',
        code: 'String pagePath = request.getParameter("pagePath");\n' +
            'Resource jcrContent = request.getResourceResolver()\n' +
            '    .getResource(pagePath + "/jcr:content");\n' +
            'if (jcrContent == null) {\n' +
            '    response.setStatus(404);\n' +
            '    response.getWriter().write("{\\\"error\\\":\\\"Page not found\\\"}");\n' +
            '    return;\n' +
            '}\n' +
            'Node node = jcrContent.adaptTo(Node.class);\n' +
            'Session session = request.getResourceResolver().adaptTo(Session.class);\n' +
            'try {\n' +
            '    node.setProperty("seo:geoRegion", geoRegion);\n' +
            '    node.setProperty("seo:canonicalUrl", canonicalUrl);\n' +
            '    // Multi-value property (String[])\n' +
            '    node.setProperty("seo:hreflang", hreflangPairs);  // String[]\n' +
            '    session.save();\n' +
            '    response.getWriter().write("{\\\"success\\\":true}");\n' +
            '} catch (RepositoryException e) {\n' +
            '    try { session.refresh(false); } catch (RepositoryException ignored) {}\n' +
            '    response.setStatus(500);\n' +
            '    response.getWriter().write("{\\\"error\\\":\\\"Save failed\\\"}");  \n' +
            '}',
        notes: [
            'session.save() commits ALL pending changes on the resolver — scope your changes carefully.',
            'session.refresh(false) discards pending changes on error.',
            'In AEMaaCS, use request.getResourceResolver() (request-scoped) — never create a new resolver in a servlet.',
            'For replication, inject ReplicationQueue/Replicator service separately.',
        ],
    },
    {
        id: 'servlet-resource-resolver',
        title: 'Reading JCR content in a servlet (page properties)',
        description: 'Read page properties from jcr:content using ValueMap. ' +
            'Always null-check the resource before adapting.',
        code: 'Resource jcrContent = request.getResourceResolver()\n' +
            '    .getResource(pagePath + "/jcr:content");\n' +
            'if (jcrContent != null) {\n' +
            '    ValueMap props = jcrContent.getValueMap();\n' +
            '    String title       = props.get("jcr:title",       String.class);\n' +
            '    String description = props.get("jcr:description", String.class);\n' +
            '    String[] tags      = props.get("cq:tags",         new String[0]);\n' +
            '    Boolean hideInNav  = props.get("hideInNav",       false);\n' +
            '}',
        notes: [
            'props.get("key", DefaultValue) never returns null — prefer this form.',
            'props.get("key", String.class) returns null if missing — use when null is meaningful.',
            'For child nodes: jcrContent.getChild("childName") or resolver.getResource(pagePath + "/jcr:content/childNode")',
        ],
    },
    {
        id: 'servlet-sling-filter',
        title: 'Securing servlet endpoints (allow-list by path prefix)',
        description: 'In AEMaaCS, servlets under /bin/ are accessible to any authenticated user by default. ' +
            'Add dispatcher filter rules to restrict access, and validate the caller is authenticated.',
        code: '// In servlet: check authentication\n' +
            'String userId = request.getResourceResolver().getUserID();\n' +
            'if (userId == null || "anonymous".equals(userId)) {\n' +
            '    response.setStatus(401);\n' +
            '    response.getWriter().write("{\\\"error\\\":\\\"Unauthorised\\\"}");\n' +
            '    return;\n' +
            '}\n\n' +
            '// In dispatcher filters file (conf.dispatcher.d/filters/filters.any):\n' +
            '// Block /bin/ by default, allow only specific paths:\n' +
            '/0100 { /type "deny"  /url "/bin/*" }\n' +
            '/0101 { /type "allow" /url "/bin/myapp/api/*" }',
        notes: [
            'Dispatcher filters are the primary line of defence for /bin/ endpoints on Publish.',
            'On Author, rely on AEM authentication — all requests require login.',
            'Never trust pagePath input — always validate it starts with /content/ and exists in JCR.',
        ],
    },
];
export const SERVICE_USER_PATTERNS = [
    {
        id: 'service-user-mapping',
        title: 'Defining a service user mapping (UserMapper)',
        description: 'Service user mappings link an OSGi bundle/service to a JCR system user. ' +
            'The mapping is declared in a Sling repo-init script and registered via OSGi config.',
        code: '// File: ui.config/src/main/content/jcr_root/apps/myapp/osgiconfig/config/\n' +
            '// org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-myapp.xml\n\n' +
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<jcr:root xmlns:sling="http://sling.apache.org/jcr/sling/1.0"\n' +
            '          xmlns:jcr="http://www.jcp.org/jcr/1.0"\n' +
            '    jcr:primaryType="sling:OsgiConfig"\n' +
            '    user.mapping="[\n' +
            '      com.myapp.core:my-service=[myapp-service-user]\n' +
            '    ]"/>',
        files: [
            {
                path: 'ui.config/src/main/content/jcr_root/apps/myapp/osgiconfig/config/org.apache.sling.serviceusermapping.impl.ServiceUserMapperImpl.amended-myapp.xml',
                content: '<?xml version="1.0" encoding="UTF-8"?>\n' +
                    '<jcr:root xmlns:sling="http://sling.apache.org/jcr/sling/1.0"\n' +
                    '          xmlns:jcr="http://www.jcp.org/jcr/1.0"\n' +
                    '    jcr:primaryType="sling:OsgiConfig"\n' +
                    '    user.mapping="[com.myapp.core:my-service=[myapp-service-user]]"/>',
            },
            {
                path: 'ui.config/src/main/content/jcr_root/apps/myapp/osgiconfig/config/org.apache.sling.jcr.repoinit.RepositoryInitializer-myapp.xml',
                content: '<?xml version="1.0" encoding="UTF-8"?>\n' +
                    '<jcr:root xmlns:sling="http://sling.apache.org/jcr/sling/1.0"\n' +
                    '          xmlns:jcr="http://www.jcp.org/jcr/1.0"\n' +
                    '    jcr:primaryType="sling:OsgiConfig"\n' +
                    '    scripts="\n' +
                    '      create service user myapp-service-user with path system/myapp\n' +
                    '      set ACL for myapp-service-user\n' +
                    '        allow jcr:read on /content/myapp\n' +
                    '        allow jcr:write on /content/myapp\n' +
                    '        allow jcr:read on /conf/myapp\n' +
                    '      end\n' +
                    '    "/>',
            },
        ],
        notes: [
            'user.mapping format: "bundleId:subServiceName=[systemUserName]"',
            'The system user must be created via repo-init BEFORE the mapping is used.',
            'In AEMaaCS, use "with path system/myapp" to put the service user under /home/users/system/.',
            'ACLs are also defined in repo-init scripts — never set them via JCR directly.',
        ],
        antiPatterns: [
            'Using admin session (adaptTo(Session.class) from admin resolver) — not allowed in AEMaaCS.',
            'Hardcoding /home/users/system/myapp-service-user in ACL paths.',
            'Using the same service user for all services — give each OSGi service its own subServiceName.',
        ],
    },
    {
        id: 'service-user-resolver',
        title: 'Obtaining a service ResourceResolver in a service/scheduler',
        description: 'Use ResourceResolverFactory with a sub-service map to get a system-user-backed resolver. ' +
            'Always close the resolver in a finally block.',
        code: '@Reference\n' +
            'private ResourceResolverFactory resolverFactory;\n\n' +
            'private static final String SUB_SERVICE = "my-service";\n\n' +
            'public void doWork() {\n' +
            '    Map<String, Object> params = Collections.singletonMap(\n' +
            '        ResourceResolverFactory.SUBSERVICE, SUB_SERVICE\n' +
            '    );\n' +
            '    try (ResourceResolver resolver = resolverFactory.getServiceResourceResolver(params)) {\n' +
            '        Resource r = resolver.getResource("/content/myapp/en");\n' +
            '        // ... do work ...\n' +
            '        resolver.commit();\n' +
            '    } catch (LoginException | PersistenceException e) {\n' +
            '        LOG.error("Service resolver error", e);\n' +
            '    }\n' +
            '}',
        notes: [
            'SUB_SERVICE must match the subServiceName in the UserMapper OSGi config.',
            'Use try-with-resources — ResourceResolver implements Closeable.',
            'resolver.commit() persists Sling API changes; session.save() persists JCR Node API changes.',
            'In a Sling Servlet, use request.getResourceResolver() — it is already properly scoped.',
        ],
        antiPatterns: [
            'resolverFactory.getAdministrativeResourceResolver() — blocked in AEMaaCS.',
            'Keeping a long-lived cached ResourceResolver as a class field — it will expire.',
            'Calling resolver.close() inside the try block and then using the resolver after.',
        ],
    },
    {
        id: 'service-user-repoinit-acl',
        title: 'Common repo-init ACL patterns',
        description: 'Repo-init scripts run on every AEM startup and are idempotent — they create users and set ACLs ' +
            'if they do not already exist. The script syntax must be exact.',
        code: '# Read-only service user (for schedulers, read-only servlets)\n' +
            'create service user myapp-reader with path system/myapp\n' +
            'set ACL for myapp-reader\n' +
            '  allow jcr:read on /content/myapp\n' +
            '  allow jcr:read on /conf/myapp\n' +
            'end\n\n' +
            '# Read-write service user (for content-writing servlets)\n' +
            'create service user myapp-writer with path system/myapp\n' +
            'set ACL for myapp-writer\n' +
            '  allow jcr:read,jcr:write,jcr:modifyProperties on /content/myapp\n' +
            '  allow jcr:read on /conf/myapp\n' +
            '  allow jcr:read on /apps/myapp\n' +
            'end\n\n' +
            '# DAM read (for asset-handling services)\n' +
            'create service user myapp-dam-reader with path system/myapp\n' +
            'set ACL for myapp-dam-reader\n' +
            '  allow jcr:read on /content/dam\n' +
            'end',
        notes: [
            'Repo-init scripts live in ui.config as a RepositoryInitializer OSGi config.',
            'Scripts are idempotent — safe to re-run on restart.',
            'jcr:modifyProperties is needed to set properties on existing nodes (jcr:write alone is insufficient).',
            'Test ACLs in local SDK: CRXDE → /home/users/system/myapp → Permissions tab.',
        ],
    },
    {
        id: 'service-user-in-servlet',
        title: 'When NOT to use a service user in a servlet',
        description: 'Sling Servlets already have a request.getResourceResolver() backed by the authenticated user. ' +
            'Only switch to a service resolver when you need permissions the logged-in user does not have ' +
            '(e.g., reading /conf, writing to a protected path).',
        code: '// PREFERRED: use the request resolver — respects user permissions\n' +
            'Resource page = request.getResourceResolver().getResource(pagePath);\n\n' +
            '// ONLY when elevated access is needed:\n' +
            'Map<String, Object> p = Collections.singletonMap(\n' +
            '    ResourceResolverFactory.SUBSERVICE, "my-elevated-service"\n' +
            ');\n' +
            'try (ResourceResolver elevated = resolverFactory.getServiceResourceResolver(p)) {\n' +
            '    // read /conf or write to /content/dam etc.\n' +
            '}',
        notes: [
            'Privilege escalation via service user should be intentional and documented.',
            'Never use a service resolver to bypass permission checks that should exist.',
            'Log a warning when falling back to elevated access so it is auditable.',
        ],
    },
];
export const SEO_OPTIMIZER_PATTERNS = [
    {
        id: 'jcr-page-text-extraction',
        title: 'Extracting full page body text for AI context',
        description: 'Recursively walk the jcr:content tree and collect text from all component text properties. ' +
            'Strip HTML tags and entities. Cap the result to avoid oversized AI prompts.',
        code: 'private static final String[] BODY_TEXT_PROPS = {\n' +
            '    "text", "jcr:text", "richTextBody", "bodyText", "content",\n' +
            '    "heading", "pretitle", "subtitle", "label",\n' +
            '    "title", "jcr:title",\n' +
            '    "description", "shortDescription", "longDescription",\n' +
            '    "question", "answer", "body"\n' +
            '};\n\n' +
            'private String extractBodyText(Resource jcrContent) {\n' +
            '    StringBuilder sb = new StringBuilder();\n' +
            '    walkText(jcrContent, sb, 0);\n' +
            '    String text = sb.toString().trim();\n' +
            '    return text.length() > 5000 ? text.substring(0, 5000) + "\\n[...truncated...]" : text;\n' +
            '}\n\n' +
            'private void walkText(Resource r, StringBuilder sb, int depth) {\n' +
            '    if (depth > 12 || r == null) return;\n' +
            '    ValueMap vm = r.getValueMap();\n' +
            '    for (String p : BODY_TEXT_PROPS) {\n' +
            '        String v = vm.get(p, String.class);\n' +
            '        if (v != null && !v.isBlank()) {\n' +
            '            sb.append(v.replaceAll("<[^>]+>", " ")\n' +
            '                       .replaceAll("&[a-zA-Z]+;", " ")\n' +
            '                       .replaceAll("\\\\s+", " ").trim()).append("\\n");\n' +
            '        }\n' +
            '    }\n' +
            '    for (Resource child : r.getChildren()) {\n' +
            '        String name = child.getName();\n' +
            '        if ("cq:responsive".equals(name) || "cq:annotations".equals(name)\n' +
            '                || "rep:policy".equals(name) || "renditions".equals(name)) continue;\n' +
            '        walkText(child, sb, depth + 1);\n' +
            '    }\n' +
            '}',
        notes: [
            'Use depth > 12 as the recursion guard — 10 is too shallow for deeply nested parsys.',
            'Skip renditions and rep:policy nodes — they contain binary/system data, not text.',
            'cq:responsive and cq:annotations are layout/overlay nodes with no content text.',
            'The 5000-char cap leaves room for metadata + instructions in the AI prompt.',
        ],
    },
    {
        id: 'geo-meta-tags',
        title: 'GEO meta tags — full set for international targeting',
        description: 'The complete set of HTML meta tags for geographic targeting, social sharing, and hreflang alternates.',
        code: '<!-- Geographic targeting -->\n' +
            '<meta name="geo.region"    content="US-CA"/>           <!-- ISO 3166-2 -->\n' +
            '<meta name="geo.placename" content="San Francisco"/>   <!-- City / Place -->\n' +
            '<meta name="geo.position"  content="37.7749;-122.4194"/> <!-- lat;lon -->\n' +
            '<meta name="ICBM"          content="37.7749, -122.4194"/> <!-- same, comma-sep -->\n\n' +
            '<!-- Canonical -->\n' +
            '<link rel="canonical" href="https://www.example.com/en-us/page"/>\n\n' +
            '<!-- Open Graph -->\n' +
            '<meta property="og:title"       content="Page Title | Brand"/>\n' +
            '<meta property="og:description" content="150-160 char description"/>\n' +
            '<meta property="og:image"       content="https://example.com/image.jpg"/>\n' +
            '<meta property="og:type"        content="website"/>\n\n' +
            '<!-- hreflang alternates -->\n' +
            '<link rel="alternate" hreflang="en-us" href="https://www.example.com/en-us/page"/>\n' +
            '<link rel="alternate" hreflang="de-de" href="https://www.example.com/de-de/seite"/>\n' +
            '<link rel="alternate" hreflang="x-default" href="https://www.example.com/en/page"/>',
        notes: [
            'geo.region uses ISO 3166-2 format: CC-AA (country-subdivision), e.g. US-CA, GB-ENG.',
            'Both geo.position and ICBM should be present — different crawlers use different tags.',
            'hreflang x-default is the fallback URL for regions not listed in any other alternate.',
            'Canonical URL must be absolute (https://...) not relative.',
        ],
    },
    {
        id: 'ai-prompt-system-user',
        title: 'AI chat servlet — system prompt + page context structure',
        description: 'Structure the AI prompt in layers: system role, brand guidelines, page metadata, page body text, then user message.',
        code: '// System prompt (role + brand guidelines)\n' +
            'StringBuilder system = new StringBuilder();\n' +
            'system.append("You are an expert SEO and GEO consultant for AEM websites.\\n\\n");\n' +
            'system.append("=== BRAND GUIDELINES ===\\n");\n' +
            'system.append(brandGuideline).append("\\n\\n");\n' +
            'system.append("Always give concrete, actionable recommendations.\\n");\n\n' +
            '// User prompt (page metadata + body text + actual question)\n' +
            'StringBuilder user = new StringBuilder();\n' +
            'user.append("=== CURRENT PAGE CONTEXT ===\\n");\n' +
            'user.append("Path: ").append(pagePath).append("\\n");\n' +
            'user.append("Title: ").append(title).append("\\n");\n' +
            'user.append("Description: ").append(description).append("\\n");\n' +
            'user.append("\\n=== PAGE BODY CONTENT ===\\n");\n' +
            'user.append(extractBodyText(jcrContent));\n' +
            'user.append("\\n\\n");\n' +
            'user.append(userMessage);  // the actual question from the UI',
        notes: [
            'Putting brand guidelines in the SYSTEM prompt ensures they always have highest priority.',
            'Page body text in the USER prompt keeps the AI\'s context window usage optimal.',
            'maxTokens on the AIRequest is for the response — set 2000 when returning JSON suggestions.',
            'temperature 0.6 balances creativity with accuracy for SEO copy.',
        ],
    },
];
// ═══════════════════════════════════════════════════════════════════════════════
// Index arrays (used by the tool for search)
// ═══════════════════════════════════════════════════════════════════════════════
export const ALL_PATTERNS = [
    ...CORAL_PATTERNS.map(p => ({ ...p, section: 'coral-ui' })),
    ...SLING_SERVLET_PATTERNS.map(p => ({ ...p, section: 'sling-servlet' })),
    ...SERVICE_USER_PATTERNS.map(p => ({ ...p, section: 'service-user' })),
    ...SEO_OPTIMIZER_PATTERNS.map(p => ({ ...p, section: 'seo-optimizer' })),
];
//# sourceMappingURL=aem-admin-ui.js.map