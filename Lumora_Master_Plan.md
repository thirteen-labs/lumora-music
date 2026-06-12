# Lumora — Offline Media Player Master Plan

## Vision

Lumora is a premium offline-first music and video player built with Expo SDK 56, focused on:

- Blazing-fast local media indexing
- Beautiful color-aware UI
- High-performance playback
- Modern animations
- Offline-first architecture
- Scalable foundation for future online features

---

# Tech Stack

## Core

- Expo SDK 56
- React Native
- TypeScript
- Expo Router
- NativeWind

## State

- Zustand
- Immer

## Storage

- React Native MMKV

## Playback

- react-native-audio-api
- expo-video

## Media Discovery

- expo-media-library
- @missingcore/react-native-metadata-retriever
- expo-file-system

## UI

- NativeWind
- FlashList
- Bottom Sheet
- Expo Blur

## Theme Engine

- react-native-image-colors
- expo-image

---

# Package Installation

```bash
npm install \
expo-router \
zustand \
immer \
react-native-audio-api \
@missingcore/react-native-metadata-retriever \
react-native-image-colors \
@shopify/flash-list \
@gorhom/bottom-sheet \
clsx \
tailwind-merge \
lucide-react-native \
nativewind \
tailwindcss
```

```bash
npx expo install \
react-native-mmkv \
expo-video \
expo-media-library \
expo-file-system \
expo-image \
expo-blur \
react-native-safe-area-context \
react-native-screens \
react-native-gesture-handler \
react-native-reanimated
```

---

# Folder Structure

```txt
src/
│
├── app/
│
├── features/
│   ├── music/
│   ├── videos/
│   ├── files/
│   ├── search/
│   ├── favorites/
│   └── settings/
│
├── player/
│   ├── queue/
│   ├── controls/
│   ├── stores/
│   └── hooks/
│
├── scanner/
│
├── services/
│
├── theme/
│
├── store/
│
├── components/
│
├── hooks/
│
├── constants/
│
├── types/
│
└── utils/
```

---

# Core Features

## Music

- Local music playback
- Queue management
- Shuffle
- Repeat
- Background playback
- Notification controls
- Lock screen controls
- Album browsing
- Artist browsing
- Genre browsing

## Video

- Local video playback
- Fullscreen mode
- Picture in Picture
- Playback speed
- Subtitle support

## File Browser

- Internal storage scanning
- Folder navigation
- File details
- Sort and filter

---

# Color-Aware Engine

Extract colors from:

- Album artwork
- Video thumbnails

Generate:

- Primary
- Secondary
- Accent
- Background
- Text

Flow:

Artwork → Color Extractor → Theme Engine → UI Update

---

# 16 Themes

## Dark

1. Midnight
2. Obsidian
3. Graphite
4. Abyss
5. Onyx

## Vibrant

6. Aurora
7. Crimson
8. Ocean
9. Emerald
10. Sunset

## Minimal

11. Silver
12. Slate
13. Pearl
14. Cloud

## AMOLED

15. Pure Black

## Adaptive

16. Color Aware

---

# Screens

## Home

- Recently Played
- Favorites
- Quick Access

## Music

- Songs
- Albums
- Artists
- Genres

## Videos

- All Videos
- Recent Videos

## Search

- Global Search

## Favorites

- Songs
- Videos

## Settings

- Themes
- Playback
- Storage

---

# Player Design

## Mini Player

- Floating bottom player
- Artwork
- Play/Pause
- Next

## Full Player

- Large artwork
- Seek bar
- Queue
- Lyrics placeholder
- Theme adaptation

## Queue Sheet

- Drag and reorder
- Remove track
- Jump to track

---

# Performance Goals

- App launch under 2 seconds
- Support 100,000+ media files
- Smooth 60 FPS scrolling
- Minimal memory usage
- Instant theme switching

---

# Future Online Phase

Do NOT implement in v1.

Future additions:

- Streaming
- Cloud Sync
- AI Playlists
- Lyrics API
- Podcasts
- User Accounts
- Downloads
- Recommendations

---

# UI / Design Direction

## Design Language

- Dark-first
- AMOLED friendly
- Glassmorphism accents
- Soft gradients
- Neon highlights
- Rounded corners
- Minimal clutter

## Main Accent Colors

- Purple
- Indigo
- Blue
- Cyan
- Magenta

## Layout Inspiration

- Premium music player
- Large artwork focus
- Adaptive colors from album covers
- Rich animations
- Modern media center aesthetic

---

# Design Poster Reference

Use the generated Lumora showcase poster as the visual reference for:

- Home screen
- Music player
- Video player
- Theme selector
- Equalizer
- Queue panel
- File browser
- Lock screen controls
- Mini player

The design should maintain a cinematic dark UI with adaptive artwork colors and premium media-player aesthetics.

---

# Release Roadmap

## Milestone 1

Foundation

- Routing
- Themes
- Zustand
- MMKV

## Milestone 2

Media Scanner

- Music discovery
- Video discovery
- Metadata extraction

## Milestone 3

Music Player

- react-native-audio-api integration
- Queue
- Notifications

## Milestone 4

Video Player

- Fullscreen
- PiP
- Subtitles

## Milestone 5

Color-Aware UI

- Artwork extraction
- Dynamic themes

## Milestone 6

Polish

- Animations
- Performance
- Testing

## Milestone 7

Production Release

- EAS Build
- Play Store release
