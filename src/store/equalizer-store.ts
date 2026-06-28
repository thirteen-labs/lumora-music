import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import { audioEngine } from '@/services/audio-engine';
import type { EqualizerSettings, EqualizerBand, EqualizerPreset } from '@/types/audio';

const EQ_KEY = 'lumora-eq-settings';

const DEFAULT_BANDS: EqualizerBand[] = [
  { frequency: 60, gain: 0 },
  { frequency: 170, gain: 0 },
  { frequency: 310, gain: 0 },
  { frequency: 600, gain: 0 },
  { frequency: 1000, gain: 0 },
  { frequency: 3000, gain: 0 },
  { frequency: 6000, gain: 0 },
  { frequency: 12000, gain: 0 },
  { frequency: 14000, gain: 0 },
  { frequency: 16000, gain: 0 },
];

const PRESET_BANDS: Record<EqualizerPreset, EqualizerBand[]> = {
  flat: DEFAULT_BANDS.map((b) => ({ ...b })),
  bass_boost: [
    { frequency: 60, gain: 10 }, { frequency: 170, gain: 8 }, { frequency: 310, gain: 5 },
    { frequency: 600, gain: 2 }, { frequency: 1000, gain: 0 }, { frequency: 3000, gain: 0 },
    { frequency: 6000, gain: 0 }, { frequency: 12000, gain: 0 }, { frequency: 14000, gain: 0 },
    { frequency: 16000, gain: 0 },
  ],
  treble_boost: [
    { frequency: 60, gain: 0 }, { frequency: 170, gain: 0 }, { frequency: 310, gain: 0 },
    { frequency: 600, gain: 0 }, { frequency: 1000, gain: 2 }, { frequency: 3000, gain: 5 },
    { frequency: 6000, gain: 8 }, { frequency: 12000, gain: 10 }, { frequency: 14000, gain: 8 },
    { frequency: 16000, gain: 6 },
  ],
  vocal: [
    { frequency: 60, gain: -2 }, { frequency: 170, gain: 0 }, { frequency: 310, gain: 4 },
    { frequency: 600, gain: 6 }, { frequency: 1000, gain: 6 }, { frequency: 3000, gain: 4 },
    { frequency: 6000, gain: 2 }, { frequency: 12000, gain: 0 }, { frequency: 14000, gain: -2 },
    { frequency: 16000, gain: -2 },
  ],
  rock: [
    { frequency: 60, gain: 6 }, { frequency: 170, gain: 4 }, { frequency: 310, gain: -2 },
    { frequency: 600, gain: -4 }, { frequency: 1000, gain: 0 }, { frequency: 3000, gain: 4 },
    { frequency: 6000, gain: 6 }, { frequency: 12000, gain: 6 }, { frequency: 14000, gain: 4 },
    { frequency: 16000, gain: 2 },
  ],
  electronic: [
    { frequency: 60, gain: 8 }, { frequency: 170, gain: 6 }, { frequency: 310, gain: 0 },
    { frequency: 600, gain: -2 }, { frequency: 1000, gain: 2 }, { frequency: 3000, gain: 0 },
    { frequency: 6000, gain: 4 }, { frequency: 12000, gain: 8 }, { frequency: 14000, gain: 6 },
    { frequency: 16000, gain: 4 },
  ],
  classical: [
    { frequency: 60, gain: 4 }, { frequency: 170, gain: 2 }, { frequency: 310, gain: 0 },
    { frequency: 600, gain: 2 }, { frequency: 1000, gain: 2 }, { frequency: 3000, gain: 4 },
    { frequency: 6000, gain: 4 }, { frequency: 12000, gain: 4 }, { frequency: 14000, gain: 2 },
    { frequency: 16000, gain: 0 },
  ],
  jazz: [
    { frequency: 60, gain: 4 }, { frequency: 170, gain: 2 }, { frequency: 310, gain: 0 },
    { frequency: 600, gain: 2 }, { frequency: 1000, gain: 4 }, { frequency: 3000, gain: 4 },
    { frequency: 6000, gain: 2 }, { frequency: 12000, gain: 4 }, { frequency: 14000, gain: 4 },
    { frequency: 16000, gain: 2 },
  ],
  pop: [
    { frequency: 60, gain: -2 }, { frequency: 170, gain: 2 }, { frequency: 310, gain: 4 },
    { frequency: 600, gain: 4 }, { frequency: 1000, gain: 2 }, { frequency: 3000, gain: 0 },
    { frequency: 6000, gain: 2 }, { frequency: 12000, gain: 4 }, { frequency: 14000, gain: 4 },
    { frequency: 16000, gain: 2 },
  ],
  custom: DEFAULT_BANDS.map((b) => ({ ...b })),
};

