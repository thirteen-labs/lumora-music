# Lumora App Development Plan

## Vision

Lumora is a premium offline-first music and video player built with Expo SDK 56, focused on fast local media indexing, a color-aware UI, high-performance playback, modern animations, and a scalable architecture for future online features.

## Tech Stack

- **Core:** Expo SDK 56, React Native, TypeScript, Expo Router, NativeWind
- **State Management:** Zustand, Immer
- **Storage:** React Native MMKV
- **Playback:** expo-video, expo-av (background), @rntp/player (future)
- **Media Discovery:** expo-media-library, expo-file-system, music-metadata-browser
- **UI:** NativeWind, Moti, FlashList, Bottom Sheet, Expo Blur, Expo Haptics
- **Theme Engine:** react-native-image-colors, expo-image
- **Icons:** lucide-react-native

## Folder Structure

```
src/
├── app/
├── features/
│   ├── music/
│   ├── videos/
│   ├── files/
│   ├── search/
│   ├── favorites/
│   └── settings/
├── player/
│   ├── queue/
│   ├── controls/
│   ├── stores/
│   └── hooks/
├── scanner/
├── services/
├── theme/
├── store/
├── components/
├── hooks/
├── constants/
├── types/
└── utils/
```

## Predefined Themes (20)

OBSIDIAN, MIDNIGHT, PHANTOM, AURORA, NEBULA, OCEANIC, EMBER, FOREST, CRIMSON, GLACIER, VELVET, CYBER NEON, MATRIX, GOLDEN HOUR, ROYAL, ROSE GOLD, SLATE, ARCTIC, PAPER, LAVENDER

Each theme defines: Background, Surface, Text, Accent colors.

## Implementation Plan (11 Features)

### Feature 1: Themes (Foundation)
- Replace `src/constants/theme.ts` with a proper theme system using 20 color palettes
- Create Zustand store (`src/store/theme-store.ts`) with MMKV persistence
- Define `Theme` type: `background`, `surface`, `text`, `accent`
- Export all 20 themes as typed objects
- Provide `useThemeStore()` hook for active theme colors
- Update `global.css` with CSS variables for NativeWind integration

**Default Theme (from design):**
- Background: #0A0A0F
- Surface: #141420
- Text: #FFFFFF
- Accent: #8B5CF6 (purple)
- Secondary: #22D3EE (cyan)

**Theme Priority (highest → lowest):**
1. Color Awareness from Now-Playing artwork (real-time, per-track)
2. Color Awareness from Image Background (when enabled)
3. User-selected predefined theme (20 themes)
4. Default design theme (fallback)

### Feature 2: Layouts
- Redesign `src/app/_layout.tsx` with Stack + Tab structure
- Create main tab layout: Home, Music, Videos, Search, Settings
- Add tab icons using `lucide-react-native`
- Implement custom tab bar (glassmorphism/minimal)
- Add mini player container at bottom of main layout

### Feature 3: TopBar
- Create reusable `TopBar` component in `src/components/`
- App logo/title, search icon, settings icon
- Dynamic colors from active theme
- Safe area insets handling

### Feature 4: Search
- Create `src/features/search/` with SearchScreen
- Global search across songs, albums, artists, videos
- Real-time filtering with debounce
- Search results grouped by category
- Integrate with media store

### Feature 5: Settings
- Create `src/features/settings/` with SettingsScreen
- Settings page layout (top to bottom):
  1. **File Size Theme** — selector for Small / Medium / Big (controls list item density in file lists)
  2. **Image Background** — container to add/select custom background image, with "Color Aware" toggle to extract colors from it and apply to UI
  3. **Predefined Color Themes** — grid of 20 themes with preview (disabled when Color Aware is ON)
- Playback settings (default shuffle, repeat, crossfade)
- Storage info display
- About section
- MMKV persistence

### Feature 5b: File Size Theme
- Three density modes for file/music/video lists:
  - **Small** — compact rows, minimal padding, smaller thumbnails
  - **Medium** — balanced spacing, standard thumbnails
  - **Big** — large rows, prominent artwork, more padding
- Create a Zustand store (`src/store/layout-store.ts`) with MMKV persistence
- Provide `useLayoutStore()` hook with `fileSizeTheme: 'small' | 'medium' | 'big'`
- Apply density via Tailwind classes or dynamic styles in list components
- Affects: song lists, album grids, video lists, file browser

### Feature 6: Music
- Create `src/features/music/` with Songs, Albums, Artists, Genres screens
- Media scanner using `expo-media-library` for local music discovery
- Music list components: album art, title, artist, duration
- Zustand store (`src/store/music-store.ts`)
- Integration with player

### Feature 7: Video
- Create `src/features/videos/` with VideoList screen
- Video discovery using `expo-media-library`
- Video thumbnails, title, duration, size
- Video player using `expo-video`
- Fullscreen and PiP support

