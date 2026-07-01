import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { storage } from "@/services/mmkv";
import type { RepeatMode } from "@/types/player";
import { reportWarning } from "@/utils/error-handler";

export type NowPlayingLayout = "modern" | "lyrics";
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
  backgroundBrightness: "lumora-setting-bg-brightness",
  backgroundBlur: "lumora-setting-bg-blur",
  backgroundHue: "lumora-setting-bg-hue",
  nowPlayingLayout: "lumora-setting-np-layout",
  language: "lumora-setting-language",
  fontFamily: "lumora-setting-font-family",
  adsRemoved: "lumora-setting-ads-removed",
  accentOverride: "lumora-setting-accent-override",
  showSystemHiddenFiles: "lumora-setting-show-system-hidden",
  audioQuality: "lumora-setting-audio-quality",
  gaplessPlayback: "lumora-setting-gapless",
  playTogether: "lumora-setting-play-together",
  newMediaNotification: "lumora-setting-new-media-notif",
  pushNotification: "lumora-setting-push-notif",

} as const;

function loadBool(key: string, fallback: boolean): boolean {
  try {
    return storage.getBoolean(key) ?? fallback;
  } catch (e) {
    reportWarning("Settings", e, `Failed to load boolean setting: ${key}`);
    return fallback;
  }
}
function loadString(key: string, fallback: string): string {
  try {
    return storage.getString(key) ?? fallback;
  } catch (e) {
    reportWarning("Settings", e, `Failed to load string setting: ${key}`);
    return fallback;
  }
}
function loadNumber(key: string, fallback: number): number {
  try {
    return storage.getNumber(key) ?? fallback;
  } catch (e) {
    reportWarning("Settings", e, `Failed to load number setting: ${key}`);
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
  backgroundBrightness: number;
  backgroundBlur: number;
  backgroundHue: number;
  nowPlayingLayout: NowPlayingLayout;
  language: AppLanguage;
  fontFamily: FontFamily;
  adsRemoved: boolean;
  accentOverride: string | null;
  showSystemHiddenFiles: boolean;
  audioQuality: string;
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
  setBackgroundBrightness: (v: number) => void;
  setBackgroundBlur: (v: number) => void;
  setBackgroundHue: (v: number) => void;
  setNowPlayingLayout: (layout: NowPlayingLayout) => void;
  setLanguage: (lang: AppLanguage) => void;
  setFontFamily: (font: FontFamily) => void;
  setAdsRemoved: (v: boolean) => void;
  setAccentOverride: (color: string | null) => void;
  setAudioQuality: (v: string) => void;
  setGaplessPlayback: (v: boolean) => void;
  setPlayTogether: (v: boolean) => void;
  setNewMediaNotification: (v: boolean) => void;
  setPushNotification: (v: boolean) => void;

}

function persistSetting(key: string, value: unknown): void {
  try {
    if (typeof value === "boolean") {
      storage.set(key, value);
    } else if (typeof value === "string") {
      storage.set(key, value);
    } else if (typeof value === "number") {
      storage.set(key, value);
    }
  } catch (e) {
    reportWarning("Settings", e, `Failed to save setting: ${key}`);
  }
}

export const useSettingsStore = create<SettingsState>()(
  immer((set) => ({
    defaultShuffle: loadBool(SETTINGS_KEYS.defaultShuffle, false),
    defaultRepeat: loadString(SETTINGS_KEYS.defaultRepeat, "off") as RepeatMode,
    crossfade: loadBool(SETTINGS_KEYS.crossfade, false),
    crossfadeDuration: loadNumber(SETTINGS_KEYS.crossfadeDuration, 5),
    colorAware: loadBool(SETTINGS_KEYS.colorAware, false),
    accentOverride: (() => {
      const v = loadString(SETTINGS_KEYS.accentOverride, "");
      return v || null;
    })(),
    backgroundImage: (() => {
      const v = loadString(SETTINGS_KEYS.backgroundImage, "");
      return v || null;
    })(),
    backgroundBrightness: loadNumber(SETTINGS_KEYS.backgroundBrightness, 100),
    backgroundBlur: loadNumber(SETTINGS_KEYS.backgroundBlur, 0),
    backgroundHue: loadNumber(SETTINGS_KEYS.backgroundHue, 0),
    nowPlayingLayout:
      (loadString(
        SETTINGS_KEYS.nowPlayingLayout,
        "modern",
      ) as NowPlayingLayout) || "modern",
    language: (loadString(SETTINGS_KEYS.language, "en") as AppLanguage) || "en",
    fontFamily: (loadString(SETTINGS_KEYS.fontFamily, "system") as FontFamily) || "system",
    adsRemoved: loadBool(SETTINGS_KEYS.adsRemoved, false),
    showSystemHiddenFiles: loadBool(SETTINGS_KEYS.showSystemHiddenFiles, false),
    audioQuality: loadString(SETTINGS_KEYS.audioQuality, 'high'),
    gaplessPlayback: loadBool(SETTINGS_KEYS.gaplessPlayback, true),
    playTogether: loadBool(SETTINGS_KEYS.playTogether, false),
    newMediaNotification: loadBool(SETTINGS_KEYS.newMediaNotification, true),
    pushNotification: loadBool(SETTINGS_KEYS.pushNotification, true),

    setShowSystemHiddenFiles: (v) => {
      set((s) => { s.showSystemHiddenFiles = v; });
      persistSetting(SETTINGS_KEYS.showSystemHiddenFiles, v);
    },
    setDefaultShuffle: (v) => {
      set((s) => { s.defaultShuffle = v; });
      persistSetting(SETTINGS_KEYS.defaultShuffle, v);
    },
    setDefaultRepeat: (v) => {
      set((s) => { s.defaultRepeat = v; });
      persistSetting(SETTINGS_KEYS.defaultRepeat, v);
    },
    setCrossfade: (v) => {
      set((s) => { s.crossfade = v; });
      persistSetting(SETTINGS_KEYS.crossfade, v);
    },
    setCrossfadeDuration: (v) => {
      set((s) => { s.crossfadeDuration = v; });
      persistSetting(SETTINGS_KEYS.crossfadeDuration, v);
    },
    setColorAware: (v) => {
      set((s) => { s.colorAware = v; });
      persistSetting(SETTINGS_KEYS.colorAware, v);
    },
    setBackgroundImage: (path) => {
      set((s) => { s.backgroundImage = path; });
      persistSetting(SETTINGS_KEYS.backgroundImage, path ?? '');
    },
    setBackgroundBrightness: (v) => {
      set((s) => { s.backgroundBrightness = v; });
      persistSetting(SETTINGS_KEYS.backgroundBrightness, v);
    },
    setBackgroundBlur: (v) => {
      set((s) => { s.backgroundBlur = v; });
      persistSetting(SETTINGS_KEYS.backgroundBlur, v);
    },
    setBackgroundHue: (v) => {
      set((s) => { s.backgroundHue = v; });
      persistSetting(SETTINGS_KEYS.backgroundHue, v);
    },
    setNowPlayingLayout: (layout) => {
      set((s) => { s.nowPlayingLayout = layout; });
      persistSetting(SETTINGS_KEYS.nowPlayingLayout, layout);
    },
    setLanguage: (lang) => {
      set((s) => { s.language = lang; });
      persistSetting(SETTINGS_KEYS.language, lang);
    },
    setFontFamily: (font) => {
      set((s) => { s.fontFamily = font; });
      persistSetting(SETTINGS_KEYS.fontFamily, font);
    },
    setAdsRemoved: (v) => {
      set((s) => { s.adsRemoved = v; });
      persistSetting(SETTINGS_KEYS.adsRemoved, v);
    },
    setAccentOverride: (color) => {
      set((s) => { s.accentOverride = color; });
      persistSetting(SETTINGS_KEYS.accentOverride, color ?? '');
    },
    setAudioQuality: (v) => {
      set((s) => { s.audioQuality = v; });
      persistSetting(SETTINGS_KEYS.audioQuality, v);
    },
    setGaplessPlayback: (v) => {
      set((s) => { s.gaplessPlayback = v; });
      persistSetting(SETTINGS_KEYS.gaplessPlayback, v);
    },
    setPlayTogether: (v) => {
      set((s) => { s.playTogether = v; });
      persistSetting(SETTINGS_KEYS.playTogether, v);
    },
    setNewMediaNotification: (v) => {
      set((s) => { s.newMediaNotification = v; });
      persistSetting(SETTINGS_KEYS.newMediaNotification, v);
    },
    setPushNotification: (v) => {
      set((s) => { s.pushNotification = v; });
      persistSetting(SETTINGS_KEYS.pushNotification, v);
    },
  })),
);
