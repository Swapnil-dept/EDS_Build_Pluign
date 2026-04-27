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
    packageJson?: string;
    headHtml?: string;
    configJson?: string;
    fstabYaml?: string;
    dropinsDirListing?: string;
    blocksDirListing?: string;
    rootDirListing?: string;
    scriptsDirListing?: string;
}
export interface DetectionSignal {
    weight: number;
    source: string;
    detail: string;
}
export interface DetectionResult {
    type: ProjectType;
    confidence: 'low' | 'medium' | 'high';
    score: number;
    signals: DetectionSignal[];
    installedDropins: string[];
    hasDropinsDir: boolean;
    hasCommerceBlocks: boolean;
    recommendedTools: string[];
    warnings: string[];
}
export declare function detectProjectType(input: DetectionInput): DetectionResult;
/** A short instruction the IDE LLM can follow to gather all detection inputs. */
export declare const DETECTION_INPUT_RECIPE: string;
