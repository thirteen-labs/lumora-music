import type { Analyzer, RuleContext, RuleResult, UxIssue } from '../types';

const KNOWN_ICON_SIZES: Record<number, string[]> = {};

export const consistencyAnalyzer: Analyzer = {
  name: 'consistency',
  category: 'consistency',

  analyze(ctx: RuleContext): RuleResult {
    const issues: UxIssue[] = [];
    const { lines, relativePath, content } = ctx.file;

    const borderRadiusValues = new Map<number, number[]>();
    for (let i = 0; i < lines.length; i++) {
      const matches = lines[i].matchAll(/borderRadius\s*:\s*(\d+)/g);
      for (const match of matches) {
        const val = parseInt(match[1]);
        if (!borderRadiusValues.has(val)) borderRadiusValues.set(val, []);
        borderRadiusValues.get(val)!.push(i + 1);
      }
    }

    const tokenRadiusValues = new Set(Object.values(ctx.theme.borderRadius));
    for (const [val, lineNums] of borderRadiusValues) {
      if (!tokenRadiusValues.has(val) && lineNums.length >= 2) {
        issues.push({
          id: `border-radius-${relativePath}-${val}`,
          severity: 'moderate',
          category: 'consistency',
          file: relativePath,
          line: lineNums[0],
          message: `Hardcoded borderRadius ${val}px used ${lineNums.length} times (not aligned to theme tokens)`,
          suggestion: `Use theme.borderRadius token (sm=6, md=10, lg=14, xl=18) or add ${val} to the token scale`,
          rule: 'border-radius-consistency',
        });
      }
    }

    const iconSizes = new Map<number, string[]>();
    for (let i = 0; i < lines.length; i++) {
      const matches = lines[i].matchAll(/<(\w+)\s+size\s*=\s*(\d+)/g);
      for (const match of matches) {
        const tagName = match[1];
        const size = parseInt(match[2]);
        if (['Play', 'Pause', 'SkipBack', 'SkipForward', 'Heart', 'Shuffle', 'Repeat',
          'Search', 'Settings', 'Music', 'ListMusic', 'AlignLeft', 'ListPlus',
          'ChevronDown', 'ChevronRight', 'ArrowRight', 'ArrowUpDown',
          'List', 'Disc3', 'User', 'Tag', 'Clock', 'X', 'Trash2',
          'GripVertical', 'LayoutGrid', 'Video', 'Folder', 'Paintbrush',
          'Palette', 'Sun', 'Languages', 'SlidersHorizontal', 'Volume2',
          'FolderOpen', 'RefreshCw', 'Database', 'Shield', 'HelpCircle',
          'Info', 'PenLine', 'Repeat1', 'Share2', 'ListPlus'].includes(tagName)) {
          if (!iconSizes.has(size)) iconSizes.set(size, []);
          iconSizes.get(size)!.push(`${tagName}:${i + 1}`);
        }
      }
    }

    const sizeGroups = new Map<string, number[]>();
    for (const [size, usages] of iconSizes) {
      const iconNames = usages.map((u) => u.split(':')[0]);
      const uniqueIcons = [...new Set(iconNames)];
      if (uniqueIcons.length <= 2 && usages.length >= 3) {
        const key = uniqueIcons.sort().join(',');
        if (!sizeGroups.has(key)) sizeGroups.set(key, []);
        sizeGroups.get(key)!.push(size);
      }
    }

    const hardcodedHexColors = new Map<string, number[]>();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('node_modules')) continue;
      const hexMatches = line.matchAll(/['"]#([0-9a-fA-F]{6})['"]/g);
      for (const match of hexMatches) {
        const hex = `#${match[1].toLowerCase()}`;
        if (hex === '#000000' || hex === '#ffffff' || hex === '#fff' || hex === '#000') continue;
        if (!hardcodedHexColors.has(hex)) hardcodedHexColors.set(hex, []);
        hardcodedHexColors.get(hex)!.push(i + 1);
      }
    }

    for (const [hex, lineNums] of hardcodedHexColors) {
      if (lineNums.length >= 2) {
        issues.push({
          id: `hardcoded-color-${relativePath}-${hex}`,
          severity: 'moderate',
          category: 'consistency',
          file: relativePath,
          line: lineNums[0],
          message: `Hardcoded color ${hex} used ${lineNums.length} times instead of theme tokens`,
          suggestion: `Map this color to a theme token or use colors.xxx from useTheme()`,
          rule: 'hardcoded-colors',
        });
      }
    }

    const rgbaMatches = [...content.matchAll(/rgba\(\s*255\s*,\s*255\s*,\s*255/g)];
    if (rgbaMatches.length >= 3 && !relativePath.includes('themes.ts')) {
      issues.push({
        id: `hardcoded-rgba-${relativePath}`,
        severity: 'major',
        category: 'consistency',
        file: relativePath,
        line: content.substring(0, rgbaMatches[0].index!).split('\n').length,
        message: `${rgbaMatches.length} hardcoded rgba(255,255,255,...) values — should use theme tokens`,
        suggestion: 'Replace with colors.text, colors.textMuted, or colors.accent from useTheme()',
        rule: 'hardcoded-rgba-colors',
      });
    }

    const spacingValues = new Map<number, number[]>();
    for (let i = 0; i < lines.length; i++) {
      const gapMatch = lines[i].match(/gap\s*:\s*(\d+)/);
      if (gapMatch) {
        const val = parseInt(gapMatch[1]);
        if (!spacingValues.has(val)) spacingValues.set(val, []);
        spacingValues.get(val)!.push(i + 1);
      }
      const padMatch = lines[i].match(/padding(?:Horizontal|Vertical|Top|Bottom|Left|Right)?\s*:\s*(\d+)/);
      if (padMatch) {
        const val = parseInt(padMatch[1]);
        if (!spacingValues.has(val)) spacingValues.set(val, []);
        spacingValues.get(val)!.push(i + 1);
      }
      const marginMatch = lines[i].match(/margin(?:Horizontal|Vertical|Top|Bottom|Left|Right)?\s*:\s*(\d+)/);
      if (marginMatch) {
        const val = parseInt(marginMatch[1]);
        if (!spacingValues.has(val)) spacingValues.set(val, []);
        spacingValues.get(val)!.push(i + 1);
      }
    }

    const tokenSpacingValues = new Set(Object.values(ctx.theme.spacing));
    const nonTokenSpacing = [...spacingValues.entries()]
      .filter(([val]) => !tokenSpacingValues.has(val))
      .filter(([, lineNums]) => lineNums.length >= 3);

    if (nonTokenSpacing.length > 0) {
      const totalNonToken = nonTokenSpacing.reduce((sum, [, lines]) => sum + lines.length, 0);
      issues.push({
        id: `spacing-tokens-${relativePath}`,
        severity: 'moderate',
        category: 'consistency',
        file: relativePath,
        message: `${totalNonToken} hardcoded spacing values not aligned to theme tokens`,
        suggestion: `Use theme.spacing values (xs=4, sm=8, md=16, lg=24, xl=32) or add new tokens`,
        rule: 'spacing-token-adherence',
      });
    }

    return { issues };
  },
};
