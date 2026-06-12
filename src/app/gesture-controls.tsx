import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { Hand, Lock } from 'lucide-react-native';

export default function GestureControlsScreen() {
  const { colors } = useTheme();

  const gestures = [
    { gesture: 'Swipe Left/Right', action: 'Seek backward/forward 10s' },
    { gesture: 'Swipe Up (left side)', action: 'Increase brightness' },
    { gesture: 'Swipe Up (right side)', action: 'Increase volume' },
    { gesture: 'Swipe Down (left side)', action: 'Decrease brightness' },
    { gesture: 'Swipe Down (right side)', action: 'Decrease volume' },
    { gesture: 'Double Tap (left)', action: 'Rewind 10s' },
    { gesture: 'Double Tap (right)', action: 'Forward 10s' },
    { gesture: 'Pinch', action: 'Zoom in/out' },
    { gesture: 'Long Press', action: 'Playback speed control' },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Gesture Controls" showSettings={false} />
      <View className="flex-1 items-center justify-center px-8">
        <View className="rounded-full p-6 mb-6" style={{ backgroundColor: colors.surface }}>
          <Hand size={48} color={colors.accent} />
        </View>
        <Text className="text-2xl font-bold text-center" style={{ color: colors.text }}>
          Video Gesture Controls
        </Text>
        <Text className="text-sm text-center mt-3 leading-6" style={{ color: colors.textMuted }}>
          Intuitive swipe and tap gestures for controlling video playback.
        </Text>

        <View className="w-full mt-6 rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
          {gestures.map((g, i) => (
            <View
              key={g.gesture}
              className="flex-row items-center gap-3 p-4"
              style={{ borderBottomWidth: i < gestures.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
            >
              <Text className="text-sm font-semibold" style={{ color: colors.accent }}>{g.gesture}</Text>
              <Text className="text-xs ml-auto" style={{ color: colors.textMuted }}>{g.action}</Text>
            </View>
          ))}
        </View>

        <View className="rounded-3xl p-5 mt-6 w-full" style={{ backgroundColor: colors.surface }}>
          <View className="flex-row items-center gap-3 mb-3">
            <Lock size={16} color={colors.accent} />
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>Coming Soon</Text>
          </View>
          <Text className="text-xs leading-5" style={{ color: colors.textMuted }}>
            Gesture controls for the video player will be available in a future update with customizable sensitivity and action mapping.
          </Text>
        </View>
      </View>
    </View>
  );
}
