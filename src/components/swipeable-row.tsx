import { View, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { ListPlus, Heart, Trash2 } from 'lucide-react-native';

type SwipeAction = 'queue' | 'favorite' | 'remove';

interface SwipeActionConfig {
  type: SwipeAction;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftActions?: SwipeActionConfig[];
  rightActions?: SwipeActionConfig[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
}

const ACTION_WIDTH = 72;
const THRESHOLD = 60;

function SwipeActionButton({ type, onPress, colors }: { type: SwipeAction; onPress: () => void; colors: { accent: string; info: string; error: string } }) {
  const iconMap = {
    queue: { icon: ListPlus, color: colors.info },
    favorite: { icon: Heart, color: colors.error },
    remove: { icon: Trash2, color: colors.error },
  };
  const { icon: Icon, color } = iconMap[type];
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: ACTION_WIDTH,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color,
      }}
    >
      <Icon size={20} color="#fff" />
    </Pressable>
  );
}

export function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
}: SwipeableRowProps) {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);
  const isOpen = useSharedValue(false);
  const hasLeftActions = leftActions.length > 0;
  const hasRightActions = rightActions.length > 0;
  const maxTranslate = hasRightActions ? -ACTION_WIDTH * rightActions.length : 0;
  const minTranslate = hasLeftActions ? ACTION_WIDTH * leftActions.length : 0;

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      translateX.value = 0;
    })
    .onUpdate((e) => {
      const clamped = Math.max(
        hasLeftActions ? ACTION_WIDTH * leftActions.length : 0,
        Math.min(
          hasRightActions ? -ACTION_WIDTH * rightActions.length : 0,
          e.translationX,
        ),
      );
      translateX.value = clamped;
    })
    .onEnd((e) => {
      if (e.translationX > THRESHOLD && onSwipeRight) {
        runOnJS(onSwipeRight)();
        translateX.value = withTiming(0, { duration: 200 });
      } else if (e.translationX < -THRESHOLD && onSwipeLeft) {
        runOnJS(onSwipeLeft)();
        translateX.value = withTiming(0, { duration: 200 });
      } else {
        const absVx = Math.abs(e.translationX);
        if (absVx > ACTION_WIDTH / 2) {
          const snapTo = e.translationX > 0 ? minTranslate : maxTranslate;
          translateX.value = withSpring(snapTo, { damping: 20, stiffness: 200 });
          isOpen.value = snapTo !== 0;
        } else {
          translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
          isOpen.value = false;
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!hasLeftActions && !hasRightActions && !onSwipeLeft && !onSwipeRight) {
    return <>{children}</>;
  }

  return (
    <View style={{ overflow: 'hidden' }}>
      {hasLeftActions && (
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
          {leftActions.map((action, i) => (
            <SwipeActionButton key={i} type={action.type} onPress={action.onPress} colors={colors} />
          ))}
        </View>
      )}
      {hasRightActions && (
        <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
          {rightActions.map((action, i) => (
            <SwipeActionButton key={i} type={action.type} onPress={action.onPress} colors={colors} />
          ))}
        </View>
      )}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
