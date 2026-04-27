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
    packageJson?: string;
    headHtml?: string;
    configJson?: string;
    fstabYaml?: string;
    dropinsDirListing?: string;
    blocksDirListing?: string;
    rootDirListing?: string;
    scriptsDirListing?: string;
    pomXml?: string;
    aemSkillsConfigYaml?: string;
    uiAppsDirListing?: string;
    coreDirListing?: string;
    dispatcherDirListing?: string;
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
    score: number;
    aemScore: number;
    aem65Score: number;
    signals: DetectionSignal[];
    installedDropins: string[];
    hasDropinsDir: boolean;
    hasCommerceBlocks: boolean;
    hasAemSkillsConfig: boolean;
    detectedAemModules: string[];
    recommendedTools: string[];
    warnings: string[];
}
export declare function detectProjectType(input: DetectionInput): DetectionResult;
/** A short instruction the IDE LLM can follow to gather all detection inputs. */
export declare const DETECTION_INPUT_RECIPE: string;
