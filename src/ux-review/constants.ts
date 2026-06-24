export const MIN_TOUCH_TARGET_PX = 44;
export const MIN_CONTRAST_RATIO_AA = 4.5;
export const MIN_CONTRAST_RATIO_AAA = 7;
export const MAX_SECTIONS_PER_SCREEN = 8;
export const MAX_ACTIONS_PER_VIEW = 10;
export const MAX_INLINE_STYLES_PER_COMPONENT = 15;
export const MIN_FONT_SIZE = 11;
export const HEADING_BODY_RATIO_MIN = 1.2;
export const ICON_SIZE_CONSISTENCY_THRESHOLD = 4;

export const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 10,
  major: 5,
  moderate: 2,
  minor: 1,
};

export const CATEGORY_WEIGHTS = {
  hierarchy: 0.20,
  accessibility: 0.20,
  consistency: 0.15,
  navigation: 0.15,
  performance: 0.10,
  discoverability: 0.10,
  visualBalance: 0.10,
};

export const SCREENSHOT_FILES = [
  'index.tsx',
  'player.tsx',
  'search.tsx',
  'favorites.tsx',
  'settings.tsx',
  'music.tsx',
  'songs.tsx',
  'albums.tsx',
  'artists.tsx',
  'genres.tsx',
  'playlists.tsx',
  'mini-player.tsx',
  'top-bar.tsx',
];

export const CATEGORY_LABELS: Record<string, string> = {
  hierarchy: 'Hierarchy',
  accessibility: 'Accessibility',
  consistency: 'Consistency',
  navigation: 'Navigation',
  performance: 'Performance',
  discoverability: 'Discoverability',
  visualBalance: 'Visual Balance',
};

export const SEVERITY_ICONS: Record<string, string> = {
  critical: '\x1b[31m●\x1b[0m',
  major: '\x1b[33m⚠\x1b[0m',
  moderate: '\x1b[36m○\x1b[0m',
  minor: '\x1b[90m·\x1b[0m',
};
