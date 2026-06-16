import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/store/settings-store';
import { useRouter } from 'expo-router';
import { ChevronLeft, BellPlus, BellRing } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const newMediaNotification = useSettingsStore((s) => s.newMediaNotification);
  const setNewMediaNotification = useSettingsStore((s) => s.setNewMediaNotification);
  const pushNotification = useSettingsStore((s) => s.pushNotification);
  const setPushNotification = useSettingsStore((s) => s.setPushNotification);

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Notifications</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={[s.mb6, { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }]}>
            <View style={[s.flexRow, s.itemsCenter, s.gap4, s.p4, { borderBottomWidth: 1, borderBottomColor: colors.border + '20' }]}>
              <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                <BellPlus size={20} color={colors.accent} />
              </View>
              <View style={[s.flex1]}>
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>New Media Notification</Text>
                <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>Show notification when new media is found</Text>
              </View>
              <Switch value={newMediaNotification} onValueChange={setNewMediaNotification} trackColor={{ false: colors.card, true: colors.accent + '80' }} thumbColor="#fff" />
            </View>
            <View style={[s.flexRow, s.itemsCenter, s.gap4, s.p4]}>
              <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                <BellRing size={20} color={colors.accent} />
              </View>
              <View style={[s.flex1]}>
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>Push Notification</Text>
                <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>Receive push notifications</Text>
              </View>
              <Switch value={pushNotification} onValueChange={setPushNotification} trackColor={{ false: colors.card, true: colors.accent + '80' }} thumbColor="#fff" />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
