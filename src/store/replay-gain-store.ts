import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import { audioEngine } from '@/services/audio-engine';
import { reportWarning } from '@/utils/error-handler';
import { logger } from '@/utils/logger';
import type { ReplayGainSettings } from '@/types/audio';

const RG_KEY = 'lumora-replay-gain';

function loadRG(): ReplayGainSettings {
  try {
    const raw = storage.getString(RG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { logger.warn('Failed to load replay gain settings:', e); }
  return { enabled: false, preamp: 0, trackGain: true, albumGain: false };
}

function saveRG(settings: ReplayGainSettings): void {
  try { storage.set(RG_KEY, JSON.stringify(settings)); } catch (e) { logger.warn('Failed to save replay gain settings:', e); }
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

export function syncReplayGainToEngine(): void {
  const state = useReplayGainStore.getState();
  audioEngine.applyReplayGainSettings({
    enabled: state.enabled,
    preampDb: state.preamp,
    useAlbum: state.albumGain,
  });
}

let _rgUnsub: (() => void) | null = null;
export function subscribeReplayGain(): () => void {
  if (_rgUnsub) _rgUnsub();
  _rgUnsub = useReplayGainStore.subscribe(() => {
    try { syncReplayGainToEngine(); } catch (e) { reportWarning('ReplayGain', e, 'Failed to sync RG to engine'); }
  });
  return () => { _rgUnsub?.(); _rgUnsub = null; };
}
