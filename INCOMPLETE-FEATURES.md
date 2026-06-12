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
| 5 | **Grid View Mode** | `src/store/layout-store.ts` | `libraryViewMode` ('list'/'grid') stored in MMKV but no component reads it -- all lists are hardcoded to list view. |
| 6 | **Notification Buttons** | `src/services/notifications.ts` | Response listener handles `play-pause`/`next`/`previous` actions, but no actions are registered with the notification. No play/pause/next/prev buttons appear. `shouldShowBanner: false` may hide notifications entirely. |

---

## PLACEHOLDER SCREENS (UI exists, shows "Coming Soon" alert)

| # | Feature | File | What's Missing |
|---|---------|------|----------------|
| 7 | **Tag Editing** | `src/app/tag-edit.tsx` | Save button shows `Alert.alert('Coming Soon')`. No native metadata writing. |
| 8 | **Batch Delete** | `src/app/batch-operations.tsx` | Shows `Alert.alert('Coming Soon')`. No file deletion logic. |
| 9 | **Batch Share** | `src/app/batch-operations.tsx` | Shows `Alert.alert('Coming Soon')`. No multi-file share logic. |
| 10 | **Online Subtitles** | `src/app/online-subtitles.tsx` | Static screen with "Coming Soon" badge. Zero functionality. |
| 11 | **AI Features** | `src/app/ai-features.tsx` | 3 planned features (Smart Playlist Generator, Mood Detection, Natural Language Search). All just description cards. |
| 12 | **Cloud Backup & Sync** | `src/app/cloud-sync.tsx` | Backup/Restore/Sync cards. No cloud infrastructure, no auth. |
| 13 | **Gesture Controls** | `src/app/gesture-controls.tsx` | Lists 9 gestures. No gesture handling in video player at all. |

---

## PARTIALLY IMPLEMENTED (works but incomplete)

| # | Feature | File | Problem |
|---|---------|------|---------|
| 14 | **Playback Speed (audio)** | `src/components/player-provider.tsx` | Speed applies on change but resets to 1x when a new track loads (not set in `loadTrack()`). Pitch correction toggle stored but never applied. |
| 15 | **Lyrics** | `src/services/lyrics.ts` | Online fetch from `lyrics.ovh` works. Missing: no embedded/local lyrics, no auto-scroll to active line, no lyrics editor, no fallback API. |
| 16 | **Video Subtitle Rendering** | `src/app/video-player.tsx` | File picker works, but subtitle text is never overlaid on video. `activeSubtitle` state set but never passed to `VideoView`. |
| 17 | **Picture-in-Picture** | `src/app/video-player.tsx` | `allowsPictureInPicture` prop set, but no Android manifest entries, no iOS background mode, no PiP plugin configured. |
| 18 | **Queue Drag Reorder** | `src/app/player.tsx` | `GripVertical` icon shown for each item, but `BottomSheetFlatList` has no drag-and-drop. |
| 19 | **Crossfade Duration** | `src/services/track-player.ts:7` | Hardcoded to 5 seconds. No UI to configure it -- only on/off toggle in settings. |
| 20 | **Missing File Cleanup** | `src/app/library-tools.tsx` | `findMissingFiles()` utility exists in `enhanced-scanner.ts` but is never called from UI. |
| 21 | **Incremental Scan** | `src/app/library-tools.tsx` | `findNewFiles()`/`findRemovedFiles()` utilities exist but main scanner always does full scan. |

---

## NOT IMPLEMENTED (nothing exists)

| # | Feature | Notes |
|---|---------|-------|
| 22 | **Weekly Listening Minutes** | `stats-store.ts` returns `weeklyMinutes: []` (empty array). No daily tracking. |
| 23 | **Lock Screen Controls** | Metadata set, but remote control buttons (play/pause/next/prev) uncertain. |
| 24 | **Frame-by-Frame Stepping** | Not started. `expo-video` doesn't support it natively. |
| 25 | **File Operations** | No rename/move/copy/delete in codebase. |
| 26 | **Background Scanning** | Scanning blocks UI. No `expo-task-manager` integration. |
| 27 | **Search across Albums/Artists/Genres** | Only songs and videos are searched. |
| 28 | **Sort by Play Count/Last Played** | Data exists in stats store but not wired to sort options. |
| 29 | **Local/Embedded Lyrics** | `parseSyncedLyrics()` exists but is never called. No LRC file import. |
| 30 | **Lyrics Editor** | Listed in features.md, no UI or logic. |

---

## DEAD CODE

| # | Item | File |
|---|------|------|
| 31 | `PlaceholderFeature` type | `src/types/audio.ts:86` -- defined but never imported anywhere. |

---

## RECOMMENDED PRIORITY ORDER

### P0 - Fix First (broken/decorative, users will notice)
1. Equalizer / Bass Boost / Balance / ReplayGain -- either apply them to audio or remove the UI
2. Notification action buttons -- register play/pause/next/prev actions
3. Grid view mode -- wire `libraryViewMode` store to list components

### P1 - Fix Second (partially working)
4. Playback speed -- apply speed in `loadTrack()` so it persists across track changes
5. Video subtitle rendering -- overlay parsed SRT/VTT on video
6. Lyrics auto-scroll -- scroll to active line in synced lyrics view
7. Crossfade duration -- add UI setting instead of hardcoded 5s

### P2 - Implement Third (placeholder screens)
8. Tag editing -- implement native metadata writing or remove screen
9. Batch delete -- implement file deletion or remove screen
10. Batch share -- implement multi-file sharing or remove screen

### P3 - Lowest Priority (advanced features)
11. AI features
12. Cloud backup & sync
13. Video gesture controls
14. Lyrics editor
15. Online subtitle downloader
16. Background scanning
17. Weekly listening minutes chart
