import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { Hand } from 'lucide-react-native';
import { storage } from '@/services/mmkv';
import { useTranslation } from '@/hooks/use-translation';

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
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<GestureSettings>(loadGestureSettings);

  const toggleSetting = (key: keyof GestureSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    saveGestureSettings(next);
  };

  const gestures = [
    { gesture: t('gesture.left'), action: t('gesture.left.action'), key: 'swipeSeek' as const },
    { gesture: t('gesture.up.left'), action: t('gesture.up.left.action'), key: 'swipeBrightness' as const },
    { gesture: t('gesture.up.right'), action: t('gesture.up.right.action'), key: 'swipeVolume' as const },
    { gesture: t('gesture.down.left'), action: t('gesture.down.left.action'), key: 'swipeBrightness' as const },
    { gesture: t('gesture.down.right'), action: t('gesture.down.right.action'), key: 'swipeVolume' as const },
    { gesture: t('gesture.double.left'), action: t('gesture.double.left.action'), key: 'doubleTapSeek' as const },
    { gesture: t('gesture.double.right'), action: t('gesture.double.right.action'), key: 'doubleTapSeek' as const },
  ];

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={t('gesture.title')} showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap4]}>
          <View style={[s.flexRow, s.itemsCenter, s.gap3, s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
            <View style={[s.roundedFull, { padding: 12, backgroundColor: colors.accent + '20' }]}>
              <Hand size={24} color={colors.accent} />
            </View>
            <View style={s.flex1}>
              <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>
                {t('gesture.title')}
              </Text>
              <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>
                {t('gesture.desc')}
              </Text>
            </View>
          </View>

          <View>
            <Text style={[s.textXs, s.fontSemibold, s.mb2, s.px1, { color: colors.textMuted }]}>
              GESTURES
            </Text>
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              {gestures.map((g, i) => (
                <Pressable
                  key={g.gesture}
                  onPress={() => toggleSetting(g.key)}
                  style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { borderBottomWidth: i < gestures.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
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

          <View style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
            <Text style={[s.textXs, { color: colors.textMuted, lineHeight: 20 }]}>
              {t('gesture.help')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
