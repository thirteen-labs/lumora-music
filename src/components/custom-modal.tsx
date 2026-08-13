import { useEffect, useState, type ReactNode } from 'react';
import { View, Pressable } from 'react-native';
import { s } from '@/styles';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface CustomModalProps {
  visible: boolean;
  onRequestClose: () => void;
  onBackdropPress?: () => void;
  children: ReactNode;
  backdropOpacity?: number;
}

const ANIM_DURATION = 200;

export function CustomModal({
  visible,
  onRequestClose,
  onBackdropPress,
  children,
  backdropOpacity = 0.5,
}: CustomModalProps) {
  const [shouldRender, setShouldRender] = useState(visible);

  if (visible && !shouldRender) {
    setShouldRender(true);
  }

  const backdropOpacityValue = useSharedValue(0);
  const contentScale = useSharedValue(0.92);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacityValue.value = withTiming(1, { duration: ANIM_DURATION });
      contentScale.value = withTiming(1, { duration: ANIM_DURATION });
      contentOpacity.value = withTiming(1, { duration: ANIM_DURATION });
    } else {
      backdropOpacityValue.value = withTiming(0, { duration: ANIM_DURATION });
      contentScale.value = withTiming(0.92, { duration: ANIM_DURATION });
      contentOpacity.value = withTiming(0, { duration: ANIM_DURATION });
      const timer = setTimeout(() => setShouldRender(false), ANIM_DURATION);
      return () => clearTimeout(timer);
    }
  }, [visible, backdropOpacityValue, contentScale, contentOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacityValue.value * backdropOpacity,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }));

  if (!shouldRender) return null;

  const handleBackdropPress = () => {
    if (onBackdropPress) onBackdropPress();
    else onRequestClose();
  };

  return (
    <View style={[s.absolute, s.flex1, { left: 0, top: 0, right: 0, bottom: 0, zIndex: 1000 }]}>
      <Pressable
        onPress={handleBackdropPress}
        style={[s.absolute, s.flex1, { left: 0, top: 0, right: 0, bottom: 0 }]}
        accessibilityLabel="Close dialog"
        accessibilityRole={'button' as const}
      >
        <Animated.View style={[s.flex1, { backgroundColor: '#000' }, backdropStyle]} />
      </Pressable>
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { width: '100%' }]}>
        <Animated.View style={[s.itemsCenter, contentStyle]}>
          {children}
        </Animated.View>
      </View>
    </View>
  );
}