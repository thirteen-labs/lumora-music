import type { UxIssue, UxScore, UxCategory, CategoryScore } from './types';
import { CATEGORY_WEIGHTS, SEVERITY_WEIGHTS } from './constants';

function categoryScore(issues: UxIssue[], category: UxCategory, weight: number): CategoryScore {
  const categoryIssues = issues.filter((i) => i.category === category);
  const penalty = categoryIssues.reduce((sum, i) => sum + (SEVERITY_WEIGHTS[i.severity] || 1), 0);
  const maxPenalty = 50;
  const score = Math.max(0, Math.round(100 - (penalty / maxPenalty) * 100));
  return { score, weight, issues: categoryIssues };
}

export function calculateScores(issues: UxIssue[]): UxScore {
  const hierarchy = categoryScore(issues, 'hierarchy', CATEGORY_WEIGHTS.hierarchy);
  const accessibility = categoryScore(issues, 'accessibility', CATEGORY_WEIGHTS.accessibility);
  const consistency = categoryScore(issues, 'consistency', CATEGORY_WEIGHTS.consistency);
  const navigation = categoryScore(issues, 'navigation', CATEGORY_WEIGHTS.navigation);
  const performance = categoryScore(issues, 'performance', CATEGORY_WEIGHTS.performance);
  const discoverability = categoryScore(issues, 'discoverability', CATEGORY_WEIGHTS.discoverability);
  const visualBalance = categoryScore(issues, 'visual-balance', CATEGORY_WEIGHTS.visualBalance);

  const overall = Math.round(
    hierarchy.score * CATEGORY_WEIGHTS.hierarchy +
    accessibility.score * CATEGORY_WEIGHTS.accessibility +
    consistency.score * CATEGORY_WEIGHTS.consistency +
    navigation.score * CATEGORY_WEIGHTS.navigation +
    performance.score * CATEGORY_WEIGHTS.performance +
    discoverability.score * CATEGORY_WEIGHTS.discoverability +
    visualBalance.score * CATEGORY_WEIGHTS.visualBalance
  );

  return { overall, hierarchy, accessibility, consistency, navigation, performance, discoverability, visualBalance };
}
