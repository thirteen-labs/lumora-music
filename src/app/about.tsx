import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AboutScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>About Lumora</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={[s.itemsCenter, s.mb8]}>
            <View style={[{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: colors.accent + '25' }]}>
              <Image source={require('../../assets/favicon.png')} style={{ width: 40, height: 40 }} />
            </View>
            <Text style={[s.textXl, s.fontBold, { color: colors.text }]}>Lumora</Text>
            <Text style={[s.textSm, s.mt1, { color: colors.textMuted }]}>Version 1.0.0</Text>
          </View>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {[
              { label: 'Version', value: '1.0.0' },
              { label: 'Developer', value: 'Cadmus Labs' },
              { label: 'Platform', value: 'React Native / Expo' },
            ].map((item, i, arr) => (
              <View
                key={item.label}
                style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.p4, { borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }]}
              >
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{item.label}</Text>
                <Text style={[s.textSm, { color: colors.textMuted }]}>{item.value}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.textXs, s.textCenter, s.mt6, { color: colors.textMuted }]}>
            Premium offline media player
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
