import type { UxReport, UxIssue, CategoryScore, UxCategory } from './types';
import { CATEGORY_LABELS, SEVERITY_ICONS } from './constants';

function pad(str: string, len: number): string {
  if (str.length >= len) return str.slice(0, len);
  return str + ' '.repeat(len - str.length);
}

function scoreBar(score: number, width: number = 10): string {
  const filled = Math.round((score / 100) * width);
  return '\x1b[42m' + '█'.repeat(filled) + '\x1b[0m' + '\x1b[90m' + '░'.repeat(width - filled) + '\x1b[0m';
}

function scoreColor(score: number): string {
  if (score >= 80) return '\x1b[32m';
  if (score >= 60) return '\x1b[33m';
  return '\x1b[31m';
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '\x1b[31m';
    case 'major': return '\x1b[33m';
    case 'moderate': return '\x1b[36m';
    default: return '\x1b[90m';
  }
}

export function formatReport(report: UxReport): string {
  const lines: string[] = [];
  const w = 68;

  lines.push('');
  lines.push('\x1b[1m' + '═'.repeat(w) + '\x1b[0m');
  lines.push('\x1b[1m' + pad('  LUMORA UI/UX REVIEW REPORT', w) + '\x1b[0m');
  lines.push('\x1b[1m' + '═'.repeat(w) + '\x1b[0m');
  lines.push('');

  const overallColor = scoreColor(report.score.overall);
  lines.push(`  Overall Score: ${overallColor}\x1b[1m${report.score.overall}/100\x1b[0m`);
  lines.push('');

  const categories: [string, CategoryScore][] = [
    ['hierarchy', report.score.hierarchy],
    ['accessibility', report.score.accessibility],
    ['consistency', report.score.consistency],
    ['navigation', report.score.navigation],
    ['performance', report.score.performance],
    ['discoverability', report.score.discoverability],
    ['visualBalance', report.score.visualBalance],
  ];

  for (const [key, cat] of categories) {
    const label = pad(CATEGORY_LABELS[key] || key, 16);
    const bar = scoreBar(cat.score);
    const color = scoreColor(cat.score);
    const weight = `${Math.round(cat.weight * 100)}%`;
    lines.push(`  ${label} ${bar} ${color}${pad(String(cat.score), 4)}\x1b[0m  (${weight})`);
  }

  lines.push('');
  lines.push('\x1b[90m' + '─'.repeat(w) + '\x1b[0m');
  lines.push('');

  lines.push(`  \x1b[1mFiles scanned:\x1b[0m ${report.summary.filesScanned}`);
  lines.push(`  \x1b[1mTotal issues:\x1b[0m  ${report.summary.totalIssues}`);
  lines.push(`  \x1b[31m● Critical:\x1b[0m ${report.summary.critical}`);
  lines.push(`  \x1b[33m⚠ Major:\x1b[0m    ${report.summary.major}`);
  lines.push(`  \x1b[36m○ Moderate:\x1b[0m  ${report.summary.moderate}`);
  lines.push(`  \x1b[90m· Minor:\x1b[0m    ${report.summary.minor}`);
  lines.push('');
  lines.push('\x1b[90m' + '─'.repeat(w) + '\x1b[0m');
  lines.push('');

  const grouped = new Map<string, UxIssue[]>();
  for (const issue of report.issues) {
    const key = issue.severity;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(issue);
  }

  const severityOrder = ['critical', 'major', 'moderate', 'minor'];
  for (const severity of severityOrder) {
    const issues = grouped.get(severity) || [];
    if (issues.length === 0) continue;

    const icon = SEVERITY_ICONS[severity] || '·';
    const color = severityColor(severity);
    lines.push(`  ${color}\x1b[1m${severity.toUpperCase()} (${issues.length})\x1b[0m`);
    lines.push('');

    for (const issue of issues.slice(0, 20)) {
      const loc = issue.line ? `${issue.file}:${issue.line}` : issue.file;
      lines.push(`  ${icon} \x1b[90m${loc}\x1b[0m`);
      lines.push(`    ${issue.message}`);
      lines.push(`    \x1b[36m→ ${issue.suggestion}\x1b[0m`);
      lines.push('');
    }

    if (issues.length > 20) {
      lines.push(`  \x1b[90m... and ${issues.length - 20} more ${severity} issues\x1b[0m`);
      lines.push('');
    }
  }

  if (report.screens.length > 0) {
    lines.push('\x1b[90m' + '─'.repeat(w) + '\x1b[0m');
    lines.push('');
    lines.push('  \x1b[1mSCREEN BREAKDOWN\x1b[0m');
    lines.push('');

    const sortedScreens = [...report.screens].sort((a, b) => b.issues.length - a.issues.length);
    for (const screen of sortedScreens.slice(0, 15)) {
      const issueCount = screen.issues.length;
      if (issueCount === 0) continue;
      const criticalCount = screen.issues.filter((i) => i.severity === 'critical').length;
      const majorCount = screen.issues.filter((i) => i.severity === 'major').length;
      const status = criticalCount > 0 ? '\x1b[31m' : majorCount > 0 ? '\x1b[33m' : '\x1b[32m';
      lines.push(`  ${status}${pad(screen.name, 24)}\x1b[0m ${pad(String(issueCount), 3)} issues  (${criticalCount} critical, ${majorCount} major)`);
    }
    lines.push('');
  }

  lines.push('\x1b[1m' + '═'.repeat(w) + '\x1b[0m');
  lines.push('');

  return lines.join('\n');
}

export function formatJson(report: UxReport): string {
  return JSON.stringify(report, null, 2);
}
