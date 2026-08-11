import type { Song, SortField, SortOrder } from '@/types/media';

interface TrackStats {
  playCount?: number;
  lastPlayed?: number;
}

export function sortSongs(songs: Song[], sortField: SortField, sortOrder: SortOrder, stats: Record<string, TrackStats>): Song[] {
  const sorted = [...songs];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'title': cmp = a.title.localeCompare(b.title); break;
      case 'artist': cmp = a.artist.localeCompare(b.artist); break;
      case 'dateAdded': cmp = a.dateAdded - b.dateAdded; break;
      case 'duration': cmp = a.duration - b.duration; break;
      case 'fileSize': cmp = a.fileSize - b.fileSize; break;
      case 'playCount': cmp = (stats[a.id]?.playCount || 0) - (stats[b.id]?.playCount || 0); break;
      case 'lastPlayed': cmp = (stats[a.id]?.lastPlayed || 0) - (stats[b.id]?.lastPlayed || 0); break;
    }
    return sortOrder === 'desc' ? -cmp : cmp;
  });
  return sorted;
}
