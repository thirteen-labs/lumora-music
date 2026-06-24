import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { useLocalSearchParams } from 'expo-router';
import { FileText, File as FileIcon, BookOpen, ExternalLink, FileArchive, WrapText, Search, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { File as ExpoFile } from 'expo-file-system';
import { formatFileSize, isTextFile, DOC_CATEGORIES } from '@/services/document-engine';
import { openDocument } from '@/services/document-scanner';

type ViewMode = 'text' | 'binary';

export default function DocumentViewerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { uri, name, size, modTime } = useLocalSearchParams<{ uri: string; name: string; size?: string; modTime?: string }>();

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wordWrap, setWordWrap] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const searchInputRef = useRef<TextInput>(null);
  const lineHeightsRef = useRef<number[]>([]);

  const ext = name ? name.substring(name.lastIndexOf('.')).toLowerCase() : '';
  const category = useMemo(() => DOC_CATEGORIES.find((c) => c.extensions.includes(ext)), [ext]);

  const viewMode: ViewMode = isTextFile(name || '') ? 'text' : 'binary';

  const lines = useMemo(() => {
    if (!content) return [];
    return content.split('\n');
  }, [content]);

  const searchMatches = useMemo(() => {
    if (!content || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const idxs: number[] = [];
    const lower = content.toLowerCase();
    let pos = 0;
    while (true) {
      const found = lower.indexOf(q, pos);
      if (found === -1) break;
      idxs.push(found);
      pos = found + 1;
    }
    return idxs;
  }, [content, searchQuery]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    setSearchIndex(0);
  }, []);

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

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleOpenExternally = async () => {
    if (!uri) return;
    try {
      await openDocument(uri);
    } catch {
      Alert.alert('Error', 'Could not open this file.');
    }
  };

  const scrollToLine = useCallback((lineNum: number) => {
    if (lineHeightsRef.current.length === 0) return;
    let offset = 0;
    for (let i = 0; i < lineNum && i < lineHeightsRef.current.length; i++) {
      offset += lineHeightsRef.current[i];
    }
    scrollRef.current?.scrollTo({ y: offset, animated: true });
  }, []);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return <>{text}</>;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase()
            ? <Text key={i} style={{ backgroundColor: colors.accent + '60', color: colors.text, borderRadius: 2 }}>{part}</Text>
            : <Text key={i}>{part}</Text>
        )}
      </>
    );
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
               isTextFile(name) ? <FileText size={28} color={category?.color || colors.textMuted} /> :
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
                  <View style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: category.color }} />
                  <Text style={[s.text10, { color: category.color }]}>{category.label}</Text>
                </View>
              )}
            </View>
          </View>

          {viewMode === 'text' && (
            <>
              {!loading && !error && content !== null && (
                <View style={[s.flexRow, s.itemsCenter, s.gap2]}>
                  <Pressable
                    onPress={() => setWordWrap(!wordWrap)}
                    style={[s.flexRow, s.itemsCenter, s.gap1, { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999, backgroundColor: wordWrap ? colors.accent + '20' : colors.surface }]}
                  >
                    <WrapText size={14} color={wordWrap ? colors.accent : colors.textMuted} />
                    <Text style={[s.textXs, s.fontMedium, { color: wordWrap ? colors.accent : colors.textMuted }]}>Wrap</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowSearch(!showSearch)}
                    style={[s.flexRow, s.itemsCenter, s.gap1, { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999, backgroundColor: showSearch ? colors.accent + '20' : colors.surface }]}
                  >
                    <Search size={14} color={showSearch ? colors.accent : colors.textMuted} />
                    <Text style={[s.textXs, s.fontMedium, { color: showSearch ? colors.accent : colors.textMuted }]}>
                      Search{searchMatches.length > 0 ? ` (${searchIndex + 1}/${searchMatches.length})` : ''}
                    </Text>
                  </Pressable>
                  <View style={s.flex1} />
                  <Text style={[s.text10, { color: colors.textMuted }]}>{lines.length} lines</Text>
                </View>
              )}

              {showSearch && (
                <View style={[s.flexRow, s.itemsCenter, s.gap2]}>
                  <View style={[s.flex1, s.flexRow, s.itemsCenter, s.gap2, s.px3, { backgroundColor: colors.surface, borderRadius: 12, height: 40 }]}>
                    <Search size={14} color={colors.textMuted} />
                    <TextInput
                      ref={searchInputRef}
                      style={[s.flex1, { color: colors.text, fontSize: 13, paddingVertical: 0 }]}
                      placeholder="Search in file..."
                      placeholderTextColor={colors.textMuted}
                      value={searchQuery}
                      onChangeText={handleSearchChange}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                      <Pressable onPress={() => setSearchQuery('')}>
                        <X size={14} color={colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                  {searchMatches.length > 1 && (
                    <>
                      <Pressable
                        onPress={() => setSearchIndex((i) => (i - 1 + searchMatches.length) % searchMatches.length)}
                        style={[s.w9, s.h9, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface, borderRadius: 10 }]}
                      >
                        <ChevronUp size={14} color={colors.text} />
                      </Pressable>
                      <Pressable
                        onPress={() => setSearchIndex((i) => (i + 1) % searchMatches.length)}
                        style={[s.w9, s.h9, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface, borderRadius: 10 }]}
                      >
                        <ChevronDown size={14} color={colors.text} />
                      </Pressable>
                    </>
                  )}
                </View>
              )}

              <View style={{ backgroundColor: colors.surface, borderRadius: 16, minHeight: 200 }}>
                {loading ? (
                  <View style={[s.itemsCenter, s.py12]}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>Loading file...</Text>
                  </View>
                ) : error ? (
                  <View style={[s.itemsCenter, { paddingVertical: 32 }, s.gap3]}>
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
                  <ScrollView
                    ref={scrollRef}
                    horizontal={!wordWrap}
                    nestedScrollEnabled
                    style={{ maxHeight: 600 }}
                  >
                    <View style={{ minWidth: wordWrap ? '100%' : undefined, padding: 16 }}>
                      {lines.map((line, i) => {
                        const lineNum = i + 1;
                        const isActiveSearchLine = searchMatches.length > 0 && searchMatches[searchIndex] !== undefined;
                        const lineStartGlobal = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
                        const lineEndGlobal = lineStartGlobal + line.length;
                        let isHighlighted = false;
                        if (isActiveSearchLine) {
                          const matchPos = searchMatches[searchIndex];
                          isHighlighted = matchPos >= lineStartGlobal && matchPos < lineEndGlobal;
                        }
                        return (
                          <View key={i} style={[s.flexRow, { backgroundColor: isHighlighted ? colors.accent + '15' : 'transparent' }]}>
                            <Text
                              style={[s.text10, { width: 40, color: colors.textMuted, fontFamily: 'monospace', lineHeight: 22, textAlign: 'right', paddingRight: 12, opacity: 0.5 }]}
                              onPress={() => scrollToLine(i)}
                            >
                              {lineNum}
                            </Text>
                            <Text
                              style={[s.textSm, {
                                color: colors.text,
                                fontFamily: 'monospace',
                                lineHeight: 22,
                                flexShrink: wordWrap ? 1 : 0,
                              }]}
                            >
                              {searchQuery ? highlightText(line, searchQuery) : line || ' '}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}
              </View>
            </>
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