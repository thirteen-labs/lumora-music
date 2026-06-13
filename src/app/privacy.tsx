import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield } from 'lucide-react-native';

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4">
        <Pressable onPress={() => router.back()} className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text className="text-lg font-bold" style={{ color: colors.text }}>Privacy</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {[
              { label: 'Offline Mode', desc: 'No internet access required', value: true },
              { label: 'No Data Collection', desc: 'Your data stays on device', value: true },
              { label: 'No Analytics', desc: 'Usage analytics disabled', value: true },
            ].map((item, i, arr) => (
              <View
                key={item.label}
                className="flex-row items-center gap-4 p-4"
                style={{ borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.accent + '15' }}>
                  <Shield size={20} color={colors.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>{item.label}</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{item.desc}</Text>
                </View>
                <Switch value={item.value} disabled trackColor={{ false: colors.card, true: colors.accent + '80' }} thumbColor="#fff" />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