### Feature 8: Color Awareness
- Use `react-native-image-colors` for dominant color extraction from artwork
- Create color extraction service in `src/services/`
- Generate dynamic background/surface/accent from artwork
- Apply extracted colors to player UI and now-playing screens
- Smooth transitions on track change

**Color Awareness Sources (priority order):**
1. **Now-Playing Artwork** — highest priority, overrides everything while playing
2. **Image Background** — applies when "Color Aware" toggle is ON in settings
3. **Predefined Theme** — fallback when no artwork/background color extraction is active

**How it works:**
- Extract 5 dominant colors from artwork/background image
- Map extracted colors to theme slots: background (darkest), surface (mid-dark), accent (vibrant), text (lightest)
- Animate color transitions when source changes (track change, theme switch)
- Store extracted colors in Zustand for real-time UI updates

### Feature 9: Sorting
- Create reusable sort context/menu component
- Sort options: Name (A-Z/Z-A), Date (newest/oldest), Duration, Size, Artist
- Apply to all lists: songs, albums, artists, videos, files
- Persist sort preference per screen with MMKV

### Feature 10: Background Play
- Configure expo-av for background audio
- Add `expo-background-fetch` and `expo-task-manager`
- Lock screen controls and notification media controls
- Audio focus handling
- Mini player persistence across screens

### Feature 11: Image Background
- Accessible from Settings → Image Background container
- Custom background images for app screens
- No cropping, no zoom, high quality
- Use `expo-image` for efficient loading
- Screen backgrounds with opacity/overlay (so content remains readable)
- Store selected background path in MMKV
- Option to remove/reset background
- **Color Aware toggle** — when ON, extracts dominant colors from background image and applies as active theme (overrides predefined theme)

## Implementation Order

```
Themes → Layouts → TopBar → Music → Sorting → Search → Settings (File Size Theme + Image Background + Color Themes) →
Color Awareness → Background Play → Video → Image Background
```

**Rationale:**
- Themes + Layouts + TopBar = visual foundation
- Music = core feature, tests full stack
- Sorting = utility enhancing all lists
- Search + Settings = features using theme/store system
- Color Awareness = advanced theme feature
- Background Play = player feature
- Video = secondary media type
- Image Background = cosmetic polish

## Screens

- **Home:** Recently Played, Favorites, Quick Access
- **Music:** Songs, Albums, Artists, Genres
- **Videos:** All Videos, Recent Videos
- **Search:** Global Search
- **Favorites:** Songs, Videos
- **Settings:** File Size Theme, Image Background, Color Themes, Playback, Storage

## Player Design

- **Mini Player:** Floating bottom player, artwork, play/pause, next
- **Full Player:** Large artwork, seek bar, queue, lyrics placeholder, theme adaptation
- **Queue Sheet:** Drag reorder, remove track, jump to track

## Performance Goals

- App launch under 2 seconds
- Support 100,000+ media files
- Smooth 60 FPS scrolling
- Minimal memory usage
- Instant theme switching

## UI / Design Direction

Dark-first, AMOLED-friendly, glassmorphism accents, soft gradients, neon highlights, rounded corners, minimal clutter, large artwork focus, adaptive colors from album covers.

---

# Design Specs

## TopBar Design

### Layout
```
[Status Bar: time, signal, wifi, battery]
[≡]    [LUMORA logo + subtitle]    [🔍] [⚙]
─────────────────────────────────────────────
[♫ Music] [🎦 Videos] [📁 Folders] [♥ Favorites]
```

### Components

