import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import type { ReplayGainSettings } from '@/types/audio';

const RG_KEY = 'lumora-replay-gain';

function loadRG(): ReplayGainSettings {
  try {
    const raw = storage.getString(RG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: false, preamp: 0, trackGain: true, albumGain: false };
}

function saveRG(settings: ReplayGainSettings): void {
  try { storage.set(RG_KEY, JSON.stringify(settings)); } catch {}
}

interface RGState extends ReplayGainSettings {
  setEnabled: (enabled: boolean) => void;
  setPreamp: (preamp: number) => void;
  setTrackGain: (v: boolean) => void;
  setAlbumGain: (v: boolean) => void;
}

export const useReplayGainStore = create<RGState>()(
  immer((set, get) => ({
    ...loadRG(),

    setEnabled: (enabled) => {
      set((s) => { s.enabled = enabled; });
      saveRG(get());
    },

    setPreamp: (preamp) => {
      set((s) => { s.preamp = preamp; });
      saveRG(get());
    },

    setTrackGain: (trackGain) => {
      set((s) => { s.trackGain = trackGain; });
      saveRG(get());
    },

    setAlbumGain: (albumGain) => {
      set((s) => { s.albumGain = albumGain; });
      saveRG(get());
    },
  })),
);
