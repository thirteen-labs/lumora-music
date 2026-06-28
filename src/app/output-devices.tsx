import { View, Text, ScrollView, Pressable, Switch } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Smartphone, Ear, Headphones, Speaker } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOutputDevicesStore, DEVICE_CATEGORIES } from '@/store/output-devices-store';
import { EQUALIZER_PRESETS } from '@/store/equalizer-store';

export default function OutputDevicesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const devices = useOutputDevicesStore((s) => s.detectedDevices);
  const profiles = useOutputDevicesStore((s) => s.stabilizerProfiles);
  const activeId = useOutputDevicesStore((s) => s.activeDeviceId);
  const updateProfile = useOutputDevicesStore((s) => s.updateProfile);

  const categoryIcon: Record<string, any> = {
    phone_speakers: Smartphone,
    earphones: Ear,
    headphones: Headphones,
    speakers: Speaker,
    external_speakers: Speaker,
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Output Devices</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {DEVICE_CATEGORIES.map((cat, idx) => {
              const connectedDevices = devices.filter((d) => d.category === cat.key);
              const profile = profiles[cat.key] ?? { enabled: false, loudnessLevel: 6, eqPreset: 'flat' };
              const Icon = categoryIcon[cat.key];
              const isActive = connectedDevices.some((d) => d.id === activeId);
              const eqLabel = EQUALIZER_PRESETS.find((p) => p.key === profile.eqPreset)?.label ?? 'Flat';

              return (
                <View key={cat.key}>
                  <View style={[s.flexRow, s.itemsCenter, s.gap4, s.p4]}>
                    <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                      <Icon size={20} color={colors.accent} />
                    </View>
                    <View style={[s.flex1]}>
                      <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{cat.label}</Text>
                      {connectedDevices.length > 0 ? (
                        connectedDevices.map((device) => (
                          <Text key={device.id} style={[s.textXs, s.mt05, { color: colors.textMuted }]}>
                            {device.name} · {device.connectionType === 'bluetooth' ? 'Bluetooth' : device.connectionType === 'wired' ? 'Wired' : 'Built-in'}
                          </Text>
                        ))
                      ) : (
                        <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>No device connected</Text>
                      )}
                      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mt2]}>
                        <View style={[s.flexRow, s.itemsCenter, s.gap1]}>
                          <Text style={[s.textXs, { color: colors.textMuted }]}>Stabilizer</Text>
                          <Switch
                            value={profile.enabled}
                            onValueChange={(v) => updateProfile(cat.key, { enabled: v })}
                            trackColor={{ false: colors.card, true: colors.accent + '80' }}
                            thumbColor="#fff"
                          />
                        </View>
                        {profile.enabled && (
                          <>
                            <Text style={[s.textXs, { color: colors.textMuted }]}>Lvl {profile.loudnessLevel}</Text>
                            <Pressable
                              onPress={() => {
                                const currentIdx = EQUALIZER_PRESETS.findIndex((p) => p.key === profile.eqPreset);
                                const next = EQUALIZER_PRESETS[(currentIdx + 1) % EQUALIZER_PRESETS.length];
                                updateProfile(cat.key, { eqPreset: next.key });
                              }}
                              style={[{ backgroundColor: colors.accent + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }]}
                            >
                              <Text style={[s.textXs, { color: colors.accent }]}>{eqLabel}</Text>
                            </Pressable>
                          </>
                        )}
                      </View>
                    </View>
                    {isActive && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' }} />
                    )}
                  </View>
                  {idx < DEVICE_CATEGORIES.length - 1 && (
                    <View style={[s.h2px, { backgroundColor: colors.card, marginHorizontal: 16 }]} />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
