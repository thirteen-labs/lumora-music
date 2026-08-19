import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { Artwork } from '@/components/artwork';
import { useEqualizerStore, EQUALIZER_PRESETS } from '@/store/equalizer-store';
import { usePlayerStore } from '@/store/player-store';
import { usePlaybackSpeedStore } from '@/store/playback-speed-store';
import { useLoudnessEnhancerStore } from '@/store/loudness-enhancer-store';
import { useReplayGainStore } from '@/store/replay-gain-store';
import Slider from '@react-native-community/slider';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import {
  AudioLines, Volume2, Gauge, Music, Power,
  RotateCcw, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { useState, useMemo, useCallback } from 'react';

const { width: SCREEN_W } = Dimensions.get('window');
const EQ_HEIGHT = 140;
const EQ_PADDING = 20;

function getEQCurvePath(bands: { frequency: number; gain: number }[], width: number, height: number): string {
  const maxGain = 12;
  const points = bands.map((band, i) => {
    const x = (i / (bands.length - 1)) * width;
    const normalizedGain = (band.gain + maxGain) / (maxGain * 2);
    const y = height - normalizedGain * height;
    return { x, y };
  });

  if (points.length < 2) return '';

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

function EQCurve({ bands, width, height, color }: { bands: { frequency: number; gain: number }[]; width: number; height: number; color: string }) {
  const path = useMemo(() => getEQCurvePath(bands, width, height), [bands, width, height]);
  const fillPath = useMemo(() => {
    if (!path) return '';
    return `${path} L ${width} ${height} L 0 ${height} Z`;
  }, [path, width, height]);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={color} stopOpacity="0.05" />
        </LinearGradient>
      </Defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((ratio) => (
        <Path
          key={ratio}
          d={`M 0 ${height * ratio} L ${width} ${height * ratio}`}
          stroke={color}
          strokeOpacity={0.1}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      ))}
      {/* Center line (0 dB) */}
      <Path
        d={`M 0 ${height / 2} L ${width} ${height / 2}`}
        stroke={color}
        strokeOpacity={0.2}
        strokeWidth={1}
      />
      {/* Fill area */}
      <Path d={fillPath} fill="url(#eqFill)" />
      {/* Curve line */}
      <Path d={path} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      {/* Band dots */}
      {bands.map((band, i) => {
        const x = (i / (bands.length - 1)) * width;
        const normalizedGain = (band.gain + 12) / 24;
        const y = height - normalizedGain * height;
        return <Circle key={i} cx={x} cy={y} r={4} fill={color} />;
      })}
    </Svg>
  );
}

