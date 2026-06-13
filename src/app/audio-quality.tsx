import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';

const QUALITY_OPTIONS = [
  { id: 'low', label: 'Low (128 kbps)', desc: 'Saves storage space' },
  { id: 'medium', label: 'Medium (192 kbps)', desc: 'Balanced quality' },
  { id: 'high', label: 'High (320 kbps)', desc: 'Best quality' },
  { id: 'lossless', label: 'Lossless', desc: 'CD quality (FLAC)' },
];

export default function AudioQualityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const current = 'high';

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4">
        <Pressable onPress={() => router.back()} className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text className="text-lg font-bold" style={{ color: colors.text }}>Audio Quality</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {QUALITY_OPTIONS.map((opt, i) => (
              <Pressable
                key={opt.id}
                className="flex-row items-center gap-4 p-4"
                style={{ borderBottomWidth: i < QUALITY_OPTIONS.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }}
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>{opt.label}</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{opt.desc}</Text>
                </View>
                {current === opt.id && <Check size={18} color={colors.accent} />}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
