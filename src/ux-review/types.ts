export type Severity = 'critical' | 'major' | 'moderate' | 'minor';

export type UxCategory =
  | 'hierarchy'
  | 'accessibility'
  | 'consistency'
  | 'navigation'
  | 'performance'
  | 'discoverability'
  | 'visual-balance';

export interface UxIssue {
  id: string;
  severity: Severity;
  category: UxCategory;
  file: string;
  line?: number;
  lineEnd?: number;
  message: string;
  suggestion: string;
  rule: string;
}

export interface CategoryScore {
  score: number;
  weight: number;
  issues: UxIssue[];
}

export interface UxScore {
  overall: number;
  hierarchy: CategoryScore;
  accessibility: CategoryScore;
  consistency: CategoryScore;
  navigation: CategoryScore;
  performance: CategoryScore;
  discoverability: CategoryScore;
  visualBalance: CategoryScore;
}

export interface UxReport {
  score: UxScore;
  issues: UxIssue[];
  summary: {
    totalIssues: number;
    critical: number;
    major: number;
    moderate: number;
    minor: number;
    filesScanned: number;
  };
  screens: ScreenReport[];
}

export interface ScreenReport {
  name: string;
  file: string;
  issues: UxIssue[];
}

export interface AnalyzedFile {
  path: string;
  relativePath: string;
  content: string;
  lines: string[];
  isScreen: boolean;
  isComponent: boolean;
  screenName?: string;
}

export interface ThemeProfile {
  colors: Record<string, string>;
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  fontSizes: Record<string, number>;
}

export interface RuleContext {
  file: AnalyzedFile;
  allFiles: AnalyzedFile[];
  theme: ThemeProfile;
}

export interface RuleResult {
  issues: UxIssue[];
}

export interface Analyzer {
  name: string;
  category: UxCategory;
  analyze(ctx: RuleContext): RuleResult;
}
