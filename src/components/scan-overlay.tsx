import { View, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { CustomModal } from '@/components/custom-modal';
import { s } from '@/styles';

export function ScanOverlay() {
  const { colors } = useTheme();
  const scanStatus = useMusicStore((s) => s.scanStatus);
  const scanProgress = useMusicStore((s) => s.scanProgress);

  return (
    <CustomModal visible={scanStatus === 'scanning'} onRequestClose={() => {}} onBackdropPress={() => {}}>
      <View
        style={{
          width: 200,
          paddingVertical: 32,
          paddingHorizontal: 24,
          borderRadius: 24,
          backgroundColor: colors.surface,
          alignItems: 'center',
          gap: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[s.textSm, s.fontMedium, { color: colors.text, textAlign: 'center' }]}>
          Scanning...{' '}
          <Text style={{ color: colors.accent }}>{scanProgress?.processed ?? 0}</Text>
          {' '}files found
        </Text>
      </View>
    </CustomModal>
  );
}
