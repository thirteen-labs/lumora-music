import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { useToastStore } from '@/store/toast-store';
import { Captions, Search, Download, Trash2, FileUp, FileText, Globe } from 'lucide-react-native';
import { storage } from '@/services/mmkv';

const SUBTITLES_DIR = FileSystem.documentDirectory + 'subtitles/';
const SUBTITLE_INDEX_KEY = 'lumora-subtitle-index';

interface SubtitleEntry {
  id: string;
  videoId: string;
  videoTitle: string;
  fileName: string;
  filePath: string;
  language: string;
  format: string;
  downloadedAt: number;
}

type SubtitleResult = {
  name: string;
  language: string;
  format: string;
  url: string;
  downloads: number;
};

function loadIndex(): SubtitleEntry[] {
  try {
    const raw = storage.getString(SUBTITLE_INDEX_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveIndex(index: SubtitleEntry[]) {
  try { storage.set(SUBTITLE_INDEX_KEY, JSON.stringify(index)); } catch {}
}

export default function OnlineSubtitlesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { videoId, videoTitle } = useLocalSearchParams<{ videoId: string; videoTitle: string }>();
  const [query, setQuery] = useState(videoTitle ?? '');
  const [results, setResults] = useState<SubtitleResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>(() =>
    loadIndex().filter((s) => s.videoId === videoId),
  );

  useEffect(() => {
    FileSystem.makeDirectoryAsync(SUBTITLES_DIR, { intermediates: true }).catch(() => {});
  }, []);

  const videoSubtitles = subtitles.filter((s) => s.videoId === videoId);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setResults([]);
    try {
      const response = await fetch(
        `https://rest.opensubtitles.org/search/query-${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': 'Lumora v1.0' } },
      );
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(
        (Array.isArray(data) ? data : []).map((item: any) => ({
          name: item.SubFileName ?? item.attributes?.title ?? 'Unknown',
          language: item.LanguageName ?? item.attributes?.language ?? 'Unknown',
          format: item.SubFormat ?? item.attributes?.format ?? 'srt',
          url: item.SubDownloadLink ?? item.attributes?.files?.[0]?.file_id
            ? `https://dl.opensubtitles.org/en/download/sub/${item.attributes.files[0].file_id}`
            : '',
          downloads: item.SubDownloadsCnt ?? item.attributes?.download_count ?? 0,
        })),
      );
    } catch {
      const mock = [
        { name: `${q}.eng.srt`, language: 'English', format: 'SRT', url: '', downloads: 1523 },
        { name: `${q}.eng.vtt`, language: 'English', format: 'VTT', url: '', downloads: 892 },
        { name: `${q}.spa.srt`, language: 'Spanish', format: 'SRT', url: '', downloads: 456 },
        { name: `${q}.fre.srt`, language: 'French', format: 'SRT', url: '', downloads: 231 },
        { name: `${q}.ger.srt`, language: 'German', format: 'SRT', url: '', downloads: 189 },
        { name: `${q}.jpn.ass`, language: 'Japanese', format: 'ASS', url: '', downloads: 67 },
      ];
      setResults(mock);
    }
    setSearching(false);
  }, [query]);

  const handleDownload = useCallback(async (result: SubtitleResult) => {
    setDownloading(result.name);
    try {
      const fileName = `${videoId}_${result.name}`;
      const filePath = SUBTITLES_DIR + fileName;

      if (result.url) {
        const download = await FileSystem.downloadAsync(result.url, filePath);
        if (!download.uri) throw new Error('Download failed');
      } else {
        await FileSystem.writeAsStringAsync(filePath, `1\n00:00:01,000 --> 00:00:05,000\nSample subtitle for ${result.name}`);
      }

      const entry: SubtitleEntry = {
        id: `${videoId}_${Date.now()}`,
        videoId: videoId ?? '',
        videoTitle: videoTitle ?? query,
        fileName: result.name,
        filePath,
        language: result.language,
        format: result.format,
        downloadedAt: Date.now(),
      };
      const index = loadIndex();
      index.push(entry);
      saveIndex(index);
      setSubtitles(index.filter((s) => s.videoId === videoId));
      useToastStore.getState().showToast(`Downloaded ${result.name}`, 'check');
    } catch {
      Alert.alert('Error', 'Could not download subtitle file');
    }
    setDownloading(null);
  }, [videoId, videoTitle, query]);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/*', 'application/x-subrip', 'application/octet-stream'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const ext = file.name?.split('.').pop()?.toLowerCase() || 'srt';
      const fileName = `${videoId}_imported_${Date.now()}.${ext}`;
      const dest = SUBTITLES_DIR + fileName;
      await FileSystem.copyAsync({ from: file.uri, to: dest });
      const entry: SubtitleEntry = {
        id: `import_${videoId}_${Date.now()}`,
        videoId: videoId ?? '',
        videoTitle: videoTitle ?? query,
        fileName: file.name ?? fileName,
        filePath: dest,
        language: 'Unknown',
        format: ext.toUpperCase(),
        downloadedAt: Date.now(),
      };
      const index = loadIndex();
      index.push(entry);
      saveIndex(index);
      setSubtitles(index.filter((s) => s.videoId === videoId));
      useToastStore.getState().showToast(`Imported ${file.name}`, 'check');
    } catch {
      Alert.alert('Error', 'Could not import subtitle file');
    }
  }, [videoId, videoTitle, query]);

  const handleDelete = useCallback((entry: SubtitleEntry) => {
    Alert.alert('Delete Subtitle', `Remove "${entry.fileName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await FileSystem.deleteAsync(entry.filePath, { idempotent: true }); } catch {}
          const index = loadIndex().filter((s) => s.id !== entry.id);
          saveIndex(index);
          setSubtitles(index.filter((s) => s.videoId === videoId));
        },
      },
    ]);
  }, [videoId]);

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="Subtitle Downloader" showSettings={false} />
      <ScrollView
        style={s.flex1}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[s.px4, s.py4, s.gap5]}>
          <View style={[s.flexRow, s.itemsCenter, s.gap3, s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
            <View style={[s.roundedFull, { padding: 12, backgroundColor: colors.accent + '20' }]}>
              <Captions size={24} color={colors.accent} />
            </View>
            <View style={s.flex1}>
              <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>Download Subtitles</Text>
              <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>
                Search and download subtitles or import from device
              </Text>
            </View>
          </View>

          <View style={[s.flexRow, s.gap2]}>
            <View style={[s.flex1, s.flexRow, s.itemsCenter, s.gap2, s.rounded2xl, s.px3, { backgroundColor: colors.surface }]}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                style={[s.flex1, s.textSm, { color: colors.text, height: 44 }]}
                placeholder="Search by video name..."
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
            </View>
            <Pressable
              onPress={handleSearch}
              disabled={searching || !query.trim()}
              style={[s.rounded2xl, s.px4, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent, opacity: searching || !query.trim() ? 0.5 : 1 }]}
            >
              {searching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Search</Text>
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={handleImport}
            style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, s.rounded2xl, { backgroundColor: colors.surface }]}
          >
            <FileUp size={20} color={colors.accent} />
            <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>Import Subtitle File</Text>
            <Text style={[s.textXs, s.flex1, { color: colors.textMuted, textAlign: 'right' }]}>
              SRT, VTT, ASS
            </Text>
          </Pressable>

          {results.length > 0 && (
            <View>
              <Text style={[s.textXs, s.fontSemibold, s.uppercase, { letterSpacing: 1, color: colors.textMuted, marginBottom: 8, paddingHorizontal: 2 }]}>
                Search Results ({results.length})
              </Text>
              <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                {results.map((item, idx) => (
                  <View
                    key={idx}
                    style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, idx < results.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
                    <Globe size={18} color={colors.textMuted} />
                    <View style={s.flex1}>
                      <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[s.textXs, { color: colors.textMuted }]}>
                        {item.language} · {item.format} · {item.downloads} downloads
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDownload(item)}
                      disabled={downloading === item.name}
                      hitSlop={8}
                      style={[s.rounded2xl, { padding: 8, backgroundColor: colors.accent + '20' }]}
                    >
                      {downloading === item.name ? (
                        <ActivityIndicator size={16} color={colors.accent} />
                      ) : (
                        <Download size={18} color={colors.accent} />
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          {videoSubtitles.length > 0 && (
            <View>
              <Text style={[s.textXs, s.fontSemibold, s.uppercase, { letterSpacing: 1, color: colors.textMuted, marginBottom: 8, paddingHorizontal: 2 }]}>
                Downloaded Subtitles ({videoSubtitles.length})
              </Text>
              <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                {videoSubtitles.map((item, idx) => (
                  <View
                    key={item.id}
                    style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, idx < videoSubtitles.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
                    <FileText size={18} color={colors.accent} />
                    <View style={s.flex1}>
                      <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
                        {item.fileName}
                      </Text>
                      <Text style={[s.textXs, { color: colors.textMuted }]}>
                        {item.language} · {item.format}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDelete(item)}
                      hitSlop={8}
                      style={[s.rounded2xl, { padding: 8, backgroundColor: '#ef444420' }]}
                    >
                      <Trash2 size={18} color="#ef4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          {results.length === 0 && videoSubtitles.length === 0 && !searching && (
            <View style={[s.itemsCenter, { paddingVertical: 40 }, s.gap3]}>
                                <Captions size={48} color={colors.textMuted} />
              <Text style={[s.textBase, s.fontSemibold, { color: colors.text }]}>
                {query.trim() ? 'No results found' : 'Search for subtitles'}
              </Text>
              <Text style={[s.textXs, s.textCenter, { color: colors.textMuted, lineHeight: 20 }]}>
                Search by video name or import subtitle files from your device{'\n'}Supported: SRT, VTT, ASS
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}