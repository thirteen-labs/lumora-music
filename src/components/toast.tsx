import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useToastStore } from '@/store/toast-store';
import { Check, Heart, ListPlus, Music, Volume2, AlertCircle, EyeOff, Trash2 } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  check: Check,
  heart: Heart,
  list: ListPlus,
  music: Music,
  volume: Volume2,
  error: AlertCircle,
  'eye-off': EyeOff,
  'trash-2': Trash2,
};

export function Toast() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (toasts.length > 0) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
    } else {
      opacity.value = 0;
      translateY.value = 20;
    }
  }, [toasts.length, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (toasts.length === 0) return null;

  const toast = toasts[toasts.length - 1];
  const IconComponent = toast.icon ? ICON_MAP[toast.icon] : null;

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        bottom: insets.bottom + 100,
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 9999,
        pointerEvents: 'none',
      }, animatedStyle]}
      accessibilityRole={'alert' as const}
      accessibilityLiveRegion={'polite' as const}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surface,
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 12,
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        borderWidth: 1,
        borderColor: colors.border,
      }}>
        {IconComponent && <IconComponent size={16} color={colors.accent} />}
        <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}
