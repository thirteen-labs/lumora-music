import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { 
  ShieldAlert, 
  ChevronLeft, 
  FolderPlus, 
  Music, 
  ChevronRight,
  Boxes,
  Info
} from 'lucide-react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { usePlayerStore } from '@/store/player-store';
import { listMediaContents } from '@/services/file-browser';
import { formatFileSize } from '@/utils/cn';
import { clusterFiles, type FileCluster, type ClusteredFile } from '@/utils/file-clustering';
import type { Song } from '@/types/media';

export default function DeepFilesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const play = usePlayerStore((s) => s.play);
  
  const [loading, setLoading] = useState(false);
  const [rootUri, setRootUri] = useState<string | null>(null);
  const [clusteredData, setClusteredData] = useState<(ClusteredFile | FileCluster)[]>([]);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  const requestDeepAccess = async (name: string) => {
    try {
      Alert.alert(
        "Deep Access",
        `To access ${name}, please grant permission to that specific folder in the next screen.`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Continue", 
            onPress: async () => {
              const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
              if (result.granted) {
                setRootUri(result.directoryUri);
                scanDeepFolder(result.directoryUri);
              }
            } 
          }
        ]
      );
    } catch (err) {
      console.warn(`[DeepFiles] Permission for ${name} failed:`, err);
    }
  };

  const scanDeepFolder = async (uri: string) => {
    setLoading(true);
    try {
      // 1. Get all subfolders
      const files = await StorageAccessFramework.readDirectoryAsync(uri);
      let allMedia: ClusteredFile[] = [];

      // 2. Scan first level subfolders for media (simplified deep scan)
      // Note: Iterating many subfolders might be slow, so we'll limit depth
      for (const fileUri of files.slice(0, 50)) { // Limit to 50 dirs for safety
        if (fileUri.includes('%2F')) { // It's likely a directory if it doesn't have an extension
           const contents = await listMediaContents(fileUri, 'all' as any);
           allMedia.push(...contents.mediaFiles.map(f => ({
             name: f.name,
             uri: f.uri,
             size: f.size
           })));
        }
      }

      // 3. Cluster them
      const clustered = clusterFiles(allMedia);
      setClusteredData(clustered);
    } catch (err) {
      console.warn('[DeepFiles] Scan failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayFile = async (file: ClusteredFile) => {
    const song: Song = {
      id: file.uri,
      uri: file.uri,
      title: file.name,
      artist: 'Deep File',
      album: 'Unrestricted',
      albumId: 'deep',
      duration: 0,
      fileSize: file.size,
      dateAdded: 0,
      artwork: null,
      genre: null,
      bitrate: null,
      sampleRate: null,
    };
    await play(song, [song]);
  };

  const toggleCluster = (id: string) => {
    setExpandedCluster(expandedCluster === id ? null : id);
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={[s.flexRow, s.itemsCenter, s.justifyBetween]}>
          <Pressable onPress={() => router.back()} style={[s.w10, s.h10, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.card }]}>
            <ChevronLeft size={20} color={colors.text} />
          </Pressable>
          <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Deep Files</Text>
          <View style={s.w10} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          
          {!rootUri ? (
            <View style={[{ padding: 24, backgroundColor: colors.card, borderRadius: 24, marginTop: 10 }]}>
              <View style={[s.w14, s.h14, s.rounded2xl, s.itemsCenter, s.justifyCenter, s.mb4, { backgroundColor: colors.accent + '20' }]}>
                <ShieldAlert size={32} color={colors.accent} />
              </View>
              <Text style={[s.textXl, s.fontBold, s.mb2, { color: colors.text }]}>Restricted Access</Text>
              <Text style={[s.textSm, s.mb6, { color: colors.textMuted, lineHeight: 20 }]}>
                Android blocks access to app data by default. Grant access to specific system folders to find hidden media.
              </Text>
              
              <View style={s.gap3}>
                <Pressable 
                  onPress={() => requestDeepAccess('Android/data')}
                  style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 16 }]}
                >
                  <FolderPlus size={18} color="#fff" />
                  <Text style={[s.textSm, s.fontBold, { color: '#fff' }]}>Grant data/ Access</Text>
                </Pressable>

                <Pressable 
                  onPress={() => requestDeepAccess('Android/media')}
                  style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { backgroundColor: colors.surface, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.accent + '30' }]}
                >
                  <FolderPlus size={18} color={colors.accent} />
                  <Text style={[s.textSm, s.fontBold, { color: colors.accent }]}>Grant media/ Access</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.mb4]}>
              <View>
                <Text style={[s.textSm, s.fontBold, { color: colors.text }]}>Discovered Media</Text>
                <Text style={[s.textXs, { color: colors.textMuted }]}>{clusteredData.length} entries found</Text>
              </View>
              <Pressable onPress={() => scanDeepFolder(rootUri)} style={{ padding: 8 }}>
                <Boxes size={20} color={colors.accent} />
              </Pressable>
            </View>
          )}

          {loading ? (
            <View style={[s.itemsCenter, s.py20]}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[s.textSm, s.mt4, { color: colors.textMuted }]}>Packing files...</Text>
            </View>
          ) : (
            <View style={s.gap3}>
              {clusteredData.map((item) => {
                if ('files' in item) {
                  const isExpanded = expandedCluster === item.id;
                  return (
                    <View key={item.id} style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                      <Pressable 
                        onPress={() => toggleCluster(item.id)}
                        style={[s.flexRow, s.itemsCenter, s.gap3, s.p4]}
                      >
                        <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                          <Boxes size={20} color={colors.accent} />
                        </View>
                        <View style={s.flex1}>
                          <Text style={[s.textSm, s.fontBold, { color: colors.text }]}>{item.name}</Text>
                          <Text style={[s.textXs, { color: colors.textMuted }]}>{item.files.length} items packed</Text>
                        </View>
                        <ChevronRight size={16} color={colors.textMuted} style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
                      </Pressable>
                      
                      {isExpanded && (
                        <View style={{ borderTopWidth: 1, borderTopColor: colors.background + '50', paddingLeft: 16 }}>
                          {item.files.map((file) => (
                            <FileItemRow key={file.uri} file={file} onPress={() => handlePlayFile(file)} colors={colors} />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                } else {
                  return (
                    <View key={item.uri} style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
                      <FileItemRow file={item} onPress={() => handlePlayFile(item)} colors={colors} />
                    </View>
                  );
                }
              })}
            </View>
          )}

          {rootUri && !loading && clusteredData.length === 0 && (
            <View style={[s.itemsCenter, s.py20]}>
              <Info size={40} color={colors.textMuted} />
              <Text style={[s.textSm, s.mt3, { color: colors.textMuted }]}>No restricted media found</Text>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

function FileItemRow({ file, onPress, colors }: { file: ClusteredFile; onPress: () => void; colors: any }) {
  return (
    <Pressable 
      onPress={onPress}
      style={({ pressed }) => [
        s.flexRow, s.itemsCenter, s.gap3, s.p3,
        { backgroundColor: pressed ? colors.background : 'transparent' }
      ]}
    >
      <View style={[{ width: 32, height: 32 }, s.roundedLg, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '10' }]}>
        <Music size={14} color={colors.accent} />
      </View>
      <View style={s.flex1}>
        <Text style={[s.textSm, { color: colors.text }]} numberOfLines={1}>{file.name}</Text>
        <Text style={[s.textXs, { color: colors.textMuted }]}>{formatFileSize(file.size)}</Text>
      </View>
    </Pressable>
  );
}
