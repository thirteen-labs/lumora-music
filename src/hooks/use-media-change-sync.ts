import { useRef } from 'react';
import { useMediaChangeEvent } from '@obsidian_north/react-native-mediastore';
import { useMusicStore } from '@/store/music-store';
import { syncIncrementalIfChanged } from '@/services/scanner';
import { logger } from '@/utils/logger';

const MEDIA_CHANGE_DEBOUNCE_MS = 4000;

/**
 * Keeps the music library fresh by reacting to native MediaStore / Photos
 * Framework change events. Only audio events matter for Lumora; on a change we
 * debounce, then use `refreshIncremental` (via syncIncrementalIfChanged) to
 * confirm real audio deltas before kicking off a rescan — so a burst of changes
 * (or non-audio changes) can't trigger a storm of full rescans.
 */
export function useMediaChangeSync(): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMediaChangeEvent((event) => {
    if (!event || event.mediaType !== 'audio') return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      syncIncrementalIfChanged()
        .then((changed) => {
          if (changed) {
            useMusicStore.getState().scan(false);
          }
        })
        .catch((e) => logger.warn('[MediaChangeSync] incremental sync failed:', e));
    }, MEDIA_CHANGE_DEBOUNCE_MS);
  });
}
