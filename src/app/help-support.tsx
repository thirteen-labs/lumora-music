import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, BookOpen, MessageCircle, Bug } from 'lucide-react-native';

const LINKS = [
  { icon: BookOpen, label: 'FAQs', desc: 'Frequently asked questions', url: '' },
  { icon: MessageCircle, label: 'Contact Support', desc: 'Get help from our team', url: 'mailto:support@lumora.app' },
  { icon: Bug, label: 'Report a Bug', desc: 'Found something wrong?', url: '' },
];

export default function HelpSupportScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4">
        <Pressable onPress={() => router.back()} className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text className="text-lg font-bold" style={{ color: colors.text }}>Help & Support</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {LINKS.map((link, i) => (
              <Pressable
                key={link.label}
                onPress={() => link.url && Linking.openURL(link.url)}
                className="flex-row items-center gap-4 p-4"
                style={{ borderBottomWidth: i < LINKS.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.accent + '15' }}>
                  <link.icon size={20} color={colors.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>{link.label}</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{link.desc}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
