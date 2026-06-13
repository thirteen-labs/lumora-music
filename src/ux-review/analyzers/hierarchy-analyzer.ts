import type { Analyzer, RuleContext, RuleResult, UxIssue } from '../types';

export const hierarchyAnalyzer: Analyzer = {
  name: 'hierarchy',
  category: 'hierarchy',

  analyze(ctx: RuleContext): RuleResult {
    const issues: UxIssue[] = [];
    const { lines, relativePath } = ctx.file;

    const fontSizes = new Map<number, number[]>();
    for (let i = 0; i < lines.length; i++) {
      const sizeMatches = lines[i].matchAll(/fontSize\s*:\s*(\d+)/g);
      for (const match of sizeMatches) {
        const size = parseInt(match[1]);
        if (!fontSizes.has(size)) fontSizes.set(size, []);
        fontSizes.get(size)!.push(i + 1);
      }
      const textClassMatches = lines[i].matchAll(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl)/g);
      const sizeMap: Record<string, number> = { xs: 11, sm: 12, base: 14, lg: 17, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36 };
      for (const match of textClassMatches) {
        const size = sizeMap[match[1]];
        if (size) {
          if (!fontSizes.has(size)) fontSizes.set(size, []);
          fontSizes.get(size)!.push(i + 1);
        }
      }
    }

    const sortedSizes = [...fontSizes.keys()].sort((a, b) => a - b);
    if (sortedSizes.length >= 3) {
      const smallest = sortedSizes[0];
      const largest = sortedSizes[sortedSizes.length - 1];
      const ratio = largest / smallest;
      if (ratio > 4) {
        issues.push({
          id: `font-ratio-${relativePath}`,
          severity: 'moderate',
          category: 'hierarchy',
          file: relativePath,
          message: `Font size range is ${smallest}px–${largest}px (${ratio.toFixed(1)}x ratio)`,
          suggestion: 'Consider reducing the font size range for a more cohesive hierarchy',
          rule: 'font-size-range',
        });
      }
    }

    const headingSizes = sortedSizes.filter((s) => s >= 17);
    if (headingSizes.length >= 2) {
      const adjacentHeadings = headingSizes.slice(0, 3);
      for (let i = 1; i < adjacentHeadings.length; i++) {
        const ratio = adjacentHeadings[i] / adjacentHeadings[i - 1];
        if (ratio < 1.15 && ratio > 1) {
          issues.push({
            id: `heading-ratio-${relativePath}-${adjacentHeadings[i]}`,
            severity: 'minor',
            category: 'hierarchy',
            file: relativePath,
            message: `Adjacent heading sizes ${adjacentHeadings[i - 1]}px and ${adjacentHeadings[i]}px have low contrast ratio (${ratio.toFixed(2)}x)`,
            suggestion: 'Increase the difference between heading levels (1.2x–1.5x recommended)',
            rule: 'heading-ratio',
          });
        }
      }
    }

    const sectionHeaderPattern = /text-xs\s+font-bold\s+uppercase\s+tracking-widest/;
    const sectionHeaders = lines.filter((l) => sectionHeaderPattern.test(l));
    const altSectionHeaders = lines.filter((l) =>
      (l.includes('uppercase') || l.includes('tracking-widest')) &&
      !sectionHeaderPattern.test(l) &&
      (l.includes('text-') || l.includes('fontSize'))
    );

    if (sectionHeaders.length > 0 && altSectionHeaders.length > 0) {
      issues.push({
        id: `section-header-inconsistency-${relativePath}`,
        severity: 'minor',
        category: 'hierarchy',
        file: relativePath,
        message: `Mixed section header styles: ${sectionHeaders.length} use standard, ${altSectionHeaders.length} use alternatives`,
        suggestion: 'Standardize section headers to use the same typography pattern',
        rule: 'section-header-consistency',
      });
    }

    const playButtonLines = lines.filter((l) =>
      l.includes('Play') && (l.includes('size=') || l.includes('fill='))
    );
    if (relativePath.includes('player') && playButtonLines.length > 0) {
      const playSizes = playButtonLines
        .map((l) => {
          const match = l.match(/size\s*=\s*(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter((s) => s > 0);

      if (playSizes.length > 0) {
        const maxSize = Math.max(...playSizes);
        const otherSizes = lines
          .filter((l) => !l.includes('Play') && l.match(/size\s*=\s*\d+/))
          .map((l) => {
            const match = l.match(/size\s*=\s*(\d+)/);
            return match ? parseInt(match[1]) : 0;
          })
          .filter((s) => s > 0);

        if (otherSizes.length > 0) {
          const maxOther = Math.max(...otherSizes);
          if (maxSize <= maxOther) {
            issues.push({
              id: `play-button-prominence-${relativePath}`,
              severity: 'major',
              category: 'hierarchy',
              file: relativePath,
              message: `Play button (${maxSize}px) is not larger than other icons (${maxOther}px)`,
              suggestion: 'The play/pause button should be the largest interactive element',
              rule: 'play-button-prominence',
            });
          }
        }
      }
    }

    return { issues };
  },
};
