/**
 * AEM Component Dialog Design Best Practices
 *
 * Comprehensive guidelines for creating usable, maintainable, and performant
 * component dialogs in AEM as a Cloud Service.
 *
 * Core principles:
 * - Simplicity: minimize options, maximize clarity
 * - Consistency: align naming, field structure, and behavior across components
 * - Author-first: design for CMS author productivity
 * - Policy-driven: offload admin/template-level config to template policies
 * - Accessibility: CoralUI compliance, tooltips, validation, help paths
 */
export interface DialogDesignPrinciple {
    id: string;
    title: string;
    description: string;
    rationale: string;
    examples: string[];
    antiPatterns: string[];
}
export declare const DIALOG_PRINCIPLES: DialogDesignPrinciple[];
export interface DialogFieldType {
    id: string;
    coralUiClass: string;
    use: string;
    examples: string[];
    validation: string[];
    defaultProperties: Record<string, unknown>;
    antiPatterns: string[];
}
export declare const DIALOG_FIELD_TYPES: DialogFieldType[];
export declare const DIALOG_PATTERNS: {
    name: string;
    description: string;
    tabStructure: {
        title: string;
        fields: string[];
    }[];
    policyConfig: string[];
    showHideLogic: string;
}[];
export declare const NAMING_CONVENTIONS: {
    codePrefix: {
        c010: string;
        c020: string;
        c030: string;
        c040: string;
        c050: string;
        c060: string;
        c070: string;
        c080: string;
        c090: string;
    };
    componentNamingPattern: {
        coreConcept: string;
        variant: string;
        correct: string;
        incorrect: string;
        rationale: string;
    };
    fieldNamingPattern: {
        substance_first: string;
        correct: string[];
        incorrect: string[];
    };
    propertyNameConvention: {
        camelCase: string;
        examples: {
            'Heading Text': string;
            'Image Alt': string;
            'CTA Link': string;
            'Show Features': string;
            'Max Items': string;
        };
    };
};
