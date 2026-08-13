import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useSettingsStore } from '@/store/settings-store';
import Slider from '@react-native-community/slider';
import { Sun, Droplets, Palette } from 'lucide-react-native';

export default function BackgroundImageAdjusterScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const brightness = useSettingsStore((s) => s.backgroundBrightness);
  const blur = useSettingsStore((s) => s.backgroundBlur);
  const hue = useSettingsStore((s) => s.backgroundHue);
  const setBrightness = useSettingsStore((s) => s.setBackgroundBrightness);
  const setBlur = useSettingsStore((s) => s.setBackgroundBlur);
  const setHue = useSettingsStore((s) => s.setBackgroundHue);

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <TopBar title="Background Image Adjusters" showSettings={false} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap6]}>
          <View>
            <SectionHeader title="Brightness" />
            <View style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb3]}>
                <Sun size={20} color={colors.accent} />
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>
                  {brightness}%
                </Text>
              </View>
              <Slider
                value={brightness / 200}
                onValueChange={(val) => setBrightness(Math.round(val * 200))}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
                style={{ width: '100%', height: 40 }}
              />
              <View style={[s.flexRow, s.justifyBetween, s.px1]}>
                <Text style={[s.textXs, { color: colors.textMuted }]}>0%</Text>
                <Text style={[s.textXs, { color: colors.textMuted }]}>200%</Text>
              </View>
            </View>
          </View>

          <View>
            <SectionHeader title="Blur" />
            <View style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb3]}>
                <Droplets size={20} color={colors.accent} />
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>
                  {blur}px
                </Text>
              </View>
              <Slider
                value={blur / 50}
                onValueChange={(val) => setBlur(Math.round(val * 50))}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
                style={{ width: '100%', height: 40 }}
              />
              <View style={[s.flexRow, s.justifyBetween, s.px1]}>
                <Text style={[s.textXs, { color: colors.textMuted }]}>0px</Text>
                <Text style={[s.textXs, { color: colors.textMuted }]}>50px</Text>
              </View>
            </View>
          </View>

          <View>
            <SectionHeader title="Hue Rotation" />
            <View style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb3]}>
                <Palette size={20} color={colors.accent} />
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>
                  {hue}°
                </Text>
              </View>
              <Slider
                value={hue / 360}
                onValueChange={(val) => setHue(Math.round(val * 360))}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
                style={{ width: '100%', height: 40 }}
              />
              <View style={[s.flexRow, s.justifyBetween, s.px1]}>
                <Text style={[s.textXs, { color: colors.textMuted }]}>0°</Text>
                <Text style={[s.textXs, { color: colors.textMuted }]}>360°</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}