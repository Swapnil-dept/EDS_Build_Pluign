import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AEM_DIALOG_FIELD_MAP, CORE_COMPONENT_MAP } from '../knowledge/aem-cloud-skills.js';

/**
 * Scaffold an AEM 6.5 LTS / AMS component.
 *
 * Mirrors the AEMaaCS `scaffold_aem_component` shape (Adobe's `create-component`
 * skill is Cloud-Service-only; 6.5 LTS does not ship one). The Granite UI
 * Coral 3 field types and Core Component delegation pattern are identical, so
 * we reuse the same field map. Differences vs Cloud:
 *
 *   - No `.aem-skills-config.yaml` source-of-truth — project / package / group
 *     are passed directly. (No 6.5 LTS skill defines that file.)
 *   - Resource type docs point at `experience-manager-65`, not Cloud Service.
 *   - OSGi DS R6 is preferred but Felix SCR is still allowed on 6.5 LTS.
 *   - Sling Model adapter target is `SlingHttpServletRequest`; uber-jar /
 *     cq.quickstart provides the same Sling Models / HTL APIs as Cloud.
 *   - Build verification uses `mvn -PautoInstallPackage clean install` (the
 *     Content Package Maven Plugin profile the 6.5 archetype ships with);
 *     Cloud Manager / `autoInstallSinglePackage` is a Cloud convention.
 *   - Deployment is via Package Manager / Maven Content Package Plugin —
 *     never Cloud Manager pipelines.
 */

const FieldSchema = z.object({
  name:  z.string().describe('Field property name (camelCase, e.g. "title")'),
  label: z.string().describe('Editor label shown in the dialog'),
  type:  z.enum([
    'textfield', 'textarea', 'richtext', 'pathfield',
    'image', 'fileupload', 'multifield',
    'checkbox', 'select', 'numberfield', 'datepicker',
  ]).describe('Granite UI field type'),
  required: z.boolean().default(false).optional(),
  description: z.string().optional().describe('Optional fieldDescription shown under the field'),
});

function pascal(s: string) {
  return s.replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase());
}

function fieldResourceType(type: string): string {
  const entry = AEM_DIALOG_FIELD_MAP.find((m) => m.user.toLowerCase() === type.toLowerCase());
  return entry?.resourceType ?? 'granite/ui/components/coral/foundation/form/textfield';
}

