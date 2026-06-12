import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { Captions, Lock } from 'lucide-react-native';

export default function OnlineSubtitlesScreen() {
  const { colors } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Subtitle Downloader" showSettings={false} />
      <View className="flex-1 items-center justify-center px-8">
        <View className="rounded-full p-6 mb-6" style={{ backgroundColor: colors.surface }}>
          <Captions size={48} color={colors.accent} />
        </View>
        <Text className="text-2xl font-bold text-center" style={{ color: colors.text }}>
          Subtitle Downloading
        </Text>
        <Text className="text-sm text-center mt-3 leading-6" style={{ color: colors.textMuted }}>
          Download subtitles from online sources for your video files. Support for SRT, ASS, VTT formats with automatic language detection.
        </Text>
        <View className="rounded-3xl p-5 mt-6 w-full" style={{ backgroundColor: colors.surface }}>
          <View className="flex-row items-center gap-3 mb-3">
            <Lock size={16} color={colors.accent} />
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>Coming Soon</Text>
          </View>
          <Text className="text-xs leading-5" style={{ color: colors.textMuted }}>
            This feature requires an internet connection and integration with online subtitle databases. It will be available in a future update.
          </Text>
        </View>
        <Text className="text-xs mt-4" style={{ color: colors.textMuted }}>
          Supported formats: SRT, ASS, VTT, SSA
        </Text>
      </View>
    </View>
  );
}
