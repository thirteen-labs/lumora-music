import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Privacy</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {[
              { label: 'Offline Mode', desc: 'No internet access required', value: true },
              { label: 'No Data Collection', desc: 'Your data stays on device', value: true },
              { label: 'No Analytics', desc: 'Usage analytics disabled', value: true },
            ].map((item, i, arr) => (
              <View
                key={item.label}
                style={[s.flexRow, s.itemsCenter, s.gap4, s.p4, { borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }]}
              >
                <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                  <Shield size={20} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>{item.desc}</Text>
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
