import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/store/settings-store';
import { useRouter } from 'expo-router';
import { ChevronLeft, Zap } from 'lucide-react-native';

const DURATIONS = [1, 2, 3, 5, 7, 10];

export default function CrossfadeSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const crossfade = useSettingsStore((s) => s.crossfade);
  const setCrossfade = useSettingsStore((s) => s.setCrossfade);
  const crossfadeDuration = useSettingsStore((s) => s.crossfadeDuration);
  const setCrossfadeDuration = useSettingsStore((s) => s.setCrossfadeDuration);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4">
        <Pressable onPress={() => router.back()} className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text className="text-lg font-bold" style={{ color: colors.text }}>Crossfade</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <View className="mb-6" style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            <View className="flex-row items-center gap-4 p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border + '20' }}>
              <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.accent + '15' }}>
                <Zap size={20} color={colors.accent} />
              </View>
              <Text className="flex-1 text-sm font-medium" style={{ color: colors.text }}>Enable Crossfade</Text>
              <Switch value={crossfade} onValueChange={() => setCrossfade(!crossfade)} trackColor={{ false: colors.card, true: colors.accent + '80' }} thumbColor="#fff" />
            </View>
            <View className="p-4">
              <Text className="text-sm font-medium mb-3" style={{ color: colors.text }}>Duration: {crossfadeDuration}s</Text>
              <View className="flex-row gap-2">
                {DURATIONS.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setCrossfadeDuration(d)}
                    className="flex-1 py-2 rounded-xl items-center justify-center"
                    style={{ backgroundColor: crossfadeDuration === d ? colors.accent : colors.card }}
                  >
                    <Text className="text-sm font-semibold" style={{ color: crossfadeDuration === d ? '#fff' : colors.text }}>{d}s</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