function loadEQ(): EqualizerSettings {
  try {
    const raw = storage.getString(EQ_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    enabled: false,
    preset: 'flat',
    bands: DEFAULT_BANDS.map((b) => ({ ...b })),
    bassBoost: 0,
    balance: 0,
  };
}

function saveEQ(settings: EqualizerSettings): void {
  try { storage.set(EQ_KEY, JSON.stringify(settings)); } catch {}
}

interface EQState extends EqualizerSettings {
  setEnabled: (enabled: boolean) => void;
  setPreset: (preset: EqualizerPreset) => void;
  setBandGain: (index: number, gain: number) => void;
  setBassBoost: (value: number) => void;
  setBalance: (value: number) => void;
  reset: () => void;
}

export const useEqualizerStore = create<EQState>()(
  immer((set, get) => ({
    ...loadEQ(),

    setEnabled: (enabled) => {
      set((s) => { s.enabled = enabled; });
      saveEQ(get());
    },

    setPreset: (preset) => {
      set((s) => {
        s.preset = preset;
        if (preset !== 'custom') {
          const bands = PRESET_BANDS[preset];
          s.bands = bands ? bands.map((b) => ({ ...b })) : DEFAULT_BANDS.map((b) => ({ ...b }));
        }
      });
      saveEQ(get());
    },

    setBandGain: (index, gain) => {
      set((s) => {
        s.preset = 'custom';
        if (s.bands[index]) s.bands[index].gain = gain;
      });
      saveEQ(get());
    },

    setBassBoost: (value) => {
      set((s) => { s.bassBoost = value; });
      saveEQ(get());
    },

    setBalance: (value) => {
      set((s) => { s.balance = value; });
      saveEQ(get());
    },

    reset: () => {
      set((s) => {
        s.enabled = false;
        s.preset = 'flat';
        s.bands = DEFAULT_BANDS.map((b) => ({ ...b }));
        s.bassBoost = 0;
        s.balance = 0;
      });
      saveEQ(get());
    },
  })),
);

export const EQUALIZER_PRESETS: { key: EqualizerPreset; label: string }[] = [
  { key: 'flat', label: 'Flat' },
  { key: 'bass_boost', label: 'Bass Boost' },
  { key: 'treble_boost', label: 'Treble Boost' },
  { key: 'vocal', label: 'Vocal' },
  { key: 'rock', label: 'Rock' },
  { key: 'electronic', label: 'Electronic' },
  { key: 'classical', label: 'Classical' },
  { key: 'jazz', label: 'Jazz' },
  { key: 'pop', label: 'Pop' },
  { key: 'custom', label: 'Custom' },
];

export function syncEqualizerToEngine(): void {
  const state = useEqualizerStore.getState();
  audioEngine.setEqEnabled(state.enabled);
  if (state.enabled) {
    audioEngine.setBandGains(state.bands);
    audioEngine.setBassBoost(state.bassBoost);
    audioEngine.setBalance(state.balance);
  } else {
    audioEngine.setBandGains(DEFAULT_BANDS);
    audioEngine.setBassBoost(0);
    audioEngine.setBalance(0);
  }
}

try {
  useEqualizerStore.subscribe(() => {
    try {
      syncEqualizerToEngine();
    } catch {}
  });
} catch {}
