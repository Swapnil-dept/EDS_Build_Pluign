/**
 * Project Type Detection
 *
 * Given snapshots of a workspace (package.json, dir listings, key files),
 * decide whether it is a vanilla EDS project or an EDS Commerce Storefront.
 * Returns a confidence-scored verdict plus the list of signals used and the
 * recommended next tools to call.
 *
 * Used by the `detect_project_type` tool and by all other tools that want to
 * gate behavior (e.g. block scaffolding suggesting commerce blocks only on
 * storefronts).
 */

export type ProjectType = 'eds' | 'storefront' | 'unknown';

export interface DetectionInput {
  packageJson?: string;          // contents of package.json
  headHtml?: string;             // contents of head.html
  configJson?: string;           // contents of config.json / default-config.json
  fstabYaml?: string;            // contents of fstab.yaml
  dropinsDirListing?: string;    // `ls scripts/__dropins__/` (one folder per line)
  blocksDirListing?: string;     // `ls blocks/`
  rootDirListing?: string;       // `ls` of project root
  scriptsDirListing?: string;    // `ls scripts/`
}

export interface DetectionSignal {
  weight: number;     // negative pulls toward EDS, positive toward storefront
  source: string;     // e.g. "package.json"
  detail: string;
}

export interface DetectionResult {
  type: ProjectType;
  confidence: 'low' | 'medium' | 'high';
  score: number;                     // raw signed score (storefront positive)
  signals: DetectionSignal[];
  installedDropins: string[];        // @dropins/storefront-* packages found
  hasDropinsDir: boolean;            // scripts/__dropins__/ exists & non-empty
  hasCommerceBlocks: boolean;        // blocks/commerce-* exist
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
  const add = (weight: number, source: string, detail: string) => {
    signals.push({ weight, source, detail });
    score += weight;
  };

  // ─── package.json ──────────────────────────────────────────
  const pkg = readJsonSafe(input.packageJson);
  let pkgPresent = false;
  if (pkg) {
    pkgPresent = true;
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const hasAnyDropin = Object.keys(deps).some((d) => d.startsWith('@dropins/'));
    if ('@dropins/tools' in deps) add(+30, 'package.json', '@dropins/tools is installed');
    for (const name of Object.keys(deps)) {
      if (name.startsWith('@dropins/storefront-')) {
        installedDropins.push(name);
        add(+8, 'package.json', `${name} dependency`);
      }
    }
    if (deps['@adobe/magento-storefront-events-sdk']
        || deps['@adobe/magento-storefront-event-collector']) {
      add(+10, 'package.json', 'Magento storefront events SDK installed');
    }
    if (pkg.scripts?.postinstall && /dropins/i.test(pkg.scripts.postinstall)) {
      add(+15, 'package.json', 'postinstall script copies dropins');
    }
    if (pkg.name && /commerce|storefront|shop/i.test(pkg.name)) {
      add(+3, 'package.json', `name "${pkg.name}" hints commerce`);
    }
    // Vanilla-EDS positive signals
    if (!hasAnyDropin) {
      add(-5, 'package.json', 'no @dropins/* dependencies');
    }
    if ('@adobe/aem-cli' in deps) {
      add(-2, 'package.json', '@adobe/aem-cli devDependency (EDS toolchain)');
    }
  } else if (input.packageJson != null) {
    warnings.push('package.json was provided but could not be parsed');
  }

  // ─── scripts/__dropins__/ listing ───────────────────────────
  const dropinFolders = listLines(input.dropinsDirListing).filter((n) => n.startsWith('storefront-'));
  const hasDropinsDir = dropinFolders.length > 0;
  if (hasDropinsDir) {
    add(+40, 'scripts/__dropins__/', `${dropinFolders.length} dropin folder(s): ${dropinFolders.join(', ')}`);
  } else if (input.dropinsDirListing != null) {
    add(-5, 'scripts/__dropins__/', 'directory listed but contains no storefront-* folders');
  }

  // ─── scripts/ listing ──────────────────────────────────────
  const scripts = listLines(input.scriptsDirListing);
  for (const f of STOREFRONT_SCRIPTS) {
    if (scripts.includes(f)) add(+6, 'scripts/', `${f} present`);
  }
  if (scripts.includes('aem.js')) add(-0, 'scripts/', 'aem.js present (EDS baseline)');

