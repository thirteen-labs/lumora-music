import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/store/theme-store';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Paintbrush } from 'lucide-react-native';
import { s } from '@/styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const THEMES = [
  { id: 'nebula', name: 'Nebula', colors: ['#7C3AED', '#3B82F6'] },
  { id: 'aurora', name: 'Aurora', colors: ['#10B981', '#3B82F6'] },
  { id: 'sunset', name: 'Sunset', colors: ['#F59E0B', '#EF4444'] },
  { id: 'rose', name: 'Rose', colors: ['#EC4899', '#8B5CF6'] },
  { id: 'ocean', name: 'Ocean', colors: ['#06B6D4', '#3B82F6'] },
  { id: 'midnight', name: 'Midnight', colors: ['#1E1B4B', '#312E81'] },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = 40;
const GAP = 12;
const ITEM_SIZE = (SCREEN_WIDTH - PADDING - GAP * 2) / 3;

export default function ThemesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { currentThemeId, setTheme } = useThemeStore();
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
          {THEMES.map((theme) => {
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
                    backgroundColor: theme.colors[0],
                    borderWidth: isActive ? 3 : 0,
                    borderColor: isActive ? colors.accent : 'transparent',
                  }]}
                >
                  {isActive && <Check size={28} color="#fff" />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
