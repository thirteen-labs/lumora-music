import { View, Text } from 'react-native';
import type { ThemeColors } from '@/types/theme';

export function LyricsBadge({ colors, show, size }: { colors: ThemeColors; show?: boolean; size?: number }) {
  if (!show) return null;
  return (
    <View
      style={{
        backgroundColor: colors.accent + '20',
        borderRadius: 6,
        paddingHorizontal: size ?? 6,
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: size ? size - 3 : 9, fontWeight: '700', color: colors.accent }}>Lyrics</Text>
    </View>
  );
}
