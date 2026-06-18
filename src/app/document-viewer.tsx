import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { useLocalSearchParams } from 'expo-router';
import { FileText, File as FileIcon, BookOpen, ExternalLink, FileArchive } from 'lucide-react-native';
import { File as ExpoFile } from 'expo-file-system';
import { openDocument, formatFileSize, DOC_CATEGORIES } from '@/services/document-scanner';

type ViewMode = 'text' | 'binary';

const TEXT_EXTENSIONS = ['.txt', '.md', '.json', '.xml', '.log', '.rtf', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.env', '.csv'];

export default function DocumentViewerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { uri, name, size, modTime } = useLocalSearchParams<{ uri: string; name: string; size?: string; modTime?: string }>();

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ext = name ? name.substring(name.lastIndexOf('.')).toLowerCase() : '';
  const category = useMemo(() => DOC_CATEGORIES.find((c) => c.extensions.includes(ext)), [ext]);

  const viewMode: ViewMode = TEXT_EXTENSIONS.includes(ext) ? 'text' : 'binary';

  useEffect(() => {
    if (!uri) return;
    async function load() {
      try {
        if (viewMode === 'text') {
          const file = new ExpoFile(uri);
          const text = await file.text();
          setContent(text);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to read file');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [uri, viewMode]);

  const handleOpenExternally = async () => {
    if (!uri) return;
    try {
      await openDocument(uri);
    } catch {
      Alert.alert('Error', 'Could not open this file.');
    }
  };

  if (!uri || !name) {
    return (
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.background }]}>
        <Text style={[{ color: colors.textMuted }]}>No file selected</Text>
      </View>
    );
  }

  const fileSize = size ? formatFileSize(Number(size)) : 'Unknown';
  const fileDate = modTime && Number(modTime) > 0 ? new Date(Number(modTime)).toLocaleDateString() : null;

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={name} showSettings={false} />
      <ScrollView
        style={s.flex1}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        <View style={[s.px4, s.py4, s.gap4]}>
          <View style={[s.flexRow, s.itemsCenter, s.gap3, { backgroundColor: colors.surface, borderRadius: 16, padding: 16 }]}>
            <View style={[s.w14, s.h14, s.rounded2xl, s.itemsCenter, s.justifyCenter, { backgroundColor: (category?.color || colors.textMuted) + '20' }]}>
              {ext === '.pdf' ? <FileText size={28} color={category?.color || colors.textMuted} /> :
               ext === '.epub' ? <BookOpen size={28} color={category?.color || colors.textMuted} /> :
               TEXT_EXTENSIONS.includes(ext) ? <FileText size={28} color={category?.color || colors.textMuted} /> :
               <FileArchive size={28} color={category?.color || colors.textMuted} />}
            </View>
            <View style={s.flex1}>
              <Text style={[s.textSm, s.fontBold, { color: colors.text }]} numberOfLines={2}>{name}</Text>
              <View style={[s.flexRow, s.flexWrap, s.itemsCenter, s.gap2, s.mt05]}>
                <Text style={[s.text10, { color: colors.textMuted }]}>{ext.toUpperCase()}</Text>
                <Text style={[s.text10, { color: colors.textMuted }]}>·</Text>
                <Text style={[s.text10, { color: colors.textMuted }]}>{fileSize}</Text>
                {fileDate && (
                  <>
                    <Text style={[s.text10, { color: colors.textMuted }]}>·</Text>
                    <Text style={[s.text10, { color: colors.textMuted }]}>{fileDate}</Text>
                  </>
                )}
              </View>
              {category && (
                <View style={[s.flexRow, s.itemsCenter, s.gap1, s.mt05]}>
                  <View style={[s.w2, s.h2, s.roundedFull, { backgroundColor: category.color }]} />
                  <Text style={[s.text10, { color: category.color }]}>{category.label}</Text>
                </View>
              )}
            </View>
          </View>

          {viewMode === 'text' && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, minHeight: 200 }}>
              {loading ? (
                <View style={[s.itemsCenter, s.py12]}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>Loading file...</Text>
                </View>
              ) : error ? (
                <View style={[s.itemsCenter, s.py8, s.gap3]}>
                  <FileIcon size={32} color={colors.accent} />
                  <Text style={[s.textSm, { color: colors.accent, textAlign: 'center' }]}>{error}</Text>
                  <Pressable
                    onPress={handleOpenExternally}
                    style={[s.flexRow, s.itemsCenter, s.gap2, s.py2, s.px4, { backgroundColor: colors.accent, borderRadius: 9999, marginTop: 8 }]}
                  >
                    <ExternalLink size={14} color={colors.background} />
                    <Text style={[s.textSm, s.fontSemibold, { color: colors.background }]}>Open Externally</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={[s.textSm, { color: colors.text, lineHeight: 22, fontFamily: 'monospace' }]}>
                  {content}
                </Text>
              )}
            </View>
          )}

          {viewMode === 'binary' && (
            <View style={[s.itemsCenter, s.py12, s.gap4, { backgroundColor: colors.surface, borderRadius: 16, padding: 24 }]}>
              <View style={[s.roundedFull, { padding: 24, backgroundColor: (category?.color || colors.textMuted) + '15' }]}>
                <FileIcon size={48} color={category?.color || colors.textMuted} />
              </View>
              <Text style={[s.textLg, s.fontBold, s.textCenter, { color: colors.text }]}>
                Cannot preview this file
              </Text>
              <Text style={[s.textSm, s.textCenter, { color: colors.textMuted, lineHeight: 22 }]}>
                {ext.toUpperCase()} files cannot be viewed in-app. Open this file with an external application to view its contents.
              </Text>
              <Pressable
                onPress={handleOpenExternally}
                style={[s.flexRow, s.itemsCenter, s.gap2, s.py3, { paddingHorizontal: 24, backgroundColor: colors.accent, borderRadius: 9999 }]}
              >
                <ExternalLink size={16} color={colors.background} />
                <Text style={[s.textSm, s.fontSemibold, { color: colors.background }]}>Open Externally</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}