import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
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
  const insets = useSafeAreaInsets();
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
    const currentUris = songs.map((s) => s.uri);
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
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={t('tools.title')} showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap6]}>
          {/* Library Health */}
          <View>
            <SectionHeader title={t('tools.health')} />
            <View style={[s.rounded3xl, s.overflowHidden, s.p4, s.gap3, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                <CircleCheck size={20} color={colors.success} />
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{t('tools.total.songs')}</Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>{t('tools.tracks.in.library', { count: songs.length })}</Text>
                </View>
              </View>
              <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                <TriangleAlert size={20} color={duplicates.length > 0 ? '#F59E0B' : colors.success} />
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>Duplicate Detection</Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>
                    {duplicates.length > 0 ? t('tools.duplicates.found', { count: duplicates.length }) : t('tools.no.duplicates')}
                  </Text>
                </View>
              </View>
              {scanHistory.lastFullScan > 0 && (
                <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                  <RefreshCw size={20} color={colors.accent} />
                  <View style={s.flex1}>
                    <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>Last Scan</Text>
                    <Text style={[s.textXs, { color: colors.textMuted }]}>
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
              <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                {duplicates.slice(0, 20).map((group, i) => (
                  <View
                    key={i}
                    style={[s.p4, { borderBottomWidth: i < duplicates.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
                  >
                    <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mb2]}>
                      <Music size={14} color={colors.accent} />
                      <Text style={[s.textSm, s.fontMedium, s.flex1, { color: colors.text }]} numberOfLines={1}>
                        {group.song.title}
                      </Text>
                      <Text style={[s.textXs, { color: colors.textMuted }]}>
                        {t('tools.copy', { count: group.duplicates.length + 1 })}
                      </Text>
                    </View>
                    <Text style={[s.textXs, { color: colors.textMuted }]}>
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
            <View style={[s.rounded3xl, s.p4, s.gap3, { backgroundColor: colors.surface }]}>
              <Text style={[s.textSm, { color: colors.text }]}>
                {t('tools.missing.desc')}
              </Text>
              <Pressable
                onPress={checkMissingFiles}
                style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent }]}
              >
                <Trash2 size={16} color={colors.background} />
                <Text style={[s.textSm, s.fontSemibold, { color: colors.background }]}>
                  {t('tools.missing.check')}
                </Text>
              </Pressable>
              {missingCount !== null && (
                <Text style={[s.textXs, s.textCenter, { color: colors.textMuted }]}>
                  {missingCount > 0 ? t('tools.missing.found', { count: missingCount }) : t('tools.missing.none')}
                </Text>
              )}
            </View>
          </View>

          {/* Incremental Scan */}
          <View>
            <SectionHeader title={t('tools.incremental')} />
            <View style={[s.rounded3xl, s.p4, s.gap3, { backgroundColor: colors.surface }]}>
              <Text style={[s.textSm, { color: colors.text }]}>
                {t('tools.incremental.desc')}
              </Text>
              <View style={[s.flexRow, s.gap2]}>
                <Pressable
                  onPress={checkIncrementalScan}
                  style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 12, borderRadius: 16, backgroundColor: colors.card }]}
                >
                  <Search size={16} color={colors.accent} />
                  <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>
                    {t('tools.check.changes')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={updateScanIndex}
                  style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent }]}
                >
                  <RefreshCw size={16} color={colors.background} />
                  <Text style={[s.textSm, s.fontSemibold, { color: colors.background }]}>
                    {t('tools.update.index')}
                  </Text>
                </Pressable>
              </View>
              {scanInfo !== null && (
                <Text style={[s.textXs, s.textCenter, { color: colors.textMuted }]}>
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
