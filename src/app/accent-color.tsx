import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Palette } from 'lucide-react-native';

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

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4">
        <Pressable onPress={() => router.back()} className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.accent + '20' }}>
          <Palette size={20} color={colors.accent} />
        </View>
        <Text className="text-lg font-bold" style={{ color: colors.text }}>Accent Color</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {ACCENT_COLORS.map((c, i) => (
              <Pressable
                key={c.id}
                className="flex-row items-center gap-4 p-4"
                style={{ borderBottomWidth: i < ACCENT_COLORS.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }}
              >
                <View className="w-10 h-10 rounded-full" style={{ backgroundColor: c.color }} />
                <Text className="flex-1 text-sm font-medium" style={{ color: colors.text }}>{c.label}</Text>
                {currentColor === c.id && <Check size={18} color={colors.accent} />}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
