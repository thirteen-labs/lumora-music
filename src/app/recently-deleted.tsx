import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/i18n/translations';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useRecentlyDeletedStore } from '@/store/recently-deleted-store';
import { Music, Film, Trash2, RotateCcw, X } from 'lucide-react-native';

function formatTimeAgo(timestamp: number, t: (key: TranslationKey, params?: Record<string, string | number>) => string): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('deleted.just.now');
  if (minutes < 60) return t('deleted.ago', { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('deleted.hours.ago', { hours });
  const days = Math.floor(hours / 24);
  return t('deleted.days.ago', { days });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function RecentlyDeletedScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const items = useRecentlyDeletedStore((s) => s.items);
  const restoreItem = useRecentlyDeletedStore((s) => s.restoreItem);
  const permanentlyDelete = useRecentlyDeletedStore((s) => s.permanentlyDelete);
  const clearAll = useRecentlyDeletedStore((s) => s.clearAll);

  const songs = items.filter((i) => i.type === 'song');
  const videos = items.filter((i) => i.type === 'video');

  const handleRestore = (id: string, title: string) => {
    Alert.alert(t('deleted.restore', { title }), t('deleted.restore', { title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.ok'), onPress: () => restoreItem(id) },
    ]);
  };

  const handlePermanentDelete = (id: string, title: string) => {
    Alert.alert(t('deleted.permanent.delete', { title }), t('deleted.permanent.delete', { title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('deleted.delete'), style: 'destructive', onPress: () => permanentlyDelete(id) },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert(t('deleted.clear'), t('deleted.clear.confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('deleted.clear'), style: 'destructive', onPress: clearAll },
    ]);
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={t('deleted.title')} showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap6]}>
          {items.length === 0 ? (
            <View style={[s.itemsCenter, s.py12]}>
              <Trash2 size={48} color={colors.textMuted} />
              <Text style={[s.textSm, s.mt4, { color: colors.textMuted }]}>
                {t('deleted.none')}
              </Text>
            </View>
          ) : (
            <>
              {items.length > 0 && (
                <View style={[s.flexRow, s.justifyEnd]}>
                  <Pressable onPress={handleClearAll}>
                    <Text style={[s.textXs, s.fontSemibold, { color: colors.accent }]}>{t('deleted.clear.all')}</Text>
                  </Pressable>
                </View>
              )}

              {songs.length > 0 && (
                <View>
                  <SectionHeader title={t('deleted.songs', { count: songs.length })} />
                  <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                    {songs.map((item, i) => (
                      <View
                        key={item.id}
                        style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { borderBottomWidth: i < songs.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
                      >
                        <Music size={18} color={colors.accent} />
                        <View style={s.flex1}>
                          <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={[s.textXs, { color: colors.textMuted }]}>
                            {item.artist || 'Unknown'} · {formatFileSize(item.fileSize)} · {formatTimeAgo(item.deletedAt, t)}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleRestore(item.id, item.title)}
                          style={[{ padding: 8, borderRadius: 9999, backgroundColor: colors.card }]}
                        >
                          <RotateCcw size={14} color={colors.accent} />
                        </Pressable>
                        <Pressable
                          onPress={() => handlePermanentDelete(item.id, item.title)}
                          style={[{ padding: 8, borderRadius: 9999, backgroundColor: colors.card }]}
                        >
                          <X size={14} color={'#ff4444'} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {videos.length > 0 && (
                <View>
                  <SectionHeader title={t('deleted.videos', { count: videos.length })} />
                  <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                    {videos.map((item, i) => (
                      <View
                        key={item.id}
                        style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, { borderBottomWidth: i < videos.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}
                      >
                        <Film size={18} color={colors.accent} />
                        <View style={s.flex1}>
                          <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={[s.textXs, { color: colors.textMuted }]}>
                            {formatFileSize(item.fileSize)} · {formatTimeAgo(item.deletedAt, t)}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleRestore(item.id, item.title)}
                          style={[{ padding: 8, borderRadius: 9999, backgroundColor: colors.card }]}
                        >
                          <RotateCcw size={14} color={colors.accent} />
                        </Pressable>
                        <Pressable
                          onPress={() => handlePermanentDelete(item.id, item.title)}
                          style={[{ padding: 8, borderRadius: 9999, backgroundColor: colors.card }]}
                        >
                          <X size={14} color={'#ff4444'} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
