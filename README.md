# Lumora

A premium offline media player built with React Native and Expo. Scan your device for songs and videos, organize by album/artist/genre, and play with features like shuffle, repeat, crossfade, lyrics, and adaptive color theming.

## Features

- **Music Playback** — Play local audio files with expo-audio, including shuffle, repeat (off/all/one), and crossfade between tracks
- **Video Playback** — Play local video files with expo-video
- **Media Scanning** — Automatically detect songs and videos from your device library
- **Library Organization** — Browse by songs, albums, artists, and genres
- **Favorites** — Mark songs and videos as favorites for quick access
- **File Browser** — Navigate device folders and play media directly
- **Search** — Find songs, artists, albums, and videos across your library
- **Lyrics** — Fetch and display lyrics for the current track
- **Color-Aware Theming** — Extract dominant colors from album artwork and apply them as the UI theme
- **Multiple Themes** — Choose from a set of built-in color themes
- **Glassmorphism UI** — Blur effects on the tab bar and mini-player using expo-blur
- **Queue Management** — View, reorder, and remove tracks from the playback queue
- **Mini Player** — Persistent bottom bar showing current track with play/pause and skip controls
- **Background Playback** — Audio continues playing when the app is backgrounded
- **Customizable Layout** — Adjust file size display (small/medium/big) in settings
- **Background Image** — Set a custom background image from your photo library

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.85 + Expo SDK 56 |
| Routing | expo-router (file-based) |
| Styling | NativeWind v4 (Tailwind CSS for React Native) |
| State | Zustand v5 with immer middleware |
| Audio | expo-audio |
| Video | expo-video |
| Storage | react-native-mmkv |
| Animations | react-native-reanimated + moti |
| Icons | lucide-react-native |
| Blur | expo-blur |
| Lists | @shopify/flash-list |
| Bottom Sheets | @gorhom/bottom-sheet |

## Project Structure

```
src/
  app/                    # Expo Router pages (file-based routing)
    (tabs)/               # Tab navigator
      _layout.tsx         # Tab bar configuration
      index.tsx           # Home screen
      music.tsx           # Music categories
      videos.tsx          # Video library
      files.tsx           # File browser
      favorites.tsx       # Favorites
      settings.tsx        # App settings
    music/                # Music sub-screens
      songs.tsx           # All songs list
      albums.tsx          # Album grid
      artists.tsx         # Artist list
      genres.tsx          # Genre list
      album/[id].tsx      # Album detail
      artist/[id].tsx     # Artist detail
      genre/[id].tsx      # Genre detail
    player.tsx            # Full-screen music player
    video-player.tsx      # Full-screen video player
    search.tsx            # Search screen
  components/             # Shared UI components
  hooks/                  # Custom React hooks
  services/               # Business logic (scanner, playback, lyrics)
  store/                  # Zustand state stores
  theme/                  # Theme system (context, provider, registry)
  types/                  # TypeScript type definitions
  utils/                  # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+
- Android Studio (for Android builds)
- Expo CLI: `npm install -g expo-cli`

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running

```bash
# Android (device or emulator)
npx expo run:android

# Web
npx expo start --web
```

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start the Expo development server |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm run web` | Run on web |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

## Configuration

The app requires the following Android permissions (configured in `app.json`):

- `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_MEDIA_PLAYBACK` — Background audio playback
- `WAKE_LOCK` — Keep device awake during playback
- Media library access — Scan for songs and videos

## License

See [LICENSE](./LICENSE) for details.
