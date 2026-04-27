/**
 * Storefront Block Catalog
 *
 * Canonical commerce blocks shipped or commonly built on top of
 * `aem-boilerplate-commerce`. Each entry maps an EDS block name to
 * the drop-in(s) it mounts and the slots it commonly customizes.
 */
export interface CommerceBlockSpec {
    name: string;
    title: string;
    purpose: string;
    dropins: string[];
    containers: string[];
    commonSlots?: string[];
    authoredFields?: string[];
    loadStrategy: 'eager' | 'lazy';
    notes?: string[];
}
export declare const COMMERCE_BLOCKS: CommerceBlockSpec[];
export declare function findCommerceBlock(name: string): CommerceBlockSpec | undefined;
