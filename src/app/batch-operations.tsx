import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { SectionHeader } from '@/components/section-header';
import { useMusicStore } from '@/store/music-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { usePlayerStore } from '@/store/player-store';
import { useRouter } from 'expo-router';
import {
  SquareCheck, Square, Trash2, Heart, Share2, Music,
  ListPlus,
} from 'lucide-react-native';

export default function BatchOperationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const songs = useMusicStore((s) => s.songs);
  const toggleSongFavorite = useFavoritesStore((s) => s.toggleSongFavorite);
  const isSongFavorite = useFavoritesStore((s) => s.isSongFavorite);
  const play = usePlayerStore((s) => s.play);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(songs.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const selectedSongs = useMemo(
    () => songs.filter((s) => selected.has(s.id)),
    [songs, selected]
  );

  const handleAddToQueue = () => {
    selectedSongs.forEach((s) => addToQueue(s));
    Alert.alert('Added', `${selectedSongs.length} tracks added to queue`);
    setSelected(new Set());
  };

  const handleFavorite = () => {
    selectedSongs.forEach((s) => {
      if (!isSongFavorite(s.id)) toggleSongFavorite(s);
    });
    Alert.alert('Done', `${selectedSongs.length} tracks favorited`);
    setSelected(new Set());
  };

  const handlePlayNow = () => {
    if (selectedSongs.length === 0) return;
    play(selectedSongs[0], selectedSongs);
    router.back();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar
        title={`${selected.size} Selected`}
        showSettings={false}
      />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-4">
          {/* Selection Controls */}
          <View className="flex-row gap-2">
            <Pressable onPress={selectAll} className="flex-1 py-3 rounded-2xl items-center" style={{ backgroundColor: colors.card }}>
              <Text className="text-xs font-semibold" style={{ color: colors.text }}>Select All</Text>
            </Pressable>
            <Pressable onPress={deselectAll} className="flex-1 py-3 rounded-2xl items-center" style={{ backgroundColor: colors.card }}>
              <Text className="text-xs font-semibold" style={{ color: colors.text }}>Deselect All</Text>
            </Pressable>
          </View>

          {/* Actions */}
          {selected.size > 0 && (
            <View>
              <SectionHeader title="Actions" />
              <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
                <ActionButton
                  icon={ListPlus} label="Add to Queue" count={selected.size}
                  onPress={handleAddToQueue} colors={colors}
                />
                <ActionButton
                  icon={Heart} label="Add to Favorites" count={selected.size}
                  onPress={handleFavorite} colors={colors}
                />
                <ActionButton
                  icon={Music} label="Play Now" count={selected.size}
                  onPress={handlePlayNow} colors={colors}
                />
                <ActionButton
                  icon={Trash2} label="Delete Files" count={selected.size}
                  onPress={() => Alert.alert('Coming Soon', 'Batch delete will be available in a future update.')}
                  colors={colors} danger
                />
                <ActionButton
                  icon={Share2} label="Share" count={selected.size}
                  onPress={() => Alert.alert('Coming Soon', 'Batch share will be available in a future update.')}
                  colors={colors}
                />
              </View>
            </View>
          )}

          {/* Song List */}
          <View>
            <SectionHeader title={`Songs (${songs.length})`} />
            <View className="rounded-3xl overflow-hidden" style={{ backgroundColor: colors.surface }}>
              {songs.map((song, i) => {
                const isSelected = selected.has(song.id);
                return (
                  <Pressable
                    key={song.id}
                    onPress={() => toggleSelect(song.id)}
                    className="flex-row items-center gap-3 p-3"
                    style={{
                      borderBottomWidth: i < songs.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                      backgroundColor: isSelected ? colors.accent + '10' : 'transparent',
                    }}
                  >
                    {isSelected ? (
                      <SquareCheck size={20} color={colors.accent} />
                    ) : (
                      <Square size={20} color={colors.textMuted} />
                    )}
                    <View className="flex-1">
                      <Text className="text-sm" style={{ color: colors.text }} numberOfLines={1}>{song.title}</Text>
                      <Text className="text-xs" style={{ color: colors.textMuted }} numberOfLines={1}>{song.artist}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ActionButton({
  icon: Icon, label, count, onPress, colors, danger,
}: {
  icon: any; label: string; count: number; onPress: () => void; colors: any; danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 p-4"
      style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
    >
      <Icon size={18} color={danger ? '#EF4444' : colors.accent} />
      <Text className="flex-1 text-sm font-medium" style={{ color: danger ? '#EF4444' : colors.text }}>{label}</Text>
      <Text className="text-xs" style={{ color: colors.textMuted }}>{count} items</Text>
    </Pressable>
  );
}
