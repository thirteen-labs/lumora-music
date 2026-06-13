import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import {
  findDuplicateSongs,
  findMissingFiles,
  getKnownFiles,
  findNewFiles,
  findRemovedFiles,
  getScanHistory,
  updateKnownFiles,
} from '@/scanner/enhanced-scanner';
import { useMusicStore } from '@/store/music-store';
import { TriangleAlert, CircleCheck, Music, Trash2, Search, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';

export default function LibraryToolsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const songs = useMusicStore((s) => s.songs);
  const [missingCount, setMissingCount] = useState<number | null>(null);
  const [scanInfo, setScanInfo] = useState<{ newFiles: number; removedFiles: number } | null>(null);

  const duplicates = findDuplicateSongs(songs);
  const scanHistory = getScanHistory();

  const checkMissingFiles = () => {
    const knownUris = new Set(Object.keys(getKnownFiles()));
    const missing = findMissingFiles(songs, knownUris);
    setMissingCount(missing.length);
    Alert.alert(
      t('tools.missing'),
      missing.length > 0
        ? t('tools.missing.found', { count: missing.length })
        : t('tools.missing.none'),
    );
  };

  const checkIncrementalScan = () => {
    const currentUris = songs.map((s) => s.id);
    const newFiles = findNewFiles(currentUris);
    const removedFiles = findRemovedFiles(currentUris);
    setScanInfo({ newFiles: newFiles.length, removedFiles: removedFiles.length });
    Alert.alert(
      t('tools.incremental'),
      t('tools.changes', { newFiles: newFiles.length, removedFiles: removedFiles.length }),
    );
  };

  const updateScanIndex = () => {
    updateKnownFiles(songs);
    Alert.alert(t('common.ok'), 'Scan index updated with current library.');
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title={t('tools.title')} showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-6">
          {/* Library Health */}
          <View>
            <SectionHeader title={t('tools.health')} />
            <View className="rounded-3xl overflow-hidden p-4 gap-3" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center gap-3">
                <CircleCheck size={20} color={colors.success} />
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>{t('tools.total.songs')}</Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>{t('tools.tracks.in.library', { count: songs.length })}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3">
                <TriangleAlert size={20} color={duplicates.length > 0 ? '#F59E0B' : colors.success} />
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>Duplicate Detection</Text>
                  <Text className="text-xs" style={{ color: colors.textMuted }}>
                    {duplicates.length > 0 ? t('tools.duplicates.found', { count: duplicates.length }) : t('tools.no.duplicates')}
                  </Text>
                </View>
              </View>
              {scanHistory.lastFullScan > 0 && (
                <View className="flex-row items-center gap-3">
                  <RefreshCw size={20} color={colors.accent} />
                  <View className="flex-1">
                    <Text className="text-sm font-medium" style={{ color: colors.text }}>Last Scan</Text>
                    <Text className="text-xs" style={{ color: colors.textMuted }}>
                      {new Date(scanHistory.lastFullScan).toLocaleDateString()} · {scanHistory.fileCount} files indexed
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Duplicates */}
          {duplicates.length > 0 && (
            <View>
              <SectionHeader title={t('tools.duplicates')} />
              <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
                {duplicates.slice(0, 20).map((group, i) => (
                  <View
                    key={i}
                    className="p-4"
                    style={{ borderBottomWidth: i < duplicates.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                  >
                    <View className="flex-row items-center gap-2 mb-2">
                      <Music size={14} color={colors.accent} />
                      <Text className="text-sm font-medium flex-1" style={{ color: colors.text }} numberOfLines={1}>
                        {group.song.title}
                      </Text>
                      <Text className="text-xs" style={{ color: colors.textMuted }}>
                        {t('tools.copy', { count: group.duplicates.length + 1 })}
                      </Text>
                    </View>
                    <Text className="text-xs" style={{ color: colors.textMuted }}>
                      by {group.song.artist} · {group.song.album}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Missing Files */}
          <View>
            <SectionHeader title={t('tools.missing')} />
            <View className="rounded-3xl p-4 gap-3" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm" style={{ color: colors.text }}>
                {t('tools.missing.desc')}
              </Text>
              <Pressable
                onPress={checkMissingFiles}
                className="flex-row items-center justify-center gap-2 py-3 rounded-2xl"
                style={{ backgroundColor: colors.accent }}
              >
                <Trash2 size={16} color={colors.background} />
                <Text className="text-sm font-semibold" style={{ color: colors.background }}>
                  {t('tools.missing.check')}
                </Text>
              </Pressable>
              {missingCount !== null && (
                <Text className="text-xs text-center" style={{ color: colors.textMuted }}>
                  {missingCount > 0 ? t('tools.missing.found', { count: missingCount }) : t('tools.missing.none')}
                </Text>
              )}
            </View>
          </View>

          {/* Incremental Scan */}
          <View>
            <SectionHeader title={t('tools.incremental')} />
            <View className="rounded-3xl p-4 gap-3" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm" style={{ color: colors.text }}>
                {t('tools.incremental.desc')}
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={checkIncrementalScan}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl"
                  style={{ backgroundColor: colors.card }}
                >
                  <Search size={16} color={colors.accent} />
                  <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                    {t('tools.check.changes')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={updateScanIndex}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl"
                  style={{ backgroundColor: colors.accent }}
                >
                  <RefreshCw size={16} color={colors.background} />
                  <Text className="text-sm font-semibold" style={{ color: colors.background }}>
                    {t('tools.update.index')}
                  </Text>
                </Pressable>
              </View>
              {scanInfo !== null && (
                <Text className="text-xs text-center" style={{ color: colors.textMuted }}>
                  {t('tools.changes', { newFiles: scanInfo.newFiles, removedFiles: scanInfo.removedFiles })}
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
