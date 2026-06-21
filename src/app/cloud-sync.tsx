import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Switch, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { useCloudStore } from '@/store/cloud-store';
import { useMusicStore } from '@/store/music-store';
import { useToastStore } from '@/store/toast-store';
import {
  HardDrive, Cloud, Server, Check, Link2,
  Upload, Download, RefreshCw, Info, ChevronRight, Settings,
} from 'lucide-react-native';
import {
  CLOUD_PROVIDERS, exportBackup, importBackup, restoreFromBackup, collectBackupData,
} from '@/services/cloud-backup';
import { getProviders } from '@/services/cloud-providers';
import type { CloudProviderId } from '@/services/cloud-backup';

const PROVIDER_ICONS: Record<string, React.ComponentType<any>> = {
  'google-drive': HardDrive,
  'dropbox': Cloud,
  'mega': Server,
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
    googleClientId, dropboxAppKey,
    lastBackupTimestamp, autoBackup, autoBackupInterval,
    setGoogleCredentials, setDropboxCredentials,
    setLastBackup, setAutoBackup, setAutoBackupInterval,
    refreshConnectionStatus, isConnected, connectedProviders,
  } = useCloudStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [editGoogleId, setEditGoogleId] = useState(googleClientId);
  const [editDropboxKey, setEditDropboxKey] = useState(dropboxAppKey);

  const formatLastBackup = useCallback(() => {
    if (!lastBackupTimestamp) return 'Never';
    const diff = Date.now() - lastBackupTimestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }, [lastBackupTimestamp]);

  const handleConnect = async (id: CloudProviderId) => {
    if (isConnected(id)) {
      Alert.alert(
        'Disconnect Provider',
        `Disconnect from ${CLOUD_PROVIDERS.find((p) => p.id === id)?.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect', style: 'destructive', onPress: async () => {
              const providers = getProviders();
              const provider = providers.find((p) => p.id === id);
              if (provider) {
                await provider.revoke();
              }
              refreshConnectionStatus();
              showToast(`Disconnected from ${CLOUD_PROVIDERS.find((p) => p.id === id)?.name}`, 'check');
            },
          },
        ],
      );
    } else {
      if (id === 'google-drive' && !googleClientId) {
        Alert.alert('Configure First', 'Set your Google Drive Client ID in the settings first.');
        return;
      }
      if (id === 'dropbox' && !dropboxAppKey) {
        Alert.alert('Configure First', 'Set your Dropbox App Key in the settings first.');
        return;
      }

      const providers = getProviders();
      const provider = providers.find((p) => p.id === id);
      if (!provider) {
        showToast(`Provider not configured. Add credentials in settings.`, 'check');
        return;
      }

      const ok = await provider.authorize();
      if (ok) {
        refreshConnectionStatus();
        showToast(`Connected to ${CLOUD_PROVIDERS.find((p) => p.id === id)?.name}`, 'check');
      } else {
        showToast('Failed to connect. Check your credentials.', 'check');
      }
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
      } else {
        showToast('No backup method available', 'check');
      }
    } catch {
      showToast('Failed to create backup', 'check');
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
        showToast('No backup file selected or invalid format', 'check');
        return;
      }
      const success = await restoreFromBackup(data);
      if (success) {
        showToast(`Backup restored — ${data.metadata.songCount} songs, ${data.metadata.playlistCount} playlists`, 'check');
      } else {
        showToast('Failed to restore backup', 'check');
      }
    } catch {
      showToast('Failed to import backup', 'check');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveConfig = () => {
    setGoogleCredentials(editGoogleId);
    setDropboxCredentials(editDropboxKey);
    refreshConnectionStatus();
    setShowConfig(false);
    showToast('Credentials saved', 'check');
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

          {/* Credentials Config */}
          <Pressable
            onPress={() => setShowConfig(!showConfig)}
            style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, s.rounded3xl, { backgroundColor: colors.surface }]}
          >
            <Settings size={18} color={colors.textMuted} />
            <Text style={[s.flex1, s.textSm, s.fontMedium, { color: colors.text }]}>Provider Credentials</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>

          {showConfig && (
            <View style={[s.p4, s.rounded3xl, s.gap4, { backgroundColor: colors.surface }]}>
              <View>
                <Text style={[s.textXs, s.fontSemibold, s.mb1, { color: colors.textMuted }]}>Google Drive Client ID</Text>
                <TextInput
                  value={editGoogleId}
                  onChangeText={setEditGoogleId}
                  placeholder="xxxxxxxx-xxxx.apps.googleusercontent.com"
                  placeholderTextColor={colors.textMuted}
                  style={[s.textSm, s.px4, s.py3, s.roundedXl, { backgroundColor: colors.card, color: colors.text }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View>
                <Text style={[s.textXs, s.fontSemibold, s.mb1, { color: colors.textMuted }]}>Dropbox App Key</Text>
                <TextInput
                  value={editDropboxKey}
                  onChangeText={setEditDropboxKey}
                  placeholder="xxxxxxxxxxxxxxxxx"
                  placeholderTextColor={colors.textMuted}
                  style={[s.textSm, s.px4, s.py3, s.roundedXl, { backgroundColor: colors.card, color: colors.text }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Pressable
                onPress={handleSaveConfig}
                style={[s.px6, s.py3, s.roundedXl, s.itemsCenter, { backgroundColor: colors.accent }]}
              >
                <Text style={[s.textSm, s.fontSemibold, { color: '#000' }]}>Save Credentials</Text>
              </Pressable>
            </View>
          )}

          {/* Cloud Providers */}
          <View>
            <Text style={[s.textXs, s.fontSemibold, s.mb3, s.px1, { color: colors.textMuted }]}>
              CLOUD PROVIDERS
            </Text>
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              {CLOUD_PROVIDERS.map((provider, i) => {
                const Icon = PROVIDER_ICONS[provider.id] || Cloud;
                const connected = connectedProviders.includes(provider.id as CloudProviderId);
                const hasCreds = provider.id === 'google-drive' ? !!googleClientId
                  : provider.id === 'dropbox' ? !!dropboxAppKey
                  : false;
                return (
                  <Pressable
                    key={provider.id}
                    onPress={() => handleConnect(provider.id as CloudProviderId)}
                    style={[s.flexRow, s.itemsCenter, s.gap3, s.p4]}
                  >
                    <View style={[s.w11, s.h11, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: provider.color + '18' }]}>
                      <Icon size={20} color={provider.color} />
                    </View>
                    <View style={s.flex1}>
                      <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{provider.name}</Text>
                      <Text style={[s.textXs, s.mt05, { color: connected ? colors.accent : colors.textMuted }]}>
                        {connected ? 'Connected' : hasCreds ? 'Tap to connect' : 'Set credentials first'}
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
            {!googleClientId && !dropboxAppKey && (
              <Text style={[s.textXs, s.mt2, s.px1, { color: colors.textMuted }]}>
                Tap &ldquo;Provider Credentials&rdquo; above to enter your Google Drive Client ID or Dropbox App Key.
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
                style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { opacity: isExporting ? 0.5 : 1 }]}
              >
                <View style={[s.w11, s.h11, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                  <Upload size={20} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>
                    {isExporting ? 'Creating backup...' : 'Create Backup'}
                  </Text>
                  <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>
                    {connectedProviders.length > 0
                      ? `Upload to ${connectedProviders.length} connected provider(s)`
                      : lastBackupTimestamp
                        ? `Last backup: ${formatLastBackup()}`
                        : 'No backups yet'}
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
                    {connectedProviders.length > 0
                      ? 'Download latest backup from cloud'
                      : 'Pick a .json backup file'}
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
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.p4]}>
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
                  {INTERVAL_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => setAutoBackupInterval(opt.value as any)}
                      style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { paddingLeft: 56 }]}
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
              Your backup includes: playlists, favorites, play stats, equalizer & audio settings, theme, custom presets, and all app preferences. Song and video files themselves are not backed up — only your library metadata.
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