**Hamburger Menu Button (Left)**
- Icon: ≡ (three horizontal lines)
- Container: circular, dark (#1A1A1A), purple border/glow
- Size: ~48px diameter

**Logo (Center)**
- "LUMORA" — large, spaced-out uppercase
- "O" replaced with glowing ring/orb (purple #8B5CF6 → cyan #22D3EE gradient)
- Subtitle: "PLAY YOUR WORLD" — small, uppercase, wide letter-spacing, gray (#888)

**Action Buttons (Right)**
- Search (magnifying glass) — circular dark container
- Sort/Filter (vertical lines with dots) — circular dark container, purple accent

**Tab Bar**
- Horizontal pill-shaped container, glassmorphism/blur
- 4 tabs: Music, Videos, Folders, Favorites (icon + label)
- Active: purple text + purple underline indicator
- Inactive: gray text/icons
- Rounded corners (~20px)

**Top Gradient Line**
- Thin gradient at very top: teal/cyan → purple/magenta

---

## Music Player Design

### Now Playing (Full Screen)
```
┌─────────────────────────────┐
│  [back arrow]    [info icon]│
│                             │
│    ┌───────────────────┐    │
│    │   Album Artwork   │    │
│    │   (large, rounded)│    │
│    └───────────────────┘    │
│                             │
│   Eclipse           [♥]    │
│   Luna Shadows              │
│  1:24 ────●───────── 3:42  │
│  [FLAC • 24bit-96kHz]      │
│                             │
│  🔀  ⏮  ▶⏸  ⏭  🔁       │
│  [⬇] [📋] [📝] [🔍]       │
└─────────────────────────────┘
```

- Album artwork: large, rounded ~16px, ~50% of screen
- Song title: large white bold
- Artist: smaller gray
- Heart icon: outlined, top-right of title
- Progress bar: thin, accent color, circular thumb
- Format badge: small pill (FLAC, bitrate, sample rate)
- Controls: shuffle, previous, play/pause (large circle), next, repeat
- Bottom actions: download, queue, lyrics, search

### Mini Player
```
┌─────────────────────────────────┐
│ ▬▬▬▬▬▬▬▬▬▬●▬▬▬▬▬▬▬▬ (progress)│
│ [img] Eclipse        ⏸  ⏭     │
│       Luna Shadows              │
└─────────────────────────────────┘
```

- Progress bar at top (thin, accent color)
- Small album art (rounded, ~40px)
- Song title (white, bold) + Artist (gray)
- Play/pause + next on right
- Background: dark surface (#1A1A1A) with blur

### Lock Screen
```
┌─────────────────────────────┐
│         9:41                │
│    Monday, June 10          │
│    ┌──────────────┐        │
│    │ Album Art    │        │
│    └──────────────┘        │
│    Eclipse                  │
│    Luna Shadows             │
│  1:24 ────●───────── 3:42  │
│    ⏮   ▶⏸   ⏭            │
└─────────────────────────────┘
```

### Notification Controls
```
┌─────────────────────────────┐
│ [img] Lumora • now          │
│      Eclipse          ⏸    │
│      Luna Shadows           │
├─────────────────────────────┤
│ [img] Lumora • 2m           │
│      Waves            ▶    │
│      Oceanic                │
└─────────────────────────────┘
```

---

## Video Player Design

### Video List (Portrait)
```
┌─────────────────────────────┐
│ Video          [🔍] [⋯]    │
│ [Videos] [Movies] [TV Shows]│
│ ┌─────────────────────────┐ │
│ │  Into The Horizon       │ │
│ │  2024 • 4K • Adventure  │ │
│ │  [▶ Play]               │ │
│ └─────────────────────────┘ │
│ Recently Added              │
│ [img] Night City    45:30  │
│ [img] Widerness    1:28:10 │
│ [img] Ocean Depths   52:43 │
└─────────────────────────────┘
```

### Video Player (Landscape/Fullscreen)
```
┌──────────────────────────────────────────────┐
│ [←]                     [4K] [📺] [⋯]       │
│              VIDEO CONTENT                   │
│  45:30 ────●───────────────────── 1:32:08    │
│              Night City                      │
│  [🔒] [⏪] [⏸] [⏩] [⚙]           [🔲]    │
└──────────────────────────────────────────────┘
```

- Back arrow (top-left)
- Quality badge "4K", cast icon, menu (top-right)
- Video title: centered, white, large
- Progress bar: thin, elapsed/remaining time
- Controls: lock, rewind, play/pause, forward, settings, fullscreen

### Movies Grid
```
┌─────────────────────────────┐
│ [Movies] tab selected       │
│ [poster] [poster] [poster]  │
│  Title    Title    Title    │
│ [poster] [poster] [poster]  │
│  Title    Title    Title    │
└─────────────────────────────┘
```

- Grid: 2-3 columns, large posters, rounded corners
- Title below each poster, minimal text

---

## Settings Page Design

### File Size Theme
```
┌─────────────────────────────────────┐
│ FILE SIZE THEME                     │
│ [Small]  [Medium]  [Big]           │
└─────────────────────────────────────┘
```
- 3 density modes for lists: Small (compact), Medium (balanced), Big (large rows)
- Pill-shaped selector, active = filled purple

### Image Background
```
┌─────────────────────────────────────┐
│ IMAGE BACKGROUND                    │
│ ┌─────────────────────────────────┐ │
│ │   Current background preview    │ │
│ └─────────────────────────────────┘ │
│ [Change]  [Remove]                  │
└─────────────────────────────────────┘
```
- Preview of current background (or placeholder)
- Change/Remove buttons

### Themes
```
┌─────────────────────────────────────┐
│ THEMES                              │
│ 16 Beautiful Built-in Themes        │
│ [●] [●] [●] [●] [●]               │
│Midnight Obsidian Graphite Aurora    │
│ [●] [●] [●] [●] [●]               │
│Crimson Ocean  Emerald Sunset Silver │
│ [●] [●] [●] [●] [●] [+]           │
│Slate Pearl Cloud Pure Black Color   │
│                          Aware      │
└─────────────────────────────────────┘
```
- Circular color swatches (~48px)
- Label below each, selected = checkmark
- "+" button for custom theme

### Color Aware
```
┌─────────────────────────────────────┐
│ COLOR AWARE                    [●] │
│ ┌─────────────────────────────────┐ │
│ │     Album Artwork Preview       │ │
│ └─────────────────────────────────┘ │
│ Extracted Colors                    │
│ [■] [■] [■] [■] [■]               │
│ #FF6B88 #7B61FF #1E3A8A #0D1521  │
│ Lumora automatically extracts       │
│ colors from album art and video     │
│ thumbnails to create a beautiful    │
│ theme that's uniquely yours.        │
└─────────────────────────────────────┘
```
- Toggle switch (top-right, purple = active)
- Album artwork preview (large, rounded)
- 5 extracted color swatches with hex values
- Description text

### Equalizer
```
┌─────────────────────────────────────┐
│ EQUALIZER                           │
│ Advanced 10-Band Equalizer          │
│  31  62  125 250 500 1K 2K 4K 8K 16K│
│  │   │   │   │   │   │   │   │   │  │
│ +12 to -12 dB sliders               │
│ [Custom] [Rock] [Pop] [Jazz] [Class]│
│ Bass Boost              Virtualizer  │
│ [●━━━━━━━━━━]        [●━━━━━━━━━━━━]│
└─────────────────────────────────────┘
```
- 10 vertical sliders (31Hz to 16KHz)
- Preset buttons: Custom, Rock, Pop, Jazz, Classical, Electronic
- Bass Boost + Virtualizer horizontal sliders

### Now Playing Layouts
```
┌─────────────────────────────────────┐
│ NOW PLAYING LAYOUTS                 │
│ Choose your style                   │
│ [preview]  [preview]  [preview]     │
│ Classic    Modern     Minimal       │
└─────────────────────────────────────┘
```
- 3 layout thumbnails with labels

### Playback Queue
```
┌─────────────────────────────────────┐
│ PLAYBACK QUEUE         Up Next Clear│
│ 1 [img] Eclipse          ▐▐▌ 3:42 │
│ 2 [img] Waves                  4:18│
│ 3 [img] Aurora              9:07  │
│ 4 [img] Radiance            3:55  │
│ 5 [img] Starlight               │
│ 5 songs • 22:59                     │
└─────────────────────────────────────┘
```

### Settings Page Full Layout
```
┌─────────────────────────────────────┐
│ Settings                            │
│ ┌─ FILE SIZE THEME ────────────────┐│
│ │ [Small] [Medium] [Big]          ││
│ └─────────────────────────────────┘│
│ ┌─ IMAGE BACKGROUND ──────────────┐│
│ │ [preview] [Change] [Remove]     ││
│ └─────────────────────────────────┘│
│ ┌─ THEMES ────────────────────────┐│
│ │ [theme grid]                    ││
│ └─────────────────────────────────┘│
│ ┌─ COLOR AWARE ───────────────────┐│
│ │ [artwork + extracted colors]    ││
│ └─────────────────────────────────┘│
│ ┌─ EQUALIZER ─────────────────────┐│
│ │ [sliders + presets]             ││
│ └─────────────────────────────────┘│
│ ┌─ NOW PLAYING LAYOUTS ───────────┐│
│ │ [layout previews]               ││
│ └─────────────────────────────────┘│
│ ┌─ PLAYBACK ──────────────────────┐│
│ │ Default Shuffle    [●━━━━━]     ││
│ │ Default Repeat     [●━━━━━]     ││
│ │ Crossfade          [●━━━━━]     ││
│ └─────────────────────────────────┘│
│ ┌─ ABOUT ─────────────────────────┐│
│ │ Version 1.0.0                   ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Color Palette (Default — adapts to active theme)
| Element | Default Color | Notes |
|---|---|---|
| Background | #0A0A0F | Changes with theme/color awareness |
| Section background | #141420 | Changes with theme/color awareness |
| Section border | #1E1E30 | Adjusts with surface |
| Title text | #FFFFFF | Always light for readability |
| Subtitle text | #888888 | Muted, stays consistent |
| Active toggle | #8B5CF6 | Uses accent color |
| Slider track | #333333 | Neutral, consistent |
| Slider fill | #8B5CF6 | Uses accent color |
| Slider thumb | #FFFFFF | Always white |
| Active chip | #8B5CF6 | Uses accent color |
| Button primary | #8B5CF6 | Uses accent color |

## Future Online Phase (Do NOT implement in v1)

Streaming, Cloud Sync, AI Playlists, Lyrics API, Podcasts, User Accounts, Downloads, Recommendations.
