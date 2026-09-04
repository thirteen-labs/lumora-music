import { View, Text, ScrollView, Pressable, useWindowDimensions, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/store/theme-store';
import { themes } from '@/theme/themes';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Paintbrush, Sparkles } from 'lucide-react-native';
import { s } from '@/styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ThemesScreen() {
  const { width: winW } = useWindowDimensions();
  const PADDING = 40;
  const GAP = 12;
  const ITEM_SIZE = (winW - PADDING - GAP * 2) / 3;
  const { colors } = useTheme();
  const router = useRouter();
  const currentThemeId = useThemeStore((s) => s.currentThemeId);
  const setTheme = useThemeStore((s) => s.setTheme);
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accentSoft }]}>
          <Paintbrush size={20} color={colors.accent} />
        </View>
        <View style={s.flex1}>
          <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Theme</Text>
          <Text style={[s.textXs, { color: colors.textMuted }]}>{themes.length} premium palettes</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={[s.px5, s.mb4, s.flexRow, s.itemsCenter, s.gap2, { backgroundColor: colors.accentSoft, borderRadius: 14, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.accent + '18' }]}>
          <Sparkles size={14} color={colors.accent} />
          <Text style={[s.textXs, s.fontMedium, { color: colors.textSecondary }]}>Tap to preview instantly — glass & image layers update live</Text>
        </View>
        <View style={[s.px5, s.flexRow, s.flexWrap, { gap: GAP }]}>
          {themes.map((theme) => {
            const isActive = currentThemeId === theme.id;
            return (
              <Pressable
                key={theme.id}
                onPress={() => setTheme(theme.id)}
                style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
              >
                <View
                  style={[
                    s.itemsCenter, s.justifyCenter, s.rounded2xl, s.overflowHidden,
                    {
                      width: ITEM_SIZE,
                      height: ITEM_SIZE,
                      backgroundColor: theme.colors.background,
                      borderWidth: isActive ? 2.5 : StyleSheet.hairlineWidth,
                      borderColor: isActive ? colors.accent : theme.colors.glassBorder,
                      shadowColor: isActive ? theme.colors.accent : '#000',
                      shadowOpacity: isActive ? 0.22 : theme.isDark ? 0.18 : 0.06,
                      shadowRadius: isActive ? 14 : 8,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: isActive ? 6 : 2,
                    },
                  ]}
                >
                  {/* subtle gradient dot */}
                  <View
                    style={[
                      s.absolute,
                      {
                        width: 56, height: 56, borderRadius: 28,
                        backgroundColor: theme.colors.accent,
                        opacity: 0.18,
                        top: -10, left: -10,
                      },
                    ]}
                  />
                  <View
                    style={[
                      s.absolute,
                      {
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: theme.colors.accent,
                        top: 10, left: 10,
                        borderWidth: 2,
                        borderColor: 'rgba(255,255,255,0.22)',
                      },
                    ]}
                  />
                  {/* surface preview stripe */}
                  <View style={[s.absolute, { bottom: 28, left: 10, right: 10, height: 10, borderRadius: 6, backgroundColor: theme.colors.surface, opacity: 0.9, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border }]} />
                  <View style={[s.absolute, { bottom: 14, left: 10, right: 36, height: 6, borderRadius: 4, backgroundColor: theme.colors.card, opacity: 0.95 }]} />
                  {isActive && (
                    <View style={[s.absolute, s.itemsCenter, s.justifyCenter, { top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6 }]}>
                      <Check size={14} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                  <Text
                    style={[
                      s.absolute, s.text10, s.fontSemibold,
                      {
                        color: theme.colors.text,
                        bottom: 8, left: 10, right: 10,
                        textShadowColor: 'rgba(0,0,0,0.35)',
                        textShadowRadius: 6,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {theme.name}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
