/**
 * Block Template Generators
 *
 * Pure functions that generate EDS-compliant block files.
 * No LLM calls — deterministic scaffolding.
 *
 * Patterns derived from production EDS repos:
 *  - aemsites/vitamix    (hero, cards, carousel)
 *  - aemsites/ingredion  (accordion, columns)
 *  - Netcentric/vg-volvotrucks-us-rd  (BEM naming, v2 blocks)
 */
export type BlockPattern = 'hero' | 'cards' | 'accordion' | 'carousel' | 'columns' | 'tabs' | 'custom';
export declare function generateBlockJS(blockName: string, options?: {
    pattern?: BlockPattern;
    variant?: string;
    interactive?: boolean;
    hasMedia?: boolean;
    description?: string;
    /** 'bem' = .block__element--modifier  /  'flat' = .block-element (default) */
    naming?: 'bem' | 'flat';
}): string;
export declare function generateBlockCSS(blockName: string, options?: {
    pattern?: BlockPattern;
    variant?: string;
    hasMedia?: boolean;
    layout?: 'grid' | 'flex' | 'stack';
    /** 'bem' = .block__element--modifier  /  'flat' = .block-element (default) */
    naming?: 'bem' | 'flat';
}): string;
export type ModelField = {
    name: string;
    type: string;
    label: string;
    required?: boolean;
    multi?: boolean;
    /**
     * When true the `name` is treated as a raw CSS-selector DOM path
     * (e.g. "div:nth-child(1)>picture:nth-child(1)>img:nth-child(3)[src]")
     * used by the xwalk / Universal Editor to bind directly to a DOM node.
     * The valueType will be forced to "string".
     */
    domPath?: boolean;
    /** Default value shown in UE property panel. */
    defaultValue?: string;
};
/**
 * Generate a single entry for component-models.json.
 *
 * Automatically prepends `image`+`imageAlt` for reference fields and
 * appends a `classes` multiselect (variants) unless the caller already
 * included one.  This mirrors real-world production repos (vitamix, ingredion).
 *
 * @param blockName  - Block id (kebab-case)
 * @param fields     - Caller-supplied fields (without `classes`)
 * @param options
 *   - pattern        - Block archetype; drives default variant options in `classes`
 *   - extraVariants  - Extra variant options merged into `classes`
 *   - omitClasses    - Set true to suppress the auto-appended `classes` field
 */
export declare function generateComponentModel(blockName: string, fields: Array<ModelField>, options?: {
    pattern?: BlockPattern;
    extraVariants?: Array<{
        name: string;
        value: string;
    }>;
    /** Suppress the auto-appended `classes` multiselect. */
    omitClasses?: boolean;
}): string;
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
    /**
     * DA editor hints — how many rows/columns the block table starts with.
     * Emit `plugins.da` if provided.
     */
    daRows?: number;
    daColumns?: number;
};
/**
 * Generate a single component entry for component-definition.json.
 *
 * Emits both `plugins.xwalk` (Universal Editor) and `plugins.da`
 * (Document Authoring) when row/column hints are provided.
 *
 * The canonical file shape is:
 *   { "groups": [ { "title": "Blocks", "id": "blocks", "components": [ ... ] } ] }
 */
export declare function generateComponentDefinition(blockName: string, titleOrOptions?: string | DefinitionOptions, group?: string): string;
/**
 * Generate an entry for component-filters.json.
 * The filter `id` equals the block id (UE convention) — NOT `<block>-filter`.
 */
export declare function generateComponentFilter(blockName: string, allowedChildren?: string[]): string;
/**
 * Generate the **single** block-scoped UE config file at
 * `blocks/<blockName>/_<blockName>.json`.
 *
 * Each block ships ONE JSON file bundling `definitions`, `models`, and
 * `filters`.  The project build aggregates these into the project-root
 * `component-definitions.json` / `component-models.json` /
 * `component-filters.json` — authors never edit those root files by hand.
 *
 * Enhancement: auto-injects `classes` multiselect (variants) and `da`
 * plugin hints derived from the block pattern.
 */
export declare function generateBlockJsonFile(blockName: string, fields: Array<ModelField>, options?: {
    title?: string;
    group?: string;
    pattern?: BlockPattern;
    items?: Array<{
        id: string;
        title?: string;
        fields: Array<ModelField>;
    }>;
    allowedChildren?: string[];
    extraVariants?: Array<{
        name: string;
        value: string;
    }>;
    /** DA editor row/column hints (default: 1 row, 2 columns for leaf blocks) */
    daRows?: number;
    daColumns?: number;
}): string;
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
