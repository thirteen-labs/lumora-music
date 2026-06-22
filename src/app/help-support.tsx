import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, BookOpen, MessageCircle, Bug } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LINKS = [
  { icon: BookOpen, label: 'FAQs', desc: 'Frequently asked questions', url: 'https://lumora.app/faq' },
  { icon: MessageCircle, label: 'Contact Support', desc: 'Get help from our team', url: 'mailto:support@lumora.app' },
  { icon: Bug, label: 'Report a Bug', desc: 'Found something wrong?', url: 'https://github.com/lumora-app/lumora/issues/new' },
];

export default function HelpSupportScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Help & Support</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {LINKS.map((link) => (
              <Pressable
                key={link.label}
                onPress={() => Linking.openURL(link.url)}
                style={[s.flexRow, s.itemsCenter, s.gap4, s.p4]}
              >
                <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                  <link.icon size={20} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{link.label}</Text>
                  <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>{link.desc}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
