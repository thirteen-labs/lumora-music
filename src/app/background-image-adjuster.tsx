import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useSettingsStore } from '@/store/settings-store';
import Slider from '@react-native-community/slider';
import { Sun, Droplets, Palette, Sparkles, ImageIcon } from 'lucide-react-native';
import { Image } from 'expo-image';

export default function BackgroundImageAdjusterScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const brightness = useSettingsStore((s) => s.backgroundBrightness);
  const blur = useSettingsStore((s) => s.backgroundBlur);
  const hue = useSettingsStore((s) => s.backgroundHue);
  const backgroundImage = useSettingsStore((s) => s.backgroundImage);
  const setBrightness = useSettingsStore((s) => s.setBackgroundBrightness);
  const setBlur = useSettingsStore((s) => s.setBackgroundBlur);
  const setHue = useSettingsStore((s) => s.setBackgroundHue);

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <TopBar title="Image Atmosphere" showSettings={false} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={[s.px4, s.py4, s.gap6]}>
          {/* Live Preview */}
          <View style={{ borderRadius: 22, overflow: 'hidden', height: 168, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder }}>
            {backgroundImage ? (
              <>
                <Image source={{ uri: backgroundImage }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={blur} />
                {brightness < 100 && <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: ((100 - brightness) / 100) * 0.52 }]} />}
                {brightness > 100 && <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: ((brightness - 100) / 100) * 0.28 }]} />}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: 0.28 }]} />
              </>
            ) : (
              <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.card }]}>
                <ImageIcon size={32} color={colors.textMuted} />
                <Text style={[s.textXs, s.mt2, { color: colors.textMuted }]}>No image — set one in Settings</Text>
              </View>
            )}
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', padding: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.42)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' }}>
                <Sparkles size={12} color="#fff" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.6 }}>LIVE PREVIEW</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginTop: 8, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 8 }}>
                Cards & bars use glass over this image
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => { setBrightness(100); setBlur(0); setHue(0); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder }}>
              <Sparkles size={14} color={colors.accent} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Reset</Text>
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: colors.accentSoft, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.accent + '18' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>{brightness}% · {blur}px · {hue}°</Text>
            </View>
          </View>

          <View>
            <SectionHeader title="Brightness — scrim depth" />
            <View style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb3]}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Sun size={16} color={colors.accent} />
                </View>
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>{brightness}%</Text>
                <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: colors.textMuted }}>{brightness < 100 ? 'darker · more contrast' : brightness > 100 ? 'lighter · airy' : 'balanced'}</Text>
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
            <SectionHeader title="Blur — glass frost" />
            <View style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb3]}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Droplets size={16} color={colors.accent} />
                </View>
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>{blur}px</Text>
                <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: colors.textMuted }}>{blur === 0 ? 'crisp' : blur < 18 ? 'soft frost' : 'dreamy'}</Text>
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
                <Text style={[s.textXs, { color: colors.textMuted }]}>0px crisp</Text>
                <Text style={[s.textXs, { color: colors.textMuted }]}>50px frosted</Text>
              </View>
            </View>
          </View>

          <View>
            <SectionHeader title="Hue — color wash" />
            <View style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb3]}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Palette size={16} color={colors.accent} />
                </View>
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>{hue}°</Text>
                <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: colors.textMuted }}>tint overlay</Text>
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
