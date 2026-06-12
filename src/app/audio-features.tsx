import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useEqualizerStore, EQUALIZER_PRESETS } from '@/store/equalizer-store';
import { useReplayGainStore } from '@/store/replay-gain-store';
import { usePlaybackSpeedStore, SPEED_OPTIONS } from '@/store/playback-speed-store';
import Slider from '@react-native-community/slider';
import {
  Music, Gauge, Volume2, AudioLines, RotateCcw,
} from 'lucide-react-native';

export default function AudioFeaturesScreen() {
  const { colors } = useTheme();
  const eq = useEqualizerStore();
  const rg = useReplayGainStore();
  const speed = usePlaybackSpeedStore();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Audio Features" showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-6">
          {/* Equalizer */}
          <View>
            <SectionHeader title="Equalizer" />
            <View className="rounded-3xl overflow-hidden p-4" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-2">
                  <AudioLines size={18} color={colors.accent} />
                  <Text className="text-sm font-semibold" style={{ color: colors.text }}>10-Band Equalizer</Text>
                </View>
                <Pressable
                  onPress={() => eq.setEnabled(!eq.enabled)}
                  className="w-14 h-8 rounded-full items-center justify-end px-1"
                  style={{ backgroundColor: eq.enabled ? colors.accent : colors.card }}
                >
                  <View
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: '#fff', transform: [{ translateX: eq.enabled ? 0 : -22 }] }}
                  />
                </Pressable>
              </View>

              {eq.enabled && (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-1">
                    {EQUALIZER_PRESETS.map((preset) => (
                      <Pressable
                        key={preset.key}
                        onPress={() => eq.setPreset(preset.key)}
                        className="px-4 py-2 rounded-full mx-1"
                        style={{
                          backgroundColor: eq.preset === preset.key ? colors.accent : colors.card,
                        }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: eq.preset === preset.key ? colors.background : colors.textMuted }}
                        >
                          {preset.label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <View className="flex-row items-end justify-between gap-1 mb-4" style={{ height: 140 }}>
                    {eq.bands.map((band, i) => (
                      <View key={band.frequency} className="flex-1 items-center">
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
                        <Text className="text-[9px] mt-1" style={{ color: colors.textMuted }}>
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
            <SectionHeader title="Bass Boost" />
            <View className="rounded-3xl overflow-hidden p-4" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center gap-2 mb-3">
                <Volume2 size={18} color={colors.accent} />
                <Text className="text-sm font-medium" style={{ color: colors.text }}>
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
              <View className="flex-row justify-between px-1">
                <Text className="text-xs" style={{ color: colors.textMuted }}>Off</Text>
                <Text className="text-xs" style={{ color: colors.textMuted }}>Max</Text>
              </View>
            </View>
          </View>

          {/* Audio Balance */}
          <View>
            <SectionHeader title="Audio Balance" />
            <View className="rounded-3xl overflow-hidden p-4" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm font-medium" style={{ color: colors.text }}>L</Text>
                <Text className="text-sm font-medium" style={{ color: colors.text }}>
                  {eq.balance === 0 ? 'Center' : eq.balance < 0 ? `Left ${Math.abs(eq.balance)}` : `Right ${eq.balance}`}
                </Text>
                <Text className="text-sm font-medium" style={{ color: colors.text }}>R</Text>
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
            <SectionHeader title="Playback Speed" />
            <View className="rounded-3xl overflow-hidden p-4" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center gap-2 mb-4">
                <Gauge size={18} color={colors.accent} />
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                  {speed.speed.toFixed(2)}x
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {SPEED_OPTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => speed.setSpeed(s)}
                    className="px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: speed.speed === s ? colors.accent : colors.card,
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: speed.speed === s ? colors.background : colors.textMuted }}
                    >
                      {s.toFixed(2)}x
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>Pitch Correction</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                    Maintain pitch at different speeds
                  </Text>
                </View>
                <Pressable
                  onPress={() => speed.togglePitchCorrection()}
                  className="w-14 h-8 rounded-full items-center justify-end px-1"
                  style={{ backgroundColor: speed.pitchCorrection ? colors.accent : colors.card }}
                >
                  <View
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: '#fff', transform: [{ translateX: speed.pitchCorrection ? 0 : -22 }] }}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          {/* ReplayGain */}
          <View>
            <SectionHeader title="Volume Normalization" />
            <View className="rounded-3xl overflow-hidden p-4" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-2">
                  <Music size={18} color={colors.accent} />
                  <Text className="text-sm font-semibold" style={{ color: colors.text }}>ReplayGain</Text>
                </View>
                <Pressable
                  onPress={() => rg.setEnabled(!rg.enabled)}
                  className="w-14 h-8 rounded-full items-center justify-end px-1"
                  style={{ backgroundColor: rg.enabled ? colors.accent : colors.card }}
                >
                  <View
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: '#fff', transform: [{ translateX: rg.enabled ? 0 : -22 }] }}
                  />
                </Pressable>
              </View>

              {rg.enabled && (
                <>
                  <View className="mb-4">
                    <Text className="text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Preamp: {rg.preamp > 0 ? '+' : ''}{rg.preamp} dB
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
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => { rg.setTrackGain(!rg.trackGain); }}
                      className="flex-1 py-3 rounded-2xl items-center"
                      style={{ backgroundColor: rg.trackGain ? colors.accent : colors.card }}
                    >
                      <Text className="text-xs font-semibold" style={{ color: rg.trackGain ? colors.background : colors.textMuted }}>
                        Track Gain
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { rg.setAlbumGain(!rg.albumGain); }}
                      className="flex-1 py-3 rounded-2xl items-center"
                      style={{ backgroundColor: rg.albumGain ? colors.accent : colors.card }}
                    >
                      <Text className="text-xs font-semibold" style={{ color: rg.albumGain ? colors.background : colors.textMuted }}>
                        Album Gain
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Reset */}
          <Pressable
            onPress={() => {
              Alert.alert('Reset Audio', 'Reset all audio settings to defaults?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => { eq.reset(); rg.setEnabled(false); speed.setSpeed(1.0); } },
              ]);
            }}
            className="flex-row items-center justify-center gap-2 py-4 rounded-3xl"
            style={{ backgroundColor: colors.surface }}
          >
            <RotateCcw size={16} color={colors.textMuted} />
            <Text className="text-sm font-medium" style={{ color: colors.textMuted }}>Reset All Audio Settings</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
