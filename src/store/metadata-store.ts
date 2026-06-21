import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '@/services/mmkv';

export interface MetadataOverride {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: string;
}

interface MetadataState {
  overrides: Record<string, MetadataOverride>;
  setOverride: (id: string, override: MetadataOverride) => void;
  removeOverride: (id: string) => void;
  getOverriddenSong: <T extends { id: string; title: string; artist?: string; album?: string; artwork?: string | null }>(song: T) => T;
}

export const useMetadataStore = create<MetadataState>()(
  persist(
    (set, get) => ({
      overrides: {},
      setOverride: (id, override) => {
        set((state) => ({
          overrides: { ...state.overrides, [id]: override },
        }));
      },
      removeOverride: (id) => {
        set((state) => {
          const next = { ...state.overrides };
          delete next[id];
          return { overrides: next };
        });
      },
      getOverriddenSong: (song) => {
        const override = get().overrides[song.id];
        if (!override) return song;
        return {
          ...song,
          title: override.title ?? song.title,
          artist: override.artist ?? song.artist,
          album: override.album ?? song.album,
          artwork: override.artwork ?? song.artwork,
        };
      },
    }),
    {
      name: 'lumora-metadata-overrides',
      storage: createJSONStorage(() => ({
        getItem: (key: string) => storage.getString(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.remove(key),
      })),
    },
  ),
);
