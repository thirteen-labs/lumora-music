import { View, Text } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { Captions, Lock } from 'lucide-react-native';

export default function OnlineSubtitlesScreen() {
  const { colors } = useTheme();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="Subtitle Downloader" showSettings={false} />
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, s.px8]}>
        <View style={[s.roundedFull, { padding: 24, marginBottom: 24, backgroundColor: colors.surface }]}>
          <Captions size={48} color={colors.accent} />
        </View>
        <Text style={[s.text2xl, s.fontBold, s.textCenter, { color: colors.text }]}>
          Subtitle Downloading
        </Text>
        <Text style={[s.textSm, s.textCenter, s.mt3, { color: colors.textMuted, lineHeight: 24 }]}>
          Download subtitles from online sources for your video files. Support for SRT, ASS, VTT formats with automatic language detection.
        </Text>
        <View style={[s.rounded3xl, s.p5, s.mt6, s.wFull, { backgroundColor: colors.surface }]}>
          <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb3]}>
            <Lock size={16} color={colors.accent} />
            <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>Coming Soon</Text>
          </View>
          <Text style={[s.textXs, { color: colors.textMuted, lineHeight: 20 }]}>
            This feature requires an internet connection and integration with online subtitle databases. It will be available in a future update.
          </Text>
        </View>
        <Text style={[s.textXs, s.mt4, { color: colors.textMuted }]}>
          Supported formats: SRT, ASS, VTT, SSA
        </Text>
      </View>
    </View>
  );
}
