# Lumora App - Incomplete Features Tracker

> Last updated: 2026-06-21 (Post-fix audit)

---

## TRULY REMAINING (require external APIs)

| # | Feature | File | Problem |
|---|---------|------|---------|
| 1 | **Online Subtitle Downloader** | `src/app/online-subtitles.tsx` | "Coming Soon" placeholder. No API integration. |
| 2 | **AI Features** | `src/app/ai-features.tsx` | 3 feature cards behind "Coming Soon" badge. No ML/AI logic. |

---

## FIXED IN THIS UPDATE

| # | Feature | What Changed |
|---|---------|-------------|
| — | Audio Quality | Informational screen (quality is file-inherent) |
| — | Video Quality | Informational screen (resolution is file-inherent) |
| — | Privacy Screen | Removed disabled switches; pure privacy info page |
| — | Help — FAQ & Bug Report | Added real URLs |
| — | Notification Settings | `newMediaNotification` gates scan notifications |
| — | not-used.tsx | Removed (dead screen, "Never Played" in Smart Playlists) |
| — | gestureSettings stale | Fixed `useMemo` → state + `useFocusEffect` |
| — | Android Scoped Storage | Updated doc comment |
| — | Search Advanced Filters | Added filter panel UI (year, genre, ext, duration) |
| — | Gesture Fine-Tuning | Added seek speed, volume/brightness sensitivity sliders |
| — | Folder Exclusion | Already implemented — verified |
| — | Manual Lyrics Sync | Already implemented — verified |
| — | Subtitle Styling | Already implemented — verified |
| — | Technical Info Panel | Already implemented — verified |

---

## ALWAYS-COMPLETE FEATURES (unchanged)

| Feature | Status |
|---------|--------|
| Equalizer/Bass/Balance/ReplayGain | ✅ Engine-wired |
| Tag Editing | ✅ Full form |
| Batch Delete/Share/Add to Playlist | ✅ Implemented |
| True Crossfade (overlapping audio) | ✅ Implemented |
| Lock Screen controls | ✅ Implemented |
| Notification album artwork | ✅ Implemented |
| Frame-by-frame video stepping | ✅ Implemented |
| Lyrics Editor | ✅ Implemented |
| Loudness Enhancer | ✅ Implemented |
| Home "Recently Played" | ✅ Implemented |
| Favorites video playback | ✅ Implemented |
| Queue drag reorder | ✅ Implemented |
| Picture-in-Picture | ✅ Implemented |
| Background scanning | ✅ Implemented |
| Gesture Controls settings | ✅ Implemented |
| Video gesture controls | ✅ Implemented |
| Cloud Backup (Google Drive, Dropbox) | ✅ Implemented |
| Duplicate Detection | ✅ Implemented |
| Rules-based Smart Playlists | ✅ Implemented |
| File Operations | ✅ Implemented |
