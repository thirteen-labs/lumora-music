import { View, Text, ScrollView, Pressable, Alert, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useEqualizerStore, EQUALIZER_PRESETS } from '@/store/equalizer-store';
import { useReplayGainStore } from '@/store/replay-gain-store';
import { usePlaybackSpeedStore, SPEED_OPTIONS } from '@/store/playback-speed-store';
import { useLoudnessEnhancerStore } from '@/store/loudness-enhancer-store';
import Slider from '@react-native-community/slider';
import {
  Music, Gauge, Volume2, AudioLines, RotateCcw, Volume,
} from 'lucide-react-native';

export default function AudioFeaturesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const eq = useEqualizerStore();
  const rg = useReplayGainStore();
  const speed = usePlaybackSpeedStore();
  const le = useLoudnessEnhancerStore();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={t('audio.title')} showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap6]}>
          {/* Equalizer */}
          <View>
            <SectionHeader title={t('audio.equalizer')} />
            <View style={[s.rounded3xl, s.overflowHidden, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.mb4]}>
                <View style={[s.flexRow, s.itemsCenter, s.gap2]}>
                  <AudioLines size={18} color={colors.accent} />
                  <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>{t('audio.equalizer.10band')}</Text>
                </View>
                <Switch
                  value={eq.enabled}
                  onValueChange={eq.setEnabled}
                  trackColor={{ false: colors.card, true: colors.accent }}
                  thumbColor="#fff"
                />
              </View>

              {eq.enabled && (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.mb4, { marginHorizontal: -4 }]}>
                    {EQUALIZER_PRESETS.map((preset) => (
                      <Pressable
                        key={preset.key}
                        onPress={() => eq.setPreset(preset.key)}
                        style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, marginHorizontal: 4, backgroundColor: eq.preset === preset.key ? colors.accent : colors.card }]}
                      >
                        <Text
                          style={[s.textXs, s.fontSemibold, { color: eq.preset === preset.key ? colors.background : colors.textMuted }]}
                        >
                          {preset.label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <View style={[s.flexRow, s.itemsEnd, s.justifyBetween, s.gap1, s.mb4, { height: 140 }]}>
                    {eq.bands.map((band, i) => (
                      <View key={band.frequency} style={[s.flex1, s.itemsCenter]}>
                        <Slider
                          value={(band.gain + 12) / 24}
                          onValueChange={(val) => eq.setBandGain(i, Math.round((val * 24 - 12) * 2) / 2)}
                          minimumValue={0}
                          maximumValue={1}
                          minimumTrackTintColor={colors.accent}
                          maximumTrackTintColor={colors.border}
                          thumbTintColor={colors.accent}
                          style={{ width: 28, height: 120 }}
                          vertical
                        />
                        <Text style={[s.text9, s.mt1, { color: colors.textMuted }]}>
                          {band.frequency >= 1000 ? `${band.frequency / 1000}k` : band.frequency}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Bass Boost */}
          <View>
            <SectionHeader title={t('audio.bass.boost')} />
            <View style={[s.rounded3xl, s.overflowHidden, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mb3]}>
                <Volume2 size={18} color={colors.accent} />
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>
                  Level: {eq.bassBoost}
                </Text>
              </View>
              <Slider
                value={eq.bassBoost / 12}
                onValueChange={(val) => eq.setBassBoost(Math.round(val * 12))}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
                style={{ width: '100%', height: 40 }}
              />
              <View style={[s.flexRow, s.justifyBetween, s.px1]}>
                <Text style={[s.textXs, { color: colors.textMuted }]}>Off</Text>
                <Text style={[s.textXs, { color: colors.textMuted }]}>Max</Text>
              </View>
            </View>
          </View>

          {/* Audio Balance */}
          <View>
            <SectionHeader title={t('audio.balance')} />
            <View style={[s.rounded3xl, s.overflowHidden, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.mb3]}>
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>L</Text>
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>
                  {eq.balance === 0 ? t('audio.balance.center') : eq.balance < 0 ? t('audio.balance.left', { value: Math.abs(eq.balance) }) : t('audio.balance.right', { value: eq.balance })}
                </Text>
                <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>R</Text>
              </View>
              <Slider
                value={(eq.balance + 10) / 20}
                onValueChange={(val) => eq.setBalance(Math.round((val * 20 - 10) * 2) / 2)}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
                style={{ width: '100%', height: 40 }}
              />
            </View>
          </View>

          {/* Playback Speed */}
          <View>
            <SectionHeader title={t('audio.speed')} />
            <View style={[s.rounded3xl, s.overflowHidden, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mb4]}>
                <Gauge size={18} color={colors.accent} />
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>
                  {speed.speed.toFixed(2)}x
                </Text>
              </View>
              <View style={[s.flexRow, s.flexWrap, s.gap2, s.mb4]}>
                {SPEED_OPTIONS.map((sp) => (
                  <Pressable
                    key={sp}
                    onPress={() => speed.setSpeed(sp)}
                    style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, backgroundColor: speed.speed === sp ? colors.accent : colors.card }]}
                  >
                    <Text
                      style={[s.textXs, s.fontSemibold, { color: speed.speed === sp ? colors.background : colors.textMuted }]}
                    >
                      {sp.toFixed(2)}x
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={[s.flexRow, s.itemsCenter, s.justifyBetween]}>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{t('audio.pitch')}</Text>
                  <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>
                    {t('audio.pitch.desc')}
                  </Text>
                </View>
                <Switch
                  value={speed.pitchCorrection}
                  onValueChange={() => speed.togglePitchCorrection()}
                  trackColor={{ false: colors.card, true: colors.accent }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>

          {/* ReplayGain */}
          <View>
            <SectionHeader title={t('audio.replaygain')} />
            <View style={[s.rounded3xl, s.overflowHidden, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.mb4]}>
                <View style={[s.flexRow, s.itemsCenter, s.gap2]}>
                  <Music size={18} color={colors.accent} />
                  <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>{t('audio.replaygain')}</Text>
                </View>
                <Switch
                  value={rg.enabled}
                  onValueChange={rg.setEnabled}
                  trackColor={{ false: colors.card, true: colors.accent }}
                  thumbColor="#fff"
                />
              </View>

              {rg.enabled && (
                <>
                  <View style={s.mb4}>
                    <Text style={[s.textSm, s.fontMedium, s.mb2, { color: colors.text }]}>
                      {t('audio.preamp', { value: `${rg.preamp > 0 ? '+' : ''}${rg.preamp}` })}
                    </Text>
                    <Slider
                      value={(rg.preamp + 12) / 24}
                      onValueChange={(val) => rg.setPreamp(Math.round((val * 24 - 12) * 2) / 2)}
                      minimumValue={0}
                      maximumValue={1}
                      minimumTrackTintColor={colors.accent}
                      maximumTrackTintColor={colors.border}
                      thumbTintColor={colors.accent}
                      style={{ width: '100%', height: 40 }}
                    />
                  </View>
                  <View style={[s.flexRow, s.gap2]}>
                    <Pressable
                      onPress={() => { rg.setTrackGain(!rg.trackGain); }}
                      style={[s.flex1, { paddingVertical: 12, borderRadius: 16, alignItems: 'center', backgroundColor: rg.trackGain ? colors.accent : colors.card }]}
                    >
                      <Text style={[s.textXs, s.fontSemibold, { color: rg.trackGain ? colors.background : colors.textMuted }]}>
                        {t('audio.track.gain')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { rg.setAlbumGain(!rg.albumGain); }}
                      style={[s.flex1, { paddingVertical: 12, borderRadius: 16, alignItems: 'center', backgroundColor: rg.albumGain ? colors.accent : colors.card }]}
                    >
                      <Text style={[s.textXs, s.fontSemibold, { color: rg.albumGain ? colors.background : colors.textMuted }]}>
                        {t('audio.album.gain')}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Loudness Enhancer */}
          <View>
            <SectionHeader title={t('audio.loudness')} />
            <View style={[s.rounded3xl, s.overflowHidden, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.mb4]}>
                <View style={[s.flexRow, s.itemsCenter, s.gap2]}>
                  <Volume size={18} color={colors.accent} />
                  <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>{t('audio.loudness')}</Text>
                </View>
                <Switch
                  value={le.enabled}
                  onValueChange={le.setEnabled}
                  trackColor={{ false: colors.card, true: colors.accent }}
                  thumbColor="#fff"
                />
              </View>
              {le.enabled && (
                <>
                  <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.mb3]}>
                    <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>
                      {t('audio.loudness.level', { value: le.level })}
                    </Text>
                  </View>
                  <Slider
                    value={le.level / 12}
                    onValueChange={(val) => { const v = Math.round(val * 12); le.setLevel(v); }}
                    minimumValue={0}
                    maximumValue={1}
                    minimumTrackTintColor={colors.accent}
                    maximumTrackTintColor={colors.border}
                    thumbTintColor={colors.accent}
                    style={{ width: '100%', height: 40 }}
                  />
                  <View style={[s.flexRow, s.justifyBetween, s.px1]}>
                    <Text style={[s.textXs, { color: colors.textMuted }]}>Subtle</Text>
                    <Text style={[s.textXs, { color: colors.textMuted }]}>Maximum</Text>
                  </View>
                  <Text style={[s.textXs, s.mt2, { color: colors.textMuted }]}>
                    {t('audio.loudness.help')}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Reset */}
          <Pressable
            onPress={() => {
              Alert.alert(t('audio.reset'), t('audio.reset.confirm'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.reset'), style: 'destructive', onPress: () => { eq.reset(); rg.setEnabled(false); speed.setSpeed(1.0); le.setEnabled(false); le.setLevel(6); } },
              ]);
            }}
            style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 16, borderRadius: 24, backgroundColor: colors.surface }]}
          >
            <RotateCcw size={16} color={colors.textMuted} />
            <Text style={[s.textSm, s.fontMedium, { color: colors.textMuted }]}>{t('audio.reset')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
