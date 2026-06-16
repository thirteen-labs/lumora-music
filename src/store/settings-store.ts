import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { storage } from "@/services/mmkv";
import type { RepeatMode } from "@/types/player";

export type NowPlayingLayout = "classic" | "modern" | "minimal";
export type AppLanguage = "en" | "es" | "fr" | "de" | "ja" | "zh" | "pt" | "ru" | "it" | "ko" | "ar" | "tr";
export type FontFamily = "system" | "serif" | "rounded" | "mono" | "poppins" | "inter" | "monr" | "socide" | "epsor" | "roba" | "hago" | "preospe";

export const LANGUAGE_OPTIONS: { code: AppLanguage; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
];

export const FONT_OPTIONS: { key: FontFamily; label: string }[] = [
  { key: "system", label: "System" },
  { key: "inter", label: "Inter" },
  { key: "poppins", label: "Poppins" },
  { key: "serif", label: "Serif" },
  { key: "rounded", label: "Rounded" },
  { key: "mono", label: "Monospace" },
  { key: "monr", label: "Monr" },
  { key: "socide", label: "Socide" },
  { key: "epsor", label: "Epsor" },
  { key: "roba", label: "Roba" },
  { key: "hago", label: "Hago" },
  { key: "preospe", label: "Preospe" },
];

const SETTINGS_KEYS = {
  defaultShuffle: "lumora-setting-shuffle",
  defaultRepeat: "lumora-setting-repeat",
  crossfade: "lumora-setting-crossfade",
  crossfadeDuration: "lumora-setting-crossfade-duration",
  colorAware: "lumora-setting-color-aware",
  backgroundImage: "lumora-setting-bg-image",
  nowPlayingLayout: "lumora-setting-np-layout",
  language: "lumora-setting-language",
  fontFamily: "lumora-setting-font-family",
  adsRemoved: "lumora-setting-ads-removed",
  accentOverride: "lumora-setting-accent-override",
  showSystemHiddenFiles: "lumora-setting-show-system-hidden",
  audioQuality: "lumora-setting-audio-quality",
  videoQuality: "lumora-setting-video-quality",
  gaplessPlayback: "lumora-setting-gapless",
  playTogether: "lumora-setting-play-together",
  newMediaNotification: "lumora-setting-new-media-notif",
  pushNotification: "lumora-setting-push-notif",
} as const;

