import { View, ViewProps, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/store/settings-store';

interface GlassViewProps extends ViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderRadius?: number;
  withBorder?: boolean;
  elevated?: boolean;
}

export function GlassView({
  children,
  style,
  intensity = 28,
  tint,
  borderRadius = 20,
  withBorder = true,
  elevated = false,
  ...props
}: GlassViewProps) {
  const { colors, isDark } = useTheme();
  const hasImage = !!useSettingsStore((s) => s.backgroundImage);
  const blurTint = tint ?? (isDark ? 'dark' : 'light');
  const effectiveIntensity = hasImage ? intensity : 0;

  return (
    <View
      style={[
        {
          borderRadius,
          overflow: 'hidden',
          backgroundColor: hasImage ? colors.surface : colors.surface,
          borderWidth: withBorder ? StyleSheet.hairlineWidth : 0,
          borderColor: hasImage ? colors.glassBorder : colors.border,
        },
        elevated && {
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.22 : 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        },
        style,
      ]}
      {...props}
    >
      {hasImage && effectiveIntensity > 4 ? (
        <BlurView
          intensity={effectiveIntensity}
          tint={blurTint}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export function SurfaceCard({
  children,
  style,
  ...props
}: ViewProps & { elevated?: boolean }) {
  const { colors } = useTheme();
  const hasImage = !!useSettingsStore((s) => s.backgroundImage);
  return (
    <GlassView
      intensity={hasImage ? 22 : 0}
      borderRadius={16}
      withBorder
      style={[{ backgroundColor: colors.card }, style]}
      {...props}
    >
      {children}
    </GlassView>
  );
}

export function AccentGlass({ children, style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.accentSoft,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.accent + '22',
          overflow: 'hidden',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
