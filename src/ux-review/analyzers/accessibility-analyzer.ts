import type { Analyzer, RuleContext, RuleResult, UxIssue } from '../types';
import { MIN_TOUCH_TARGET_PX, MIN_CONTRAST_RATIO_AA } from '../constants';

function parseHexString(hex: string): { r: number; g: number; b: number; a: number } | null {
  const match6 = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (match6) return { r: parseInt(match6[1], 16), g: parseInt(match6[2], 16), b: parseInt(match6[3], 16), a: 1 };
  const match8 = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (match8) return { r: parseInt(match8[1], 16), g: parseInt(match8[2], 16), b: parseInt(match8[3], 16), a: parseInt(match8[4], 16) / 255 };
  return null;
}

function parseRgba(rgba: string): { r: number; g: number; b: number; a: number } | null {
  const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  return { r: +match[1], g: +match[2], b: +match[3], a: match[4] !== undefined ? +match[4] : 1 };
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(rgb1: { r: number; g: number; b: number }, rgb2: { r: number; g: number; b: number }): number {
  const l1 = luminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = luminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveColor(color: string, theme: Record<string, string>): { r: number; g: number; b: number } | null {
  if (color.startsWith('#')) return parseHexString(color);
  const rgba = parseRgba(color);
  if (rgba) return rgba;
  if (color.startsWith('colors.')) {
    const key = color.replace('colors.', '');
    const resolved = theme[key];
    if (resolved) return resolveColor(resolved, theme);
  }
  return null;
}

function parseSizeFromClass(cls: string): number | null {
  const match = cls.match(/(?:w|h)-(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return val * 4;
}

function parseSizeFromStyle(styleStr: string, prop: string): number | null {
  const regex = new RegExp(`${prop}\\s*:\\s*(\\d+(?:\\.\\d+)?)`);
  const match = styleStr.match(regex);
  return match ? parseFloat(match[1]) : null;
}

export const accessibilityAnalyzer: Analyzer = {
  name: 'accessibility',
  category: 'accessibility',

  analyze(ctx: RuleContext): RuleResult {
    const issues: UxIssue[] = [];
    const { lines, relativePath } = ctx.file;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      if (line.includes('Pressable') || line.includes('onPress')) {
        const surroundingLines = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 4)).join(' ');
        const hasHitSlop = surroundingLines.includes('hitSlop');

        if (!line.includes('accessibilityLabel') && !line.includes('accessibilityRole') && !line.includes('accessible')) {
          const classMatch = line.match(/className="([^"]*)"/);
          if (classMatch) {
            const classes = classMatch[1];
            const w = parseSizeFromClass(classes);
            const h = parseSizeFromClass(classes);
            if (w !== null && w < MIN_TOUCH_TARGET_PX && !hasHitSlop) {
              issues.push({
                id: `touch-target-${relativePath}-${lineNum}`,
                severity: 'critical',
                category: 'accessibility',
                file: relativePath,
                line: lineNum,
                message: `Touch target ${w}x${h ?? w}px is below ${MIN_TOUCH_TARGET_PX}px minimum`,
                suggestion: `Increase size to at least ${MIN_TOUCH_TARGET_PX}x${MIN_TOUCH_TARGET_PX}px (e.g., w-11 h-11)`,
                rule: 'touch-target-size',
              });
            }
          }

          const widthMatch = parseSizeFromStyle(line, 'width');
          const heightMatch = parseSizeFromStyle(line, 'height');
          if (widthMatch !== null && heightMatch !== null && (widthMatch < MIN_TOUCH_TARGET_PX || heightMatch < MIN_TOUCH_TARGET_PX) && !hasHitSlop) {
            issues.push({
              id: `touch-target-style-${relativePath}-${lineNum}`,
              severity: widthMatch < 36 || heightMatch < 36 ? 'critical' : 'major',
              category: 'accessibility',
              file: relativePath,
              line: lineNum,
              message: `Touch target ${widthMatch}x${heightMatch}px is below ${MIN_TOUCH_TARGET_PX}px minimum`,
              suggestion: `Increase width/height to at least ${MIN_TOUCH_TARGET_PX}px`,
              rule: 'touch-target-size',
            });
          }
        }
      }

      const bgColorMatch = line.match(/backgroundColor\s*:\s*['"]([^'"]+)['"]/);
      if (bgColorMatch) {
        const bgHex = bgColorMatch[1];
        const bgRgb = parseHexString(bgHex);
        if (bgRgb && bgRgb.a > 0.5) {
          const nextLines = lines.slice(i + 1, i + 5).join(' ');
          const colorMatch = nextLines.match(/color\s*:\s*['"]([^'"]+)['"]/);
          if (colorMatch) {
            const fgRgb = resolveColor(colorMatch[1], ctx.theme.colors);
            if (fgRgb) {
              const ratio = contrastRatio(bgRgb, fgRgb);
              if (ratio < MIN_CONTRAST_RATIO_AA) {
                issues.push({
                  id: `contrast-${relativePath}-${lineNum}`,
                  severity: ratio < 3 ? 'critical' : 'major',
                  category: 'accessibility',
                  file: relativePath,
                  line: lineNum,
                  message: `Contrast ratio ${ratio.toFixed(1)}:1 is below WCAG AA minimum (${MIN_CONTRAST_RATIO_AA}:1)`,
                  suggestion: 'Increase foreground opacity or use a lighter/darker color',
                  rule: 'contrast-ratio',
                });
              }
            }
          }
        }
      }

      if (line.includes('TextInput') && !line.includes('accessibilityLabel')) {
        const isImport = line.includes('import');
        if (!isImport) {
          const nearbyLines = lines.slice(i, Math.min(lines.length, i + 30)).join(' ');
          if (!nearbyLines.includes('accessibilityLabel') && !nearbyLines.includes('accessible')) {
            issues.push({
              id: `input-a11y-${relativePath}-${lineNum}`,
              severity: 'major',
              category: 'accessibility',
              file: relativePath,
              line: lineNum,
              message: 'TextInput missing accessibilityLabel',
              suggestion: 'Add accessibilityLabel prop for screen reader support',
              rule: 'input-accessibility-label',
            });
          }
        }
      }
    }

    return { issues };
  },
};
