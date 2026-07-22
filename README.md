# Lumora

A premium offline media player built with React Native and Expo. Scan your device for songs, organize by album/artist/genre, and play with features like shuffle, repeat, crossfade, lyrics, and adaptive color theming.

## Features

- **Music Playback** — Play local audio files with react-native-audio-api, including shuffle, repeat (off/all/one), and crossfade between tracks
- **Media Scanning** — Automatically detect songs from your device library
- **Library Organization** — Browse by songs, albums, artists, and genres
- **Favorites** — Mark songs as favorites for quick access
- **File Browser** — Navigate device folders and play media directly
- **Search** — Find songs, artists, albums with advanced filters
- **Lyrics** — Fetch and display synced lyrics for the current track
- **Equalizer** — 10-band EQ, bass boost, stereo balance, loudness enhancer
- **Color-Aware Theming** — Extract dominant colors from album artwork and apply them as the UI theme
- **Multiple Themes** — Choose from 19 built-in color themes
- **Glassmorphism UI** — Blur effects on the tab bar and mini-player using expo-blur
- **Queue Management** — View, reorder, and remove tracks from the playback queue
- **Mini Player** — Persistent bottom bar showing current track with play/pause and skip controls
- **Background Playback** — Audio continues playing when the app is backgrounded
- **Cloud Backup** — Backup and restore settings via Google Drive or Dropbox
- **Smart Playlists** — Rule-based auto-generated playlists
- **Tag Editing** — Edit song metadata and artwork
- **Sleep Timer** — Stop playback after a set duration

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.85 + Expo SDK 56 |
| Routing | expo-router (file-based) |
| Styling | React Native StyleSheet via `src/styles/index.ts` |
| State | Zustand v5 with immer middleware |
| Audio | react-native-audio-api (Web Audio API) |
| Storage | react-native-mmkv |
| Animations | react-native-reanimated |
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
