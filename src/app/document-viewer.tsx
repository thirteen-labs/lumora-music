import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { useLocalSearchParams } from 'expo-router';
import { File, BookOpen, ExternalLink } from 'lucide-react-native';
import { File as ExpoFile } from 'expo-file-system';
import { openDocument } from '@/services/document-scanner';

type ViewMode = 'text' | 'epub' | 'unsupported';

export default function DocumentViewerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { uri, name } = useLocalSearchParams<{ uri: string; name: string }>();

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ext = name ? name.substring(name.lastIndexOf('.')).toLowerCase() : '';
  const viewMode: ViewMode = ['.txt', '.md', '.json', '.xml', '.log', '.rtf'].includes(ext)
    ? 'text'
    : ext === '.epub'
    ? 'epub'
    : 'unsupported';

  useEffect(() => {
    if (!uri) return;

    async function load() {
      try {
        if (viewMode === 'text') {
          const file = new ExpoFile(uri);
          const text = await file.text();
          setContent(text);
        } else if (viewMode === 'epub') {
          setContent('ePub reading is not supported in-app. You can open this file with an external reader.');
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to read file');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [uri, viewMode]);

  const handleShare = async () => {
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

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={name} showSettings={false} />
      <ScrollView
        style={s.flex1}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        <View style={[s.px4, s.py4]}>
          {viewMode === 'text' && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16 }}>
              {loading ? (
                <View style={[s.itemsCenter, s.py12]}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>Loading file...</Text>
                </View>
              ) : error ? (
                <Text style={[{ color: colors.accent }]}>{error}</Text>
              ) : (
                <Text style={[s.textSm, { color: colors.text, lineHeight: 22, fontFamily: 'monospace' }]}>
                  {content}
                </Text>
              )}
            </View>
          )}

          {viewMode === 'epub' && (
            <View style={[s.itemsCenter, s.py12, s.gap4]}>
              <View style={[s.roundedFull, { padding: 24, backgroundColor: colors.surface }]}>
                <BookOpen size={48} color={colors.accent} />
              </View>
              <Text style={[s.textLg, s.fontBold, s.textCenter, { color: colors.text }]}>
                {name}
              </Text>
              <Text style={[s.textSm, s.textCenter, s.px4, { color: colors.textMuted, lineHeight: 22 }]}>
                In-app ePub reading is not supported yet. Open this file with an external reader.
              </Text>
              <Pressable
                onPress={handleShare}
                style={[s.flexRow, s.itemsCenter, s.gap2, s.py3, { paddingHorizontal: 24, backgroundColor: colors.accent, borderRadius: 9999 }]}
              >
                <ExternalLink size={16} color={colors.background} />
                <Text style={[s.textSm, s.fontSemibold, { color: colors.background }]}>Open Externally</Text>
              </Pressable>
            </View>
          )}

          {viewMode === 'unsupported' && (
            <View style={[s.itemsCenter, s.py12, s.gap4]}>
              <View style={[s.roundedFull, { padding: 24, backgroundColor: colors.surface }]}>
                <File size={48} color={colors.textMuted} />
              </View>
              <Text style={[s.textLg, s.fontBold, s.textCenter, { color: colors.text }]}>
                {name}
              </Text>
              <Text style={[s.textSm, s.textCenter, s.px4, { color: colors.textMuted, lineHeight: 22 }]}>
                This file type cannot be viewed in-app. Open it with an external application.
              </Text>
              <Pressable
                onPress={handleShare}
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
