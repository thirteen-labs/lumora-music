import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { useCloudStore } from '@/store/cloud-store';
import { useMusicStore } from '@/store/music-store';
import { usePlaylistStore } from '@/store/playlist-store';
import { useToastStore } from '@/store/toast-store';
import {
  HardDrive, Cloud, FolderOpen, Server, Check, Link2,
  Upload, Download, RefreshCw, Info, ChevronRight,
} from 'lucide-react-native';
import { CLOUD_PROVIDERS, exportBackup, importBackup, restoreFromBackup, collectBackupData } from '@/services/cloud-backup';
import type { CloudProviderId } from '@/services/cloud-backup';

const PROVIDER_ICONS: Record<string, React.ComponentType<any>> = {
  'google-drive': HardDrive,
  'dropbox': Cloud,
  'mega': FolderOpen,
  'onedrive': Cloud,
  'custom': Server,
};

const INTERVAL_OPTIONS: { value: string; label: string }[] = [
  { value: 'daily', label: 'Every Day' },
  { value: 'weekly', label: 'Every Week' },
  { value: 'monthly', label: 'Every Month' },
  { value: 'off', label: 'Manual Only' },
];

export default function CloudSyncScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const songs = useMusicStore((s) => s.songs);
  const showToast = useToastStore((s) => s.showToast);
  const {
    connectedProviders, lastBackupTimestamp, autoBackup, autoBackupInterval,
    connectProvider, disconnectProvider, isConnected, setLastBackup,
    setAutoBackup, setAutoBackupInterval,
  } = useCloudStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const formatLastBackup = useCallback(() => {
    if (!lastBackupTimestamp) return 'Never';
    const diff = Date.now() - lastBackupTimestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }, [lastBackupTimestamp]);

  const handleConnect = (id: CloudProviderId) => {
    if (isConnected(id)) {
      Alert.alert(
        'Disconnect Provider',
        `Disconnect ${CLOUD_PROVIDERS.find((p) => p.id === id)?.name}? Your backups will remain saved in the app data.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disconnect', style: 'destructive', onPress: () => disconnectProvider(id) },
        ],
      );
    } else {
      connectProvider(id);
      showToast('check', `Connected to ${CLOUD_PROVIDERS.find((p) => p.id === id)?.name}`);
    }
  };

  const handleExportBackup = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const data = await collectBackupData(songs);
      const success = await exportBackup(data);
      if (success) {
        setLastBackup(Date.now());
        showToast('check', 'Backup exported successfully');
      } else {
        showToast('check', 'Backup data ready — save via share sheet');
        setLastBackup(Date.now());
      }
    } catch {
      showToast('check', 'Failed to create backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const data = await importBackup();
      if (!data) {
        showToast('check', 'No backup file selected or invalid format');
        return;
      }
      const success = await restoreFromBackup(data);
      if (success) {
        showToast('check', `Backup restored — ${data.metadata.songCount} songs, ${data.metadata.playlistCount} playlists`);
      } else {
        showToast('check', 'Failed to restore backup');
      }
    } catch {
      showToast('check', 'Failed to import backup');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="Cloud Sync" showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap6]}>

          {/* Header */}
          <View style={[s.flexRow, s.itemsCenter, s.gap4, s.rounded3xl, s.p5, { backgroundColor: colors.surface }]}>
            <View style={[s.w16, s.h16, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '20' }]}>
              <Cloud size={32} color={colors.accent} />
            </View>
            <View style={s.flex1}>
              <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Cloud Backup & Sync</Text>
              <Text style={[s.textXs, s.mt05, { color: colors.textMuted, lineHeight: 18 }]}>
                Connect your cloud accounts to backup, restore, and sync your Lumora data.
              </Text>
            </View>
          </View>

          {/* Cloud Providers */}
          <View>
            <Text style={[s.textXs, s.fontSemibold, s.mb3, s.px1, { color: colors.textMuted }]}>
              CLOUD PROVIDERS
            </Text>
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              {CLOUD_PROVIDERS.map((provider, i) => {
                const Icon = PROVIDER_ICONS[provider.id] || Cloud;
                const connected = isConnected(provider.id as CloudProviderId);
                return (
                  <Pressable
                    key={provider.id}
                    onPress={() => handleConnect(provider.id as CloudProviderId)}
                    style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, {
                      borderBottomWidth: i < CLOUD_PROVIDERS.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }]}
                  >
                    <View style={[s.w11, s.h11, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: provider.color + '18' }]}>
                      <Icon size={20} color={provider.color} />
                    </View>
                    <View style={s.flex1}>
                      <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{provider.name}</Text>
                      <Text style={[s.textXs, s.mt05, { color: connected ? colors.accent : colors.textMuted }]}>
                        {connected ? 'Connected' : 'Tap to connect'}
                      </Text>
                    </View>
                    {connected ? (
                      <View style={[s.w9, s.h9, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '20' }]}>
                        <Check size={16} color={colors.accent} />
                      </View>
                    ) : (
                      <View style={[s.w9, s.h9, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.card }]}>
                        <Link2 size={16} color={colors.textMuted} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
            {connectedProviders.length === 0 && (
              <Text style={[s.textXs, s.mt2, s.px1, { color: colors.textMuted }]}>
                Connect at least one cloud provider to enable backup and sync features.
              </Text>
            )}
          </View>

          {/* Backup Actions */}
          <View>
            <Text style={[s.textXs, s.fontSemibold, s.mb3, s.px1, { color: colors.textMuted }]}>
              BACKUP & RESTORE
            </Text>
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              <Pressable
                onPress={handleExportBackup}
                disabled={isExporting}
                style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { borderBottomWidth: 1, borderBottomColor: colors.border, opacity: isExporting ? 0.5 : 1 }]}
              >
                <View style={[s.w11, s.h11, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                  <Upload size={20} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>
                    {isExporting ? 'Creating backup...' : 'Create Backup'}
                  </Text>
                  <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>
                    {lastBackupTimestamp ? `Last backup: ${formatLastBackup()}` : 'No backups yet'}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={handleImportBackup}
                disabled={isImporting}
                style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { opacity: isImporting ? 0.5 : 1 }]}
              >
                <View style={[s.w11, s.h11, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                  <Download size={20} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>
                    {isImporting ? 'Restoring...' : 'Restore from Backup'}
                  </Text>
                  <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>
                    Pick a .json backup file to restore
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Auto Backup */}
          <View>
            <Text style={[s.textXs, s.fontSemibold, s.mb3, s.px1, { color: colors.textMuted }]}>
              AUTO BACKUP
            </Text>
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[s.w11, s.h11, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                  <RefreshCw size={20} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>Auto Backup</Text>
                  <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>
                    Automatically backup your data on a schedule
                  </Text>
                </View>
                <Switch
                  value={autoBackup}
                  onValueChange={setAutoBackup}
                  trackColor={{ false: colors.card, true: colors.accent + '80' }}
                  thumbColor="#fff"
                />
              </View>
              {autoBackup && (
                <View>
                  {INTERVAL_OPTIONS.map((opt, i) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => setAutoBackupInterval(opt.value as any)}
                      style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, {
                        borderBottomWidth: i < INTERVAL_OPTIONS.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                        paddingLeft: 56,
                      }]}
                    >
                      <View style={[{ width: 32, height: 32 }, s.roundedFull, s.itemsCenter, s.justifyCenter, {
                        borderWidth: 2,
                        borderColor: autoBackupInterval === opt.value ? colors.accent : colors.border,
                      }]}>
                        {autoBackupInterval === opt.value && (
                          <View style={[{ width: 16, height: 16 }, s.roundedFull, { backgroundColor: colors.accent }]} />
                        )}
                      </View>
                      <Text style={[s.textSm, { color: colors.text }]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Data Summary */}
          <View style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
            <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mb2]}>
              <Info size={14} color={colors.textMuted} />
              <Text style={[s.textXs, s.fontSemibold, { color: colors.textMuted }]}>BACKUP DATA</Text>
            </View>
            <Text style={[s.textXs, { color: colors.textMuted, lineHeight: 20 }]}>
              Your backup includes:               playlists ({usePlaylistStore.getState().playlists.length}), favorites, play stats,
              equalizer & audio settings, theme, custom presets, and all app preferences.
              Song and video files themselves are not backed up — only your library metadata.
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
