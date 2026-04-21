import { z } from 'zod';
import { PERFORMANCE_RULES } from '../knowledge/eds-conventions.js';
export function registerPerformanceCheck(server) {
    server.tool('check_performance', `Analyze an EDS block's code for performance issues and estimate its impact on the 100KB pre-LCP budget. Checks JS and CSS size, identifies render-blocking patterns, lazy loading compliance, CLS risks, and main-thread work. Returns a performance report with actionable recommendations.`, {
        blockName: z.string().describe('Block name'),
        js: z.string().optional().describe('Block JS file contents'),
        css: z.string().optional().describe('Block CSS file contents'),
        isAboveFold: z
            .boolean()
            .default(false)
            .describe('Whether this block appears above the fold (eager-loaded)'),
    }, {
        title: 'Check Block Performance',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    }, async ({ blockName, js, css, isAboveFold }) => {
        const findings = [];
        let jsSize = 0;
        let cssSize = 0;
        // ─── Size Analysis ──────────────────────────────────
        if (js) {
            jsSize = new TextEncoder().encode(js).length;
            const jsKB = (jsSize / 1024).toFixed(1);
            if (jsSize > 10240) {
                findings.push({
                    category: 'size',
                    severity: 'warning',
                    message: `Block JS is ${jsKB}KB`,
                    impact: isAboveFold
                        ? 'Directly increases pre-LCP payload. Target: under 10KB.'
                        : 'Loaded lazily but still affects total page weight.',
                });
            }
            else {
                findings.push({
                    category: 'size',
                    severity: 'info',
                    message: `Block JS: ${jsKB}KB ✓`,
                    impact: 'Within recommended size budget',
                });
            }
        }
        if (css) {
            cssSize = new TextEncoder().encode(css).length;
            const cssKB = (cssSize / 1024).toFixed(1);
            if (cssSize > 15360) {
                findings.push({
                    category: 'size',
                    severity: 'warning',
                    message: `Block CSS is ${cssKB}KB`,
                    impact: 'Large CSS blocks parser and layout. Consider splitting.',
                });
            }
            else {
                findings.push({
                    category: 'size',
                    severity: 'info',
                    message: `Block CSS: ${cssKB}KB ✓`,
                    impact: 'Within recommended size budget',
                });
            }
        }
        const totalKB = ((jsSize + cssSize) / 1024).toFixed(1);
        const budgetUsed = isAboveFold
            ? `${totalKB}KB of 100KB pre-LCP budget (${((jsSize + cssSize) / 1024 / 100 * 100).toFixed(0)}%)`
            : `${totalKB}KB (loaded lazily, not in pre-LCP budget)`;
        // ─── JS Performance Patterns ────────────────────────
        if (js) {
            // Synchronous fetch in decorate
            if (js.includes('await fetch(') || js.includes('.then(')) {
                findings.push({
                    category: 'loading',
                    severity: isAboveFold ? 'critical' : 'warning',
                    message: 'Network request in decorate() blocks rendering',
                    impact: isAboveFold
                        ? 'CRITICAL: Async work in eager blocks delays LCP'
                        : 'Delays block visibility. Consider a loading skeleton.',
                });
            }
            // DOM thrashing
            const getComputedCount = (js.match(/getComputedStyle/g) || []).length;
            const offsetCount = (js.match(/offset(Width|Height|Top|Left)/g) || []).length;
            if (getComputedCount + offsetCount > 2) {
                findings.push({
                    category: 'rendering',
                    severity: 'warning',
                    message: `${getComputedCount + offsetCount} layout-triggering reads detected`,
                    impact: 'Forced reflows cause jank. Batch reads before writes.',
                });
            }
            // Heavy DOM creation
            const createElementCount = (js.match(/createElement/g) || []).length;
            if (createElementCount > 20) {
                findings.push({
                    category: 'rendering',
                    severity: 'warning',
                    message: `${createElementCount} createElement calls — heavy DOM creation`,
                    impact: 'Consider using template literals with innerHTML for bulk DOM creation',
                });
            }
            // Event listeners without delegation
            const addEventCount = (js.match(/addEventListener/g) || []).length;
            if (addEventCount > 5) {
                findings.push({
                    category: 'rendering',
                    severity: 'warning',
                    message: `${addEventCount} event listeners — consider event delegation`,
                    impact: 'Many listeners increase memory usage. Delegate to block root.',
                });
            }
            // Missing lazy loading on images
            if (js.includes('createElement') && js.includes('img') && !js.includes('loading')) {
                findings.push({
                    category: 'loading',
                    severity: 'warning',
                    message: 'Dynamic images missing loading="lazy"',
                    impact: 'Below-fold images without lazy loading delay other resources.',
                });
            }
            // External library imports
            if (js.includes('import(') || js.match(/from ['"][^.\/]/)) {
                findings.push({
                    category: 'size',
                    severity: 'warning',
                    message: 'External imports detected',
                    impact: 'External libraries add network requests and payload. Use sparingly.',
                });
            }
            // CSS-in-JS / inline styles
            if (js.includes('.style.') || js.includes('setAttribute(\'style')) {
                findings.push({
                    category: 'rendering',
                    severity: 'info',
                    message: 'Inline styles detected — prefer CSS classes',
                    impact: 'Inline styles bypass browser caching and increase specificity.',
                });
            }
        }
        // ─── CSS Performance Patterns ───────────────────────
        if (css) {
            // Excessive animations
            const animationCount = (css.match(/@keyframes/g) || []).length;
            if (animationCount > 3) {
                findings.push({
                    category: 'rendering',
                    severity: 'warning',
                    message: `${animationCount} @keyframes animations`,
                    impact: 'Animations trigger repaints. Use transform/opacity for 60fps.',
                });
            }
            // Box shadows on many elements
            if ((css.match(/box-shadow/g) || []).length > 5) {
                findings.push({
                    category: 'rendering',
                    severity: 'info',
                    message: 'Multiple box-shadows detected',
                    impact: 'Box shadows are paint-heavy. Consider using fewer or simpler shadows.',
                });
            }
            // Missing contain property
            if (!css.includes('contain:') && isAboveFold) {
                findings.push({
                    category: 'rendering',
                    severity: 'info',
                    message: 'No CSS containment declared',
                    impact: 'Adding contain: layout style can improve rendering performance.',
                });
            }
        }
        // ─── Build Report ───────────────────────────────────
        const critical = findings.filter((f) => f.severity === 'critical');
        const warnings = findings.filter((f) => f.severity === 'warning');
        const infos = findings.filter((f) => f.severity === 'info');
        const score = critical.length > 0 ? '🔴 Critical issues' :
            warnings.length > 0 ? '🟡 Needs attention' :
                '🟢 Looks good';
        const report = [
            `# Performance Report: ${blockName}`,
            `**Status:** ${score}`,
            `**Budget:** ${budgetUsed}`,
            `**Position:** ${isAboveFold ? '⚡ Above fold (eager-loaded — performance-critical)' : '📦 Below fold (lazy-loaded)'}`,
            '',
        ];
        if (critical.length > 0) {
            report.push('## 🔴 Critical');
            critical.forEach((f) => report.push(`- **${f.message}**\n  ${f.impact}`));
            report.push('');
        }
        if (warnings.length > 0) {
            report.push('## 🟡 Warnings');
            warnings.forEach((f) => report.push(`- **${f.message}**\n  ${f.impact}`));
            report.push('');
        }
        if (infos.length > 0) {
            report.push('## 🔵 Info');
            infos.forEach((f) => report.push(`- ${f.message} — ${f.impact}`));
            report.push('');
        }
        report.push('---', '', PERFORMANCE_RULES);
        return {
            content: [{ type: 'text', text: report.join('\n') }],
        };
    });
}
//# sourceMappingURL=check-performance.js.map