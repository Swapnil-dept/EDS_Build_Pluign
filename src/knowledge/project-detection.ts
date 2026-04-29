/**
 * Project Type Detection
 *
 * Given snapshots of a workspace (package.json, dir listings, key files),
 * decide whether it is:
 *   - vanilla EDS (aem.live, no commerce dropins)
 *   - EDS Commerce Storefront (@dropins/* + scripts/__dropins__/)
 *   - AEM as a Cloud Service (Maven/Java with core, ui.apps, dispatcher)
 *
 * Returns a confidence-scored verdict plus the list of signals used and the
 * recommended next tools to call.
 */

export type ProjectType = 'eds' | 'storefront' | 'aemaacs' | 'aem65lts' | 'unknown';

export interface DetectionInput {
  // EDS / Storefront inputs
  packageJson?: string;
  headHtml?: string;
  configJson?: string;
  fstabYaml?: string;
  dropinsDirListing?: string;
  blocksDirListing?: string;
  rootDirListing?: string;
  scriptsDirListing?: string;
  // AEMaaCS inputs
  pomXml?: string;                  // contents of root pom.xml
  aemSkillsConfigYaml?: string;     // contents of .aem-skills-config.yaml
  uiAppsDirListing?: string;        // ls ui.apps/
  coreDirListing?: string;          // ls core/
  dispatcherDirListing?: string;    // ls dispatcher/
}

export interface DetectionSignal {
  weight: number;
  bucket?: 'commerce' | 'aemaacs' | 'aem65lts';
  source: string;
  detail: string;
}

export interface DetectionResult {
  type: ProjectType;
  confidence: 'low' | 'medium' | 'high';
  score: number;                     // commerce-vs-eds (storefront positive, eds negative)
  aemScore: number;                  // AEMaaCS positive-only
  aem65Score: number;                // AEM 6.5 LTS positive-only
  signals: DetectionSignal[];
  installedDropins: string[];
  hasDropinsDir: boolean;
  hasCommerceBlocks: boolean;
  hasAemSkillsConfig: boolean;
  detectedAemModules: string[];
  recommendedTools: string[];
  warnings: string[];
}

const STOREFRONT_FILES = [
  'demo-config.json',
  'demo-config-aco.json',
  'default-config.json',
  'default-site.json',
  'default-query.yaml',
];

const STOREFRONT_SCRIPTS = ['initializers.js', 'configs.js', 'commerce.js'];

const AEM_MODULE_NAMES = ['core', 'ui.apps', 'ui.config', 'ui.frontend', 'ui.content', 'ui.tests', 'it.tests', 'dispatcher', 'all'];

