import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/store/settings-store';
import { useRouter } from 'expo-router';
import { ChevronLeft, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DURATIONS = [1, 2, 3, 5, 7, 10];

export default function CrossfadeSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const crossfade = useSettingsStore((s) => s.crossfade);
  const setCrossfade = useSettingsStore((s) => s.setCrossfade);
  const crossfadeDuration = useSettingsStore((s) => s.crossfadeDuration);
  const setCrossfadeDuration = useSettingsStore((s) => s.setCrossfadeDuration);
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Crossfade</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={[s.mb6, { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }]}>
            <View style={[s.flexRow, s.itemsCenter, s.gap4, s.p4]}>
              <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                <Zap size={20} color={colors.accent} />
              </View>
              <Text style={[s.flex1, s.textSm, s.fontMedium, { color: colors.text }]}>Enable Crossfade</Text>
              <Switch value={crossfade} onValueChange={() => setCrossfade(!crossfade)} trackColor={{ false: colors.card, true: colors.accent + '80' }} thumbColor="#fff" />
            </View>
            <View style={s.p4}>
              <Text style={[s.textSm, s.fontMedium, s.mb3, { color: colors.text }]}>Duration: {crossfadeDuration}s</Text>
              <View style={[s.flexRow, s.gap2]}>
                {DURATIONS.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setCrossfadeDuration(d)}
                    style={[s.flex1, { paddingVertical: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: crossfadeDuration === d ? colors.accent : colors.card }]}
                  >
                    <Text style={[s.textSm, s.fontSemibold, { color: crossfadeDuration === d ? colors.background : colors.text }]}>{d}s</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
