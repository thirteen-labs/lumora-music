import * as fs from 'fs';
import * as path from 'path';
import type { AnalyzedFile, Analyzer, RuleContext, ThemeProfile, UxReport, UxIssue, ScreenReport } from './types';
import { extractTheme } from './theme-extractor';
import { calculateScores } from './scoring';
import { accessibilityAnalyzer } from './analyzers/accessibility-analyzer';
import { consistencyAnalyzer } from './analyzers/consistency-analyzer';
import { hierarchyAnalyzer } from './analyzers/hierarchy-analyzer';
import { musicPlayerAnalyzer } from './analyzers/music-player-analyzer';
import { cognitiveLoadAnalyzer } from './analyzers/cognitive-load-analyzer';
import { navigationAnalyzer } from './analyzers/navigation-analyzer';
import { performanceAnalyzer } from './analyzers/performance-analyzer';

const ALL_ANALYZERS: Analyzer[] = [
  accessibilityAnalyzer,
  consistencyAnalyzer,
  hierarchyAnalyzer,
  musicPlayerAnalyzer,
  cognitiveLoadAnalyzer,
  navigationAnalyzer,
  performanceAnalyzer,
];

function discoverFiles(srcDir: string): AnalyzedFile[] {
  const files: AnalyzedFile[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === 'android' || entry.name === 'ios') continue;
        walk(fullPath);
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        const relativePath = path.relative(path.join(srcDir, '..'), fullPath);

        const isScreen = relativePath.startsWith('src/app/') && !relativePath.includes('_layout');
        const isComponent = relativePath.startsWith('src/components/');
        const screenName = isScreen ? path.basename(relativePath, path.extname(relativePath)) : undefined;

        files.push({ path: fullPath, relativePath, content, lines, isScreen, isComponent, screenName });
      }
    }
  }

  walk(srcDir);
  return files;
}

function deduplicateIssues(issues: UxIssue[]): UxIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.rule}:${issue.file}:${issue.line ?? 0}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface ReviewOptions {
  screen?: string;
  json?: boolean;
}

export function runUxReview(projectRoot: string, options: ReviewOptions = {}): UxReport {
  const srcDir = path.join(projectRoot, 'src');
  const allFiles = discoverFiles(srcDir);
  const theme = extractTheme(projectRoot);

    let filesToAnalyze = allFiles;
    if (options.screen) {
      const screenPattern = options.screen.toLowerCase();
      filesToAnalyze = allFiles.filter((f) =>
        f.relativePath.toLowerCase().includes(screenPattern)
      );
    }

  let allIssues: UxIssue[] = [];

  for (const file of filesToAnalyze) {
    const ctx: RuleContext = { file, allFiles, theme };
    for (const analyzer of ALL_ANALYZERS) {
      try {
        const result = analyzer.analyze(ctx);
        allIssues.push(...result.issues);
      } catch (err) {
        // Skip analyzer errors silently
      }
    }
  }

  allIssues = deduplicateIssues(allIssues);

  const score = calculateScores(allIssues);

  const screenReports: ScreenReport[] = [];
  const screenFiles = allFiles.filter((f) => f.isScreen);
  for (const screen of screenFiles) {
    const screenIssues = allIssues.filter((i) => i.file === screen.relativePath);
    screenReports.push({
      name: screen.screenName || path.basename(screen.relativePath, '.tsx'),
      file: screen.relativePath,
      issues: screenIssues,
    });
  }

  return {
    score,
    issues: allIssues,
    summary: {
      totalIssues: allIssues.length,
      critical: allIssues.filter((i) => i.severity === 'critical').length,
      major: allIssues.filter((i) => i.severity === 'major').length,
      moderate: allIssues.filter((i) => i.severity === 'moderate').length,
      minor: allIssues.filter((i) => i.severity === 'minor').length,
      filesScanned: filesToAnalyze.length,
    },
    screens: screenReports,
  };
}