function readJsonSafe(s?: string): any {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function listLines(s?: string): string[] {
  return (s ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function detectProjectType(input: DetectionInput): DetectionResult {
  const signals: DetectionSignal[] = [];
  const warnings: string[] = [];
  const installedDropins: string[] = [];
  let score = 0;
  let aemScore = 0;
  let aem65Score = 0;
  const addCommerce = (weight: number, source: string, detail: string) => {
    signals.push({ weight, source, detail });
    score += weight;
  };
  const addAem = (weight: number, source: string, detail: string) => {
    signals.push({ weight, bucket: 'aemaacs', source, detail });
    aemScore += weight;
  };
  const addAem65 = (weight: number, source: string, detail: string) => {
    signals.push({ weight, bucket: 'aem65lts', source, detail });
    aem65Score += weight;
  };

  // ─── package.json ──────────────────────────────────────────
  const pkg = readJsonSafe(input.packageJson);
  let pkgPresent = false;
  if (pkg) {
    pkgPresent = true;
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const hasAnyDropin = Object.keys(deps).some((d) => d.startsWith('@dropins/'));
    if ('@dropins/tools' in deps) addCommerce(+30, 'package.json', '@dropins/tools is installed');
    for (const name of Object.keys(deps)) {
      if (name.startsWith('@dropins/storefront-')) {
        installedDropins.push(name);
        addCommerce(+8, 'package.json', `${name} dependency`);
      }
    }
    if (deps['@adobe/magento-storefront-events-sdk']
        || deps['@adobe/magento-storefront-event-collector']) {
      addCommerce(+10, 'package.json', 'Magento storefront events SDK installed');
    }
    if (pkg.scripts?.postinstall && /dropins/i.test(pkg.scripts.postinstall)) {
      addCommerce(+15, 'package.json', 'postinstall script copies dropins');
    }
    if (pkg.name && /commerce|storefront|shop/i.test(pkg.name)) {
      addCommerce(+3, 'package.json', `name "${pkg.name}" hints commerce`);
    }
    if (!hasAnyDropin) {
      addCommerce(-5, 'package.json', 'no @dropins/* dependencies');
    }
    if ('@adobe/aem-cli' in deps) {
      addCommerce(-2, 'package.json', '@adobe/aem-cli devDependency (EDS toolchain)');
    }
  } else if (input.packageJson != null) {
    warnings.push('package.json was provided but could not be parsed');
  }

  // ─── scripts/__dropins__/ listing ───────────────────────────
  const dropinFolders = listLines(input.dropinsDirListing).filter((n) => n.startsWith('storefront-'));
  const hasDropinsDir = dropinFolders.length > 0;
  if (hasDropinsDir) {
    addCommerce(+40, 'scripts/__dropins__/', `${dropinFolders.length} dropin folder(s): ${dropinFolders.join(', ')}`);
  } else if (input.dropinsDirListing != null) {
    addCommerce(-5, 'scripts/__dropins__/', 'directory listed but contains no storefront-* folders');
  }

  // ─── scripts/ listing ──────────────────────────────────────
  const scripts = listLines(input.scriptsDirListing);
  for (const f of STOREFRONT_SCRIPTS) {
    if (scripts.includes(f)) addCommerce(+6, 'scripts/', `${f} present`);
  }

  // ─── root listing ──────────────────────────────────────────
  const root = listLines(input.rootDirListing);
  for (const f of STOREFRONT_FILES) {
    if (root.includes(f)) addCommerce(+8, 'root', `${f} present`);
  }
  if (root.includes('postinstall.js')) addCommerce(+5, 'root', 'postinstall.js present');

  // ─── blocks/ listing ───────────────────────────────────────
  const blocks = listLines(input.blocksDirListing);
  const commerceBlocks = blocks.filter((b) => b.startsWith('commerce-'));
  const hasCommerceBlocks = commerceBlocks.length > 0;
  if (hasCommerceBlocks) {
    addCommerce(+12, 'blocks/', `${commerceBlocks.length} commerce-* block(s): ${commerceBlocks.join(', ')}`);
  }
  const classicBlocks = blocks.filter((b) => /^(hero|cards|columns|footer|header|fragment|carousel|tabs)$/.test(b));
  if (classicBlocks.length && !hasCommerceBlocks) {
    addCommerce(-3, 'blocks/', `${classicBlocks.length} vanilla EDS block(s): ${classicBlocks.join(', ')}`);
  }

  // ─── head.html ─────────────────────────────────────────────
  if (input.headHtml) {
    if (/adobeDataLayer\s*=/.test(input.headHtml)) {
      addCommerce(+8, 'head.html', 'bootstraps window.adobeDataLayer');
    }
    if (/preconnect[^>]*commerce/i.test(input.headHtml)) {
      addCommerce(+4, 'head.html', 'preconnects to commerce endpoint');
    }
  }

  // ─── config.json ───────────────────────────────────────────
  const cfg = readJsonSafe(input.configJson);
  if (cfg) {
    if (cfg['commerce-endpoint'])         addCommerce(+15, 'config.json', 'commerce-endpoint set');
    if (cfg['commerce-environment-id'])   addCommerce(+5,  'config.json', 'commerce-environment-id set');
    if (cfg['adobe-commerce-optimizer'])  addCommerce(+5,  'config.json', 'adobe-commerce-optimizer = true');
    if (cfg.headers?.cs)                  addCommerce(+4,  'config.json', 'headers.cs commerce headers');
  }

  // ─── fstab.yaml / helix yaml ────────────────────────────────
  if (input.fstabYaml && /\/$/m.test(input.fstabYaml)) {
    addCommerce(-2, 'fstab.yaml', 'fstab present (vanilla EDS or storefront)');
  }
  if (root.includes('fstab.yaml')) addCommerce(-1, 'root', 'fstab.yaml present');
  if (root.includes('helix-query.yaml') || root.includes('helix-sitemap.yaml')) {
    addCommerce(-1, 'root', 'helix-* yaml present (EDS baseline)');
  }

  // ═══ AEMaaCS signals ═══════════════════════════════════════
  const detectedAemModules: string[] = [];

  const pom = input.pomXml ?? '';
  if (pom) {
    if (/<artifactId>\s*aem-sdk-api\s*<\/artifactId>/.test(pom)
        || /com\.adobe\.aem[\s\S]{0,40}aem-sdk-api/i.test(pom)) {
      addAem(+40, 'pom.xml', 'depends on com.adobe.aem:aem-sdk-api (AEMaaCS)');
    }
    if (/aem-project-archetype/i.test(pom)) {
      addAem(+30, 'pom.xml', 'generated from aem-project-archetype');
    }
    if (/<artifactId>\s*uber-jar\s*<\/artifactId>/.test(pom)) {
      addAem65(+40, 'pom.xml', 'depends on com.adobe.aem:uber-jar (AEM 6.5 LTS / AMS)');
    }
    if (/<cq\.quickstart\.version>|<aem\.version>\s*6\.5/i.test(pom) || /cq-quickstart/.test(pom)) {
      addAem65(+30, 'pom.xml', 'cq.quickstart.version / cq-quickstart property present (6.5 line)');
    }
    if (/<groupId>\s*com\.adobe\.cq\s*<\/groupId>/.test(pom)) {
      addAem(+4, 'pom.xml', 'com.adobe.cq groupId present (shared 6.5 / Cloud)');
      addAem65(+4, 'pom.xml', 'com.adobe.cq groupId present (shared 6.5 / Cloud)');
    }
    const modulesMatch = pom.match(/<modules>([\s\S]*?)<\/modules>/);
    if (modulesMatch) {
      const found = AEM_MODULE_NAMES.filter((m) => new RegExp(`<module>\\s*${m.replace('.', '\\.')}\\s*</module>`).test(modulesMatch[1]));
      if (found.length) {
        detectedAemModules.push(...found);
        const w = +5 * Math.min(found.length, 4);
        addAem(w, 'pom.xml', `<modules> includes ${found.join(', ')}`);
        addAem65(w, 'pom.xml', `<modules> includes ${found.join(', ')}`);
      }
    }
    if (/aem-core-cif-components|cif-connector/i.test(pom)) {
      addAem(+5, 'pom.xml', 'CIF (Commerce) add-on detected');
      addAem65(+5, 'pom.xml', 'CIF (Commerce) add-on detected');
    }
    if (/aem-forms-|forms\.core/i.test(pom)) {
      addAem(+5, 'pom.xml', 'AEM Forms add-on detected');
      addAem65(+5, 'pom.xml', 'AEM Forms add-on detected');
    }
  }

  const hasAemSkillsConfig = !!input.aemSkillsConfigYaml && /configured\s*:\s*true/i.test(input.aemSkillsConfigYaml);
  if (input.aemSkillsConfigYaml) {
    addAem(+15, '.aem-skills-config.yaml', hasAemSkillsConfig ? 'present and configured' : 'present (configured: false)');
  }

  if (listLines(input.uiAppsDirListing).length) {
    addAem(+10, 'ui.apps/', 'ui.apps module directory exists');
    addAem65(+10, 'ui.apps/', 'ui.apps module directory exists');
    if (!detectedAemModules.includes('ui.apps')) detectedAemModules.push('ui.apps');
  }
  if (listLines(input.coreDirListing).length) {
    addAem(+10, 'core/', 'core module directory exists');
    addAem65(+10, 'core/', 'core module directory exists');
    if (!detectedAemModules.includes('core')) detectedAemModules.push('core');
  }
  if (listLines(input.dispatcherDirListing).length) {
    addAem(+10, 'dispatcher/', 'dispatcher module directory exists');
    addAem65(+10, 'dispatcher/', 'dispatcher module directory exists');
    if (!detectedAemModules.includes('dispatcher')) detectedAemModules.push('dispatcher');
  }

  if (root.includes('pom.xml') && !pom) {
    addAem(+4, 'root', 'pom.xml at root (Maven project)');
    addAem65(+4, 'root', 'pom.xml at root (Maven project)');
  }
  for (const m of AEM_MODULE_NAMES) {
    if (root.includes(m) && !detectedAemModules.includes(m)) {
      addAem(+3, 'root', `${m}/ folder at root`);
      addAem65(+3, 'root', `${m}/ folder at root`);
      detectedAemModules.push(m);
    }
  }
  if (root.includes('AGENTS.md')) {
    addAem(+2, 'root', 'AGENTS.md present');
    addAem65(+2, 'root', 'AGENTS.md present');
  }
  if (root.includes('archetype.properties')) {
    addAem(+5, 'root', 'archetype.properties present');
    addAem65(+5, 'root', 'archetype.properties present');
  }

  // ─── Verdict ───────────────────────────────────────────────
  let type: ProjectType;
  let confidence: 'low' | 'medium' | 'high';

  const isStorefrontStrong = score >= 25;
  // Maven project: pick the AEM variant with the higher *exclusive* signal.
  // Cloud-service-only signals: aem-sdk-api, .aem-skills-config.yaml, archetype.
  // 6.5-LTS-only signals: uber-jar, cq.quickstart.version, cq-quickstart.
  const aemMaxScore = Math.max(aemScore, aem65Score);
  const winsAemaacs = aemScore >= aem65Score;
  if (aemMaxScore >= 40 && !isStorefrontStrong) {
    type = winsAemaacs ? 'aemaacs' : 'aem65lts';
    confidence = aemMaxScore >= 70 ? 'high' : 'medium';
  } else if (aemMaxScore >= 20 && !isStorefrontStrong) {
    type = winsAemaacs ? 'aemaacs' : 'aem65lts';
    confidence = 'low';
  } else if (score >= 25) {
    type = 'storefront';
    confidence = score >= 60 ? 'high' : 'medium';
  } else if (score >= 10) {
    type = 'storefront';
    confidence = 'low';
  } else if (score <= -5) {
    type = 'eds';
    confidence = 'high';
  } else if (score <= -2) {
    type = 'eds';
    confidence = 'medium';
  } else if (pkgPresent || (signals.length > 0 && score < 0)) {
    type = 'eds';
    confidence = 'low';
  } else {
    type = 'unknown';
    confidence = 'low';
  }

  // Mismatch warnings
  if (installedDropins.length && !hasDropinsDir && input.dropinsDirListing != null) {
    warnings.push(
      `${installedDropins.length} drop-in package(s) installed but scripts/__dropins__/ has no storefront-* folders. Run "npm run postinstall".`,
    );
  }
  if (hasDropinsDir && !installedDropins.length && pkg) {
    warnings.push('scripts/__dropins__/ contains dropins but package.json has no @dropins/storefront-* dependencies (postinstall artifact left over?).');
  }
  if (type === 'aemaacs' && !hasAemSkillsConfig) {
    warnings.push('No `.aem-skills-config.yaml` (or `configured: true`) at the project root. Create it before scaffolding components.');
  }
  if ((type === 'aemaacs' || type === 'aem65lts') && !root.includes('AGENTS.md')) {
    warnings.push(`No \`AGENTS.md\` at the workspace root. Run \`ensure_agents_md\` FIRST (variant: ${type === 'aemaacs' ? 'cloud-service' : '6.5-lts'}) before any other AEM task.`);
  }

  // Recommended tools
  const recommendedTools: string[] = [];
  if (type === 'aemaacs') {
    recommendedTools.push(
      'project_summary',
      'ensure_agents_md',
      'aem_skills_index',
      'scaffold_aem_component',
      'aem_best_practices',
      'aem_migration_pattern',
      'aem_dispatcher_config',
    );
  } else if (type === 'aem65lts') {
    recommendedTools.push(
      'project_summary',
      'ensure_agents_md',
      'aem65_skills_index',
      'aem65_replication',
      'aem65_workflow',
      'aem_dispatcher_config',
    );
  } else if (type === 'storefront') {
    recommendedTools.push(
      'project_summary',
      'lookup_dropin',
      'add_dropin',
      'scaffold_commerce_block',
      'customize_dropin_slot',
      'style_dropin',
      'eds_storefront_config',
      'commerce_events_guide',
      'validate_storefront',
    );
  } else if (type === 'eds') {
    recommendedTools.push(
      'project_summary',
      'lookup_block',
      'scaffold_block',
      'scaffold_model',
      'generate_block_from_design',
      'validate_block',
      'check_performance',
      'eds_config',
      'eds_scripts_guide',
    );
  } else {
    recommendedTools.push('project_summary', 'scaffold_project', 'scaffold_storefront_project');
  }

  return {
    type,
    confidence,
    score,
    aemScore,
    aem65Score,
    signals,
    installedDropins,
    hasDropinsDir,
    hasCommerceBlocks,
    hasAemSkillsConfig,
    detectedAemModules,
    recommendedTools,
    warnings,
  };
}

/** A short instruction the IDE LLM can follow to gather all detection inputs. */
export const DETECTION_INPUT_RECIPE = `
To detect project type, gather these inputs from the user's workspace and
pass them to \`detect_project_type\`. None of them are required individually —
pass whatever you have. The more inputs, the higher the detection confidence.

EDS / Storefront inputs:
  packageJson         ← contents of \`package.json\`
  rootDirListing      ← \`ls\` of the project root (one name per line)
  scriptsDirListing   ← \`ls scripts/\`
  blocksDirListing    ← \`ls blocks/\`
  dropinsDirListing   ← \`ls scripts/__dropins__/\`
  headHtml            ← contents of \`head.html\`
  configJson          ← contents of \`config.json\` or \`default-config.json\`
  fstabYaml           ← contents of \`fstab.yaml\`

AEMaaCS inputs:
  pomXml              ← contents of root \`pom.xml\`
  aemSkillsConfigYaml ← contents of \`.aem-skills-config.yaml\` (project root)
  uiAppsDirListing    ← \`ls ui.apps/\`
  coreDirListing      ← \`ls core/\`
  dispatcherDirListing← \`ls dispatcher/\`
`.trim();
