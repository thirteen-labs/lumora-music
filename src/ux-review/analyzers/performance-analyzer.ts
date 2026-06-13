import type { Analyzer, RuleContext, RuleResult, UxIssue } from '../types';
import { MAX_INLINE_STYLES_PER_COMPONENT } from '../constants';

export const performanceAnalyzer: Analyzer = {
  name: 'performance',
  category: 'performance',

  analyze(ctx: RuleContext): RuleResult {
    const issues: UxIssue[] = [];
    const { lines, relativePath, content } = ctx.file;

    let inlineStyleCount = 0;
    for (const line of lines) {
      if (line.match(/style\s*=\s*\{\s*\{/)) {
        inlineStyleCount++;
      }
    }

    if (inlineStyleCount > MAX_INLINE_STYLES_PER_COMPONENT) {
      issues.push({
        id: `inline-styles-${relativePath}`,
        severity: 'moderate',
        category: 'performance',
        file: relativePath,
        message: `${inlineStyleCount} inline style objects (max recommended: ${MAX_INLINE_STYLES_PER_COMPONENT})`,
        suggestion: 'Extract repeated styles to StyleSheet.create() or useMemo hooks',
        rule: 'inline-style-count',
      });
    }

    const scrollViewMapCount = (content.match(/ScrollView[^}]*\.map\(/g) || []).length;
    if (scrollViewMapCount > 0) {
      issues.push({
        id: `scrollview-map-${relativePath}`,
        severity: 'moderate',
        category: 'performance',
        file: relativePath,
        message: `ScrollView with .map() detected (${scrollViewMapCount} instances)`,
        suggestion: 'Use FlatList or FlashList for lists with 10+ items for better performance',
        rule: 'scrollview-vs-flatlist',
      });
    }

    const hasFlatList = content.includes('FlatList') || content.includes('FlashList');
    const hasScrollView = content.includes('ScrollView');
    const listItems = (content.match(/\.map\(/g) || []).length;

    if (hasScrollView && !hasFlatList && listItems >= 2) {
      issues.push({
        id: `no-flatlist-${relativePath}`,
        severity: 'minor',
        category: 'performance',
        file: relativePath,
        message: 'Screen uses ScrollView for lists without FlatList',
        suggestion: 'Consider FlatList for better memory management with large lists',
        rule: 'flatlist-usage',
      });
    }

    const componentDefs = lines.filter((l) =>
      l.match(/^(export\s+)?(default\s+)?function\s+\w+/) ||
      l.match(/^(export\s+)?const\s+\w+\s*[:=]\s*(\([^)]*\)\s*=>|React\.memo)/)
    );

    if (componentDefs.length >= 2 && relativePath.includes('(tabs)')) {
      const hasAnyMemo = content.includes('useCallback') || content.includes('useMemo');
      if (!hasAnyMemo) {
        issues.push({
          id: `no-memo-${relativePath}`,
          severity: 'minor',
          category: 'performance',
          file: relativePath,
          message: 'Tab screen has no memoized callbacks or computed values',
          suggestion: 'Wrap expensive computations and callbacks in useMemo/useCallback',
          rule: 'memoization-usage',
        });
      }
    }

    const isUiFile = relativePath.includes('app/') || relativePath.includes('components/');
    const hasImage = (content.includes('<Image') || content.includes('<Artwork')) && isUiFile;
    if (hasImage) {
      const hasTransition = content.includes('transition=');
      const hasContentFit = content.includes('contentFit=');
      if (!hasTransition && !hasContentFit) {
        issues.push({
          id: `image-perf-${relativePath}`,
          severity: 'minor',
          category: 'performance',
          file: relativePath,
          message: 'Images may benefit from transition/contentFit props for better UX',
          suggestion: 'Add transition prop for smooth loading and contentFit for proper scaling',
          rule: 'image-optimization',
        });
      }
    }

    const hasExpoBlur = content.includes('blurRadius');
    if (hasExpoBlur) {
      issues.push({
        id: `blur-perf-${relativePath}`,
        severity: 'moderate',
        category: 'performance',
        file: relativePath,
        message: 'blurRadius detected — may cause performance issues on low-end devices',
        suggestion: 'Consider conditional blur based on device performance or use a lighter alternative',
        rule: 'blur-performance',
      });
    }

    return { issues };
  },
};
