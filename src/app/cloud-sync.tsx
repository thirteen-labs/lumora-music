import { View, Text } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { Upload, Download, RefreshCw, Lock, Cloud } from 'lucide-react-native';

export default function CloudSyncScreen() {
  const { colors } = useTheme();

  const features = [
    {
      icon: Upload,
      title: 'Backup',
      description: 'Backup your playlists, favorites, play counts, and settings to the cloud.',
    },
    {
      icon: Download,
      title: 'Restore',
      description: 'Restore your data from a previous backup to any device.',
    },
    {
      icon: RefreshCw,
      title: 'Sync',
      description: 'Keep your playlists, favorites, and settings synchronized across all your devices.',
    },
  ];

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="Cloud Sync" showSettings={false} />
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, s.px8]}>
        <View style={[s.roundedFull, { padding: 24, marginBottom: 24, backgroundColor: colors.surface }]}>
          <Cloud size={48} color={colors.accent} />
        </View>
        <Text style={[s.text2xl, s.fontBold, s.textCenter, { color: colors.text }]}>
          Cloud Backup & Sync
        </Text>
        <Text style={[s.textSm, s.textCenter, s.mt3, { color: colors.textMuted, lineHeight: 24 }]}>
          Keep your music library data safe and synchronized across all your devices.
        </Text>

        <View style={[s.wFull, s.mt6, s.gap3]}>
          {features.map((feature) => (
            <View key={feature.title} style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb2]}>
                <feature.icon size={18} color={colors.accent} />
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>{feature.title}</Text>
              </View>
              <Text style={[s.textXs, { color: colors.textMuted, lineHeight: 20 }]}>{feature.description}</Text>
            </View>
          ))}
        </View>

        <View style={[s.rounded3xl, s.p5, s.mt6, s.wFull, { backgroundColor: colors.surface }]}>
          <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb3]}>
            <Lock size={16} color={colors.accent} />
            <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>Coming Soon</Text>
          </View>
          <Text style={[s.textXs, { color: colors.textMuted, lineHeight: 20 }]}>
            Cloud features require account creation and will be end-to-end encrypted. Your data stays private. Available in a future update.
          </Text>
        </View>
      </View>
    </View>
  );
}
