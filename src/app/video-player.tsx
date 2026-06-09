import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function VideoPlayerScreen() {
  const { colors } = useTheme();
  const { uri, title } = useLocalSearchParams<{ uri: string; title: string }>();

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#000' }}>
      <Text className="text-lg font-bold mb-4" style={{ color: colors.text }}>
        {title ?? 'Video'}
      </Text>
      <Text style={{ color: colors.textMuted }}>Video player coming soon</Text>
      <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>{uri}</Text>
    </View>
  );
}
