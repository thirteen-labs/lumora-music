import type { Song } from '@/types/media';
import { useStatsStore } from '@/store/stats-store';

const MAX_UP_NEXT = 20;

interface TrackStatsLike {
  playCount?: number;
  totalPlayTime?: number;
  lastPlayed?: number;
}

function scoreCandidate(candidate: Song, seed: Song, stats: Record<string, TrackStatsLike>): number {
  let score = 0;
  if (candidate.artist && seed.artist && candidate.artist === seed.artist) score += 5;
  if (candidate.albumId && seed.albumId && candidate.albumId === seed.albumId) score += 3;
  if (candidate.genre && seed.genre && candidate.genre === seed.genre) score += 2;
  const playStats = stats[candidate.id];
  if (playStats) {
    score += Math.min(playStats.playCount || 0, 5) * 0.4;
    score += Math.min((playStats.totalPlayTime || 0) / 60000, 30) * 0.05;
  }
  return score;
}

function similarityFallback(allSongs: Song[], excludeIds: Set<string>, limit: number): Song[] {
  const stats = useStatsStore.getState().trackStats;
  const pool = allSongs.filter((s) => !excludeIds.has(s.id));
  const pub = (s: Song): TrackStatsLike => stats[s.id] ?? {};
  const byPlays = [...pool]
    .sort(
      (a, b) =>
        (pub(b).playCount || 0) - (pub(a).playCount || 0) ||
        (pub(b).lastPlayed || 0) - (pub(a).lastPlayed || 0) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, Math.ceil(limit * 0.6));

  const neverPlayed = [...pool]
    .filter((s) => !stats[s.id] || (stats[s.id].playCount ?? 0) === 0)
    .sort((a, b) => a.title.localeCompare(b.title));

  const result: Song[] = [];
  const seen = new Set<string>();
  const push = (s: Song) => {
    if (seen.has(s.id)) return;
    seen.add(s.id);
    result.push(s);
  };
  byPlays.forEach(push);
  neverPlayed.forEach(push);
  return result.slice(0, limit);
}

/**
 * Generates an "Up Next" list of tracks similar to the seed track so playback
 * keeps flowing when the user queue runs out (autoplay).
 *
 * Matching priority: same artist > same album > same genre, then smoothed by
 * play history so frequently enjoyed tracks surface first.
 */
export function generateUpNext(
  seed: Song,
  allSongs: Song[],
  excludeIds: Set<string>,
  limit: number = MAX_UP_NEXT,
): Song[] {
  if (!allSongs || allSongs.length === 0) return [];

  const stats = useStatsStore.getState().trackStats;
  const candidates = allSongs.filter((s) => s.id !== seed.id && !excludeIds.has(s.id));
  const scored = candidates.map((song) => ({ song, score: scoreCandidate(song, seed, stats) }));
  scored.sort((a, b) => b.score - a.score || a.song.title.localeCompare(b.song.title));

  if (scored.length === 0) return [];

  if (scored[0].score <= 1) {
    return similarityFallback(allSongs, excludeIds, limit);
  }

  return scored.slice(0, limit).map((e) => e.song);
}