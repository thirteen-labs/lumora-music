import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { useRouter } from 'expo-router';
import {
  FileText, Table, Presentation, BookOpen, File,
  FileArchive, ChevronRight, Files, RefreshCw,
  Search, ArrowUpDown, SortAsc, SortDesc,
} from 'lucide-react-native';
import {
  getDocCategory, formatFileSize, searchDocuments, sortDocuments,
  type DocCategory, type DocFile, type SortField, type SortOrder,
} from '@/services/document-engine';
import { useDocumentStore } from '@/store/document-store';

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

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'date', label: 'Date' },
  { field: 'name', label: 'Name' },
  { field: 'size', label: 'Size' },
];

export default function DocumentReaderScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showSortPicker, setShowSortPicker] = useState(false);

  const files = useDocumentStore((s) => s.files);
  const scanStatus = useDocumentStore((s) => s.scanStatus);
  const scanError = useDocumentStore((s) => s.scanError);
  const categorized = useDocumentStore((s) => s.categorized);
  const categories = useDocumentStore((s) => s.categories);
  const scanDocuments = useDocumentStore((s) => s.scanDocuments);

  const scanning = scanStatus === 'scanning';

  useEffect(() => {
    scanDocuments();
  }, [scanDocuments]);

  const handleRefresh = useCallback(async () => {
    await scanDocuments(true);
  }, [scanDocuments]);

  const handleCategoryPress = useCallback((category: DocCategory) => {
    setSelectedCategory(category);
    setViewMode('category');
    setSearchQuery('');
  }, []);

  const handleAllPress = useCallback(() => {
    setSelectedCategory(null);
    setViewMode('all');
    setSearchQuery('');
  }, []);

  const handleDocPress = useCallback((doc: DocFile) => {
    router.push({ pathname: '/document-viewer', params: { uri: doc.uri, name: doc.name, size: String(doc.size), modTime: String(doc.modificationTime) } } as any);
  }, [router]);

  const handleBack = useCallback(() => {
    if (viewMode === 'category' || viewMode === 'all') {
      setViewMode('categories');
      setSelectedCategory(null);
      setSearchQuery('');
    } else {
      router.back();
    }
  }, [viewMode, router]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
  }, []);

  const currentDocs = useMemo(() => {
    let docs: DocFile[];
    if (viewMode === 'all') {
      docs = files;
    } else if (viewMode === 'category' && selectedCategory) {
      docs = categorized.categorized[selectedCategory.id] || [];
    } else {
      docs = [];
    }
    docs = searchDocuments(docs, searchQuery);
    docs = sortDocuments(docs, sortField, sortOrder);
    return docs;
  }, [viewMode, selectedCategory, categorized, files, searchQuery, sortField, sortOrder]);

  const hasDocsForCategory = (id: string) => (categorized.counts[id] || 0) > 0;

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
                    {scanning ? 'Scanning your device...' : `${files.length} documents found`}
                  </Text>
                </View>
                {scanning && <ActivityIndicator size="small" color={colors.accent} />}
                {!scanning && (
                  <Pressable onPress={handleRefresh} style={s.iconButton}>
                    <RefreshCw size={18} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>

              {scanError && (
                <View style={[{ backgroundColor: colors.accent + '15', borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: colors.accent }]}>
                  <Text style={[s.textXs, { color: colors.accent }]}>{scanError}</Text>
                </View>
              )}

              {!scanning && files.length > 0 && (
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
                    <Text style={[s.text10, { color: colors.textMuted }]}>{files.length} files</Text>
                  </View>
                  <ChevronRight size={16} color={colors.textMuted} />
                </Pressable>
              )}

              <Text style={[s.textXs, s.fontBold, s.uppercase, s.mt2, s.mb3, { letterSpacing: 1, color: colors.textMuted }]}>
                Categories
              </Text>

              <View style={[s.flexRow, s.flexWrap, { gap: 12 }]}>
                {categories.map((category) => {
                  const Icon = CATEGORY_ICONS[category.id] || File;
                  const count = categorized.counts[category.id] || 0;
                  const hasDocs = hasDocsForCategory(category.id);
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => hasDocs && handleCategoryPress(category)}
                      style={[{
                        width: '48%',
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        padding: 16,
                        borderLeftWidth: 3,
                        borderLeftColor: category.color,
                        opacity: hasDocs ? 1 : 0.4,
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

              <View style={[s.flexRow, s.itemsCenter, s.gap2]}>
                <View style={[s.flex1, s.flexRow, s.itemsCenter, s.gap2, s.px3, { backgroundColor: colors.surface, borderRadius: 12, height: 40 }]}>
                  <Search size={16} color={colors.textMuted} />
                  <TextInput
                    style={[s.flex1, { color: colors.text, fontSize: 14, paddingVertical: 0 }]}
                    placeholder="Search documents..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Pressable
                  onPress={toggleSortOrder}
                  style={[s.w10, s.h10, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface, borderRadius: 12 }]}
                >
                  {sortOrder === 'desc' ? <SortDesc size={18} color={colors.textMuted} /> : <SortAsc size={18} color={colors.textMuted} />}
                </Pressable>
                <Pressable
                  onPress={() => setShowSortPicker(!showSortPicker)}
                  style={[s.flexRow, s.itemsCenter, s.gap1, { paddingHorizontal: 10, height: 40, backgroundColor: colors.surface, borderRadius: 12 }]}
                >
                  <ArrowUpDown size={16} color={colors.accent} />
                  <Text style={[s.textXs, s.fontSemibold, { color: colors.accent }]}>
                    {SORT_OPTIONS.find((o) => o.field === sortField)?.label}
                  </Text>
                </Pressable>
              </View>

              {showSortPicker && (
                <View style={[s.flexRow, s.gap2]}>
                  {SORT_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.field}
                      onPress={() => { setSortField(opt.field); setShowSortPicker(false); }}
                      style={[{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 10,
                        alignItems: 'center',
                        backgroundColor: sortField === opt.field ? colors.accent : colors.surface,
                      }]}
                    >
                      <Text style={[s.textXs, s.fontSemibold, { color: sortField === opt.field ? colors.background : colors.text }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {currentDocs.length === 0 ? (
                <View style={[s.itemsCenter, s.justifyCenter, s.py20]}>
                  <FileText size={48} color={colors.textMuted} />
                  <Text style={[s.textSm, s.mt4, { color: colors.textMuted }]}>No documents found</Text>
                  <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>
                    {searchQuery ? 'Try a different search term' : 'Try checking your Download or Documents folders'}
                  </Text>
                </View>
              ) : (
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', marginTop: 4 }}>
                  {currentDocs.map((doc, i) => {
                    const cat = getDocCategory(doc.name);
                    const Icon = cat ? (CATEGORY_ICONS[cat.id] || File) : File;
                    const catColor = cat?.color || colors.textMuted;
                    return (
                      <Pressable
                        key={doc.uri}
                        onPress={() => handleDocPress(doc)}
                        style={[s.flexRow, s.itemsCenter, s.gap3, s.p4]}
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