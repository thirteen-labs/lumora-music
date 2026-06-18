import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { useRouter } from 'expo-router';
import {
  FileText, Table, Presentation, BookOpen, File,
  FileArchive, ChevronRight, Files, RefreshCw,
} from 'lucide-react-native';
import {
  DOC_CATEGORIES, type DocCategory, type DocFile,
  scanRootDirectories, categorizeAndCount, getDocCategory,
  type CategorizedResult, formatFileSize,
} from '@/services/document-scanner';
import { storage } from '@/services/mmkv';

const DOC_CACHE_KEY = 'lumora-documents';
const DOC_CACHE_TIME_KEY = 'lumora-documents-time';

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  word: FileText,
  excel: Table,
  powerpoint: Presentation,
  epub: BookOpen,
  text: File,
  other: FileArchive,
};

type ViewMode = 'categories' | 'category' | 'all';

export default function DocumentReaderScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | null>(null);
  const [allDocuments, setAllDocuments] = useState<DocFile[]>([]);
  const [scanning, setScanning] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cached = storage.getString(DOC_CACHE_KEY);
      if (cached) {
        try {
          const docs: DocFile[] = JSON.parse(cached);
          if (!cancelled) setAllDocuments(docs);
        } catch {}
        if (!cancelled) setScanning(false);
        return;
      }
      if (!cancelled) setScanning(true);
      try {
        const docs = await scanRootDirectories();
        storage.set(DOC_CACHE_KEY, JSON.stringify(docs));
        storage.set(DOC_CACHE_TIME_KEY, new Date().toISOString());
        if (!cancelled) setAllDocuments(docs);
      } catch (e: any) {
        if (!cancelled) setScanError(e?.message || 'Failed to scan documents');
      } finally {
        if (!cancelled) setScanning(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleRefresh = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    try {
      const docs = await scanRootDirectories();
      storage.set(DOC_CACHE_KEY, JSON.stringify(docs));
      storage.set(DOC_CACHE_TIME_KEY, new Date().toISOString());
      setAllDocuments(docs);
    } catch (e: any) {
      setScanError(e?.message || 'Failed to scan documents');
    } finally {
      setScanning(false);
    }
  }, []);

  const { categorized, counts: categoryCounts } = useMemo<CategorizedResult>(
    () => categorizeAndCount(allDocuments), [allDocuments]
  );

  const handleCategoryPress = useCallback((category: DocCategory) => {
    setSelectedCategory(category);
    setViewMode('category');
  }, []);

  const handleAllPress = useCallback(() => {
    setSelectedCategory(null);
    setViewMode('all');
  }, []);

  const handleDocPress = useCallback((doc: DocFile) => {
    router.push({ pathname: '/document-viewer', params: { uri: doc.uri, name: doc.name, size: String(doc.size), modTime: String(doc.modificationTime) } } as any);
  }, [router]);

  const handleBack = useCallback(() => {
    if (viewMode === 'category' || viewMode === 'all') {
      setViewMode('categories');
      setSelectedCategory(null);
    } else {
      router.back();
    }
  }, [viewMode, router]);

  const currentDocs = useMemo(() => {
    if (viewMode === 'all') return allDocuments;
    if (viewMode === 'category' && selectedCategory) return categorized[selectedCategory.id] || [];
    return [];
  }, [viewMode, selectedCategory, categorized, allDocuments]);

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar
        title={
          viewMode === 'category' && selectedCategory ? selectedCategory.label
          : viewMode === 'all' ? 'All Documents'
          : 'Document Reader'
        }
        showSettings={false}
      />
      <ScrollView
        style={s.flex1}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        <View style={[s.px4, s.py4, s.gap4]}>
          {viewMode === 'categories' ? (
            <>
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb2]}>
                <View style={[s.w12, s.h12, s.rounded2xl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '20' }]}>
                  <FileText size={24} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textXl, s.fontBold, { color: colors.text }]}>Document Reader</Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>
                    {scanning ? 'Scanning your device...' : `${allDocuments.length} documents found`}
                  </Text>
                </View>
                {scanning && <ActivityIndicator size="small" color={colors.accent} />}
                {!scanning && (
                  <Pressable onPress={handleRefresh} style={{ padding: 6, borderRadius: 6 }}>
                    <RefreshCw size={18} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>

              {scanError && (
                <View style={[{ backgroundColor: colors.accent + '15', borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: colors.accent }]}>
                  <Text style={[s.textXs, { color: colors.accent }]}>{scanError}</Text>
                </View>
              )}

              {!scanning && allDocuments.length > 0 && (
                <Pressable
                  onPress={handleAllPress}
                  style={[s.flexRow, s.itemsCenter, s.gap3, {
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 16,
                    borderLeftWidth: 3,
                    borderLeftColor: colors.accent,
                  }]}
                >
                  <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '20' }]}>
                    <Files size={20} color={colors.accent} />
                  </View>
                  <View style={s.flex1}>
                    <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>All Documents</Text>
                    <Text style={[s.text10, { color: colors.textMuted }]}>{allDocuments.length} files</Text>
                  </View>
                  <ChevronRight size={16} color={colors.textMuted} />
                </Pressable>
              )}

              <Text style={[s.textXs, s.fontBold, s.uppercase, s.mt2, s.mb3, { letterSpacing: 1, color: colors.textMuted }]}>
                Categories
              </Text>

              <View style={[s.flexRow, s.flexWrap, { gap: 12 }]}>
                {DOC_CATEGORIES.map((category) => {
                  const Icon = CATEGORY_ICONS[category.id] || File;
                  const count = categoryCounts[category.id] || 0;
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => handleCategoryPress(category)}
                      style={[{
                        width: '48%',
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        padding: 16,
                        borderLeftWidth: 3,
                        borderLeftColor: category.color,
                      }]}
                    >
                      <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                        <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: category.color + '20' }]}>
                          <Icon size={20} color={category.color} />
                        </View>
                        <View style={s.flex1}>
                          <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>{category.label}</Text>
                          <Text style={[s.text10, { color: colors.textMuted }]}>
                            {scanning ? '...' : `${count} files`}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <Pressable
                onPress={handleBack}
                style={[s.flexRow, s.itemsCenter, s.gap2, s.mb2]}
              >
                <ChevronRight size={18} color={colors.accent} style={{ transform: [{ rotate: '180deg' }] }} />
                <Text style={[s.textSm, { color: colors.accent }]}>All Categories</Text>
              </Pressable>

              <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                <View style={[s.w12, s.h12, s.rounded2xl, s.itemsCenter, s.justifyCenter, { backgroundColor: (selectedCategory?.color || colors.accent) + '20' }]}>
                  {viewMode === 'all' ? (
                    <Files size={24} color={colors.accent} />
                  ) : (
                    (() => {
                      const Icon = selectedCategory ? (CATEGORY_ICONS[selectedCategory.id] || File) : Files;
                      return <Icon size={24} color={selectedCategory?.color || colors.accent} />;
                    })()
                  )}
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>
                    {viewMode === 'all' ? 'All Documents' : selectedCategory?.label}
                  </Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>{currentDocs.length} files</Text>
                </View>
              </View>

              {currentDocs.length === 0 ? (
                <View style={[s.flex1, s.itemsCenter, s.justifyCenter, s.py20]}>
                  <FileText size={48} color={colors.textMuted} />
                  <Text style={[s.textSm, s.mt4, { color: colors.textMuted }]}>No documents found</Text>
                  <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>Try checking your Download or Documents folders</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', marginTop: 8 }}>
                  {currentDocs.map((doc, i) => {
                    const cat = getDocCategory(doc.name);
                    const Icon = cat ? (CATEGORY_ICONS[cat.id] || File) : File;
                    const catColor = cat?.color || colors.textMuted;
                    return (
                      <Pressable
                        key={doc.uri}
                        onPress={() => handleDocPress(doc)}
                        style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, i < currentDocs.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border + '20' } : undefined]}
                      >
                        <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: catColor + '15' }]}>
                          <Icon size={20} color={catColor} />
                        </View>
                        <View style={s.flex1}>
                          <Text style={[s.textSm, s.fontMedium, { color: colors.text }]} numberOfLines={1}>
                            {doc.name}
                          </Text>
                          <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mt05]}>
                            <Text style={[s.text10, { color: colors.textMuted }]}>{formatFileSize(doc.size)}</Text>
                            {doc.modificationTime > 0 && (
                              <>
                                <Text style={[s.text10, { color: colors.textMuted }]}>·</Text>
                                <Text style={[s.text10, { color: colors.textMuted }]}>
                                  {new Date(doc.modificationTime).toLocaleDateString()}
                                </Text>
                              </>
                            )}
                          </View>
                        </View>
                        <ChevronRight size={16} color={colors.textMuted} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}