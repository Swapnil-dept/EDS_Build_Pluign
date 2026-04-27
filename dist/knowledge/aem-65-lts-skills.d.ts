/**
 * AEM 6.5 LTS — skills catalog & conventions
 *
 * Mirrors the Adobe Skills repo at
 *   https://github.com/adobe/skills/tree/beta/skills/aem/6.5-lts
 *
 * 6.5 LTS targets on-prem and Adobe Managed Services (AMS) — NOT AEM as a
 * Cloud Service. The Java/OSGi stack is the same shape (Maven project with
 * core / ui.apps / dispatcher / ...), but several things differ:
 *
 *   - pom depends on `com.adobe.aem:uber-jar` (any classifier) or
 *     `cq.quickstart.version` — never `aem-sdk-api`
 *   - JMX is allowed (workflow purge, retry, stale detection)
 *   - Felix SCR annotations are still supported alongside OSGi DS R6
 *   - Deployment via Package Manager / Maven Content Package Plugin
 *     (not Cloud Manager pipelines)
 *   - Replication uses legacy agents, NOT Sling Distribution
 *   - Dispatcher MCP variant is `ams` (AEM_DEPLOYMENT_MODE=ams)
 */
export interface Aem65LtsSkill {
    id: string;
    title: string;
    description: string;
    when: string;
    path: string;
    status: 'beta' | 'ready';
    subSkills?: {
        id: string;
        description: string;
    }[];
}
export declare const AEM_65_LTS_SKILLS: Aem65LtsSkill[];
export declare function findAem65LtsSkill(query: string): Aem65LtsSkill | undefined;
export declare const AEM_65_LTS_HARD_RULES: string[];
export declare const AEM_65_LTS_PROJECT_STRUCTURE: string;
