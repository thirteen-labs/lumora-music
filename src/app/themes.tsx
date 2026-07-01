import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/store/theme-store';
import { themes } from '@/theme/themes';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Paintbrush } from 'lucide-react-native';
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
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '20' }]}>
          <Paintbrush size={20} color={colors.accent} />
        </View>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Theme</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={[s.px5, s.flexRow, s.flexWrap, { gap: GAP }]}>
          {themes.map((theme) => {
            const isActive = currentThemeId === theme.id;
            return (
              <Pressable
                key={theme.id}
                onPress={() => setTheme(theme.id)}
              >
                <View
                  style={[s.itemsCenter, s.justifyCenter, s.rounded2xl, {
                    width: ITEM_SIZE,
                    height: ITEM_SIZE,
                    backgroundColor: theme.colors.background,
                    borderWidth: isActive ? 3 : 0,
                    borderColor: isActive ? colors.accent : 'transparent',
                  }]}
                >
                  <View
                    style={[s.absolute, {
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: theme.colors.accent,
                      top: 8, left: 8,
                    }]}
                  />
                  {isActive && <Check size={28} color={colors.background} />}
                  <Text style={[s.absolute, s.text10, s.fontMedium, {
                    color: theme.colors.text,
                    bottom: 8, left: 8, right: 8,
                  }]} numberOfLines={1}>{theme.name}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
