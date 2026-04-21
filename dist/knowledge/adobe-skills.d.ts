/**
 * Adobe EDS Skills — condensed workflow knowledge.
 *
 * Source: https://github.com/adobe/skills/tree/beta/skills/aem/edge-delivery-services/skills
 * License: Apache-2.0 (Adobe). Condensed for MCP consumption.
 *
 * These are the workflows the IDE LLM should follow when building or
 * modifying EDS blocks. They are surfaced via MCP resources and composed
 * into tool outputs (e.g. generate_block_from_design).
 */
export declare const ADOBE_SKILLS_INDEX: Array<{
    id: string;
    purpose: string;
    when: string;
}>;
export declare const CDD_WORKFLOW: string;
export declare const ANALYZE_AND_PLAN_TEMPLATE: string;
export declare const CONTENT_MODEL_RULES: string;
export declare const AUTHORING_DECISION_TREE: string;
export declare const BUILDING_BLOCKS_PATTERNS: string;
export declare const UE_COMPONENT_MODEL_RULES: string;
export declare const CODE_REVIEW_CHECKLIST: string;
export declare const TESTING_MATRIX: string;
