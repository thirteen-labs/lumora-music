#!/usr/bin/env node

import * as path from 'path';
import { runUxReview, formatReport, formatJson } from '../ux-review';

const args = process.argv.slice(2);

const options: { screen?: string; json?: boolean } = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--screen' && args[i + 1]) {
    options.screen = args[++i];
  }
  if (args[i] === '--json') {
    options.json = true;
  }
  if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Lumora UI/UX Reviewer

Usage:
  npx tsx src/scripts/ux-review.ts [options]

Options:
  --screen <name>   Review a specific screen (e.g., "player", "search")
  --json            Output JSON instead of formatted report
  --help, -h        Show this help message

Examples:
  npx tsx src/scripts/ux-review.ts
  npx tsx src/scripts/ux-review.ts --screen player
  npx tsx src/scripts/ux-review.ts --json > ux-report.json
`);
    process.exit(0);
  }
}

const projectRoot = path.resolve(__dirname, '..', '..');

try {
  const report = runUxReview(projectRoot, options);

  if (options.json) {
    console.log(formatJson(report));
  } else {
    console.log(formatReport(report));
  }

  if (report.summary.critical > 0) {
    process.exit(1);
  }
} catch (err) {
  console.error('Error running UX review:', err);
  process.exit(1);
}