  // ─── root listing ──────────────────────────────────────────
  const root = listLines(input.rootDirListing);
  for (const f of STOREFRONT_FILES) {
    if (root.includes(f)) add(+8, 'root', `${f} present`);
  }
  if (root.includes('postinstall.js')) add(+5, 'root', 'postinstall.js present');
  if (root.includes('component-models.json')) add(-0, 'root', 'component-models.json (UE — common to both)');

  // ─── blocks/ listing ───────────────────────────────────────
  const blocks = listLines(input.blocksDirListing);
  const commerceBlocks = blocks.filter((b) => b.startsWith('commerce-'));
  const hasCommerceBlocks = commerceBlocks.length > 0;
  if (hasCommerceBlocks) {
    add(+12, 'blocks/', `${commerceBlocks.length} commerce-* block(s): ${commerceBlocks.join(', ')}`);
  }
  // Vanilla-EDS positive: classic blocks present without any commerce-* blocks
  const classicBlocks = blocks.filter((b) => /^(hero|cards|columns|footer|header|fragment|carousel|tabs)$/.test(b));
  if (classicBlocks.length && !hasCommerceBlocks) {
    add(-3, 'blocks/', `${classicBlocks.length} vanilla EDS block(s): ${classicBlocks.join(', ')}`);
  }

  // ─── head.html ─────────────────────────────────────────────
  if (input.headHtml) {
    if (/adobeDataLayer\s*=/.test(input.headHtml)) {
      add(+8, 'head.html', 'bootstraps window.adobeDataLayer');
    }
    if (/preconnect[^>]*commerce/i.test(input.headHtml)) {
      add(+4, 'head.html', 'preconnects to commerce endpoint');
    }
  }

  // ─── config.json ───────────────────────────────────────────
  const cfg = readJsonSafe(input.configJson);
  if (cfg) {
    if (cfg['commerce-endpoint'])         add(+15, 'config.json', 'commerce-endpoint set');
    if (cfg['commerce-environment-id'])   add(+5,  'config.json', 'commerce-environment-id set');
    if (cfg['adobe-commerce-optimizer'])  add(+5,  'config.json', 'adobe-commerce-optimizer = true');
    if (cfg.headers?.cs)                  add(+4,  'config.json', 'headers.cs commerce headers');
  }

  // ─── fstab.yaml ────────────────────────────────────────────
  if (input.fstabYaml && /\/$/m.test(input.fstabYaml)) {
    add(-2, 'fstab.yaml', 'fstab present (vanilla EDS or storefront)');
  }
  if (root.includes('fstab.yaml')) add(-1, 'root', 'fstab.yaml present');
  if (root.includes('helix-query.yaml') || root.includes('helix-sitemap.yaml')) {
    add(-1, 'root', 'helix-* yaml present (EDS baseline)');
  }

  // ─── Verdict ───────────────────────────────────────────────
  let type: ProjectType;
  let confidence: 'low' | 'medium' | 'high';
  if (score >= 25)      { type = 'storefront'; confidence = score >= 60 ? 'high' : 'medium'; }
  else if (score >= 10) { type = 'storefront'; confidence = 'low'; }
  else if (score <= -5) { type = 'eds';        confidence = 'high'; }
  else if (score <= -2) { type = 'eds';        confidence = 'medium'; }
  else if (pkgPresent || (signals.length > 0 && score < 0)) {
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

  // Recommended tools
  const recommendedTools: string[] = [];
  if (type === 'storefront') {
    recommendedTools.push(
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
    recommendedTools.push('scaffold_project', 'scaffold_storefront_project');
  }

  return {
    type,
    confidence,
    score,
    signals,
    installedDropins,
    hasDropinsDir,
    hasCommerceBlocks,
    recommendedTools,
    warnings,
  };
}

/** A short instruction the IDE LLM can follow to gather all detection inputs. */
export const DETECTION_INPUT_RECIPE = `
To detect project type, gather these inputs from the user's workspace and
pass them to \`detect_project_type\`:

  packageJson         ← contents of \`package.json\`
  rootDirListing      ← \`ls\` of the project root (one name per line)
  scriptsDirListing   ← \`ls scripts/\`
  blocksDirListing    ← \`ls blocks/\`
  dropinsDirListing   ← \`ls scripts/__dropins__/\`        (skip if dir missing)
  headHtml            ← contents of \`head.html\`           (if present)
  configJson          ← contents of \`config.json\` or \`default-config.json\`
  fstabYaml           ← contents of \`fstab.yaml\`          (optional)

The IDE LLM should read these via its own file-access tools and pass the
strings through. None of them are required individually — pass whatever
you have. The more inputs, the higher the detection confidence.
`.trim();
