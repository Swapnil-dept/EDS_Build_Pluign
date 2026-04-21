export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  file: string;
  rule: string;
  message: string;
  line?: number;
  fix?: string;
}

export interface ValidationResult {
  blockName: string;
  passed: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  score: number;
  issues: ValidationIssue[];
}

export interface BlockFiles {
  js?: string;
  css?: string;
  json?: string;
  content?: string;
  readme?: string;
}

export function validateBlock(blockName: string, files: BlockFiles): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!files.js) {
    issues.push({
      severity: 'error',
      file: `${blockName}.js`,
      rule: 'js-missing',
      message: 'Missing block.js file - every EDS block needs a JS file with decorate()',
    });
  } else {
    const js = files.js;

    if (!js.includes('export default function decorate') && !js.includes('export default async function decorate')) {
      issues.push({
        severity: 'error',
        file: `${blockName}.js`,
        rule: 'js-no-decorate',
        message: 'Missing required: export default function decorate(block)',
        fix: 'Add: export default function decorate(block) { ... }',
      });
    }

    if (js.includes('export default function decorate()')) {
      issues.push({
        severity: 'error',
        file: `${blockName}.js`,
        rule: 'js-missing-block-param',
        message: 'decorate() must accept block parameter: decorate(block)',
        fix: 'Change to: export default function decorate(block) { ... }',
      });
    }

    if (js.includes('document.querySelector(') || js.includes('document.querySelectorAll(')) {
      if (!js.includes('block.querySelector(') && !js.includes('block.querySelectorAll(')) {
        issues.push({
          severity: 'error',
          file: `${blockName}.js`,
          rule: 'js-global-query',
          message: 'Use block.querySelector() instead of document.querySelector() to avoid cross-block conflicts',
          fix: 'Replace document.querySelector with block.querySelector',
        });
      } else {
        issues.push({
          severity: 'warning',
          file: `${blockName}.js`,
          rule: 'js-mixed-query-scope',
          message: 'Found document.querySelector with block.querySelector - prefer block-scoped queries only',
        });
      }
    }

    if (js.includes('fetch(') && js.includes('await')) {
      issues.push({
        severity: 'warning',
        file: `${blockName}.js`,
        rule: 'js-fetch-in-decorate',
        message: 'Async fetch() in decorate() may delay rendering',
      });
    }

    if (js.includes('innerHTML') && js.includes('fetch(')) {
      issues.push({
        severity: 'warning',
        file: `${blockName}.js`,
        rule: 'js-innerhtml-fetch',
        message: 'Setting innerHTML from fetched content is an XSS risk - use DOM APIs',
      });
    }

    const frameworkPatterns = ['from "react"', "from 'react'", 'from "vue"', "from 'vue'", 'from "@angular', "from '@angular"];
    for (const pattern of frameworkPatterns) {
      if (js.includes(pattern)) {
        issues.push({
          severity: 'error',
          file: `${blockName}.js`,
          rule: 'js-framework-import',
          message: `Framework import detected (${pattern}). EDS blocks must use vanilla JS`,
        });
      }
    }

    const npmImport = js.match(/from ['"]([^.\/][^'"]*)['"]/);
    if (npmImport && !npmImport[1].startsWith('http')) {
      issues.push({
        severity: 'error',
        file: `${blockName}.js`,
        rule: 'js-npm-import',
        message: `npm import detected: "${npmImport[1]}". EDS has no node_modules runtime`,
        fix: 'Remove the import or use a CDN URL',
      });
    }

    if (js.includes('document.write')) {
      issues.push({
        severity: 'error',
        file: `${blockName}.js`,
        rule: 'js-document-write',
        message: 'document.write() is forbidden in EDS',
      });
    }

    if (js.includes('localStorage') || js.includes('sessionStorage')) {
      issues.push({
        severity: 'error',
        file: `${blockName}.js`,
        rule: 'js-storage-forbidden',
        message: 'localStorage/sessionStorage are forbidden in EDS blocks',
        fix: 'Use data attributes, CSS classes, or URL params for state',
      });
    }

    const blockClassQuery = new RegExp(`document\\.querySelector(All)?\\s*\\(\\s*['"\\"][^'\"]*\\.${blockName}`, 'g');
    if (blockClassQuery.test(js)) {
      issues.push({
        severity: 'error',
        file: `${blockName}.js`,
        rule: 'js-multi-instance-break',
        message: `document.querySelector('.${blockName}') breaks with multiple instances - use block.querySelector()`,
      });
    }

    const decorateExports = (js.match(/export\s+default\s+(async\s+)?function/g) || []).length;
    if (decorateExports > 1) {
      issues.push({
        severity: 'error',
        file: `${blockName}.js`,
        rule: 'js-multiple-default-exports',
        message: 'Multiple default exports detected - each block must have one decorate() export',
      });
    }

    if ((js.includes("createElement('img')") || js.includes('createElement("img")')) && !js.includes('loading')) {
      issues.push({
        severity: 'warning',
        file: `${blockName}.js`,
        rule: 'js-img-lazy-missing',
        message: 'Dynamically created img should include loading="lazy" and dimensions',
      });
    }

    const jsSize = Buffer.byteLength(js, 'utf8');
    if (jsSize > 10240) {
      issues.push({
        severity: 'warning',
        file: `${blockName}.js`,
        rule: 'js-size-budget',
        message: `Block JS is ${(jsSize / 1024).toFixed(1)}KB - recommended under 10KB`,
      });
    }
  }

  if (!files.css) {
    issues.push({
      severity: 'warning',
      file: `${blockName}.css`,
      rule: 'css-missing',
      message: 'Missing block.css - block will have no styles',
    });
  } else {
    const css = files.css;

    if (!css.includes(`.${blockName}`)) {
      issues.push({
        severity: 'error',
        file: `${blockName}.css`,
        rule: 'css-no-scope',
        message: `CSS must be scoped to .${blockName}`,
        fix: `Prefix selectors with .${blockName}`,
      });
    }

    const reservedPatterns = [`.${blockName}-container`, `.${blockName}-wrapper`];
    const cssLines = css.split('\n');
    const nonCommentLines = cssLines.filter((line) => {
      const trimmed = line.trim();
      return !(trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('//'));
    });

    for (const reserved of reservedPatterns) {
      const inCode = nonCommentLines.some((line) => line.includes(reserved) && !line.includes('auto-generated'));
      if (!inCode) continue;

      if (reserved.endsWith('-container')) {
        issues.push({
          severity: 'error',
          file: `${blockName}.css`,
          rule: 'css-reserved-container',
          message: `${reserved} is auto-generated by EDS on parent section`,
          fix: `Use a different suffix like .${blockName}-inner`,
        });
      } else {
        issues.push({
          severity: 'info',
          file: `${blockName}.css`,
          rule: 'css-wrapper-awareness',
          message: `${reserved} targets the auto-generated wrapper, not a custom element`,
        });
      }
    }

    cssLines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('//')) return;
      if (trimmed.startsWith('@') || trimmed.startsWith('}') || trimmed.startsWith('.') || trimmed.startsWith('#')) return;

      const bareElementMatch = trimmed.match(/^(h[1-6]|p|a|img|ul|ol|li|div|span|button|input|table|tr|td|th|nav|main|section|article|header|footer)\s*[{,]/);
      if (bareElementMatch) {
        issues.push({
          severity: 'error',
          file: `${blockName}.css`,
          rule: 'css-unscoped-element',
          message: `Unscoped selector "${bareElementMatch[1]}" leaks globally`,
          line: index + 1,
          fix: `Change to: .${blockName} ${bareElementMatch[1]} { ... }`,
        });
      }
    });

    if (css.includes('!important')) {
      issues.push({
        severity: 'warning',
        file: `${blockName}.css`,
        rule: 'css-important',
        message: '!important detected - likely specificity issue',
      });
    }

    // Detect ID selectors while ignoring hex color values (e.g. #fff, #e5e5e5).
    // An ID selector only appears in selector context — at start of a rule or
    // after whitespace / combinator. Hex colors always sit inside a property
    // value (after `:`), so we strip declaration values before matching.
    const cssWithoutValues = css.replace(/:[^;{}]*(;|(?=\}))/g, ';');
    if (/(^|[\s,>+~(])#[a-zA-Z_-][\w-]*/m.test(cssWithoutValues)) {
      issues.push({
        severity: 'error',
        file: `${blockName}.css`,
        rule: 'css-id-selector',
        message: 'ID selectors are forbidden in block CSS - use classes',
      });
    }

    const cssSize = Buffer.byteLength(css, 'utf8');
    if (cssSize > 15360) {
      issues.push({
        severity: 'warning',
        file: `${blockName}.css`,
        rule: 'css-size-budget',
        message: `Block CSS is ${(cssSize / 1024).toFixed(1)}KB - recommended under 15KB`,
      });
    }
  }

  if (files.json) {
    try {
      const model = JSON.parse(files.json);

      if (!model.id) {
        issues.push({
          severity: 'error',
          file: 'component-models.json',
          rule: 'json-id-missing',
          message: 'Missing "id" field in component model',
        });
      } else if (model.id !== blockName) {
        issues.push({
          severity: 'warning',
          file: 'component-models.json',
          rule: 'json-id-mismatch',
          message: `Model id "${model.id}" does not match block name "${blockName}"`,
        });
      }

      if (!model.fields || !Array.isArray(model.fields)) {
        issues.push({
          severity: 'error',
          file: 'component-models.json',
          rule: 'json-fields-missing',
          message: 'Missing or invalid "fields" array',
        });
      } else {
        const validTypes = [
          'text-input',
          'text-area',
          'richtext',
          'reference',
          'aem-content',
          'select',
          'multiselect',
          'boolean',
          'number',
          'date-input',
          'container',
          'tab',
        ];

        for (const field of model.fields) {
          if (!field.name) {
            issues.push({
              severity: 'error',
              file: 'component-models.json',
              rule: 'json-field-name-missing',
              message: 'Field missing "name" property',
            });
          }

          if (!field.component) {
            issues.push({
              severity: 'error',
              file: 'component-models.json',
              rule: 'json-field-component-missing',
              message: `Field "${field.name || '(unnamed)'}" missing "component" property`,
            });
          } else if (!validTypes.includes(field.component)) {
            issues.push({
              severity: 'warning',
              file: 'component-models.json',
              rule: 'json-field-component-unknown',
              message: `Field "${field.name || '(unnamed)'}" has unknown component type "${field.component}"`,
            });
          }
        }
      }
    } catch {
      issues.push({
        severity: 'error',
        file: 'component-models.json',
        rule: 'json-parse',
        message: 'Invalid JSON - cannot parse model file',
      });
    }
  }

  if (files.content) {
    const titleCase = blockName
      .split('-')
      .map((word: string) => word[0].toUpperCase() + word.slice(1))
      .join(' ');

    if (
      !files.content.includes(`| ${titleCase} |`) &&
      !files.content.includes(`| ${titleCase} (`) &&
      !files.content.toLowerCase().includes(`| ${blockName} |`)
    ) {
      issues.push({
        severity: 'warning',
        file: 'sample-content.md',
        rule: 'content-header-name',
        message: `First row should contain the block name, for example "| ${titleCase} |"`,
      });
    }

    if (!files.content.includes('| --- |') && !files.content.includes('|---|')) {
      issues.push({
        severity: 'error',
        file: 'sample-content.md',
        rule: 'content-table-separator',
        message: 'Missing table separator row "| --- |"',
      });
    }
  }

  if (!files.readme) {
    issues.push({
      severity: 'warning',
      file: 'README.md',
      rule: 'readme-missing',
      message: 'README.md is missing - add authoring documentation',
    });
  }

  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const infos = issues.filter((issue) => issue.severity === 'info');
  const score = Math.max(0, 100 - errors.length * 15 - warnings.length * 5 - infos.length * 2);

  return {
    blockName,
    passed: errors.length === 0,
    errors,
    warnings,
    infos,
    score,
    issues,
  };
}
