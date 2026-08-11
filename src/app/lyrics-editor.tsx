import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { TopBar } from '@/components/top-bar';
import { useLyricsStore } from '@/store/lyrics-store';
import { usePlayerStore } from '@/store/player-store';
import { fetchLyrics } from '@/services/lyrics';
import { useState } from 'react';
import { Search, FileUp, FileDown, Paperclip, Loader } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { logger } from '@/utils/logger';

export default function LyricsEditorScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const songs = usePlayerStore((s) => s.queue);
  const getLyrics = useLyricsStore((s) => s.getLyrics);
  const saveLyrics = useLyricsStore((s) => s.saveLyrics);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const targetSong = currentTrack ?? songs[0] ?? null;

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

  const handleImportLrc = async (songId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const fileUri = result.assets[0].uri;
      const name = result.assets[0].name;

      if (!name.toLowerCase().endsWith('.lrc') && !name.toLowerCase().endsWith('.txt')) {
        Alert.alert('Invalid File', 'Please select a .lrc or .txt file');
        return;
      }

      let content = await FileSystem.readAsStringAsync(fileUri);
      saveLyrics(songId, content);
      Alert.alert(t('common.ok') || 'Success', 'Lyrics imported successfully!');
    } catch (error) {
      logger.error('LRC import error:', error);
      Alert.alert('Error', 'Failed to import lyrics. Please try again.');
    }
  };

  const handleSearchLyrics = async () => {
    if (!targetSong) return;
    setSearchLoading(true);
    const result = await fetchLyrics(targetSong.artist, targetSong.title, true);
    setSearchLoading(false);
    if (result) {
      saveLyrics(targetSong.id, result.raw || result.lyrics);
      Alert.alert('Success', 'Lyrics found and saved!');
    } else {
      Alert.alert('Not Found', 'No lyrics found for this song.');
    }
  };

  const handleImportForCurrent = () => {
    if (!targetSong) {
      Alert.alert('No Song', 'No song is currently selected.');
      return;
    }
    handleImportLrc(targetSong.id);
  };

  const handleExportLrc = async () => {
    if (!targetSong) {
      Alert.alert('No Song', 'No song is currently selected.');
      return;
    }
    const lyrics = getLyrics(targetSong.id);
    if (!lyrics) {
      Alert.alert('No Lyrics', 'No lyrics to export for this song.');
      return;
    }

    try {
      const fileName = `${targetSong.title.replace(/[^a-zA-Z0-9]/g, '_')}.lrc`;
      const fileUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, lyrics);
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/plain' });
      } else {
        Alert.alert('Exported', `Lyrics saved to cache:\n${fileName}`);
      }
    } catch (error) {
      logger.error('LRC export error:', error);
      Alert.alert('Error', 'Failed to export lyrics.');
    }
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={t('lyrics.title')} showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap4]}>
          {targetSong && (
            <View style={[s.rounded3xl, { padding: 16, marginBottom: 12, backgroundColor: colors.surface }]}>
              <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
                {targetSong.title}
              </Text>
              <Text style={[s.textXs, { color: colors.textMuted }]}>{targetSong.artist}</Text>
            </View>
          )}

          <View style={[s.flexRow, s.gap2, s.mb3]}>
            <Pressable
              onPress={handleSearchLyrics}
              disabled={searchLoading || !targetSong}
              style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent, opacity: !targetSong ? 0.5 : 1 }]}
            >
              {searchLoading ? (
                <Loader size={14} color={colors.background} />
              ) : (
                <Search size={14} color={colors.background} />
              )}
              <Text style={[s.textXs, s.fontSemibold, { color: colors.background }]}>
                {searchLoading ? 'Searching...' : t('lyrics.search')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleImportForCurrent}
              style={[{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card }]}
            >
              <FileUp size={14} color={colors.text} />
              <Text style={[s.textXs, s.fontSemibold, { color: colors.text }]}>Import LRC</Text>
            </Pressable>
            <Pressable
              onPress={handleExportLrc}
              style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 8, borderRadius: 12, backgroundColor: colors.card }]}
            >
              <FileDown size={14} color={colors.textMuted} />
              <Text style={[s.textXs, { color: colors.textMuted }]}>Export LRC</Text>
            </Pressable>
          </View>

          {songs.length === 0 && !currentTrack ? (
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
                  <View style={[s.flexRow, s.justifyEnd, s.itemsCenter, s.gap2, s.mt2]}>
                    <Pressable
                      onPress={() => handleImportLrc(song.id)}
                      style={[{ padding: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                    >
                      <Paperclip size={12} color={colors.textMuted} />
                      <Text style={[s.text10, s.fontMedium, { color: colors.textMuted }]}>
                        Import .LRC
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (isEditing) {
                          handleSaveLyrics(song.id);
                        } else {
                          startEditing(song.id, existingLyrics ?? '');
                        }
                      }}
                      style={[{ padding: 8 }]}
                    >
                      <Text style={[s.text10, s.fontMedium, { color: colors.accent }]}>
                        {isEditing ? t('common.save') : t('lyrics.edit')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
