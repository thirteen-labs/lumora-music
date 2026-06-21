import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, Alert } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, FolderMinus, Plus, Trash2, FolderOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '@/store/settings-store';
import { requestDocumentDirectoryPermission } from '@/services/document-scanner';

export default function ExcludedFoldersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const folders = useSettingsStore((s) => s.excludedFolders);
  const setFolders = useSettingsStore((s) => s.setExcludedFolders);
  
  const [showModal, setShowModal] = useState(false);
  const [newPath, setNewPath] = useState('');

  const removeFolder = useCallback((path: string) => {
    const next = folders.filter((f) => f !== path);
    setFolders(next);
  }, [folders, setFolders]);

  const addFolder = useCallback(() => {
    const trimmed = newPath.trim();
    if (!trimmed) return;
    if (folders.includes(trimmed)) {
      Alert.alert('Duplicate', 'This folder is already in the excluded list.');
      return;
    }
    const next = [...folders, trimmed];
    setFolders(next);
    setNewPath('');
    setShowModal(false);
  }, [folders, newPath, setFolders]);

  const addSAFFolder = useCallback(async () => {
    const uri = await requestDocumentDirectoryPermission();
    if (uri) {
      if (folders.includes(uri)) {
        Alert.alert('Duplicate', 'This folder is already in the excluded list.');
        return;
      }
      const next = [...folders, uri];
      setFolders(next);
    }
  }, [folders, setFolders]);

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Excluded Folders</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          {folders.length === 0 ? (
            <View style={[s.itemsCenter, s.py16]}>
              <FolderMinus size={36} color={colors.textMuted} />
              <Text style={[s.mt3, s.textSm, { color: colors.textMuted }]}>No folders excluded</Text>
              <Text style={[s.mt1, s.textXs, { color: colors.textMuted }, { textAlign: 'center' }]}>
                Add folders like Ringtones or Games{'\n'}to keep your library clean.
              </Text>
            </View>
          ) : (
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
              {folders.map((folderPath) => {
                const name = decodeURIComponent(folderPath.split('%2F').pop() ?? folderPath.split('/').pop() ?? folderPath);
                return (
                  <View
                    key={folderPath}
                    style={[s.flexRow, s.itemsCenter, s.gap4, s.p4]}
                  >
                    <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.notification + '15' }]}>
                      <FolderMinus size={20} color={colors.notification} />
                    </View>
                    <View style={s.flex1}>
                      <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{name}</Text>
                      <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>{folderPath}</Text>
                    </View>
                    <Pressable
                      onPress={() => removeFolder(folderPath)}
                      style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.notification + '20' }]}
                      hitSlop={8}
                    >
                      <Trash2 size={16} color={colors.notification} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          <Pressable
            onPress={addSAFFolder}
            style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, s.mt4, { paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent + '20' }]}
          >
            <FolderOpen size={18} color={colors.accent} />
            <Text style={[s.textSm, s.fontSemibold, { color: colors.accent }]}>Pick Folder (SAF)</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowModal(true)}
            style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, s.mt2, { paddingVertical: 12, borderRadius: 16, backgroundColor: colors.card }]}
          >
            <Plus size={18} color={colors.textMuted} />
            <Text style={[s.textSm, s.fontSemibold, { color: colors.textMuted }]}>Add Path Manually</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={{ width: '85%', backgroundColor: colors.surface, borderRadius: 20, padding: 24 }}>
            <Text style={[s.textLg, s.fontBold, s.mb4, { color: colors.text }]}>Add Folder Path</Text>
            <TextInput
              value={newPath}
              onChangeText={setNewPath}
              placeholder="/storage/emulated/0/Ringtones"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[s.px4, s.py3, { backgroundColor: colors.background, borderRadius: 12, color: colors.text, fontSize: 15 }]}
            />
            <View style={[s.flexRow, s.gap3, s.mt4]}>
              <Pressable
                onPress={() => { setNewPath(''); setShowModal(false); }}
                style={[s.flex1, s.itemsCenter, s.py3, { borderRadius: 12, backgroundColor: colors.background }]}
              >
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={addFolder}
                style={[s.flex1, s.itemsCenter, s.py3, { borderRadius: 12, backgroundColor: colors.accent }]}
              >
                <Text style={[s.textSm, s.fontSemibold, { color: '#fff' }]}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
