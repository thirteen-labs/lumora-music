import { useRef, useCallback, useEffect } from 'react';
import { ScrollView } from 'react-native';
import type { SyncedLine } from '@/services/lyrics';

export function useSyncedLyricsScroll(synced: SyncedLine[], position: number) {
  const scrollRef = useRef<ScrollView>(null);
  const lineOffsets = useRef<number[]>([]);
  const lastActiveIdx = useRef<number>(-1);

  const registerLine = useCallback((index: number, y: number) => {
    lineOffsets.current[index] = y;
  }, []);

  const activeIdx = (() => {
    if (!synced.length) return -1;
    let idx = -1;
    for (let i = 0; i < synced.length; i++) {
      if (position >= synced[i].time) idx = i;
      else break;
    }
    return idx;
  })();

  useEffect(() => {
    if (activeIdx >= 0 && activeIdx !== lastActiveIdx.current && lineOffsets.current[activeIdx] !== undefined) {
      lastActiveIdx.current = activeIdx;
      scrollRef.current?.scrollTo({
        y: Math.max(0, lineOffsets.current[activeIdx] - 80),
        animated: true,
      });
    }
  }, [activeIdx]);

  return { scrollRef, registerLine, activeIdx };
}
