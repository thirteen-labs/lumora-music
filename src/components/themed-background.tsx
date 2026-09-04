import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export function ThemedBackground({ children, style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: colors.pageBackground }, style]} {...props}>
      {children}
    </View>
  );
}

export function ScrimOverlay({ opacity = 0.52 }: { opacity?: number }) {
  const { colors } = useTheme();
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity }]} pointerEvents="none" />;
}

export function SectionGlass({ children, style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.glassBorder,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
