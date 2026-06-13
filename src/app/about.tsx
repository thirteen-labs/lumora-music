import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Info } from 'lucide-react-native';

export default function AboutScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4">
        <Pressable onPress={() => router.back()} className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text className="text-lg font-bold" style={{ color: colors.text }}>About Lumora</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-3xl items-center justify-center mb-4" style={{ backgroundColor: colors.accent + '25' }}>
              <Info size={36} color={colors.accent} />
            </View>
            <Text className="text-xl font-bold" style={{ color: colors.text }}>Lumora</Text>
            <Text className="text-sm mt-1" style={{ color: colors.textMuted }}>Version 1.0.0</Text>
          </View>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {[
              { label: 'Version', value: '1.0.0' },
              { label: 'Developer', value: 'Cadmus Labs' },
              { label: 'Platform', value: 'React Native / Expo' },
            ].map((item, i, arr) => (
              <View
                key={item.label}
                className="flex-row items-center justify-between p-4"
                style={{ borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }}
              >
                <Text className="text-sm font-medium" style={{ color: colors.text }}>{item.label}</Text>
                <Text className="text-sm" style={{ color: colors.textMuted }}>{item.value}</Text>
              </View>
            ))}
          </View>
          <Text className="text-xs text-center mt-6" style={{ color: colors.textMuted }}>
            Premium offline media player
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