export function registerScaffoldAem65Component(server: McpServer) {
  server.tool(
    'scaffold_aem65_component',
    `Scaffold a complete AEM 6.5 LTS / AMS component: \`.content.xml\`, \`_cq_dialog/.content.xml\` (Granite UI Coral 3), HTL template, Sling Model + JUnit test, and a clientlib (CSS+JS+css.txt+js.txt). 6.5 LTS does NOT ship an Adobe \`create-component\` skill — this tool follows the same Granite UI / HTL / Sling Models patterns the AEMaaCS skill uses, adjusted for 6.5 conventions (uber-jar / cq.quickstart, Felix SCR still allowed but DS R6 preferred, Package Manager deploy, no \`.aem-skills-config.yaml\`). PRECONDITION: only use after detect_project_type returns "aem65lts". DO NOT use on AEMaaCS — use \`scaffold_aem_component\` for that.`,
    {
      componentName: z.string().regex(/^[a-z][a-z0-9-]*$/).describe('kebab-case component name (e.g. "promo-card", "hero-banner")'),
      title:         z.string().describe('Editor-visible component title (e.g. "Promo Card")'),
      project:       z.string().describe('AEM project name (used in /apps/<project>/components/...). Read from the project\'s root pom.xml <artifactId>.'),
      javaPackage:   z.string().describe('Java base package (e.g. "com.mysite.core"). Read from the project\'s core/pom.xml or existing core/src/main/java/.'),
      group:         z.string().describe('Component group displayed in the SidePanel (e.g. "MySite - Content")'),
      fields:        z.array(FieldSchema).min(1).describe('Dialog fields to render — exactly the fields the user asked for. No extras.'),
      extendsCore:   z.string().optional().describe('Optional Core Component to extend (e.g. "teaser", "list", "navigation"). Resolves to the Sling Resource Merger pattern with @Self @Via(ResourceSuperType.class). Requires Core Components 2.x + on 6.5 LTS.'),
      hasServlet:    z.boolean().default(false).describe('Whether the component needs a Sling Servlet (dynamic data, external API, form submission).'),
    },
    {
      title: 'Scaffold AEM 6.5 LTS Component',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ componentName, title, project, javaPackage, group, fields, extendsCore, hasServlet }) => {
      const Pascal = pascal(componentName);
      const javaPath = javaPackage.replace(/\./g, '/');
      const jcrBase = `ui.apps/src/main/content/jcr_root/apps/${project}/components/${componentName}`;
      const javaBase = `core/src/main/java/${javaPath}`;
      const javaTestBase = `core/src/test/java/${javaPath}`;

      const extendsResourceType = extendsCore
        ? CORE_COMPONENT_MAP[extendsCore.toLowerCase()]
        : undefined;
      if (extendsCore && !extendsResourceType) {
        return {
          content: [{ type: 'text' as const, text: `Unknown Core Component "${extendsCore}". Pass one of: ${Object.keys(CORE_COMPONENT_MAP).join(', ')}, or omit \`extendsCore\` for a standalone component.` }],
          isError: true,
        };
      }

      // ─── .content.xml ─────────────────────────────────────
      const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
    jcr:primaryType="cq:Component"
    jcr:title="${escapeXml(title)}"
    componentGroup="${escapeXml(group)}"${extendsResourceType ? `\n    sling:resourceSuperType="${extendsResourceType}"` : ''}/>
`;

      // ─── _cq_dialog/.content.xml (Coral 3 — same as Cloud) ──
      const fieldXml = fields.map((f) => {
        const rt = fieldResourceType(f.type);
        const required = f.required ? `\n        required="{Boolean}true"` : '';
        const desc = f.description ? `\n        fieldDescription="${escapeXml(f.description)}"` : '';
        if (f.type === 'image') {
          return `      <!-- ${f.name}: Core Image embedded in HTL via data-sly-resource — no dialog field -->`;
        }
        return `      <${f.name}
        jcr:primaryType="nt:unstructured"
        sling:resourceType="${rt}"
        fieldLabel="${escapeXml(f.label)}"
        name="./${f.name}"${required}${desc}/>`;
      }).join('\n');

      const dialogXml = `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
    jcr:primaryType="nt:unstructured"
    jcr:title="${escapeXml(title)}"
    sling:resourceType="cq/gui/components/authoring/dialog">
  <content
      jcr:primaryType="nt:unstructured"
      sling:resourceType="granite/ui/components/coral/foundation/container">
    <items jcr:primaryType="nt:unstructured">
      <tabs
          jcr:primaryType="nt:unstructured"
          sling:resourceType="granite/ui/components/coral/foundation/tabs">
        <items jcr:primaryType="nt:unstructured">
          <properties
              jcr:primaryType="nt:unstructured"
              jcr:title="Properties"
              sling:resourceType="granite/ui/components/coral/foundation/fixedcolumns"
              margin="{Boolean}true">
            <items jcr:primaryType="nt:unstructured">
              <column
                  jcr:primaryType="nt:unstructured"
                  sling:resourceType="granite/ui/components/coral/foundation/container">
                <items jcr:primaryType="nt:unstructured">
${fieldXml}
                </items>
              </column>
            </items>
          </properties>
        </items>
      </tabs>
    </items>
  </content>
</jcr:root>
`;

      // ─── HTL ───────────────────────────────────────────────
      const htlBody = fields.map((f) => {
        if (f.type === 'image') {
          return `  <div class="${componentName}__media" data-sly-resource="\${ 'image' @ resourceType='core/wcm/components/image/v3/image' }"></div>`;
        }
        if (f.type === 'richtext') {
          return `  <div class="${componentName}__${f.name}" data-sly-test="\${model.${f.name}}">\${model.${f.name} @ context='html'}</div>`;
        }
        return `  <p class="${componentName}__${f.name}" data-sly-test="\${model.${f.name}}">\${model.${f.name}}</p>`;
      }).join('\n');

      const htl = `<sly data-sly-use.model="${javaPackage}.models.${Pascal}Model"></sly>
<div class="${componentName}" data-sly-test="\${model.hasContent}">
${htlBody}
</div>
`;

      // ─── Sling Model (DS R6, same shape as Cloud) ──────────
      const javaFields = fields
        .filter((f) => f.type !== 'image')
        .map((f) => {
          const javaType = f.type === 'numberfield' ? 'Long' : f.type === 'checkbox' ? 'Boolean' : 'String';
          return `    @ValueMapValue\n    private ${javaType} ${f.name};\n\n    public ${javaType} get${pascal(f.name)}() {\n        return ${f.name};\n    }`;
        })
        .join('\n\n');

      const isExtension = !!extendsResourceType;
      const slingModel = `package ${javaPackage}.models;

${isExtension ? 'import org.apache.sling.models.annotations.Via;\nimport org.apache.sling.models.annotations.via.ResourceSuperType;\n' : ''}import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.injectorspecific.Self;
import org.apache.sling.models.annotations.injectorspecific.ValueMapValue;

@Model(adaptables = SlingHttpServletRequest.class,
       adapters = ${Pascal}Model.class,
       resourceType = ${Pascal}Model.RESOURCE_TYPE)
public class ${Pascal}Model {

    public static final String RESOURCE_TYPE = "${project}/components/${componentName}";

${javaFields}

    public boolean hasContent() {
        return ${fields.filter((f) => f.type !== 'image').map((f) => `${f.name} != null`).join(' || ') || 'true'};
    }
}
`;

      // ─── JUnit test (uses io.wcm AEM Mocks — works on 6.5 LTS) ─
      const slingModelTest = `package ${javaPackage}.models;

import io.wcm.testing.mock.aem.junit5.AemContext;
import io.wcm.testing.mock.aem.junit5.AemContextExtension;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@ExtendWith(AemContextExtension.class)
class ${Pascal}ModelTest {

    private final AemContext ctx = new AemContext();

    @BeforeEach
    void setUp() {
        ctx.addModelsForClasses(${Pascal}Model.class);
        ctx.load().json("/${componentName}.json", "/content");
        ctx.currentResource("/content/${componentName}");
    }

    @Test
    void testModel() {
        ${Pascal}Model model = ctx.request().adaptTo(${Pascal}Model.class);
        assertNotNull(model);
    }
}
`;

      // ─── Clientlib ──────────────────────────────────────────
      const clientlibContent = `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:jcr="http://www.jcp.org/jcr/1.0"
    jcr:primaryType="cq:ClientLibraryFolder"
    categories="[${project}.components.${componentName}]"/>
`;
      const css = `.${componentName} {\n  display: block;\n}\n`;
      const js  = `(function () {\n  // ${componentName} clientlib\n})();\n`;
      const cssTxt = `#base=css\n${componentName}.css\n`;
      const jsTxt  = `#base=js\n${componentName}.js\n`;

      // ─── Servlet (optional, OSGi DS R6) ─────────────────────
      const servletPath = `/bin/${project}/${componentName}`;
      const servlet = hasServlet ? `package ${javaPackage}.servlets;

import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.SlingHttpServletResponse;
import org.apache.sling.api.servlets.SlingSafeMethodsServlet;
import org.osgi.service.component.annotations.Component;

import javax.servlet.Servlet;
import java.io.IOException;

@Component(service = Servlet.class, property = {
    "sling.servlet.paths=${servletPath}",
    "sling.servlet.methods=GET",
    "sling.servlet.extensions=json"
})
public class ${Pascal}Servlet extends SlingSafeMethodsServlet {

    @Override
    protected void doGet(SlingHttpServletRequest request, SlingHttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        response.getWriter().write("{}");
    }
}
` : '';

      // ─── Output ─────────────────────────────────────────────
      const sections: string[] = [];
      sections.push(`# Scaffold AEM 6.5 LTS / AMS component: \`${componentName}\` (${Pascal})\n\nResource type: \`${project}/components/${componentName}\`\nGroup: \`${group}\`${extendsResourceType ? `\nExtends: \`${extendsResourceType}\` — uses Sling Resource Merger / @Self @Via(ResourceSuperType.class) delegation.` : ''}`);

      sections.push(`## Files to create (in this order)\n\n1. \`${jcrBase}/.content.xml\` — component definition\n2. \`${jcrBase}/_cq_dialog/.content.xml\` — Granite UI Coral 3 dialog\n3. \`${jcrBase}/${componentName}.html\` — HTL\n4. \`${javaBase}/models/${Pascal}Model.java\` — Sling Model\n5. \`${javaTestBase}/models/${Pascal}ModelTest.java\` — JUnit 5 + io.wcm AEM Mocks\n6. \`${jcrBase}/clientlibs/clientlib-${componentName}/.content.xml\` — clientlib\n7. \`${jcrBase}/clientlibs/clientlib-${componentName}/css/${componentName}.css\`\n8. \`${jcrBase}/clientlibs/clientlib-${componentName}/css.txt\`\n9. \`${jcrBase}/clientlibs/clientlib-${componentName}/js/${componentName}.js\`\n10. \`${jcrBase}/clientlibs/clientlib-${componentName}/js.txt\`${hasServlet ? `\n11. \`${javaBase}/servlets/${Pascal}Servlet.java\` — Sling Servlet at ${servletPath}` : ''}`);

      sections.push(`### \`${jcrBase}/.content.xml\`\n\n\`\`\`xml\n${contentXml}\`\`\``);
      sections.push(`### \`${jcrBase}/_cq_dialog/.content.xml\`\n\n\`\`\`xml\n${dialogXml}\`\`\``);
      sections.push(`### \`${jcrBase}/${componentName}.html\`\n\n\`\`\`html\n${htl}\`\`\``);
      sections.push(`### \`${javaBase}/models/${Pascal}Model.java\`\n\n\`\`\`java\n${slingModel}\`\`\``);
      sections.push(`### \`${javaTestBase}/models/${Pascal}ModelTest.java\`\n\n\`\`\`java\n${slingModelTest}\`\`\``);
      sections.push(`### Clientlib\n\n**\`.content.xml\`**\n\`\`\`xml\n${clientlibContent}\`\`\`\n\n**\`css/${componentName}.css\`**\n\`\`\`css\n${css}\`\`\`\n\n**\`css.txt\`**\n\`\`\`\n${cssTxt}\`\`\`\n\n**\`js/${componentName}.js\`**\n\`\`\`javascript\n${js}\`\`\`\n\n**\`js.txt\`**\n\`\`\`\n${jsTxt}\`\`\``);
      if (hasServlet) {
        sections.push(`### \`${javaBase}/servlets/${Pascal}Servlet.java\`\n\n\`\`\`java\n${servlet}\`\`\``);
      }

      const fieldRows = fields.map((f, i) => `| ${i + 1} | \`${f.name}\` | ${f.label} | ${f.type} |`).join('\n');
      sections.push(`## Dialog fields (exact match — no extras)\n\n| # | Property | Label | Type |\n|---|---|---|---|\n${fieldRows}`);

      if (extendsResourceType) {
        sections.push(`## Core Component extension reminders\n\n- Requires WCM Core Components 2.x + installed on 6.5 LTS (separate package — verify it's in your \`all/pom.xml\`).\n- Use \`@Self @Via(type = ResourceSuperType.class)\` to delegate to the parent model.\n- To hide a parent dialog tab/field, add a node with \`sling:hideResource="{Boolean}true"\` at the same path inside this dialog.\n- To override a property, use \`sling:hideProperties\` plus your new value.`);
      }

      sections.push(`## 6.5 LTS / AMS specific notes\n\n- The Sling Model above uses **OSGi DS R6** (\`org.osgi.service.component.annotations\` style). Felix SCR (\`org.apache.felix.scr.annotations.*\`) is still supported on 6.5 LTS but new code should use DS R6.\n- Build with \`mvn -PautoInstallPackage clean install -pl core,ui.apps\` (the 6.5 archetype profile). For a single package, the Content Package Maven Plugin's \`-PautoInstallSinglePackage\` profile also works if your pom defines it.\n- Deploy via **Package Manager** or the **Content Package Maven Plugin** — there is no Cloud Manager pipeline on 6.5.\n- Doc references should point at \`experienceleague.adobe.com/en/docs/experience-manager-65/\`, never Cloud Service URLs.\n- For dialog patterns, \`htmlField\` (Coral 2 RTE) is deprecated; use the Coral 3 \`cq/gui/components/authoring/dialog/richtext\` already wired above.`);

      sections.push(`## Build verification\n\n\`\`\`bash\nmvn -PautoInstallPackage clean install -pl core,ui.apps\n\`\`\`\n\nThen author the component on a test page to verify the dialog renders the ${fields.length} field(s) above and nothing else.`);

      return { content: [{ type: 'text' as const, text: sections.join('\n\n') }] };
    },
  );
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
}
