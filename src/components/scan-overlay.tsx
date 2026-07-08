import { View, Text, Modal, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { s } from '@/styles';

export function ScanOverlay() {
  const { colors } = useTheme();
  const scanStatus = useMusicStore((s) => s.scanStatus);
  const scanProgress = useMusicStore((s) => s.scanProgress);

  if (scanStatus !== 'scanning') return null;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
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
      </View>
    </Modal>
  );
}