export default function EqualizerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const eq = useEqualizerStore();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const speed = usePlaybackSpeedStore();
  const le = useLoudnessEnhancerStore();
  const rg = useReplayGainStore();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const eqWidth = SCREEN_W - EQ_PADDING * 2;

  const handleReset = useCallback(() => {
    eq.reset();
  }, [eq]);

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <TopBar title={t('audio.equalizer')} showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap5]}>

          {/* Now Playing Card */}
          {currentTrack && (
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.p4]}>
                <View style={[s.rounded2xl, s.overflowHidden, { backgroundColor: colors.card }]}>
                  <Artwork uri={currentTrack.artwork} size={56} borderRadius={16} iconSize={22} iconColor={colors.accent} backgroundColor="transparent" />
                </View>
                <View style={[s.flex1]}>
                  <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>
                    {currentTrack.title}
                  </Text>
                  <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>
                    {currentTrack.artist}
                  </Text>
                </View>
                <View style={[s.itemsCenter, s.justifyCenter]}>
                  {isPlaying && (
                    <View style={[s.w8, s.h8, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '20' }]}>
                      <AudioLines size={16} color={colors.accent} />
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* EQ Toggle */}
          <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
            <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.p4]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap2]}>
                <Power size={18} color={eq.enabled ? colors.accent : colors.textMuted} />
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>
                  {t('audio.equalizer.10band')}
                </Text>
              </View>
              <Pressable
                onPress={() => eq.setEnabled(!eq.enabled)}
                style={[s.w14, s.h8, s.roundedFull, s.itemsCenter, s.justifyCenter, {
                  backgroundColor: eq.enabled ? colors.accent : colors.card,
                }]}
              >
                <View style={[s.w6, s.h6, s.roundedFull, {
                  backgroundColor: '#fff',
                  marginLeft: eq.enabled ? 24 : -24,
                }]} />
              </Pressable>
            </View>
          </View>

          {/* EQ Visual Curve */}
          {eq.enabled && (
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface, padding: EQ_PADDING }]}>
              <EQCurve bands={eq.bands} width={eqWidth} height={EQ_HEIGHT} color={colors.accent} />
              <View style={[s.flexRow, s.justifyBetween, s.px1, s.mt2]}>
                {eq.bands.map((band) => (
                  <Text key={band.frequency} style={[s.text9, { color: colors.textMuted, width: 24, textAlign: 'center' }]}>
                    {band.frequency >= 1000 ? `${band.frequency / 1000}k` : band.frequency}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* Quick Presets */}
          {eq.enabled && (
            <View>
              <Text style={[s.textXs, s.fontBold, s.uppercase, { letterSpacing: 1, color: colors.textMuted }, s.mb3]}>
                {t('audio.presets')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {EQUALIZER_PRESETS.filter((p) => p.key !== 'custom').map((preset) => (
                  <Pressable
                    key={preset.key}
                    onPress={() => eq.setPreset(preset.key)}
                    style={[{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, backgroundColor: eq.preset === preset.key ? colors.accent : colors.surface }]}
                  >
                    <Text style={[s.textSm, s.fontSemibold, { color: eq.preset === preset.key ? colors.background : colors.textMuted }]}>
                      {preset.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Band Sliders */}
          {eq.enabled && (
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.p4, s.pb2]}>
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>
                  Frequency Bands
                </Text>
                <Text style={[s.textXs, { color: colors.textMuted }]}>
                  {eq.preset === 'custom' ? 'Custom' : EQUALIZER_PRESETS.find((p) => p.key === eq.preset)?.label ?? 'Custom'}
                </Text>
              </View>
              <View style={[s.gap1, s.px4, s.pb4]}>
                {eq.bands.map((band, i) => (
                  <View key={band.frequency} style={[s.flexRow, s.itemsCenter, s.gap2]}>
                    <Text style={[s.textXs, { width: 32, color: colors.textMuted, fontVariant: ['tabular-nums'] }]}>
                      {band.frequency >= 1000 ? `${band.frequency / 1000}k` : band.frequency}
                    </Text>
                    <Slider
                      value={(band.gain + 12) / 24}
                      onValueChange={(val) => eq.setBandGain(i, Math.round((val * 24 - 12) * 2) / 2)}
                      minimumValue={0}
                      maximumValue={1}
                      minimumTrackTintColor={colors.accent}
                      maximumTrackTintColor={colors.border}
                      thumbTintColor={colors.accent}
                      style={{ flex: 1, height: 28 }}
                    />
                    <Text style={[s.textXs, { width: 28, textAlign: 'right', color: band.gain >= 0 ? colors.accent : colors.textMuted, fontVariant: ['tabular-nums'] }]}>
                      {band.gain > 0 ? '+' : ''}{band.gain}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Bass Boost */}
          {eq.enabled && (
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap2, s.p4, s.pb2]}>
                <Volume2 size={18} color={colors.accent} />
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>
                  {t('audio.bass.boost')}
                </Text>
                <Text style={[s.textXs, { color: colors.textMuted, marginLeft: 'auto' }]}>
                  Level {eq.bassBoost}
                </Text>
              </View>
              <View style={[s.px4, s.pb4]}>
                <Slider
                  value={eq.bassBoost / 12}
                  onValueChange={(val) => eq.setBassBoost(Math.round(val * 12))}
                  minimumValue={0}
                  maximumValue={1}
                  minimumTrackTintColor={colors.accent}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.accent}
                  style={{ width: '100%', height: 32 }}
                />
                <View style={[s.flexRow, s.justifyBetween, s.px1]}>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>Off</Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>Max</Text>
                </View>
              </View>
            </View>
          )}

          {/* Balance */}
          {eq.enabled && (
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap2, s.p4, s.pb2]}>
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>
                  {t('audio.balance')}
                </Text>
                <Text style={[s.textXs, { color: colors.textMuted, marginLeft: 'auto' }]}>
                  {eq.balance === 0 ? t('audio.balance.center') : eq.balance < 0 ? `L ${Math.abs(eq.balance)}` : `R ${eq.balance}`}
                </Text>
              </View>
              <View style={[s.px4, s.pb4]}>
                <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.mb1]}>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>L</Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>R</Text>
                </View>
                <Slider
                  value={(eq.balance + 10) / 20}
                  onValueChange={(val) => eq.setBalance(Math.round((val * 20 - 10) * 2) / 2)}
                  minimumValue={0}
                  maximumValue={1}
                  minimumTrackTintColor={colors.accent}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.accent}
                  style={{ width: '100%', height: 32 }}
                />
              </View>
            </View>
          )}

          {/* Advanced Section Toggle */}
          {eq.enabled && (
            <Pressable
              onPress={() => setShowAdvanced(!showAdvanced)}
              style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}
            >
              <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.p4]}>
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>Advanced Audio</Text>
                {showAdvanced ? (
                  <ChevronUp size={18} color={colors.textMuted} />
                ) : (
                  <ChevronDown size={18} color={colors.textMuted} />
                )}
              </View>
            </Pressable>
          )}

          {/* Advanced Settings */}
          {eq.enabled && showAdvanced && (
            <>
              {/* Playback Speed */}
              <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                <View style={[s.flexRow, s.itemsCenter, s.gap2, s.p4, s.pb2]}>
                  <Gauge size={18} color={colors.accent} />
                  <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>
                    {t('audio.speed')}
                  </Text>
                  <Text style={[s.textXs, { color: colors.textMuted, marginLeft: 'auto' }]}>
                    {speed.speed.toFixed(2)}x
                  </Text>
                </View>
                <View style={[s.flexRow, s.flexWrap, s.gap2, s.px4, s.pb4]}>
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((sp) => (
                    <Pressable
                      key={sp}
                      onPress={() => speed.setSpeed(sp)}
                      style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: speed.speed === sp ? colors.accent : colors.card }]}
                    >
                      <Text style={[s.textXs, s.fontSemibold, { color: speed.speed === sp ? colors.background : colors.textMuted }]}>
                        {sp.toFixed(2)}x
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Loudness Enhancer */}
              <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.p4, s.pb2]}>
                  <View style={[s.flexRow, s.itemsCenter, s.gap2]}>
                    <Volume2 size={18} color={colors.accent} />
                    <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>
                      {t('audio.loudness')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => le.setEnabled(!le.enabled)}
                    style={[s.w12, s.h7, s.roundedFull, s.itemsCenter, s.justifyCenter, {
                      backgroundColor: le.enabled ? colors.accent : colors.card,
                    }]}
                  >
                    <View style={[s.w5, s.h5, s.roundedFull, {
                      backgroundColor: '#fff',
                      marginLeft: le.enabled ? 20 : -20,
                    }]} />
                  </Pressable>
                </View>
                {le.enabled && (
                  <View style={[s.px4, s.pb4]}>
                    <Slider
                      value={le.level / 12}
                      onValueChange={(val) => le.setLevel(Math.round(val * 12))}
                      minimumValue={0}
                      maximumValue={1}
                      minimumTrackTintColor={colors.accent}
                      maximumTrackTintColor={colors.border}
                      thumbTintColor={colors.accent}
                      style={{ width: '100%', height: 32 }}
                    />
                    <View style={[s.flexRow, s.justifyBetween, s.px1]}>
                      <Text style={[s.textXs, { color: colors.textMuted }]}>Subtle</Text>
                      <Text style={[s.textXs, { color: colors.textMuted }]}>{le.level}</Text>
                      <Text style={[s.textXs, { color: colors.textMuted }]}>Max</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* ReplayGain */}
              <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.p4, s.pb2]}>
                  <View style={[s.flexRow, s.itemsCenter, s.gap2]}>
                    <Music size={18} color={colors.accent} />
                    <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>
                      {t('audio.replaygain')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => rg.setEnabled(!rg.enabled)}
                    style={[s.w12, s.h7, s.roundedFull, s.itemsCenter, s.justifyCenter, {
                      backgroundColor: rg.enabled ? colors.accent : colors.card,
                    }]}
                  >
                    <View style={[s.w5, s.h5, s.roundedFull, {
                      backgroundColor: '#fff',
                      marginLeft: rg.enabled ? 20 : -20,
                    }]} />
                  </Pressable>
                </View>
                {rg.enabled && (
                  <View style={[s.px4, s.pb4, s.gap3]}>
                    <View>
                      <Text style={[s.textXs, s.mb1, { color: colors.textMuted }]}>
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
                        style={{ width: '100%', height: 28 }}
                      />
                    </View>
                    <View style={[s.flexRow, s.gap2]}>
                      <Pressable
                        onPress={() => rg.setTrackGain(!rg.trackGain)}
                        style={[s.flex1, { paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: rg.trackGain ? colors.accent : colors.card }]}
                      >
                        <Text style={[s.textXs, s.fontSemibold, { color: rg.trackGain ? colors.background : colors.textMuted }]}>
                          {t('audio.track.gain')}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => rg.setAlbumGain(!rg.albumGain)}
                        style={[s.flex1, { paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: rg.albumGain ? colors.accent : colors.card }]}
                      >
                        <Text style={[s.textXs, s.fontSemibold, { color: rg.albumGain ? colors.background : colors.textMuted }]}>
                          {t('audio.album.gain')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Reset Button */}
          {eq.enabled && (
            <Pressable
              onPress={handleReset}
              style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 16, borderRadius: 24, backgroundColor: colors.surface }]}
            >
              <RotateCcw size={16} color={colors.textMuted} />
              <Text style={[s.textSm, s.fontMedium, { color: colors.textMuted }]}>{t('audio.reset')}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
      <MiniPlayer />
    </View>
  );
}
