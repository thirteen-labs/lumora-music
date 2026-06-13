import type { Analyzer, RuleContext, RuleResult, UxIssue } from '../types';
import { MIN_TOUCH_TARGET_PX } from '../constants';

export const musicPlayerAnalyzer: Analyzer = {
  name: 'music-player',
  category: 'discoverability',

  analyze(ctx: RuleContext): RuleResult {
    const issues: UxIssue[] = [];
    const { relativePath, content } = ctx.file;

    if (relativePath.includes('mini-player')) {
      const hasPlayPause = content.includes('Play') && content.includes('Pause');
      if (!hasPlayPause) {
        issues.push({
          id: 'mini-player-no-play',
          severity: 'critical',
          category: 'discoverability',
          file: relativePath,
          message: 'MiniPlayer missing play/pause control',
          suggestion: 'Add play/pause button to MiniPlayer',
          rule: 'miniplayer-controls',
        });
      }

      const hasSkip = content.includes('SkipForward') || content.includes('SkipBack');
      if (!hasSkip) {
        issues.push({
          id: 'mini-player-no-skip',
          severity: 'major',
          category: 'discoverability',
          file: relativePath,
          message: 'MiniPlayer missing skip control',
          suggestion: 'Add skip forward button to MiniPlayer',
          rule: 'miniplayer-controls',
        });
      }

      const hasProgress = content.includes('progress') || content.includes('position');
      if (!hasProgress) {
        issues.push({
          id: 'mini-player-no-progress',
          severity: 'major',
          category: 'discoverability',
          file: relativePath,
          message: 'MiniPlayer missing progress indicator',
          suggestion: 'Add a progress bar or text to show playback position',
          rule: 'miniplayer-progress',
        });
      }

      const hasHitSlop = content.includes('hitSlop');
      const playButtonMatch = content.match(/className="[^"]*w-10\s+h-10[^"]*"[^>]*>[^]*?(?:Play|Pause)/);
      if (playButtonMatch && !hasHitSlop) {
        const size = 40;
        if (size < MIN_TOUCH_TARGET_PX) {
          issues.push({
            id: 'mini-player-play-size',
            severity: 'critical',
            category: 'accessibility',
            file: relativePath,
            message: `MiniPlayer play button ${size}x${size}px is below ${MIN_TOUCH_TARGET_PX}px minimum`,
            suggestion: `Increase to w-11 h-11 (${MIN_TOUCH_TARGET_PX}px) or larger, or add hitSlop`,
            rule: 'miniplayer-touch-target',
          });
        }
      }
    }

    const isFullPlayer = (relativePath.endsWith('/player.tsx') || relativePath.includes('player/[id]')) && !relativePath.includes('mini-player');
    if (isFullPlayer) {
      const hasQueue = content.includes('queueSheetRef') || content.includes('Queue') || content.includes('ListMusic');
      if (!hasQueue) {
        issues.push({
          id: 'player-no-queue',
          severity: 'major',
          category: 'discoverability',
          file: relativePath,
          message: 'Full player missing queue access',
          suggestion: 'Add a queue button so users can view and manage the playback queue',
          rule: 'queue-discoverability',
        });
      }

      const hasLyrics = content.includes('lyricsSheetRef') || content.includes('Lyrics') || content.includes('AlignLeft');
      if (!hasLyrics) {
        issues.push({
          id: 'player-no-lyrics',
          severity: 'moderate',
          category: 'discoverability',
          file: relativePath,
          message: 'Full player missing lyrics access',
          suggestion: 'Add a lyrics button for users to view song lyrics',
          rule: 'lyrics-discoverability',
        });
      }

      const hasFavorite = content.includes('Heart') || content.includes('favorite');
      if (!hasFavorite) {
        issues.push({
          id: 'player-no-favorite',
          severity: 'moderate',
          category: 'discoverability',
          file: relativePath,
          message: 'Full player missing favorite toggle',
          suggestion: 'Add a heart/favorite button for quick access',
          rule: 'favorite-discoverability',
        });
      }

      const hasShuffle = content.includes('Shuffle') || content.includes('shuffle');
      if (!hasShuffle) {
        issues.push({
          id: 'player-no-shuffle',
          severity: 'moderate',
          category: 'discoverability',
          file: relativePath,
          message: 'Full player missing shuffle control',
          suggestion: 'Add a shuffle button for playback randomization',
          rule: 'shuffle-discoverability',
        });
      }

      const hasRepeat = content.includes('Repeat') || content.includes('repeat');
      if (!hasRepeat) {
        issues.push({
          id: 'player-no-repeat',
          severity: 'moderate',
          category: 'discoverability',
          file: relativePath,
          message: 'Full player missing repeat control',
          suggestion: 'Add a repeat button for loop playback',
          rule: 'repeat-discoverability',
        });
      }

      const hasMultipleLayouts = content.includes('ClassicLayout') || content.includes('ModernLayout') || content.includes('MinimalLayout');
      if (hasMultipleLayouts) {
        const modernHasWhite = (content.match(/rgba\(255,\s*255,\s*255/g) || []).length;
        if (modernHasWhite > 5) {
          issues.push({
            id: 'player-hardcoded-white',
            severity: 'major',
            category: 'consistency',
            file: relativePath,
            message: `ModernLayout uses ${modernHasWhite} hardcoded white rgba values instead of theme tokens`,
            suggestion: 'Use theme colors or define layout-specific color constants',
            rule: 'layout-color-consistency',
          });
        }
      }
    }

    if (relativePath.includes('top-bar')) {
      const hasSearch = content.includes('Search') || content.includes('search');
      if (!hasSearch) {
        issues.push({
          id: 'topbar-no-search',
          severity: 'major',
          category: 'discoverability',
          file: relativePath,
          message: 'TopBar missing search access',
          suggestion: 'Add search button to TopBar for easy discovery',
          rule: 'search-discoverability',
        });
      }
    }

    return { issues };
  },
};
