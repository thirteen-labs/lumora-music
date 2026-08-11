import { View, Text, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/hooks/use-translation';
import Constants from 'expo-constants';

export default function AboutScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>{t('about.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={[s.itemsCenter, s.mb8]}>
            <View style={[{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: colors.accent + '25' }]}>
              <Image source={require('../../assets/favicon.png')} style={{ width: 40, height: 40 }} contentFit="contain" />
            </View>
            <Text style={[s.textXl, s.fontBold, { color: colors.text }]}>Lumora</Text>
            <Text style={[s.textSm, s.mt1, { color: colors.textMuted }]}>{t('about.version')} {Constants.expoConfig?.version ?? '1.0.1'}</Text>
          </View>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {[
              { label: t('about.version'), value: Constants.expoConfig?.version ?? '1.0.1' },
              { label: t('about.developer'), value: 'Northern Obsidian' },
              { label: t('about.platform'), value: 'React Native / Expo' },
            ].map((item, i, arr) => (
              <View
                key={item.label}
                style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.p4]}
              >
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{item.label}</Text>
                <Text style={[s.textSm, { color: colors.textMuted }]}>{item.value}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.textXs, s.textCenter, s.mt6, { color: colors.textMuted }]}>
            {t('about.description')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
