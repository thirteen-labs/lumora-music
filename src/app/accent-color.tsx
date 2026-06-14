import { View, Text, ScrollView, Pressable } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Palette } from 'lucide-react-native';
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
];

export default function AccentColorScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const currentColor = 'purple';
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '20' }]}>
          <Palette size={20} color={colors.accent} />
        </View>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Accent Color</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {ACCENT_COLORS.map((c, i) => (
              <Pressable
                key={c.id}
                style={[s.flexRow, s.itemsCenter, s.gap4, s.p4, { borderBottomWidth: i < ACCENT_COLORS.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }]}
              >
                <View style={[s.w10, s.h10, s.roundedFull, { backgroundColor: c.color }]} />
                <Text style={[s.flex1, s.textSm, s.fontMedium, { color: colors.text }]}>{c.label}</Text>
                {currentColor === c.id && <Check size={18} color={colors.accent} />}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
