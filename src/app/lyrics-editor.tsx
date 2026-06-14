import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { TopBar } from '@/components/top-bar';
import { useLyricsStore } from '@/store/lyrics-store';
import { usePlayerStore } from '@/store/player-store';
import { useState } from 'react';
import { Search, FileUp, FileDown } from 'lucide-react-native';

export default function LyricsEditorScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const songs = usePlayerStore((s) => s.queue);
  const trackArtist = usePlayerStore((s) => s.currentTrack?.artist ?? '');
  const getLyrics = useLyricsStore((s) => s.getLyrics);
  const saveLyrics = useLyricsStore((s) => s.saveLyrics);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleSaveLyrics = (songId: string) => {
    saveLyrics(songId, editText);
    setEditingId(null);
    setEditText('');
    Alert.alert(t('common.ok'), t('lyrics.saved'));
  };

  const startEditing = (songId: string, existing: string) => {
    setEditingId(songId);
    setEditText(existing);
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={t('lyrics.title')} showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap4]}>
          {songs.length > 0 && (
            <View style={[s.rounded3xl, { padding: 16, marginBottom: 12, backgroundColor: colors.surface }]}>
              <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
                {songs[0]?.title ?? ''}
              </Text>
              <Text style={[s.textXs, { color: colors.textMuted }]}>{trackArtist}</Text>
            </View>
          )}

          <View style={[s.flexRow, s.gap2, s.mb3]}>
            <Pressable
              style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent }]}
            >
              <Search size={14} color={colors.background} />
              <Text style={[s.textXs, s.fontSemibold, { color: colors.background }]}>
                {t('lyrics.search')}
              </Text>
            </Pressable>
            <Pressable
              style={[{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card }]}
            >
              <FileUp size={14} color={colors.text} />
              <Text style={[s.textXs, s.fontSemibold, { color: colors.text }]}>Import LRC</Text>
            </Pressable>
            <Pressable
              style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 8, borderRadius: 12, backgroundColor: colors.card }]}
            >
              <FileDown size={14} color={colors.textMuted} />
              <Text style={[s.textXs, { color: colors.textMuted }]}>Export LRC</Text>
            </Pressable>
          </View>

          {songs.length === 0 ? (
            <View style={[s.itemsCenter, s.py16]}>
              <Search size={40} color={colors.textMuted} />
              <Text style={[s.mt3, s.textSm, { color: colors.textMuted }]}>
                {t('lyrics.no.song')}
              </Text>
              <Text style={[s.mt1, s.textXs, { color: colors.textMuted }]}>
                {t('lyrics.play.song')}
              </Text>
            </View>
          ) : (
            songs.map((song) => {
              const existingLyrics = getLyrics(song.id);
              const isEditing = editingId === song.id;
              return (
                <View key={song.id} style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
                  <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mb2]}>
                    <Text style={[s.textSm, s.fontSemibold, s.flex1, { color: colors.text }]} numberOfLines={1}>
                      {song.title}
                    </Text>
                  </View>
                  {isEditing ? (
                    <TextInput
                      value={editText}
                      onChangeText={setEditText}
                      multiline
                      style={[{ padding: 8, borderRadius: 8, fontSize: 10, fontFamily: 'monospace', marginTop: 2, color: colors.accent, backgroundColor: colors.card }]}
                    />
                  ) : (
                    existingLyrics && (
                      <Text style={[s.text10, s.fontMono, s.mt05, { color: colors.accent }]} numberOfLines={3}>
                        {existingLyrics.slice(0, 200)}
                      </Text>
                    )
                  )}
                  <Pressable
                    onPress={() => {
                      if (isEditing) {
                        handleSaveLyrics(song.id);
                      } else {
                        startEditing(song.id, existingLyrics ?? '');
                      }
                    }}
                    style={[{ padding: 8, alignSelf: 'flex-end' }]}
                  >
                    <Text style={[s.text10, s.fontMedium, { color: colors.accent }]}>
                      {isEditing ? t('common.save') : t('lyrics.edit')}
                    </Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
