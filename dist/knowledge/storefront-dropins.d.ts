/**
 * Drop-in Catalog
 *
 * Comprehensive catalog of all Adobe Commerce drop-ins (B2C + B2B).
 * Each entry documents: package, purpose, container components, slots,
 * events, and the canonical mount snippet.
 *
 * Source: experienceleague.adobe.com/developer/commerce/storefront/dropins
 * + npm registry (@dropins/storefront-*)
 */
export interface DropinSlot {
    name: string;
    purpose: string;
}
export interface DropinContainer {
    name: string;
    importPath: string;
    purpose: string;
    slots?: DropinSlot[];
}
export interface DropinEvent {
    name: string;
    payload: string;
}
export interface DropinSpec {
    id: string;
    title: string;
    package: string;
    category: 'b2c' | 'b2b' | 'shared';
    purpose: string;
    apiImport: string;
    containers: DropinContainer[];
    events: DropinEvent[];
    blockName: string;
    notes?: string[];
}
export declare const DROPIN_CATALOG: DropinSpec[];
export declare function findDropin(query: string): DropinSpec | undefined;
export declare function listDropinsByCategory(category: 'b2c' | 'b2b' | 'shared'): DropinSpec[];
export declare function buildMountSnippet(spec: DropinSpec, container?: DropinContainer): string;
