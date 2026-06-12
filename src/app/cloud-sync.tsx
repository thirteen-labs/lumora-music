import { View, Text } from 'react-native';
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
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Cloud Sync" showSettings={false} />
      <View className="flex-1 items-center justify-center px-8">
        <View className="rounded-full p-6 mb-6" style={{ backgroundColor: colors.surface }}>
          <Cloud size={48} color={colors.accent} />
        </View>
        <Text className="text-2xl font-bold text-center" style={{ color: colors.text }}>
          Cloud Backup & Sync
        </Text>
        <Text className="text-sm text-center mt-3 leading-6" style={{ color: colors.textMuted }}>
          Keep your music library data safe and synchronized across all your devices.
        </Text>

        <View className="w-full mt-6 gap-3">
          {features.map((feature) => (
            <View key={feature.title} className="rounded-3xl p-4" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center gap-3 mb-2">
                <feature.icon size={18} color={colors.accent} />
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>{feature.title}</Text>
              </View>
              <Text className="text-xs leading-5" style={{ color: colors.textMuted }}>{feature.description}</Text>
            </View>
          ))}
        </View>

        <View className="rounded-3xl p-5 mt-6 w-full" style={{ backgroundColor: colors.surface }}>
          <View className="flex-row items-center gap-3 mb-3">
            <Lock size={16} color={colors.accent} />
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>Coming Soon</Text>
          </View>
          <Text className="text-xs leading-5" style={{ color: colors.textMuted }}>
            Cloud features require account creation and will be end-to-end encrypted. Your data stays private. Available in a future update.
          </Text>
        </View>
      </View>
    </View>
  );
}
