# Lumora App Development Plan

This plan outlines the development strategy for the Lumora offline media player, based on the `Lumora_Master_Plan.md` and the provided UI design.

## Vision

Lumora is envisioned as a premium offline-first music and video player for Expo SDK 55, prioritizing fast local media indexing, a color-aware UI, high-performance playback, modern animations, and a scalable architecture for future online features.

## Tech Stack

The core technologies include:
- **Core:** Expo SDK 55, React Native, TypeScript, Expo Router, NativeWind
- **State Management:** Zustand, Immer
- **Storage:** React Native MMKV
- **Playback:** @rntp/player, expo-video
- **Media Discovery:** expo-media-library, expo-file-system, music-metadata-browser
- **UI:** NativeWind, Moti, FlashList, Bottom Sheet, Expo Blur, Expo Haptics
- **Theme Engine:** react-native-image-colors, expo-image

## Folder Structure

The project will adhere to the following `src` folder structure:

```
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

## Core Features

### Music
- Local music playback, queue management, shuffle, repeat.
- Background and lock screen controls.
- Album, artist, and genre browsing.

### Video
- Local video playback with fullscreen and Picture-in-Picture modes.
- Playback speed control and subtitle support.

### File Browser
- Internal storage scanning, folder navigation, file details, sort and filter options.

## Color-Aware Engine & Themes

The app will feature a color-aware theme engine that extracts colors from album artwork and video thumbnails to generate dynamic UI themes. There will be 16 predefined themes across Dark, Vibrant, Minimal, AMOLED, and an Adaptive "Color Aware" theme.

## Screens

Key screens include:
- **Home:** Recently Played, Favorites, Quick Access.
- **Music:** Songs, Albums, Artists, Genres.
- **Videos:** All Videos, Recent Videos.
- **Search:** Global Search.
- **Favorites:** Songs, Videos.
- **Settings:** Themes, Playback, Storage.

## Player Design

- **Mini Player:** Floating bottom player with artwork, play/pause, next controls.
- **Full Player:** Large artwork, seek bar, queue, lyrics placeholder, theme adaptation.
- **Queue Sheet:** Drag and reorder, remove, and jump to track functionality.

## Performance Goals

- App launch under 2 seconds.
- Support 100,000+ media files.
- Smooth 60 FPS scrolling.
- Minimal memory usage.
- Instant theme switching.

## UI / Design Direction

A dark-first, AMOLED-friendly design language with glassmorphism accents, soft gradients, neon highlights, and rounded corners. Emphasis on large artwork and adaptive colors.

## Release Roadmap (Milestone 1 - Foundation)

The initial focus will be on establishing the core foundation:

1.  **Routing:** Implement Expo Router for navigation.
2.  **Themes:** Set up the theme system with NativeWind and initial theme definitions.
3.  **State Management:** Integrate Zustand for global state management.
4.  **Local Storage:** Implement MMKV for fast, encrypted local storage.

## Implementation Steps for Milestone 1

1.  **`app/` directory setup:** Configure Expo Router for initial navigation.
2.  **`theme/` directory:** Define initial theme structures and integrate NativeWind.
3.  **`store/` directory:** Initialize Zustand stores for basic app state.
4.  **`services/` directory:** Set up MMKV instance for persistent storage.
5.  **Basic UI Components:** Create foundational UI components in `components/` using NativeWind.
6.  **Global CSS:** Ensure `global.css` is correctly configured for NativeWind.
