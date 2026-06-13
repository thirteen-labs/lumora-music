import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock } from 'lucide-react-native';

export default function PrivateFolderScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4">
        <Pressable onPress={() => router.back()} className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text className="text-lg font-bold" style={{ color: colors.text }}>Private Folder</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View className="px-5 items-center py-20">
          <View className="w-20 h-20 rounded-3xl items-center justify-center mb-4" style={{ backgroundColor: colors.accent + '20' }}>
            <Lock size={36} color={colors.accent} />
          </View>
          <Text className="text-base font-semibold mb-2" style={{ color: colors.text }}>Private Folder</Text>
          <Text className="text-sm text-center" style={{ color: colors.textMuted }}>
            Protect your private files with a lock.{'\n'}This folder is secured and only accessible to you.
          </Text>
          <Pressable className="mt-6 px-6 py-3 rounded-2xl" style={{ backgroundColor: colors.accent }}>
            <Text className="text-sm font-semibold" style={{ color: '#fff' }}>Set Up Lock</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
