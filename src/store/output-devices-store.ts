import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { storage } from '@/services/mmkv';
import { audioEngine } from '@/services/audio-engine';
import type { EqualizerPreset } from '@/types/audio';
import { useEqualizerStore } from '@/store/equalizer-store';

export type DeviceCategory = 'phone_speakers' | 'earphones' | 'headphones' | 'speakers' | 'external_speakers';

export interface StabilizerProfile {
  enabled: boolean;
  loudnessLevel: number;
  eqPreset: EqualizerPreset;
}

export interface OutputDevice {
  id: string;
  name: string;
  category: DeviceCategory;
  connectionType: 'built-in' | 'bluetooth' | 'wired';
}

interface OutputDevicesState {
  detectedDevices: OutputDevice[];
  activeDeviceId: string | null;
  stabilizerProfiles: Record<DeviceCategory, StabilizerProfile>;
  setActiveDevice: (id: string | null) => void;
  setDetectedDevices: (devices: OutputDevice[]) => void;
  addDevice: (device: OutputDevice) => void;
  removeDevice: (id: string) => void;
  updateProfile: (category: DeviceCategory, profile: Partial<StabilizerProfile>) => void;
  applyProfileForCategory: (category: DeviceCategory) => void;
}

const PROFILES_KEY = 'lumora-stabilizer-profiles';
const DEVICES_KEY = 'lumora-output-devices';
const ACTIVE_KEY = 'lumora-active-output-device';

function loadProfiles(): Record<DeviceCategory, StabilizerProfile> {
  try {
    const raw = storage.getString(PROFILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return getDefaultProfiles();
}

function getDefaultProfiles(): Record<DeviceCategory, StabilizerProfile> {
  return {
    phone_speakers: { enabled: true, loudnessLevel: 4, eqPreset: 'pop' },
    earphones: { enabled: true, loudnessLevel: 6, eqPreset: 'vocal' },
    headphones: { enabled: true, loudnessLevel: 7, eqPreset: 'flat' },
    speakers: { enabled: true, loudnessLevel: 8, eqPreset: 'bass_boost' },
    external_speakers: { enabled: true, loudnessLevel: 9, eqPreset: 'rock' },
  };
}

function loadDevices(): OutputDevice[] {
  try {
    const raw = storage.getString(DEVICES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function loadActiveId(): string | null {
  try {
    return storage.getString(ACTIVE_KEY) ?? null;
  } catch { return null; }
}

function saveProfiles(profiles: Record<DeviceCategory, StabilizerProfile>): void {
  try { storage.set(PROFILES_KEY, JSON.stringify(profiles)); } catch {}
}

function saveDevices(devices: OutputDevice[]): void {
  try { storage.set(DEVICES_KEY, JSON.stringify(devices)); } catch {}
}

function syncToEngine(category: DeviceCategory, profile: StabilizerProfile): void {
  audioEngine.setLoudnessEnabled(profile.enabled);
  audioEngine.setLoudnessLevel(profile.loudnessLevel);
}

function syncEqPreset(preset: EqualizerPreset): void {
  try {
    const eqStore = useEqualizerStore.getState();
    eqStore.setPreset(preset);
    if (!eqStore.enabled) {
      eqStore.setEnabled(true);
    }
  } catch {}
}

export const useOutputDevicesStore = create<OutputDevicesState>()(
  immer((set, get) => ({
    detectedDevices: loadDevices(),
    activeDeviceId: loadActiveId(),
    stabilizerProfiles: loadProfiles(),

    setActiveDevice: (id) => {
      set((s) => { s.activeDeviceId = id; });
      try { storage.set(ACTIVE_KEY, id ?? ''); } catch {}
      if (id) {
        const device = get().detectedDevices.find((d) => d.id === id);
        if (device) {
          get().applyProfileForCategory(device.category);
        }
      }
    },

    setDetectedDevices: (devices) => {
      set((s) => { s.detectedDevices = devices; });
      saveDevices(devices);
    },

    addDevice: (device) => {
      set((s) => {
        const existing = s.detectedDevices.findIndex((d) => d.id === device.id);
        if (existing >= 0) {
          s.detectedDevices[existing] = device;
        } else {
          s.detectedDevices.push(device);
        }
      });
      saveDevices(get().detectedDevices);
      get().setActiveDevice(device.id);
    },

    removeDevice: (id) => {
      set((s) => {
        s.detectedDevices = s.detectedDevices.filter((d) => d.id !== id);
        if (s.activeDeviceId === id) {
          s.activeDeviceId = null;
        }
      });
      saveDevices(get().detectedDevices);
      if (get().activeDeviceId === null) {
        audioEngine.setLoudnessEnabled(false);
      }
    },

    updateProfile: (category, partial) => {
      set((s) => {
        if (!s.stabilizerProfiles[category]) {
          s.stabilizerProfiles[category] = getDefaultProfiles()[category];
        }
        Object.assign(s.stabilizerProfiles[category], partial);
      });
      saveProfiles(get().stabilizerProfiles);
      const activeDevice = get().detectedDevices.find((d) => d.id === get().activeDeviceId);
      if (activeDevice && activeDevice.category === category) {
        get().applyProfileForCategory(category);
      }
    },

    applyProfileForCategory: (category) => {
      const profile = get().stabilizerProfiles[category] ?? getDefaultProfiles()[category];
      syncToEngine(category, profile);
      if (profile.enabled) {
        syncEqPreset(profile.eqPreset);
      }
    },
  })),
);

export const DEVICE_CATEGORIES: { key: DeviceCategory; label: string }[] = [
  { key: 'phone_speakers', label: 'Phone Speakers' },
  { key: 'earphones', label: 'Earphones' },
  { key: 'headphones', label: 'Headphones' },
  { key: 'speakers', label: 'Speakers' },
  { key: 'external_speakers', label: 'External Speakers' },
];

export function startDeviceDetection(): () => void {
  const store = useOutputDevicesStore;
  const builtInDevice: OutputDevice = {
    id: 'built-in-phone-speakers',
    name: 'Device Speakers',
    category: 'phone_speakers',
    connectionType: 'built-in',
  };
  store.getState().addDevice(builtInDevice);

  return () => {};
}
