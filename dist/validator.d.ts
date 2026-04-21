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
export declare function validateBlock(blockName: string, files: BlockFiles): ValidationResult;
