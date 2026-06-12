import { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { useLocalSearchParams } from 'expo-router';
import { usePlayerStore } from '@/store/player-store';
import { parseSyncedLyrics, type SyncedLine } from '@/services/lyrics';
import {
  Plus, Trash2, Clock, Save, Upload, Music,
} from 'lucide-react-native';
import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

function formatTimestamp(time: number): string {
  const min = Math.floor(time / 60);
  const sec = Math.floor(time % 60);
  const ms = Math.floor((time % 1) * 100);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

function generateLRC(lines: SyncedLine[], title?: string, artist?: string): string {
  let lrc = '';
  if (title) lrc += `[ti:${title}]\n`;
  if (artist) lrc += `[ar:${artist}]\n`;
  lrc += `[by:Lumora]\n`;
  for (const line of lines) {
    lrc += `[${formatTimestamp(line.time)}]${line.text}\n`;
  }
  return lrc;
}

export default function LyricsEditorScreen() {
  const { colors } = useTheme();
  const { title, artist } = useLocalSearchParams<{ title: string; artist: string }>();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const position = usePlayerStore((s) => s.position);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const [lines, setLines] = useState<SyncedLine[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const trackTitle = title ?? currentTrack?.title ?? 'Untitled';
  const trackArtist = artist ?? currentTrack?.artist ?? 'Unknown';

  const addLineAtCurrentTime = useCallback(() => {
    setLines((prev) => {
      const updated = [...prev, { time: position, text: '' }];
      updated.sort((a, b) => a.time - b.time);
      return updated;
    });
    setTimeout(() => {
      setEditingIndex(lines.length);
      setEditText('');
    }, 100);
  }, [position, lines.length]);

  const removeLine = useCallback((index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  }, [editingIndex]);

  const updateLineText = useCallback((index: number, text: string) => {
    setLines((prev) => prev.map((line, i) => i === index ? { ...line, text } : line));
  }, []);

  const updateLineTime = useCallback((index: number, time: number) => {
    setLines((prev) => {
      const updated = prev.map((line, i) => i === index ? { ...line, time } : line);
      updated.sort((a, b) => a.time - b.time);
      return updated;
    });
  }, []);

  const snapToCurrentTime = useCallback((index: number) => {
    updateLineTime(index, position);
  }, [position, updateLineTime]);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/x-lrc', '*/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const file = new File(result.assets[0].uri);
        const content = await file.text();
        const parsed = parseSyncedLyrics(content);
        if (parsed.synced.length > 0) {
          setLines(parsed.synced);
          Alert.alert('Imported', `Loaded ${parsed.synced.length} synced lines`);
        } else if (parsed.lyrics) {
          const plainLines = parsed.lyrics.split('\n').filter(Boolean);
          setLines(plainLines.map((text, i) => ({ time: i * 3, text })));
          Alert.alert('Imported', `Loaded ${plainLines.length} lines (unsynced, estimated timing)`);
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to import file');
    }
  }, []);

  const handleExport = useCallback(async () => {
    const lrc = generateLRC(lines, trackTitle, trackArtist);
    try {
      const filename = `${trackTitle.replace(/[^a-zA-Z0-9]/g, '_')}.lrc`;
      const file = new File(Paths.document, filename);
      await file.write(lrc);
      Alert.alert('Saved', `Lyrics saved as ${filename}`);
    } catch {
      Alert.alert('Error', 'Failed to save file');
    }
  }, [lines, trackTitle, trackArtist]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar
        title="Lyrics Editor"
        showSettings={false}
      />
      <View className="px-4 py-3">
        <View className="rounded-2xl p-3 mb-3" style={{ backgroundColor: colors.surface }}>
          <Text className="text-sm font-medium" style={{ color: colors.text }} numberOfLines={1}>
            {trackTitle}
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>{trackArtist}</Text>
        </View>

        <View className="flex-row gap-2 mb-3">
          <Pressable
            onPress={addLineAtCurrentTime}
            className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl"
            style={{ backgroundColor: colors.accent }}
          >
            <Plus size={16} color={colors.background} />
            <Text className="text-xs font-semibold" style={{ color: colors.background }}>
              Add at {formatTimestamp(position)}
            </Text>
          </Pressable>
          <Pressable
            onPress={togglePlay}
            className="py-3 px-4 rounded-2xl items-center justify-center"
            style={{ backgroundColor: colors.card }}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.text }}>
              {isPlaying ? '⏸' : '▶'}
            </Text>
          </Pressable>
        </View>

        <View className="flex-row gap-2">
          <Pressable
            onPress={handleImport}
            className="flex-1 flex-row items-center justify-center gap-2 py-2 rounded-xl"
            style={{ backgroundColor: colors.card }}
          >
            <Upload size={14} color={colors.textMuted} />
            <Text className="text-xs" style={{ color: colors.textMuted }}>Import LRC</Text>
          </Pressable>
          <Pressable
            onPress={handleExport}
            className="flex-1 flex-row items-center justify-center gap-2 py-2 rounded-xl"
            style={{ backgroundColor: colors.card }}
          >
            <Save size={14} color={colors.textMuted} />
            <Text className="text-xs" style={{ color: colors.textMuted }}>Export LRC</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={lines}
        keyExtractor={(_, index) => `line-${index}`}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Music size={40} color={colors.textMuted} />
            <Text className="mt-3 text-sm" style={{ color: colors.textMuted }}>
              No lyrics lines yet
            </Text>
            <Text className="mt-1 text-xs" style={{ color: colors.textMuted }}>
              Tap &quot;Add at current time&quot; while playing to add synced lines
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            className="flex-row items-center gap-2 mb-2"
            style={{
              backgroundColor: editingIndex === index ? colors.accent + '15' : colors.surface,
              borderRadius: 16,
              padding: 12,
            }}
          >
            <Pressable
              onPress={() => snapToCurrentTime(index)}
              className="items-center justify-center"
              style={{ minWidth: 70 }}
            >
              <Clock size={12} color={colors.accent} />
              <Text className="text-[10px] font-mono mt-0.5" style={{ color: colors.accent }}>
                {formatTimestamp(item.time)}
              </Text>
            </Pressable>

            <TextInput
              value={editingIndex === index ? editText : item.text}
              onChangeText={(text) => {
                if (editingIndex === index) {
                  setEditText(text);
                } else {
                  updateLineText(index, text);
                }
              }}
              onFocus={() => {
                setEditingIndex(index);
                setEditText(item.text);
              }}
              onBlur={() => {
                if (editingIndex === index) {
                  updateLineText(index, editText);
                  setEditingIndex(null);
                }
              }}
              placeholder="Lyric line..."
              placeholderTextColor={colors.textMuted + '80'}
              style={{
                flex: 1,
                fontSize: 14,
                color: colors.text,
                padding: 0,
              }}
              multiline
            />

            <Pressable
              onPress={() => removeLine(index)}
              className="p-2"
            >
              <Trash2 size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}
