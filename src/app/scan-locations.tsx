import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, Alert } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Folder, Plus, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '@/services/mmkv';

const STORAGE_KEY = 'lumora-scan-locations';

interface ScanFolder {
  name: string;
  path: string;
}

function loadFolders(): ScanFolder[] {
  try {
    const raw = storage.getString(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [{ name: 'Internal Music', path: '/storage/emulated/0/Music' }];
  } catch {
    return [{ name: 'Internal Music', path: '/storage/emulated/0/Music' }];
  }
}

function saveFolders(folders: ScanFolder[]) {
  try { storage.set(STORAGE_KEY, JSON.stringify(folders)); } catch {}
}

export default function ScanLocationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [folders, setFolders] = useState<ScanFolder[]>(loadFolders);
  const [showModal, setShowModal] = useState(false);
  const [newPath, setNewPath] = useState('');

  const removeFolder = useCallback((path: string) => {
    const next = folders.filter((f) => f.path !== path);
    setFolders(next);
    saveFolders(next);
  }, [folders]);

  const addFolder = useCallback(() => {
    const trimmed = newPath.trim();
    if (!trimmed) return;
    if (folders.some((f) => f.path === trimmed)) {
      Alert.alert('Duplicate', 'This folder is already in the list.');
      return;
    }
    const name = trimmed.split('/').filter(Boolean).pop() || trimmed;
    const next = [...folders, { name, path: trimmed }];
    setFolders(next);
    saveFolders(next);
    setNewPath('');
    setShowModal(false);
  }, [folders, newPath]);

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Scan Locations</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          {folders.length === 0 ? (
            <View style={[s.itemsCenter, s.py16]}>
              <Folder size={36} color={colors.textMuted} />
              <Text style={[s.mt3, s.textSm, { color: colors.textMuted }]}>No scan folders added</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
              {folders.map((folder, i) => (
                <View
                  key={folder.path}
                  style={[s.flexRow, s.itemsCenter, s.gap4, s.p4, { borderBottomWidth: i < folders.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }]}
                >
                  <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                    <Folder size={20} color={colors.accent} />
                  </View>
                  <View style={s.flex1}>
                    <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{folder.name}</Text>
                    <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>{folder.path}</Text>
                  </View>
                  <Pressable
                    onPress={() => removeFolder(folder.path)}
                    style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.notification + '20' }]}
                    hitSlop={8}
                  >
                    <Trash2 size={16} color={colors.notification} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <Pressable
            onPress={() => setShowModal(true)}
            style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, s.mt4, { paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent + '20' }]}
          >
            <Plus size={18} color={colors.accent} />
            <Text style={[s.textSm, s.fontSemibold, { color: colors.accent }]}>Add Folder</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={{ width: '85%', backgroundColor: colors.surface, borderRadius: 20, padding: 24 }}>
            <Text style={[s.textLg, s.fontBold, s.mb4, { color: colors.text }]}>Add Folder</Text>
            <TextInput
              value={newPath}
              onChangeText={setNewPath}
              placeholder="/storage/emulated/0/Music"
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
