import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Paintbrush } from 'lucide-react-native';

const THEMES = [
  { id: 'nebula', name: 'Nebula', colors: ['#7C3AED', '#3B82F6'] },
  { id: 'aurora', name: 'Aurora', colors: ['#10B981', '#3B82F6'] },
  { id: 'sunset', name: 'Sunset', colors: ['#F59E0B', '#EF4444'] },
  { id: 'rose', name: 'Rose', colors: ['#EC4899', '#8B5CF6'] },
  { id: 'ocean', name: 'Ocean', colors: ['#06B6D4', '#3B82F6'] },
  { id: 'midnight', name: 'Midnight', colors: ['#1E1B4B', '#312E81'] },
];

export default function ThemesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const currentTheme = 'nebula';

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4">
        <Pressable onPress={() => router.back()} className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.accent + '20' }}>
          <Paintbrush size={20} color={colors.accent} />
        </View>
        <Text className="text-lg font-bold" style={{ color: colors.text }}>Theme</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {THEMES.map((theme, i) => (
              <Pressable
                key={theme.id}
                className="flex-row items-center gap-4 p-4"
                style={{ borderBottomWidth: i < THEMES.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }}
              >
                <View className="w-10 h-10 rounded-full" style={{ backgroundColor: theme.colors[0] }} />
                <Text className="flex-1 text-sm font-medium" style={{ color: colors.text }}>{theme.name}</Text>
                {currentTheme === theme.id && <Check size={18} color={colors.accent} />}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
