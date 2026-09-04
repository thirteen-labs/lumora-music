import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/settings-store';
import { ChevronLeft, Check, Palette, X, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT_COLORS = [
  { id: 'purple', label: 'Purple', color: '#7C3AED' },
  { id: 'blue', label: 'Blue', color: '#3B82F6' },
  { id: 'green', label: 'Green', color: '#10B981' },
  { id: 'red', label: 'Red', color: '#EF4444' },
  { id: 'orange', label: 'Orange', color: '#F59E0B' },
  { id: 'pink', label: 'Pink', color: '#EC4899' },
  { id: 'cyan', label: 'Cyan', color: '#06B6D4' },
  { id: 'teal', label: 'Teal', color: '#14B8A6' },
  { id: 'lime', label: 'Lime', color: '#84CC16' },
];

export default function AccentColorScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const accentOverride = useSettingsStore((s) => s.accentOverride);
  const setAccentOverride = useSettingsStore((s) => s.setAccentOverride);

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accentSoft, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.accent + '14' }]}>
          <Palette size={20} color={colors.accent} />
        </View>
        <View style={s.flex1}>
          <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Accent Color</Text>
          <Text style={[s.textXs, { color: colors.textMuted }]}>Tint glass & highlights</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mb4, s.px4, s.py3, { backgroundColor: colors.accentSoft, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.accent + '18' }]}>
            <Sparkles size={14} color={colors.accent} />
            <Text style={[s.textXs, s.fontMedium, { color: colors.textSecondary }]}>Overrides theme accent — affects glass border & player</Text>
          </View>
          {accentOverride && (
            <Pressable
              onPress={() => setAccentOverride(null)}
              style={[s.flexRow, s.itemsCenter, s.gap3, s.mb4, s.py3, s.px4, s.roundedXl, { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder }]}
            >
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
                <X size={14} color={colors.textMuted} />
              </View>
              <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>Reset to theme default</Text>
            </Pressable>
          )}
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder }}>
            {ACCENT_COLORS.map((c) => {
              const isActive = accentOverride === c.color;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setAccentOverride(c.color)}
                  style={[s.flexRow, s.itemsCenter, s.gap4, s.p4, { backgroundColor: isActive ? colors.accentSoft : 'transparent', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.color, borderWidth: 2, borderColor: isActive ? '#fff' : 'rgba(255,255,255,0.12)', shadowColor: c.color, shadowOpacity: isActive ? 0.32 : 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }} />
                  <View style={s.flex1}>
                    <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>{c.label}</Text>
                    <Text style={[s.textXs, { color: colors.textMuted }]}>{c.color}</Text>
                  </View>
                  {isActive && (
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
