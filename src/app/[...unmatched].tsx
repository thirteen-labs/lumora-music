import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { Music } from 'lucide-react-native';

export default function UnmatchedRoute() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ unmatched?: string | string[] }>();

  const path = Array.isArray(params.unmatched)
    ? params.unmatched.join('/')
    : params.unmatched ?? '';

  useEffect(() => {
    if (!path) {
      router.replace('/(tabs)');
    }
  }, [path, router]);

  return (
    <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.background, padding: 24 }]}>
      <View
        style={[
          s.w16,
          s.h16,
          s.roundedFull,
          s.itemsCenter,
          s.justifyCenter,
          s.mb4,
          { backgroundColor: colors.accent + '20' },
        ]}
      >
        <Music size={28} color={colors.accent} />
      </View>
      <Text style={[s.textBase, s.fontSemibold, s.textCenter, { color: colors.text }]}>
        {t('common.notFound')}
      </Text>
      <Text style={[s.textSm, s.textCenter, s.mt1, s.mb5, { color: colors.textMuted }]}>
        {path || t('common.notFound.desc')}
      </Text>
      <Pressable
        onPress={() => router.replace('/(tabs)')}
        style={[
          { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, backgroundColor: colors.accent },
        ]}
      >
        <Text style={[s.textSm, s.fontSemibold, { color: '#fff' }]}>{t('common.goHome')}</Text>
      </Pressable>
    </View>
  );
}
