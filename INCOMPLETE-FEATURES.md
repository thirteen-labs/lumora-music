# Lumora App - Incomplete Features Tracker

> Auto-generated inventory of all incomplete, broken, placeholder, and missing features.

---

## BROKEN / DECORATIVE (UI exists but does nothing)

| # | Feature | File | Problem |
|---|---------|------|---------|
| ~~1~~ | ~~**Equalizer**~~ | ~~`src/app/audio-features.tsx` + `src/store/equalizer-store.ts`~~ | ~~Full 10-band UI with presets, but settings are never applied to audio output.~~ **FIXED**: Engine wiring verified - `syncEqualizerToEngine()` pushes to `audioEngine` BiquadFilter chain on every state change. |
| ~~2~~ | ~~**Bass Boost**~~ | ~~Same as above~~ | ~~Slider UI (0-12), persisted in MMKV, never touches the player.~~ **FIXED**: Wired to `audioEngine.setBassBoost()` via lowshelf filter at 150Hz. |
| ~~3~~ | ~~**Audio Balance (L/R)**~~ | ~~Same as above~~ | ~~Slider from L10 to R10, saved but no stereo panning applied.~~ **FIXED**: Wired to `audioEngine.setBalance()` via StereoPannerNode. |
| ~~4~~ | ~~**ReplayGain**~~ | ~~`src/store/replay-gain-store.ts`~~ | ~~Toggle + preamp + track/album gain toggles.~~ **FIXED**: `syncReplayGainToEngine()` pushes preamp dB→linear conversion to `audioEngine.setReplayGainVolume()`. |

---

## PLACEHOLDER SCREENS (UI exists, shows "Coming Soon" alert)

| # | Feature | File | What's Missing |
|---|---------|------|----------------|
| ~~5~~ | ~~**Tag Editing**~~ | ~~`src/app/tag-edit.tsx`~~ | **IMPLEMENTED**: Full form with `react-hook-form` + `zod` validation. Saves to music store. |
| ~~6~~ | ~~**Batch Delete**~~ | ~~`src/app/batch-operations.tsx`~~ | **IMPLEMENTED**: Uses `expo-file-system` to delete files, removes from music store. |
| ~~7~~ | ~~**Batch Share**~~ | ~~`src/app/batch-operations.tsx`~~ | **IMPLEMENTED**: Uses `expo-sharing` to share files. |
| 8 | **Online Subtitles** | `src/app/online-subtitles.tsx` | Static screen with "Coming Soon" badge. Requires online API. |
| 9 | **AI Features** | `src/app/ai-features.tsx` | 3 planned features. Requires online API / ML models. |
| 10 | **Cloud Backup & Sync** | `src/app/cloud-sync.tsx` | Backup/Restore/Sync cards. Requires cloud infrastructure. |
| ~~11~~ | ~~**Gesture Controls**~~ | ~~`src/app/gesture-controls.tsx`~~ | **IMPLEMENTED**: Swipe gestures (seek, volume, brightness) and double-tap seek in video player. Settings screen with toggles. |

---

## PARTIALLY IMPLEMENTED (works but incomplete)

| # | Feature | File | Problem |
|---|---------|------|---------|
| ~~12~~ | ~~**Picture-in-Picture**~~ | ~~`src/app/video-player.tsx`~~ | **FIXED**: Added `android:supportsPictureInPicture="true"` to Android manifest, added `SYSTEM_ALERT_WINDOW` and `FOREGROUND_SERVICE_SPECIAL_USE` permissions. |
| ~~13~~ | ~~**Queue Drag Reorder**~~ | ~~`src/app/player.tsx`~~ | **IMPLEMENTED**: Up/down arrow buttons on each queue item for reordering via `reorderQueue()` action. |

---

## REMAINING ITEMS (require online resources or native modules)

| # | Feature | Notes |
|---|---------|-------|
| 14 | **Online Subtitle Downloading** | Requires subtitle API (OpenSubtitles, etc.) |
| 15 | **AI Playlists / Mood Detection / NLP Search** | Requires ML models or cloud AI APIs |
| 16 | **Cloud Backup & Sync** | Requires cloud storage backend and auth |
| 17 | **Background Scanning** | Requires `expo-task-manager` integration |
| 18 | **Frame-by-Frame Stepping** | `expo-video` doesn't support it natively |
| 19 | **File Operations** (rename/move/copy/delete) | **IMPLEMENTED** in `src/services/file-operations.ts` using `expo-file-system` |

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
| 13 | Equalizer Engine Wiring | `syncEqualizerToEngine()` verified - pushes to BiquadFilter chain |
| 14 | Bass Boost Engine Wiring | Wired to lowshelf filter at 150Hz via `audioEngine.setBassBoost()` |
| 15 | Audio Balance Engine Wiring | Wired to StereoPannerNode via `audioEngine.setBalance()` |
| 16 | ReplayGain Engine Wiring | dB→linear conversion pushed to `audioEngine.setReplayGainVolume()` |
| 17 | Tag Editing | Full form with react-hook-form + zod validation, saves to music store |
| 18 | Batch Delete | File deletion via expo-file-system with confirmation dialog |
| 19 | Batch Share | Multi-file sharing via expo-sharing |
| 20 | Video Gesture Controls | Swipe seek/volume/brightness + double-tap seek with indicators |
| 21 | Gesture Controls Settings | Toggle individual gestures on/off, persisted to MMKV |
| 22 | Queue Drag Reorder | Up/down arrows on each queue item, wired to `reorderQueue()` |
| 23 | Picture-in-Picture | Android manifest configured with `supportsPictureInPicture` |
| 24 | File Operations Service | `src/services/file-operations.ts` - delete/rename/move/copy/share |

---

## RECOMMENDED REMAINING PRIORITY

### P1 - Online Features (requires API/backend)
1. Online subtitle downloader
2. AI features (smart playlists, mood detection, NLP search)
3. Cloud backup & sync

### P2 - Native Module Features
4. Background scanning (expo-task-manager)
5. Frame-by-frame stepping (native video module)

### P3 - Already Implemented
6. ~~Tag editing~~ ✅
7. ~~Batch delete~~ ✅
8. ~~Batch share~~ ✅
9. ~~Queue drag reorder~~ ✅
10. ~~Gesture controls~~ ✅
11. ~~File operations~~ ✅
12. ~~PiP~~ ✅
13. ~~Equalizer/Bass/Balance/ReplayGain~~ ✅
