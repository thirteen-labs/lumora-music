import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { useRouter } from 'expo-router';
import {
  FileText, Table, Presentation, BookOpen, File,
  FileArchive, ChevronRight, FolderOpen,
} from 'lucide-react-native';
import {
  DOC_CATEGORIES, type DocCategory, type DocFile,
  scanDocuments, openDocument, getRootDocPaths, formatFileSize,
} from '@/services/document-scanner';

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  word: FileText,
  excel: Table,
  powerpoint: Presentation,
  epub: BookOpen,
  text: File,
  other: FileArchive,
};

export default function DocumentReaderScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | null>(null);
  const [documents, setDocuments] = useState<DocFile[]>([]);
  const [scanning, setScanning] = useState(false);
  const scanPaths = getRootDocPaths();

  const handleCategoryPress = useCallback(async (category: DocCategory) => {
    setSelectedCategory(category);
    setScanning(true);
    setDocuments([]);

    const allDocs: DocFile[] = [];
    for (const path of scanPaths) {
      try {
        const docs = await scanDocuments(path);
        const filtered = docs.filter((d) => {
          const ext = d.name.substring(d.name.lastIndexOf('.')).toLowerCase();
          return category.extensions.includes(ext);
        });
        allDocs.push(...filtered);
      } catch {}
    }

    setDocuments(allDocs);
    setScanning(false);
  }, [scanPaths]);

  const handleDocPress = useCallback(async (doc: DocFile) => {
    const ext = doc.name.substring(doc.name.lastIndexOf('.')).toLowerCase();
    if (ext === '.txt' || ext === '.md' || ext === '.json' || ext === '.xml' || ext === '.log' || ext === '.rtf') {
      router.push({ pathname: '/document-viewer', params: { uri: doc.uri, name: doc.name } } as any);
    } else if (ext === '.epub') {
      router.push({ pathname: '/document-viewer', params: { uri: doc.uri, name: doc.name } } as any);
    } else {
      try {
        await openDocument(doc.uri);
      } catch {
        Alert.alert('Error', 'Could not open this file type.');
      }
    }
  }, [router]);

  const handleBack = useCallback(() => {
    if (selectedCategory) {
      setSelectedCategory(null);
      setDocuments([]);
    } else {
      router.back();
    }
  }, [selectedCategory, router]);

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar
        title={selectedCategory ? selectedCategory.label : 'Document Reader'}
        showSettings={false}
      />
      <ScrollView
        style={s.flex1}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        <View style={[s.px4, s.py4, s.gap4]}>
          {!selectedCategory ? (
            <>
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb2]}>
                <View style={[s.w12, s.h12, s.rounded2xl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '20' }]}>
                  <FileText size={24} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textXl, s.fontBold, { color: colors.text }]}>Document Reader</Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>Browse and read documents on your device</Text>
                </View>
              </View>

              <Text style={[s.textXs, s.fontBold, s.uppercase, s.mt2, s.mb3, { letterSpacing: 1, color: colors.textMuted }]}>
                Categories
              </Text>

              <View style={[s.flexRow, s.flexWrap, { gap: 12 }]}>
                {DOC_CATEGORIES.map((category) => {
                  const Icon = CATEGORY_ICONS[category.id] || File;
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
                            {category.extensions.join(', ')}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[s.textXs, s.fontBold, s.uppercase, s.mt4, s.mb3, { letterSpacing: 1, color: colors.textMuted }]}>
                Scan Locations
              </Text>
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                {scanPaths.map((path, i) => (
                  <View key={i} style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, i < scanPaths.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border + '20' } : undefined]}>
                    <FolderOpen size={18} color={colors.accent} />
                    <Text style={[s.textXs, s.flex1, { color: colors.textMuted }]}>{path}</Text>
                  </View>
                ))}
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
                <View style={[s.w12, s.h12, s.rounded2xl, s.itemsCenter, s.justifyCenter, { backgroundColor: selectedCategory.color + '20' }]}>
                  {(() => {
                    const Icon = CATEGORY_ICONS[selectedCategory.id] || File;
                    return <Icon size={24} color={selectedCategory.color} />;
                  })()}
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>{selectedCategory.label}</Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>{documents.length} files found</Text>
                </View>
                {scanning && <ActivityIndicator size="small" color={colors.accent} />}
              </View>

              {scanning ? (
                <View style={[s.flex1, s.itemsCenter, s.justifyCenter, s.py20]}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={[s.textSm, s.mt4, { color: colors.textMuted }]}>Scanning for {selectedCategory.label} files...</Text>
                </View>
              ) : documents.length === 0 ? (
                <View style={[s.flex1, s.itemsCenter, s.justifyCenter, s.py20]}>
                  <FileText size={48} color={colors.textMuted} />
                  <Text style={[s.textSm, s.mt4, { color: colors.textMuted }]}>No {selectedCategory.label} files found</Text>
                  <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>Try checking your Download or Documents folders</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', marginTop: 8 }}>
                  {documents.map((doc, i) => {
                    const Icon = CATEGORY_ICONS[selectedCategory.id] || File;
                    return (
                      <Pressable
                        key={doc.uri}
                        onPress={() => handleDocPress(doc)}
                        style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, i < documents.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border + '20' } : undefined]}
                      >
                        <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: selectedCategory.color + '15' }]}>
                          <Icon size={20} color={selectedCategory.color} />
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
