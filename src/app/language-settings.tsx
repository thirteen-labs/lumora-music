import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore, LANGUAGE_OPTIONS } from '@/store/settings-store';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Languages } from 'lucide-react-native';

export default function LanguageSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4">
        <Pressable onPress={() => router.back()} className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.accent + '20' }}>
          <Languages size={20} color={colors.accent} />
        </View>
        <Text className="text-lg font-bold" style={{ color: colors.text }}>Language</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {LANGUAGE_OPTIONS.map((lang, i) => (
              <Pressable
                key={lang.code}
                onPress={() => setLanguage(lang.code)}
                className="flex-row items-center gap-4 p-4"
                style={{ borderBottomWidth: i < LANGUAGE_OPTIONS.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }}
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>{lang.native}</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{lang.label}</Text>
                </View>
                {language === lang.code && <Check size={18} color={colors.accent} />}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
