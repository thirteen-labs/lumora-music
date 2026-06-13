import type { Analyzer, RuleContext, RuleResult, UxIssue } from '../types';

export const navigationAnalyzer: Analyzer = {
  name: 'navigation',
  category: 'navigation',

  analyze(ctx: RuleContext): RuleResult {
    const issues: UxIssue[] = [];
    const { relativePath, content } = ctx.file;

    const isTabScreen = relativePath.startsWith('src/app/(tabs)/');
    const isPushedScreen = !isTabScreen && relativePath.startsWith('src/app/');

    if (isPushedScreen) {
      const hasBackButton =
        content.includes('ChevronDown') ||
        content.includes('ChevronLeft') ||
        content.includes('router.back()') ||
        content.includes('router.replace') ||
        content.includes('BackHandler');

      if (!hasBackButton) {
        issues.push({
          id: `no-back-${relativePath}`,
          severity: 'major',
          category: 'navigation',
          file: relativePath,
          message: 'Pushed screen has no visible back/dismiss button',
          suggestion: 'Add a back arrow or swipe-down handle for navigation',
          rule: 'back-button-presence',
        });
      }
    }

    if (isTabScreen) {
      const tabName = relativePath.match(/\(tabs\)\\?\/?(\w+)/)?.[1];
      if (tabName) {
        const hasTopBar = content.includes('TopBar');
        if (!hasTopBar) {
          issues.push({
            id: `no-topbar-${relativePath}`,
            severity: 'moderate',
            category: 'navigation',
            file: relativePath,
            message: `Tab screen "${tabName}" missing TopBar component`,
            suggestion: 'Include TopBar for consistent navigation and branding',
            rule: 'topbar-presence',
          });
        }
      }
    }

    const hasLinks = content.includes('router.push') || content.includes('router.replace');

    if (isTabScreen && !hasLinks) {
      issues.push({
        id: `no-navigation-${relativePath}`,
        severity: 'moderate',
        category: 'navigation',
        file: relativePath,
        message: 'Tab screen has no navigation links to other screens',
        suggestion: 'Add navigation to sub-screens (e.g., Songs, Albums, Artists)',
        rule: 'navigation-links',
      });
    }

    const routeMatches = content.matchAll(/router\.push\(\s*\{\s*pathname\s*:\s*['"]([^'"]+)['"]/g);
    const routes: string[] = [];
    for (const match of routeMatches) {
      routes.push(match[1]);
    }

    if (relativePath.includes('_layout')) {
      const layoutRoutes = content.matchAll(/name\s*=\s*['"]([^'"]+)['"]/g);
      const definedRoutes = new Set<string>();
      for (const match of layoutRoutes) {
        definedRoutes.add(match[1]);
      }

      for (const route of routes) {
        const routePath = route.replace(/^\//, '').replace(/\[.*?\]/g, ':param');
        let found = false;
        for (const defined of definedRoutes) {
          if (routePath.startsWith(defined) || defined.startsWith(routePath.split('/')[0])) {
            found = true;
            break;
          }
        }
        if (!found) {
          issues.push({
            id: `unregistered-route-${route}`,
            severity: 'moderate',
            category: 'navigation',
            file: relativePath,
            message: `Route "${route}" is used but may not be registered in the layout`,
            suggestion: 'Add the route to _layout.tsx Stack.Screen definitions',
            rule: 'route-registration',
          });
        }
      }
    }

    return { issues };
  },
};
