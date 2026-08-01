import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const songs = useMusicStore((s) => s.songs);
  const trackStats = useStatsStore((s) => s.trackStats);
  const resolveSongs = useSmartPlaylistStore((s) => s.resolveSongs);
  const customPlaylists = useSmartPlaylistStore((s) => s.playlists);
  const play = usePlayerStore((s) => s.play);
  const [showCreate, setShowCreate] = useState(false);

  const builtInCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of BUILT_IN_PLAYLISTS) {
      counts[p.id] = resolveSongs(p.id, songs, trackStats).length;
    }
    return counts;
  }, [songs, trackStats, resolveSongs]);

  const customCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of customPlaylists) {
      counts[p.id] = resolveSongs(p.id, songs, trackStats).length;
    }
    return counts;
  }, [customPlaylists, songs, trackStats, resolveSongs]);

  const handlePlayPlaylist = useCallback((playlist: SmartPlaylist) => {
    const resolved = resolveSongs(playlist.id, songs, trackStats);
    if (resolved.length === 0) {
      Alert.alert('Empty Playlist', 'No songs match the rules for this playlist.');
      return;
    }
    play(resolved[0], resolved);
    router.back();
  }, [resolveSongs, songs, trackStats, play, router]);

  const builtInIcon = (icon: string) => {
    const Icon = ICONS[icon] || Music;
    return <Icon size={20} color={colors.accent} />;
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="Smart Playlists" showSettings={false} />
      <ScrollView style={s.flex1} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.px4, s.py4, s.gap6]}>
          <View>
            <SectionHeader title="Automatic Playlists" />
            <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
              {BUILT_IN_PLAYLISTS.map((playlist, i) => {
                const count = builtInCounts[playlist.id] ?? 0;
                return (
                  <Pressable
                    key={playlist.id}
                    onPress={() => handlePlayPlaylist(playlist)}
                    style={[s.flexRow, s.itemsCenter, s.gap3, s.p4]}
                  >
                    {builtInIcon(playlist.icon)}
                    <View style={s.flex1}>
                      <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{playlist.name}</Text>
                      <Text style={[s.textXs, { color: colors.textMuted }]}>{count} songs</Text>
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <SectionHeader title="Your Smart Playlists" />
            {customPlaylists.length === 0 ? (
              <View style={[s.rounded3xl, { padding: 32, alignItems: 'center', backgroundColor: colors.surface }]}>
                <Zap size={32} color={colors.textMuted} />
                <Text style={[s.textSm, s.mt2, { color: colors.textMuted }]}>No custom playlists yet</Text>
                <Text style={[s.textXs, s.mt1, { color: colors.textMuted }]}>Create rules-based playlists</Text>
              </View>
            ) : (
              <View style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}>
                {customPlaylists.map((playlist, i) => {
                  const count = customCounts[playlist.id] ?? 0;
                  return (
                    <View
                      key={playlist.id}
                      style={[s.flexRow, s.itemsCenter, s.gap3, s.p4]}
                    >
                      <Zap size={20} color={colors.accent} />
                      <Pressable style={s.flex1} onPress={() => handlePlayPlaylist(playlist)}>
                        <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{playlist.name}</Text>
                        <Text style={[s.textXs, { color: colors.textMuted }]}>
                          {playlist.rules.length} rules • {count} songs
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Alert.alert('Delete', `Delete "${playlist.name}"?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => useSmartPlaylistStore.getState().deletePlaylist(playlist.id) },
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
            style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { paddingVertical: 16, borderRadius: 24, backgroundColor: colors.accent }]}
          >
            <Plus size={18} color={colors.background} />
            <Text style={[s.textSm, s.fontSemibold, { color: colors.background }]}>Create Smart Playlist</Text>
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
  const addPlaylist = useSmartPlaylistStore((s) => s.addPlaylist);
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
    addPlaylist({
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
    <View style={[s.rounded3xl, s.p4, s.gap4, { backgroundColor: colors.surface }]}>
      <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>New Smart Playlist</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Playlist name"
        placeholderTextColor={colors.textMuted}
        style={[{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, fontSize: 14, backgroundColor: colors.card, color: colors.text }]}
        accessibilityLabel="Playlist name"
      />

      {rules.map((rule, i) => (
        <View key={i} style={[s.flexRow, s.itemsCenter, s.gap2]}>
          <View style={[s.flex1, { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.card }]}>
            <Text style={[s.textXs, { color: colors.textMuted }]}>Field</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['genre', 'artist', 'album', 'duration', 'playCount', 'dateAdded'] as const).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => updateRule(i, { field: f })}
                  style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 4, marginTop: 4, backgroundColor: rule.field === f ? colors.accent + '30' : 'transparent' }]}
                >
                  <Text style={[s.text10, { color: rule.field === f ? colors.accent : colors.textMuted }]}>
                    {f}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={[s.flex1, { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.card }]}>
            <Text style={[s.textXs, { color: colors.textMuted }]}>Operator</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['equals', 'contains', 'greater_than', 'less_than'] as const).map((op) => (
                <Pressable
                  key={op}
                  onPress={() => updateRule(i, { operator: op })}
                  style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 4, marginTop: 4, backgroundColor: rule.operator === op ? colors.accent + '30' : 'transparent' }]}
                >
                  <Text style={[s.text10, { color: rule.operator === op ? colors.accent : colors.textMuted }]}>
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

      <View style={[s.flexRow, s.gap2]}>
        <Pressable onPress={addRule} style={[s.flex1, { paddingVertical: 12, borderRadius: 16, alignItems: 'center', backgroundColor: colors.card }]}>
          <Text style={[s.textXs, s.fontSemibold, { color: colors.accent }]}>+ Add Rule</Text>
        </Pressable>
        <Pressable onPress={save} style={[s.flex1, { paddingVertical: 12, borderRadius: 16, alignItems: 'center', backgroundColor: colors.accent }]}>
          <Text style={[s.textXs, s.fontSemibold, { color: colors.background }]}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}
