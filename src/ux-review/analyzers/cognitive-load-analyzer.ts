import type { Analyzer, RuleContext, RuleResult, UxIssue } from '../types';
import { MAX_SECTIONS_PER_SCREEN, MAX_ACTIONS_PER_VIEW } from '../constants';

export const cognitiveLoadAnalyzer: Analyzer = {
  name: 'cognitive-load',
  category: 'hierarchy',

  analyze(ctx: RuleContext): RuleResult {
    const issues: UxIssue[] = [];
    const { lines, relativePath, content } = ctx.file;

    const sectionMatches = content.match(/\}\s*\)\s*\}\)/g);
    if (sectionMatches && sectionMatches.length > MAX_SECTIONS_PER_SCREEN) {
      issues.push({
        id: `section-count-${relativePath}`,
        severity: 'moderate',
        category: 'hierarchy',
        file: relativePath,
        message: `Screen has ${sectionMatches.length} sections (max recommended: ${MAX_SECTIONS_PER_SCREEN})`,
        suggestion: 'Consider consolidating sections or using tabs to reduce visual complexity',
        rule: 'section-count',
      });
    }

    const uniqueActions = new Set(
      lines
        .filter((l) => l.includes('onPress'))
        .map((l) => {
          const match = l.match(/onPress\s*=\s*\{([^}]+)\}/);
          return match ? match[1].trim() : '';
        })
        .filter(Boolean)
    );

    if (uniqueActions.size > MAX_ACTIONS_PER_VIEW) {
      issues.push({
        id: `action-count-${relativePath}`,
        severity: 'moderate',
        category: 'hierarchy',
        file: relativePath,
        message: `Screen has ${uniqueActions.size} distinct actions (max recommended: ${MAX_ACTIONS_PER_VIEW})`,
        suggestion: 'Group related actions or use progressive disclosure to reduce cognitive load',
        rule: 'action-count',
      });
    }

    const horizontalScrolls = content.match(/horizontal\s*(?:=|:\s*{)/g);
    if (horizontalScrolls && horizontalScrolls.length >= 3) {
      issues.push({
        id: `horizontal-scrolls-${relativePath}`,
        severity: 'moderate',
        category: 'visual-balance',
        file: relativePath,
        message: `Screen has ${horizontalScrolls.length} horizontal scroll areas — may feel fragmented`,
        suggestion: 'Consider consolidating or using a single scroll area with sections',
        rule: 'horizontal-scroll-count',
      });
    }

    const complexExpressions = lines.filter((l) =>
      (l.match(/\?\s*[^?]+\?:/) || l.match(/&&\s*\(/) || l.match(/\.filter\(/)) &&
      l.length > 80
    );

    if (complexExpressions.length >= 5) {
      issues.push({
        id: `complex-render-${relativePath}`,
        severity: 'minor',
        category: 'performance',
        file: relativePath,
        message: `${complexExpressions.length} complex conditional renders detected`,
        suggestion: 'Extract complex conditions into named variables or helper functions',
        rule: 'render-complexity',
      });
    }

    const mapViewCount = (content.match(/\.map\(/g) || []).length;
    if (mapViewCount >= 5 && relativePath.includes('(tabs)')) {
      issues.push({
        id: `nested-maps-${relativePath}`,
        severity: 'moderate',
        category: 'performance',
        file: relativePath,
        message: `Screen has ${mapViewCount} .map() calls — may cause re-render overhead`,
        suggestion: 'Extract repeated list rendering into memoized subcomponents',
        rule: 'map-render-count',
      });
    }

    return { issues };
  },
};
