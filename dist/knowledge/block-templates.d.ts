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
type ModelField = {
    name: string;
    type: string;
    label: string;
    required?: boolean;
    multi?: boolean;
};
/**
 * Generate a single entry for component-models.json.
 * Returns a JSON string of `{ id, fields: [...] }` ready to be appended
 * to the top-level array in the file.
 */
export declare function generateComponentModel(blockName: string, fields: Array<ModelField>): string;
type DefinitionOptions = {
    title?: string;
    /** UE group this component belongs to (e.g. "Blocks", "Default Content"). */
    group?: string;
    /** Model id to reference. Defaults to `blockName`. Pass `null` to omit. */
    model?: string | null;
    /** Filter id for container blocks. Omitted for leaf blocks. */
    filter?: string;
    /** If true, emit an item definition (resourceType .../block/v1/block/item). */
    isItem?: boolean;
};
/**
 * Generate a single component entry for component-definition.json.
 *
 * The canonical file shape is:
 *   { "groups": [ { "title": "Blocks", "id": "blocks", "components": [ ... ] } ] }
 *
 * This generator returns the inner component object ready to append to
 * `groups[i].components`. Consumers should merge it into the existing
 * group (default: "Blocks").
 */
export declare function generateComponentDefinition(blockName: string, titleOrOptions?: string | DefinitionOptions, group?: string): string;
/**
 * Generate an entry for component-filters.json.
 * The filter `id` equals the block id (UE convention) \u2014 NOT `<block>-filter`.
 */
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
export {};
