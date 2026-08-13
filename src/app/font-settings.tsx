import { View, Text, ScrollView, Pressable } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore, FONT_OPTIONS } from '@/store/settings-store';
import { FONT_FAMILY_MAP } from '@/components/font-provider';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Type } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FontSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const setFontFamily = useSettingsStore((s) => s.setFontFamily);
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '20' }]}>
          <Type size={20} color={colors.accent} />
        </View>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>App Font</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {FONT_OPTIONS.map((font, i) => (
              <Pressable
                key={font.key}
                onPress={() => setFontFamily(font.key)}
                style={[s.flexRow, s.itemsCenter, s.gap4, s.p4]}
              >
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text, fontFamily: FONT_FAMILY_MAP[font.key] }]}>{font.label}</Text>
                </View>
                {fontFamily === font.key && <Check size={18} color={colors.accent} />}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}