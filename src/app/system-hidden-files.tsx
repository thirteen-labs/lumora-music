import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useSystemHiddenStore } from '@/store/system-hidden-store';
import { ScanEye, Folder, FileAudio, ChevronDown, ChevronRight, RefreshCw, HardDrive } from 'lucide-react-native';

export default function SystemHiddenFilesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const groups = useSystemHiddenStore((s) => s.groups);
  const files = useSystemHiddenStore((s) => s.files);
  const status = useSystemHiddenStore((s) => s.status);
  const error = useSystemHiddenStore((s) => s.error);
  const lastScanTime = useSystemHiddenStore((s) => s.lastScanTime);
  const scan = useSystemHiddenStore((s) => s.scan);
  const clear = useSystemHiddenStore((s) => s.clear);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'idle') scan();
  }, [status, scan]);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleRefresh = () => {
    Alert.alert(t('hidden.system.rescan'), t('hidden.system.rescan.desc'), [
      { text: 'Cancel', style: 'cancel' },
      { text: t('hidden.system.scan'), onPress: () => scan() },
    ]);
  };

  const handleClear = () => {
    Alert.alert(t('common.clear'), t('hidden.system.clear.confirm'), [
      { text: 'Cancel', style: 'cancel' },
      { text: t('hidden.system.clear'), style: 'destructive', onPress: () => clear() },
    ]);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getTypeIcon = (type: 'audio' | 'video' | 'mixed') => {
    if (type === 'audio') return FileAudio;
    return HardDrive;
  };

  const [lastScanLabel, setLastScanLabel] = useState('');

  useEffect(() => {
    const update = () => {
      if (!lastScanTime) { setLastScanLabel(''); return; }
      const diff = Date.now() - lastScanTime;
      if (diff < 60000) setLastScanLabel(t('deleted.just.now'));
      else if (diff < 3600000) setLastScanLabel(t('deleted.ago', { minutes: Math.floor(diff / 60000) }));
      else if (diff < 86400000) setLastScanLabel(t('deleted.hours.ago', { hours: Math.floor(diff / 3600000) }));
      else setLastScanLabel(t('deleted.days.ago', { days: Math.floor(diff / 86400000) }));
    };

    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [lastScanTime, t]);

  const ungroupedCount = files.length - groups.reduce((sum, g) => sum + g.files.length, 0);

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={t('hidden.system.title')} showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap6]}>
          <View style={[s.flexRow, s.itemsCenter, s.gap3, s.flexWrap]}>
            <Pressable
              onPress={handleRefresh}
              disabled={status === 'scanning'}
              style={[s.flexRow, s.itemsCenter, s.gap2, { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.accent + '20' }]}
            >
              <RefreshCw size={16} color={colors.accent} />
              <Text style={[s.textSm, s.fontSemibold, { color: colors.accent }]}>
                {status === 'scanning' ? t('hidden.system.scanning') : t('hidden.system.scan')}
              </Text>
            </Pressable>
            {files.length > 0 && (
              <Pressable
                onPress={handleClear}
                style={[s.flexRow, s.itemsCenter, s.gap2, { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.notification + '20' }]}
              >
                <Text style={[s.textSm, s.fontSemibold, { color: colors.notification }]}>{t('hidden.system.clear')}</Text>
              </Pressable>
            )}
            {lastScanLabel && (
              <Text style={[s.textXs, { color: colors.textMuted }]}>
                {t('hidden.system.last.scan', { time: lastScanLabel })}
              </Text>
            )}
          </View>

          {error && (
            <View style={{ backgroundColor: colors.notification + '15', borderRadius: 12, padding: 16 }}>
              <Text style={[s.textSm, { color: colors.notification }]}>{error}</Text>
            </View>
          )}

          {status === 'scanning' && (
            <View style={[s.itemsCenter, s.py12]}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>{t('hidden.system.scanning')}</Text>
              <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>{t('hidden.system.scan.folders')}</Text>
            </View>
          )}

          {status === 'complete' && files.length === 0 && (
            <View style={[s.itemsCenter, s.py12]}>
              <ScanEye size={48} color={colors.textMuted} />
              <Text style={[s.textSm, s.mt4, { color: colors.textMuted }]}>{t('hidden.system.none')}</Text>
              <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>{t('hidden.system.none.desc')}</Text>
            </View>
          )}

          {status === 'complete' && files.length > 0 && (
            <>
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16 }}>
                <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                  <HardDrive size={20} color={colors.accent} />
                  <View style={s.flex1}>
                    <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>
                      {t('hidden.system.files.found', { count: files.length })}
                    </Text>
                    <Text style={[s.textXs, { color: colors.textMuted }]}>
                      {t('hidden.system.groups', { count: groups.length })} · {t('hidden.system.ungrouped', { count: ungroupedCount })}
                    </Text>
                  </View>
                </View>
              </View>

              {groups.length > 0 && (
                <View>
                  <SectionHeader title={t('hidden.system.groups', { count: groups.length })} />
                  <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                    {groups.map((group, i) => {
                      const isExpanded = expandedGroups.has(group.name);
                      const TypeIcon = getTypeIcon(group.type);
                      return (
                        <View key={group.name}>
                          <Pressable
                            onPress={() => toggleGroup(group.name)}
                            style={[s.flexRow, s.itemsCenter, s.gap3, s.p4]}
                          >
                            <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                              <Folder size={20} color={colors.accent} />
                            </View>
                            <View style={s.flex1}>
                              <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
                                {group.name.charAt(0).toUpperCase() + group.name.slice(1)}
                              </Text>
                              <Text style={[s.textXs, { color: colors.textMuted }]}>
                                {group.files.length} file{group.files.length !== 1 ? 's' : ''} · {group.type}
                              </Text>
                            </View>
                            {isExpanded ? (
                              <ChevronDown size={18} color={colors.textMuted} />
                            ) : (
                              <ChevronRight size={18} color={colors.textMuted} />
                            )}
                          </Pressable>
                          {isExpanded && (
                            <View style={{ backgroundColor: colors.card, paddingHorizontal: 16, paddingBottom: 8 }}>
                              {group.files.map((file, fi) => (
                                <View
                                  key={file.uri}
                                  style={[s.flexRow, s.itemsCenter, s.gap3, s.py2]}
                                >
                                  <TypeIcon size={16} color={group.type === 'audio' ? colors.accent : colors.textMuted} />
                                  <View style={s.flex1}>
                                    <Text style={[s.textXs, { color: colors.text }]} numberOfLines={1}>
                                      {file.name}
                                    </Text>
                                    <Text style={[s.text10, { color: colors.textMuted }]} numberOfLines={1}>
                                      {formatSize(file.size)} · {file.sourcePath.split('/').pop()}
                                    </Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {groups.length === 0 && files.length > 0 && (
                <View style={[s.itemsCenter, s.py6]}>
                  <Text style={[s.textSm, { color: colors.textMuted }]}>
                    Files found but no common substrings detected
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
