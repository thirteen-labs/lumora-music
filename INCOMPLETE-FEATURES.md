# Lumora App - Incomplete Features Tracker

> Auto-generated inventory of all incomplete, broken, placeholder, and missing features.

---

## BROKEN / DECORATIVE (UI exists but does nothing)

| # | Feature | File | Problem |
|---|---------|------|---------|
| 1 | **Equalizer** | `src/app/audio-features.tsx` + `src/store/equalizer-store.ts` | Full 10-band UI with presets, but settings are never applied to audio output. Purely cosmetic. |
| 2 | **Bass Boost** | Same as above | Slider UI (0-12), persisted in MMKV, never touches the player. |
| 3 | **Audio Balance (L/R)** | Same as above | Slider from L10 to R10, saved but no stereo panning applied. |
| 4 | **ReplayGain** | `src/store/replay-gain-store.ts` | Toggle + preamp + track/album gain toggles. No ReplayGain tags are read from files, no volume adjustment applied. |

---

## PLACEHOLDER SCREENS (UI exists, shows "Coming Soon" alert)

| # | Feature | File | What's Missing |
|---|---------|------|----------------|
| 5 | **Tag Editing** | `src/app/tag-edit.tsx` | Save button shows `Alert.alert('Coming Soon')`. No native metadata writing. |
| 6 | **Batch Delete** | `src/app/batch-operations.tsx` | Shows `Alert.alert('Coming Soon')`. No file deletion logic. |
| 7 | **Batch Share** | `src/app/batch-operations.tsx` | Shows `Alert.alert('Coming Soon')`. No multi-file share logic. |
| 8 | **Online Subtitles** | `src/app/online-subtitles.tsx` | Static screen with "Coming Soon" badge. Requires online API. |
| 9 | **AI Features** | `src/app/ai-features.tsx` | 3 planned features. Requires online API / ML models. |
| 10 | **Cloud Backup & Sync** | `src/app/cloud-sync.tsx` | Backup/Restore/Sync cards. Requires cloud infrastructure. |
| 11 | **Gesture Controls** | `src/app/gesture-controls.tsx` | Lists 9 gestures. No gesture handling in video player at all. |

---

## PARTIALLY IMPLEMENTED (works but incomplete)

| # | Feature | File | Problem |
|---|---------|------|---------|
| 12 | **Picture-in-Picture** | `src/app/video-player.tsx` | `allowsPictureInPicture` prop set, but no Android manifest entries, no iOS background mode, no PiP plugin configured. |
| 13 | **Queue Drag Reorder** | `src/app/player.tsx` | `GripVertical` icon shown for each item, but `BottomSheetFlatList` has no drag-and-drop. |

---

## REMAINING ITEMS (require online resources or native modules)

| # | Feature | Notes |
|---|---------|-------|
| 14 | **Online Subtitle Downloading** | Requires subtitle API (OpenSubtitles, etc.) |
| 15 | **AI Playlists / Mood Detection / NLP Search** | Requires ML models or cloud AI APIs |
| 16 | **Cloud Backup & Sync** | Requires cloud storage backend and auth |
| 17 | **Background Scanning** | Requires `expo-task-manager` integration |
| 18 | **Frame-by-Frame Stepping** | `expo-video` doesn't support it natively |
| 19 | **File Operations** (rename/move/copy/delete) | No native file operation modules integrated |

---

## FIXED / COMPLETED IN THIS UPDATE

| # | Feature | Status |
|---|---------|--------|
| 1 | Grid View Mode | Already wired to `useLayoutStore` in songs.tsx with toggle UI |
| 2 | Playback Speed Persistence | Already applied in `loadTrack()` at `track-player.ts:108-110` |
| 3 | Notification Buttons | Play/pause/next/prev actions registered with Android notification |
| 4 | Crossfade Duration | New `crossfadeDuration` setting with slider UI (1-12s), synced to engine |
| 5 | Sort by Play Count/Last Played | New `playCount` and `lastPlayed` sort fields added to `SortField` type |
| 6 | Search across Albums/Artists/Genres | Search now queries songs, videos, albums, artists, and genres |
| 7 | Missing File Cleanup | "Check for Missing Files" button wired to `findMissingFiles()` |
| 8 | Incremental Scan | "Check Changes" and "Update Index" buttons wired to enhanced scanner utilities |
| 9 | Lyrics Auto-scroll | Synced lyrics view auto-scrolls to active line with `useSyncedLyricsScroll` hook |
| 10 | Weekly Listening Minutes | Daily listening time tracked, bar chart in statistics screen |
| 11 | Video Subtitle Rendering | SRT/VTT parsing and overlay on video (normal + fullscreen) |
| 12 | Dead Code Removal | Removed unused `PlaceholderFeature` type |

---

## RECOMMENDED REMAINING PRIORITY

### P1 - Placeholder Screens
1. Tag editing -- implement native metadata writing or remove screen
2. Batch delete -- implement file deletion or remove screen
3. Batch share -- implement multi-file sharing or remove screen

### P2 - Advanced Features
4. Queue drag reorder -- add gesture-based drag-and-drop
5. Picture-in-Picture -- configure Android manifest and background modes
6. Gesture controls for video -- implement swipe gestures

### P3 - Online Features (requires API/backend)
7. Online subtitle downloader
8. AI features (smart playlists, mood detection, NLP search)
9. Cloud backup & sync

### P4 - Native Module Features
10. Background scanning (expo-task-manager)
11. Frame-by-frame stepping (native video module)
12. File operations (rename/move/copy/delete)
