#!/usr/bin/env node

/**
 * AEM Edge Delivery Services — MCP Server
 *
 * A comprehensive development assistant for AEM EDS projects.
 * Provides tools for block scaffolding, validation, configuration,
 * performance analysis, and guided development workflows.
 *
 * LLM-agnostic: no API keys needed. This server provides tools and
 * context that any IDE LLM (Copilot, Claude, etc.) can consume.
 *
 * Install in your IDE:
 *   npx @anthropic-eds/eds-mcp-server
 *
 * Or add to .cursor/mcp.json / .vscode/mcp.json:
 *   { "command": "npx", "args": ["-y", "@anthropic-eds/eds-mcp-server"] }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Tools
import { registerScaffoldBlock } from './tools/scaffold-block.js';
import { registerScaffoldModel } from './tools/scaffold-model.js';
import { registerScaffoldProject } from './tools/scaffold-project.js';
import { registerValidateBlock } from './tools/validate-block.js';
import { registerExplainDom } from './tools/explain-dom.js';
import { registerEdsConfig } from './tools/eds-config.js';
import { registerPerformanceCheck } from './tools/check-performance.js';
import { registerLookupBlock } from './tools/lookup-block.js';
import { registerSearchBlockCollection } from './tools/search-block-collection.js';
import { registerEdsScripts } from './tools/eds-scripts.js';
import { registerGenerateBlockFromDesign } from './tools/generate-block-from-design.js';
import { registerProjectSummary } from './tools/project-summary.js';

// Tools — Project routing (smart detection)
import { registerDetectProjectType } from './tools/detect-project-type.js';

// Tools — Storefront (Adobe Commerce drop-ins)
import { registerScaffoldStorefrontProject } from './tools/scaffold-storefront-project.js';
import { registerAddDropin } from './tools/add-dropin.js';
import { registerLookupDropin } from './tools/lookup-dropin.js';
import { registerCustomizeDropinSlot } from './tools/customize-dropin-slot.js';
import { registerStyleDropin } from './tools/style-dropin.js';
import { registerScaffoldCommerceBlock } from './tools/scaffold-commerce-block.js';
import { registerValidateStorefront } from './tools/validate-storefront.js';
import { registerEdsStorefrontConfig } from './tools/eds-storefront-config.js';
import { registerCommerceEventsGuide } from './tools/commerce-events-guide.js';

// Tools — AEM as a Cloud Service (Java / Maven stack)
import { registerAemSkillsIndex } from './tools/aem-skills-index.js';
import { registerEnsureAgentsMd } from './tools/ensure-agents-md.js';
import { registerScaffoldAemComponent } from './tools/scaffold-aem-component.js';
import { registerAemBestPractices } from './tools/aem-best-practices.js';
import { registerAemMigrationPattern } from './tools/aem-migration-pattern.js';
import { registerAemDispatcherConfig } from './tools/aem-dispatcher-config.js';

// Tools — AEM 6.5 LTS / AMS (on-prem & Adobe Managed Services)
import { registerAem65SkillsIndex } from './tools/aem65-skills-index.js';
import { registerAem65Replication } from './tools/aem65-replication.js';
import { registerAem65Workflow } from './tools/aem65-workflow.js';

// Resources
import { registerResources } from './resources/eds-resources.js';

// Prompts
import { registerPrompts } from './prompts/eds-prompts.js';

// ─── Server Setup ─────────────────────────────────────────────

const server = new McpServer({
  name: 'eds-mcp-server',
  version: '1.0.0',
});

// ─── Register Everything ──────────────────────────────────────

// Tools: Block Development
registerScaffoldBlock(server);    // scaffold_block — generate block files
registerScaffoldModel(server);    // scaffold_model — generate UE component models
registerValidateBlock(server);    // validate_block — check block against EDS standards
registerExplainDom(server);       // explain_dom — show content → DOM mapping
registerLookupBlock(server);      // lookup_block — search block patterns & references
registerSearchBlockCollection(server); // search_block_collection — search Adobe Block Collection & Block Party
registerPerformanceCheck(server); // check_performance — analyze block performance
registerGenerateBlockFromDesign(server); // generate_block_from_design — text / image / Figma → block (Adobe CDD)
registerProjectSummary(server);   // project_summary — create/update workspace summary and session handoff

// Tools: Project & Configuration
registerScaffoldProject(server);  // scaffold_project — new project setup guide
registerEdsConfig(server);        // eds_config — configuration file templates
registerEdsScripts(server);       // eds_scripts_guide — scripts.js customization

// Tools: Project routing — call FIRST to decide EDS vs storefront
registerDetectProjectType(server);         // detect_project_type

// Tools: Storefront (Adobe Commerce drop-ins)
registerScaffoldStorefrontProject(server); // scaffold_storefront_project
registerAddDropin(server);                 // add_dropin
registerLookupDropin(server);              // lookup_dropin
registerCustomizeDropinSlot(server);       // customize_dropin_slot
registerStyleDropin(server);               // style_dropin
registerScaffoldCommerceBlock(server);     // scaffold_commerce_block
registerValidateStorefront(server);        // validate_storefront
registerEdsStorefrontConfig(server);       // eds_storefront_config
registerCommerceEventsGuide(server);       // commerce_events_guide

// Tools: AEM as a Cloud Service (Java / Maven stack)
registerAemSkillsIndex(server);            // aem_skills_index
registerEnsureAgentsMd(server);            // ensure_agents_md
registerScaffoldAemComponent(server);      // scaffold_aem_component
registerAemBestPractices(server);          // aem_best_practices
registerAemMigrationPattern(server);       // aem_migration_pattern
registerAemDispatcherConfig(server);       // aem_dispatcher_config (cloud + ams variants)

// Tools: AEM 6.5 LTS / AMS
registerAem65SkillsIndex(server);          // aem65_skills_index
registerAem65Replication(server);          // aem65_replication
registerAem65Workflow(server);             // aem65_workflow

// Resources: Documentation (available as context to the LLM)
registerResources(server);

// Prompts: Task Templates (appear as slash commands in IDEs)
registerPrompts(server);

// ─── Start Server ─────────────────────────────────────────────

async function main() {
  // Catch stray writes to stdout that corrupt JSON-RPC
  process.on('uncaughtException', (err) => {
    console.error('[eds-mcp-server] Uncaught exception:', err);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[eds-mcp-server] Unhandled rejection:', reason);
    process.exit(1);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr — stdout is reserved for JSON-RPC
  console.error('🚀 EDS MCP Server v1.0.0 running on stdio');
  console.error('   Tools: scaffold_block, scaffold_model, validate_block, explain_dom,');
  console.error('          lookup_block, search_block_collection, check_performance,');
  console.error('          generate_block_from_design, project_summary,');
  console.error('          scaffold_project, eds_config, eds_scripts_guide');
  console.error('   Routing: detect_project_type (call first to decide EDS vs storefront)');
  console.error('   Storefront tools: scaffold_storefront_project, add_dropin, lookup_dropin,');
  console.error('                     customize_dropin_slot, style_dropin, scaffold_commerce_block,');
  console.error('                     validate_storefront, eds_storefront_config, commerce_events_guide');
  console.error('   AEMaaCS tools: aem_skills_index, ensure_agents_md, scaffold_aem_component,');
  console.error('                  aem_best_practices, aem_migration_pattern, aem_dispatcher_config');
  console.error('   AEM 6.5 LTS / AMS tools: aem65_skills_index, aem65_replication, aem65_workflow,');
  console.error('                            aem_dispatcher_config (variant=ams), ensure_agents_md (variant=6.5-lts)');
  console.error('   Resources: eds-coding-standards, eds-block-guide, eds-cheatsheet, eds-adobe-skills,');
  console.error('              eds-storefront-architecture, eds-storefront-dropins, eds-storefront-sdk,');
  console.error('              aemaacs-skills, aemaacs-architecture');
  console.error('   Prompts: new-block, fix-block, design-to-block,');
  console.error('            new-storefront-project, add-and-customize-dropin, storefront-from-design,');
  console.error('            new-aem-component, migrate-to-cloud-service, aem-dispatcher-task');
  console.error('   CLI: eds-validate (block validator/linter)');
}

main().catch((error) => {
  console.error('[eds-mcp-server] Fatal error:', error);
  console.error('[eds-mcp-server] Node:', process.version, '| Platform:', process.platform);
  process.exit(1);
});
