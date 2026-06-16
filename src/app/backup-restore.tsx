import { View, Text, Pressable } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Database } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BackupRestoreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Backup & Restore</Text>
      </View>
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, s.px5]}>
        <View style={[s.w16, s.h16, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
          <Database size={32} color={colors.accent} />
        </View>
        <Text style={[s.textLg, s.fontBold, s.mt4, { color: colors.text }]}>Backup & Restore</Text>
        <Text style={[s.textSm, s.mt2, { color: colors.textMuted }, s.textCenter]}>Coming soon</Text>
      </View>
    </View>
  );
}
