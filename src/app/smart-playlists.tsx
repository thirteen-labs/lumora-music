import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useSmartPlaylistStore, BUILT_IN_PLAYLISTS } from '@/store/smart-playlist-store';
import { useStatsStore } from '@/store/stats-store';
import { useMusicStore } from '@/store/music-store';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '@/store/player-store';
import type { SmartPlaylist, SmartPlaylistRule } from '@/types/audio';
import {
  Clock, History, TrendingUp, Disc, Plus, Trash2, Music,
  ChevronRight, Zap,
} from 'lucide-react-native';

const ICONS: Record<string, any> = {
  clock: Clock, history: History, 'trending-up': TrendingUp, disc: Disc, zap: Zap,
};

export default function SmartPlaylistsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const songs = useMusicStore((s) => s.songs);
  const stats = useStatsStore();
  const smartPlaylists = useSmartPlaylistStore();
  const play = usePlayerStore((s) => s.play);
  const [showCreate, setShowCreate] = useState(false);

  const handlePlayPlaylist = (playlist: SmartPlaylist) => {
    const resolved = smartPlaylists.resolveSongs(playlist.id, songs, stats.trackStats);
    if (resolved.length === 0) {
      Alert.alert('Empty Playlist', 'No songs match the rules for this playlist.');
      return;
    }
    play(resolved[0], resolved);
    router.back();
  };

  const builtInIcon = (icon: string) => {
    const Icon = ICONS[icon] || Music;
    return <Icon size={20} color={colors.accent} />;
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Smart Playlists" showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-6">
          <View>
            <SectionHeader title="Automatic Playlists" />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              {BUILT_IN_PLAYLISTS.map((playlist, i) => {
                const count = smartPlaylists.resolveSongs(playlist.id, songs, stats.trackStats).length;
                return (
                  <Pressable
                    key={playlist.id}
                    onPress={() => handlePlayPlaylist(playlist)}
                    className="flex-row items-center gap-3 p-4"
                    style={{ borderBottomWidth: i < BUILT_IN_PLAYLISTS.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                  >
                    {builtInIcon(playlist.icon)}
                    <View className="flex-1">
                      <Text className="text-sm font-medium" style={{ color: colors.text }}>{playlist.name}</Text>
                      <Text className="text-xs" style={{ color: colors.textMuted }}>{count} songs</Text>
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <SectionHeader title="Your Smart Playlists" />
            {smartPlaylists.playlists.length === 0 ? (
              <View className="rounded-3xl p-8 items-center" style={{ backgroundColor: colors.surface }}>
                <Zap size={32} color={colors.textMuted} />
                <Text className="text-sm mt-2" style={{ color: colors.textMuted }}>No custom playlists yet</Text>
                <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>Create rules-based playlists</Text>
              </View>
            ) : (
              <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
                {smartPlaylists.playlists.map((playlist, i) => {
                  const count = smartPlaylists.resolveSongs(playlist.id, songs, stats.trackStats).length;
                  return (
                    <View
                      key={playlist.id}
                      className="flex-row items-center gap-3 p-4"
                      style={{ borderBottomWidth: i < smartPlaylists.playlists.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                    >
                      <Zap size={20} color={colors.accent} />
                      <Pressable className="flex-1" onPress={() => handlePlayPlaylist(playlist)}>
                        <Text className="text-sm font-medium" style={{ color: colors.text }}>{playlist.name}</Text>
                        <Text className="text-xs" style={{ color: colors.textMuted }}>
                          {playlist.rules.length} rules • {count} songs
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Alert.alert('Delete', `Delete "${playlist.name}"?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => smartPlaylists.deletePlaylist(playlist.id) },
                          ]);
                        }}
                        style={{ padding: 4 }}
                      >
                        <Trash2 size={16} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <Pressable
            onPress={() => setShowCreate(!showCreate)}
            className="flex-row items-center justify-center gap-2 py-4 rounded-3xl"
            style={{ backgroundColor: colors.accent }}
          >
            <Plus size={18} color={colors.background} />
            <Text className="text-sm font-semibold" style={{ color: colors.background }}>Create Smart Playlist</Text>
          </Pressable>

          {showCreate && (
            <CreateSmartPlaylist onClose={() => setShowCreate(false)} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function CreateSmartPlaylist({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const smartPlaylists = useSmartPlaylistStore();
  const [name, setName] = useState('');
  const [rules, setRules] = useState<SmartPlaylistRule[]>([
    { field: 'genre', operator: 'equals', value: '' },
  ]);

  const addRule = () => {
    setRules([...rules, { field: 'genre', operator: 'equals', value: '' }]);
  };

  const updateRule = (index: number, updates: Partial<SmartPlaylistRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }
    smartPlaylists.addPlaylist({
      name: name.trim(),
      icon: 'zap',
      rules: rules.filter((r) => r.value !== ''),
      matchAll: true,
      limit: 50,
      sortBy: 'title',
      sortOrder: 'asc',
    });
    onClose();
  };

  return (
    <View className="rounded-3xl p-4 gap-4" style={{ backgroundColor: colors.surface }}>
      <Text className="text-sm font-semibold" style={{ color: colors.text }}>New Smart Playlist</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Playlist name"
        placeholderTextColor={colors.textMuted}
        className="px-4 py-3 rounded-2xl text-sm"
        style={{ backgroundColor: colors.card, color: colors.text }}
        accessibilityLabel="Playlist name"
      />

      {rules.map((rule, i) => (
        <View key={i} className="flex-row items-center gap-2">
          <View className="flex-1 rounded-xl px-3 py-2" style={{ backgroundColor: colors.card }}>
            <Text className="text-xs" style={{ color: colors.textMuted }}>Field</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['genre', 'artist', 'album', 'duration', 'playCount', 'dateAdded'] as const).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => updateRule(i, { field: f })}
                  className="px-2 py-1 rounded-lg mr-1 mt-1"
                  style={{ backgroundColor: rule.field === f ? colors.accent + '30' : 'transparent' }}
                >
                  <Text className="text-[10px]" style={{ color: rule.field === f ? colors.accent : colors.textMuted }}>
                    {f}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View className="flex-1 rounded-xl px-3 py-2" style={{ backgroundColor: colors.card }}>
            <Text className="text-xs" style={{ color: colors.textMuted }}>Operator</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['equals', 'contains', 'greater_than', 'less_than'] as const).map((op) => (
                <Pressable
                  key={op}
                  onPress={() => updateRule(i, { operator: op })}
                  className="px-2 py-1 rounded-lg mr-1 mt-1"
                  style={{ backgroundColor: rule.operator === op ? colors.accent + '30' : 'transparent' }}
                >
                  <Text className="text-[10px]" style={{ color: rule.operator === op ? colors.accent : colors.textMuted }}>
                    {op.replace('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <Pressable onPress={() => removeRule(i)} style={{ padding: 4 }}>
            <Trash2 size={14} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}

      <View className="flex-row gap-2">
        <Pressable onPress={addRule} className="flex-1 py-3 rounded-2xl items-center" style={{ backgroundColor: colors.card }}>
          <Text className="text-xs font-semibold" style={{ color: colors.accent }}>+ Add Rule</Text>
        </Pressable>
        <Pressable onPress={save} className="flex-1 py-3 rounded-2xl items-center" style={{ backgroundColor: colors.accent }}>
          <Text className="text-xs font-semibold" style={{ color: colors.background }}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}
