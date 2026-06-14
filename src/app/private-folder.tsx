import { View, Text, ScrollView, Pressable } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivateFolderScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Private Folder</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={[s.px5, s.itemsCenter, s.py20]}>
          <View style={[{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: colors.accent + '20' }]}>
            <Lock size={36} color={colors.accent} />
          </View>
          <Text style={[s.textBase, s.fontSemibold, s.mb2, { color: colors.text }]}>Private Folder</Text>
          <Text style={[s.textSm, s.textCenter, { color: colors.textMuted }]}>
            Protect your private files with a lock.{'\n'}This folder is secured and only accessible to you.
          </Text>
          <Pressable style={[s.mt6, { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent }]}>
            <Text style={[s.textSm, s.fontSemibold, { color: '#fff' }]}>Set Up Lock</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
