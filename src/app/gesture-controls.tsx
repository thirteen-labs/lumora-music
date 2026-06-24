import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { Hand } from 'lucide-react-native';
import { storage } from '@/services/mmkv';
import Slider from '@react-native-community/slider';

const GESTURE_STORAGE_KEY = 'lumora-gesture-settings';
const SENSITIVITY_KEY = 'lumora-gesture-sensitivity';

interface GestureSettings {
  swipeSeek: boolean;
  swipeVolume: boolean;
  swipeBrightness: boolean;
  doubleTapSeek: boolean;
}

interface SensitivitySettings {
  seekSpeed: number;
  volumeSensitivity: number;
  brightnessSensitivity: number;
}

function loadGestureSettings(): GestureSettings {
  try {
    const raw = storage.getString(GESTURE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { swipeSeek: true, swipeVolume: true, swipeBrightness: true, doubleTapSeek: true };
}

function saveGestureSettings(settings: GestureSettings): void {
  try { storage.set(GESTURE_STORAGE_KEY, JSON.stringify(settings)); } catch {}
}

function loadSensitivity(): SensitivitySettings {
  try {
    const raw = storage.getString(SENSITIVITY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { seekSpeed: 1, volumeSensitivity: 1, brightnessSensitivity: 1 };
}

function saveSensitivity(settings: SensitivitySettings): void {
  try { storage.set(SENSITIVITY_KEY, JSON.stringify(settings)); } catch {}
}

export default function GestureControlsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<GestureSettings>(loadGestureSettings);
  const [sensitivity, setSensitivity] = useState<SensitivitySettings>(loadSensitivity);

  const toggleSetting = useCallback((key: keyof GestureSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    saveGestureSettings(next);
  }, [settings]);

  const updateSensitivity = useCallback((key: keyof SensitivitySettings, value: number) => {
    const next = { ...sensitivity, [key]: value };
    setSensitivity(next);
    saveSensitivity(next);
  }, [sensitivity]);

  const gestures = [
    { gesture: 'Swipe Left/Right', action: 'Seek forward/backward', key: 'swipeSeek' as const },
    { gesture: 'Swipe Up (Left)', action: 'Adjust brightness', key: 'swipeBrightness' as const },
    { gesture: 'Swipe Up (Right)', action: 'Adjust volume', key: 'swipeVolume' as const },
    { gesture: 'Double Tap Left', action: 'Seek backward 10s', key: 'doubleTapSeek' as const },
    { gesture: 'Double Tap Right', action: 'Seek forward 10s', key: 'doubleTapSeek' as const },
  ];

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="Gesture Controls" showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap6]}>
          <View style={[s.flexRow, s.itemsCenter, s.gap3, s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
            <View style={[s.roundedFull, { padding: 12, backgroundColor: colors.accent + '20' }]}>
              <Hand size={24} color={colors.accent} />
            </View>
            <View style={s.flex1}>
              <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>
                Gesture Controls
              </Text>
              <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>
                Enable, disable, and fine-tune player gestures
              </Text>
            </View>
          </View>

          <View>
            <Text style={[s.textXs, s.fontSemibold, s.mb2, s.px1, { color: colors.textMuted }]}>
              GESTURES
            </Text>
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              {gestures.map((g) => (
                <Pressable
                  key={g.gesture}
                  onPress={() => toggleSetting(g.key)}
                  style={[s.flexRow, s.itemsCenter, s.gap3, s.p4]}
                >
                  <View style={s.flex1}>
                    <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{g.gesture}</Text>
                    <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>{g.action}</Text>
                  </View>
                  <View
                    style={[{ width: 48, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 4, backgroundColor: settings[g.key] ? colors.accent : colors.card }]}
                  >
                    <View
                      style={[{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', transform: [{ translateX: settings[g.key] ? 0 : -18 }] }]}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text style={[s.textXs, s.fontSemibold, s.mb2, s.px1, { color: colors.textMuted }]}>
              SENSITIVITY
            </Text>
            <View style={[s.rounded3xl, s.p4, s.gap4, { backgroundColor: colors.surface }]}>
              <View>
                <View style={[s.flexRow, s.justifyBetween, s.mb1]}>
                  <Text style={[s.textXs, { color: colors.text }]}>Seek Speed</Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>{sensitivity.seekSpeed.toFixed(1)}x</Text>
                </View>
                <Slider
                  style={{ height: 32 }}
                  minimumValue={0.5}
                  maximumValue={3}
                  step={0.1}
                  value={sensitivity.seekSpeed}
                  onValueChange={(v) => updateSensitivity('seekSpeed', v)}
                  minimumTrackTintColor={colors.accent}
                  maximumTrackTintColor={colors.card}
                  thumbTintColor={colors.accent}
                />
              </View>
              <View>
                <View style={[s.flexRow, s.justifyBetween, s.mb1]}>
                  <Text style={[s.textXs, { color: colors.text }]}>Volume Sensitivity</Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>{sensitivity.volumeSensitivity.toFixed(1)}x</Text>
                </View>
                <Slider
                  style={{ height: 32 }}
                  minimumValue={0.5}
                  maximumValue={2}
                  step={0.1}
                  value={sensitivity.volumeSensitivity}
                  onValueChange={(v) => updateSensitivity('volumeSensitivity', v)}
                  minimumTrackTintColor={colors.accent}
                  maximumTrackTintColor={colors.card}
                  thumbTintColor={colors.accent}
                />
              </View>
              <View>
                <View style={[s.flexRow, s.justifyBetween, s.mb1]}>
                  <Text style={[s.textXs, { color: colors.text }]}>Brightness Sensitivity</Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>{sensitivity.brightnessSensitivity.toFixed(1)}x</Text>
                </View>
                <Slider
                  style={{ height: 32 }}
                  minimumValue={0.5}
                  maximumValue={2}
                  step={0.1}
                  value={sensitivity.brightnessSensitivity}
                  onValueChange={(v) => updateSensitivity('brightnessSensitivity', v)}
                  minimumTrackTintColor={colors.accent}
                  maximumTrackTintColor={colors.card}
                  thumbTintColor={colors.accent}
                />
              </View>
            </View>
          </View>

          <View style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
            <Text style={[s.textXs, { color: colors.textMuted, lineHeight: 20 }]}>
              Gesture sensitivity values affect how responsive gestures are. Changes take effect on the next playback.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
