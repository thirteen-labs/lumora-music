import { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useToastStore } from '@/store/toast-store';
import { Check, Heart, ListPlus, Music } from 'lucide-react-native';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  check: Check,
  heart: Heart,
  list: ListPlus,
  music: Music,
};

export function Toast() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(20));

  useEffect(() => {
    if (toasts.length > 0) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      translateY.setValue(20);
      opacity.setValue(0);
    }
  }, [toasts.length, opacity, translateY]);

  if (toasts.length === 0) return null;

  const toast = toasts[toasts.length - 1];
  const IconComponent = toast.icon ? ICON_MAP[toast.icon] : null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: insets.bottom + 100,
        left: 20,
        right: 20,
        alignItems: 'center',
        opacity,
        transform: [{ translateY }],
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surface,
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 12,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
        {IconComponent && <IconComponent size={16} color={colors.accent} />}
        <Text className="text-sm font-medium" style={{ color: colors.text }}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}
