/**
 * Block Template Generators
 *
 * Pure functions that generate EDS-compliant block files.
 * No LLM calls — deterministic scaffolding.
 */
export declare function generateBlockJS(blockName: string, options?: {
    variant?: string;
    interactive?: boolean;
    hasMedia?: boolean;
    description?: string;
}): string;
export declare function generateBlockCSS(blockName: string, options?: {
    variant?: string;
    hasMedia?: boolean;
    layout?: 'grid' | 'flex' | 'stack';
}): string;
export declare function generateComponentModel(blockName: string, fields: Array<{
    name: string;
    type: string;
    label: string;
    required?: boolean;
}>): string;
export declare function generateComponentDefinition(blockName: string, title?: string, group?: string): string;
export declare function generateComponentFilter(blockName: string, allowedChildren?: string[]): string;
export declare function generateSampleContent(blockName: string, fields: Array<{
    name: string;
    type: string;
    label: string;
}>, variant?: string): string;
export declare function generateBlockReadme(blockName: string, description?: string, variant?: string, fields?: Array<{
    name: string;
    type: string;
    label: string;
}>): string;
export declare function generateTestHtml(blockName: string, sampleContent: string): string;
