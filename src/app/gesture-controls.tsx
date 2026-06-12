import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { Hand } from 'lucide-react-native';
import { storage } from '@/services/mmkv';

const GESTURE_STORAGE_KEY = 'lumora-gesture-settings';

interface GestureSettings {
  swipeSeek: boolean;
  swipeVolume: boolean;
  swipeBrightness: boolean;
  doubleTapSeek: boolean;
}

function loadGestureSettings(): GestureSettings {
  try {
    const raw = storage.getString(GESTURE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    swipeSeek: true,
    swipeVolume: true,
    swipeBrightness: true,
    doubleTapSeek: true,
  };
}

function saveGestureSettings(settings: GestureSettings): void {
  try { storage.set(GESTURE_STORAGE_KEY, JSON.stringify(settings)); } catch {}
}

export default function GestureControlsScreen() {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<GestureSettings>(loadGestureSettings);

  const toggleSetting = (key: keyof GestureSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    saveGestureSettings(next);
  };

  const gestures = [
    { gesture: 'Swipe Left/Right', action: 'Seek backward/forward 10s', key: 'swipeSeek' as const },
    { gesture: 'Swipe Up (left side)', action: 'Increase brightness', key: 'swipeBrightness' as const },
    { gesture: 'Swipe Up (right side)', action: 'Increase volume', key: 'swipeVolume' as const },
    { gesture: 'Swipe Down (left side)', action: 'Decrease brightness', key: 'swipeBrightness' as const },
    { gesture: 'Swipe Down (right side)', action: 'Decrease volume', key: 'swipeVolume' as const },
    { gesture: 'Double Tap (left)', action: 'Rewind 10s', key: 'doubleTapSeek' as const },
    { gesture: 'Double Tap (right)', action: 'Forward 10s', key: 'doubleTapSeek' as const },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Gesture Controls" showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-4">
          <View className="flex-row items-center gap-3 rounded-3xl p-4" style={{ backgroundColor: colors.surface }}>
            <View className="rounded-full p-3" style={{ backgroundColor: colors.accent + '20' }}>
              <Hand size={24} color={colors.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                Video Gesture Controls
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                Swipe and tap gestures for video playback
              </Text>
            </View>
          </View>

          <View>
            <Text className="text-xs font-semibold mb-2 px-1" style={{ color: colors.textMuted }}>
              GESTURES
            </Text>
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              {gestures.map((g, i) => (
                <Pressable
                  key={g.gesture}
                  onPress={() => toggleSetting(g.key)}
                  className="flex-row items-center gap-3 p-4"
                  style={{ borderBottomWidth: i < gestures.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                >
                  <View className="flex-1">
                    <Text className="text-sm font-medium" style={{ color: colors.text }}>{g.gesture}</Text>
                    <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{g.action}</Text>
                  </View>
                  <View
                    className="w-12 h-7 rounded-full items-center justify-end px-1"
                    style={{ backgroundColor: settings[g.key] ? colors.accent : colors.card }}
                  >
                    <View
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: '#fff', transform: [{ translateX: settings[g.key] ? 0 : -18 }] }}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="rounded-3xl p-4" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xs leading-5" style={{ color: colors.textMuted }}>
              Gestures work in the video player. Swipe gestures use the left side for brightness and right side for volume. Double-tap on either side to seek.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
