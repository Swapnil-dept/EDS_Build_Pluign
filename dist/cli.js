#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import chalk from 'chalk';
import { glob } from 'glob';
import { validateBlock } from './validator.js';
const args = process.argv.slice(2);
const flags = {
    json: args.includes('--json'),
    strict: args.includes('--strict'),
    help: args.includes('--help') || args.includes('-h'),
};
const paths = args.filter((arg) => !arg.startsWith('--'));
if (flags.help) {
    console.log(`
${chalk.bold('eds-validate')} - AEM EDS block validator

${chalk.bold('Usage:')}
  eds-validate [paths...] [options]

${chalk.bold('Paths:')}
  Directory containing block folders or a single block folder
  Defaults to current directory

${chalk.bold('Options:')}
  --strict   Treat warnings as errors (exit code 1)
  --json     Output machine-readable JSON
  --help     Show this help

${chalk.bold('Examples:')}
  eds-validate
  eds-validate ./blocks/hero
  eds-validate ./blocks --strict
  eds-validate ./blocks --json
`);
    process.exit(0);
}
function looksLikeBlockDir(dir) {
    const name = dir.split('/').filter(Boolean).pop() ?? '';
    return existsSync(join(dir, `${name}.js`)) || existsSync(join(dir, `${name}.css`));
}
function readSafe(dir, file) {
    const target = join(dir, file);
    return existsSync(target) ? readFileSync(target, 'utf8') : undefined;
}
function validateDirectory(dir) {
    const name = dir.split('/').filter(Boolean).pop() ?? '';
    const files = {
        js: readSafe(dir, `${name}.js`),
        css: readSafe(dir, `${name}.css`),
        json: readSafe(dir, `_${name}.json`),
        content: readSafe(dir, 'sample-content.md'),
        readme: readSafe(dir, 'README.md'),
    };
    return validateBlock(name, files);
}
function printResult(result) {
    const icon = result.passed ? chalk.green('OK') : chalk.red('FAIL');
    const score = result.score >= 80
        ? chalk.green(String(result.score))
        : result.score >= 60
            ? chalk.yellow(String(result.score))
            : chalk.red(String(result.score));
    console.log(`\n${icon} ${chalk.bold(result.blockName)} ${chalk.dim(`[score: ${score}/100]`)}`);
    for (const issue of result.errors) {
        console.log(`  ${chalk.red('error')}  ${chalk.dim(issue.file)} ${chalk.dim(`(${issue.rule})`)}`);
        console.log(`         ${issue.message}`);
        if (issue.fix)
            console.log(`         ${chalk.dim(`fix: ${issue.fix}`)}`);
    }
    for (const issue of result.warnings) {
        console.log(`  ${chalk.yellow('warn')}   ${chalk.dim(issue.file)} ${chalk.dim(`(${issue.rule})`)}`);
        console.log(`         ${issue.message}`);
        if (issue.fix)
            console.log(`         ${chalk.dim(`fix: ${issue.fix}`)}`);
    }
    for (const issue of result.infos) {
        console.log(`  ${chalk.cyan('info')}   ${chalk.dim(issue.file)} ${chalk.dim(`(${issue.rule})`)}`);
        console.log(`         ${issue.message}`);
    }
    if (result.issues.length === 0) {
        console.log(`  ${chalk.dim('No issues found')}`);
    }
}
async function run() {
    const targetPaths = paths.length > 0 ? paths : ['.'];
    const results = [];
    for (const targetPath of targetPaths) {
        const abs = resolve(targetPath);
        if (looksLikeBlockDir(abs)) {
            results.push(validateDirectory(abs));
            continue;
        }
        const dirs = await glob('*/', { cwd: abs, absolute: true });
        for (const dir of dirs) {
            if (looksLikeBlockDir(dir)) {
                results.push(validateDirectory(dir));
            }
        }
    }
    if (results.length === 0) {
        console.log(chalk.yellow('No EDS block directories found.'));
        console.log(chalk.dim('A block directory must contain at least <name>.js or <name>.css.'));
        process.exit(0);
    }
    if (flags.json) {
        console.log(JSON.stringify(results, null, 2));
        const hasErrors = results.some((result) => !result.passed);
        const hasWarnings = results.some((result) => result.warnings.length > 0);
        process.exit(hasErrors || (flags.strict && hasWarnings) ? 1 : 0);
    }
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalInfos = 0;
    for (const result of results) {
        printResult(result);
        totalErrors += result.errors.length;
        totalWarnings += result.warnings.length;
        totalInfos += result.infos.length;
    }
    console.log(`\n${chalk.bold('-'.repeat(56))}`);
    console.log(`${results.length} block(s) validated   ` +
        chalk.red(`${totalErrors} error(s)`) +
        '   ' +
        chalk.yellow(`${totalWarnings} warning(s)`) +
        '   ' +
        chalk.cyan(`${totalInfos} info`));
    const failed = totalErrors > 0 || (flags.strict && totalWarnings > 0);
    if (failed) {
        console.log(chalk.red('\nValidation failed'));
        process.exit(1);
    }
    console.log(chalk.green('\nAll blocks passed'));
    process.exit(0);
}
run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('Error:'), message);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map