function loadBool(key: string, fallback: boolean): boolean {
  try {
    return storage.getBoolean(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function loadString(key: string, fallback: string): string {
  try {
    return storage.getString(key) ?? fallback;
  } catch {
    return fallback;
  }
}

interface SettingsState {
  defaultShuffle: boolean;
  defaultRepeat: RepeatMode;
  crossfade: boolean;
  crossfadeDuration: number;
  colorAware: boolean;
  backgroundImage: string | null;
  nowPlayingLayout: NowPlayingLayout;
  language: AppLanguage;
  fontFamily: FontFamily;
  adsRemoved: boolean;
  accentOverride: string | null;
  showSystemHiddenFiles: boolean;
  audioQuality: string;
  videoQuality: string;
  gaplessPlayback: boolean;
  playTogether: boolean;
  newMediaNotification: boolean;
  pushNotification: boolean;
  setShowSystemHiddenFiles: (v: boolean) => void;
  setDefaultShuffle: (v: boolean) => void;
  setDefaultRepeat: (v: RepeatMode) => void;
  setCrossfade: (v: boolean) => void;
  setCrossfadeDuration: (v: number) => void;
  setColorAware: (v: boolean) => void;
  setBackgroundImage: (path: string | null) => void;
  setNowPlayingLayout: (layout: NowPlayingLayout) => void;
  setLanguage: (lang: AppLanguage) => void;
  setFontFamily: (font: FontFamily) => void;
  setAdsRemoved: (v: boolean) => void;
  setAccentOverride: (color: string | null) => void;
  setAudioQuality: (v: string) => void;
  setVideoQuality: (v: string) => void;
  setGaplessPlayback: (v: boolean) => void;
  setPlayTogether: (v: boolean) => void;
  setNewMediaNotification: (v: boolean) => void;
  setPushNotification: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  immer((set) => ({
    defaultShuffle: loadBool(SETTINGS_KEYS.defaultShuffle, false),
    defaultRepeat: loadString(SETTINGS_KEYS.defaultRepeat, "off") as RepeatMode,
    crossfade: loadBool(SETTINGS_KEYS.crossfade, false),
    crossfadeDuration: (() => {
      try {
        return Number(storage.getString(SETTINGS_KEYS.crossfadeDuration)) || 5;
      } catch {
        return 5;
      }
    })(),
    colorAware: loadBool(SETTINGS_KEYS.colorAware, false),
    accentOverride: (() => {
      const v = loadString(SETTINGS_KEYS.accentOverride, "");
      return v || null;
    })(),
    backgroundImage: (() => {
      const v = loadString(SETTINGS_KEYS.backgroundImage, "");
      return v || null;
    })(),
    nowPlayingLayout:
      (loadString(
        SETTINGS_KEYS.nowPlayingLayout,
        "classic",
      ) as NowPlayingLayout) || "classic",
    language: (loadString(SETTINGS_KEYS.language, "en") as AppLanguage) || "en",
    fontFamily: (loadString(SETTINGS_KEYS.fontFamily, "system") as FontFamily) || "system",
    adsRemoved: loadBool(SETTINGS_KEYS.adsRemoved, false),
    showSystemHiddenFiles: loadBool(SETTINGS_KEYS.showSystemHiddenFiles, false),
    audioQuality: loadString(SETTINGS_KEYS.audioQuality, 'high'),
    videoQuality: loadString(SETTINGS_KEYS.videoQuality, '1080p'),
    gaplessPlayback: loadBool(SETTINGS_KEYS.gaplessPlayback, true),
    playTogether: loadBool(SETTINGS_KEYS.playTogether, false),
    newMediaNotification: loadBool(SETTINGS_KEYS.newMediaNotification, true),
    pushNotification: loadBool(SETTINGS_KEYS.pushNotification, true),

    setShowSystemHiddenFiles: (v) => {
      set((s) => { s.showSystemHiddenFiles = v; });
      try { storage.set(SETTINGS_KEYS.showSystemHiddenFiles, v); } catch {}
    },
    setDefaultShuffle: (v) => {
      set((s) => {
        s.defaultShuffle = v;
      });
      try {
        storage.set(SETTINGS_KEYS.defaultShuffle, v);
      } catch {}
    },
    setDefaultRepeat: (v) => {
      set((s) => {
        s.defaultRepeat = v;
      });
      try {
        storage.set(SETTINGS_KEYS.defaultRepeat, v);
      } catch {}
    },
    setCrossfade: (v) => {
      set((s) => {
        s.crossfade = v;
      });
      try {
        storage.set(SETTINGS_KEYS.crossfade, v);
      } catch {}
    },
    setCrossfadeDuration: (v) => {
      set((s) => {
        s.crossfadeDuration = v;
      });
      try {
        storage.set(SETTINGS_KEYS.crossfadeDuration, String(v));
      } catch {}
    },
    setColorAware: (v) => {
      set((s) => {
        s.colorAware = v;
      });
      try {
        storage.set(SETTINGS_KEYS.colorAware, v);
      } catch {}
    },
    setBackgroundImage: (path) => {
      set((s) => {
        s.backgroundImage = path;
      });
      try {
        if (path) storage.set(SETTINGS_KEYS.backgroundImage, path);
          else storage.set(SETTINGS_KEYS.backgroundImage, '');
      } catch {}
    },
    setNowPlayingLayout: (layout) => {
      set((s) => {
        s.nowPlayingLayout = layout;
      });
      try {
        storage.set(SETTINGS_KEYS.nowPlayingLayout, layout);
      } catch {}
    },
    setLanguage: (lang) => {
      set((s) => { s.language = lang; });
      try { storage.set(SETTINGS_KEYS.language, lang); } catch {}
    },
    setFontFamily: (font) => {
      set((s) => { s.fontFamily = font; });
      try { storage.set(SETTINGS_KEYS.fontFamily, font); } catch {}
    },
    setAdsRemoved: (v) => {
      set((s) => { s.adsRemoved = v; });
      try { storage.set(SETTINGS_KEYS.adsRemoved, v); } catch {}
    },
    setAccentOverride: (color) => {
      set((s) => { s.accentOverride = color; });
      try {
        if (color) storage.set(SETTINGS_KEYS.accentOverride, color);
        else storage.set(SETTINGS_KEYS.accentOverride, '');
      } catch {}
    },
    setAudioQuality: (v) => {
      set((s) => { s.audioQuality = v; });
      try { storage.set(SETTINGS_KEYS.audioQuality, v); } catch {}
    },
    setVideoQuality: (v) => {
      set((s) => { s.videoQuality = v; });
      try { storage.set(SETTINGS_KEYS.videoQuality, v); } catch {}
    },
    setGaplessPlayback: (v) => {
      set((s) => { s.gaplessPlayback = v; });
      try { storage.set(SETTINGS_KEYS.gaplessPlayback, v); } catch {}
    },
    setPlayTogether: (v) => {
      set((s) => { s.playTogether = v; });
      try { storage.set(SETTINGS_KEYS.playTogether, v); } catch {}
    },
    setNewMediaNotification: (v) => {
      set((s) => { s.newMediaNotification = v; });
      try { storage.set(SETTINGS_KEYS.newMediaNotification, v); } catch {}
    },
    setPushNotification: (v) => {
      set((s) => { s.pushNotification = v; });
      try { storage.set(SETTINGS_KEYS.pushNotification, v); } catch {}
    },
  })),
);
