/**
 * AEM as a Cloud Service — skills catalog & conventions
 *
 * Mirrors the Adobe Skills repo at
 *   https://github.com/adobe/skills/tree/beta/skills/aem/cloud-service
 *
 * The actual SKILL.md files (and their `references/*.md`) live in Adobe's
 * repo. This module surfaces the index, hard rules, project layout, and
 * pattern map that the IDE LLM needs to route correctly.
 */
export interface AemCloudSkill {
    id: string;
    title: string;
    description: string;
    /** When the IDE LLM should pick this skill */
    when: string;
    /** Anchor in Adobe's repo for the SKILL.md (under skills/aem/cloud-service/skills/) */
    path: string;
    status: 'beta' | 'ready';
    /** Optional: sub-skills (intent router rows) for skills that route to specialists. */
    subSkills?: {
        id: string;
        description: string;
    }[];
}
export declare const AEM_CLOUD_SKILLS: AemCloudSkill[];
export declare function findAemCloudSkill(query: string): AemCloudSkill | undefined;
export declare const AEM_CLOUD_HARD_RULES: string[];
export declare const AEM_CLOUD_PROJECT_STRUCTURE: string;
export interface PatternRef {
    id: string;
    title: string;
    module: string;
    classification: string;
}
export declare const AEM_CLOUD_PATTERNS: PatternRef[];
export declare const AEM_DIALOG_FIELD_MAP: Array<{
    user: string;
    resourceType: string;
    note?: string;
}>;
export declare const CORE_COMPONENT_MAP: Record<string, string>;
export declare const AEM_SKILLS_CONFIG_TEMPLATE = "# .aem-skills-config.yaml \u2014 single source of truth for create-component\n# Place this file in the project root (next to pom.xml).\nproject:    mysite                   # AEM project name (artifact in /apps/<project>/)\npackage:    com.mysite.core          # Java base package\ngroup:      MySite Components        # Component group shown in editor\nconfigured: true                     # required: skills will refuse to scaffold without it\n";
