/**
 * AEM Admin UI Development Knowledge Base
 *
 * Covers three interconnected topics essential for building AEM backend tooling:
 *   1. Coral UI 3  — building admin-grade HTML/JS using the Granite/CoralUI component library
 *   2. Sling Servlets — writing GET/POST Sling servlets correctly for AEMaaCS
 *   3. Service Users & UserMapper — mapping system users and reading/writing JCR safely
 *
 * All patterns verified against AEM SDK 2026.5.x (AEM as a Cloud Service).
 *
 * Source of truth: first-hand implementation of the DAM Value Add SEO Optimizer
 * (multi-tab admin page, AI-powered GEO suggestions, Brand Context chat).
 */
export interface CoralPattern {
    id: string;
    title: string;
    description: string;
    correct: string;
    wrong?: string;
    notes?: string[];
}
export declare const CORAL_PATTERNS: CoralPattern[];
export interface SlingServletPattern {
    id: string;
    title: string;
    description: string;
    code: string;
    notes?: string[];
    antiPatterns?: string[];
}
export declare const SLING_SERVLET_PATTERNS: SlingServletPattern[];
export interface ServiceUserPattern {
    id: string;
    title: string;
    description: string;
    code: string;
    files?: {
        path: string;
        content: string;
    }[];
    notes?: string[];
    antiPatterns?: string[];
}
export declare const SERVICE_USER_PATTERNS: ServiceUserPattern[];
export interface SeoOptimizerPattern {
    id: string;
    title: string;
    description: string;
    code: string;
    notes?: string[];
}
export declare const SEO_OPTIMIZER_PATTERNS: SeoOptimizerPattern[];
export declare const ALL_PATTERNS: ({
    section: string;
    id: string;
    title: string;
    description: string;
    correct: string;
    wrong?: string;
    notes?: string[];
} | {
    section: string;
    id: string;
    title: string;
    description: string;
    code: string;
    notes?: string[];
})[];
