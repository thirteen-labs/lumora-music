import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { usePlayerStore } from '@/store/player-store';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, ChevronDown, Heart, ListMusic, AlignLeft } from 'lucide-react-native';
import { formatDuration } from '@/utils/cn';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useFavoritesStore } from '@/store/favorites-store';

export default function PlayerScreen() {
  const { colors } = useTheme();
  const {
    currentTrack, isPlaying, position, duration,
    togglePlay, next, previous, seekTo,
    shuffle, setShuffle, repeat, setRepeat,
    queue, hideFullPlayer,
  } = usePlayerStore();
  const { favoriteSongIds, toggleSongFavorite } = useFavoritesStore();
  const router = useRouter();

  if (!currentTrack) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Text style={{ color: colors.textMuted }}>No track playing</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text style={{ color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isFav = favoriteSongIds.includes(currentTrack.id);
  const repeatLabel = repeat === 'off' ? 'Off' : repeat === 'all' ? 'All' : 'One';

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
        <Pressable onPress={() => { hideFullPlayer(); router.back(); }} className="w-10 h-10 items-center justify-center">
          <ChevronDown size={28} color={colors.text} />
        </Pressable>
        <Text className="text-sm font-semibold" style={{ color: colors.textMuted }}>Now Playing</Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View
          className="w-72 h-72 rounded-3xl items-center justify-center mb-8"
          style={{ backgroundColor: colors.surface }}
        >
          <Text className="text-6xl" style={{ color: colors.accent }}>♪</Text>
        </View>

        <View className="w-full items-center mb-4">
          <Text className="text-xl font-bold" style={{ color: colors.text }} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text className="text-base mt-1" style={{ color: colors.textMuted }} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>

        <View className="w-full mb-6">
          <Slider
            value={duration > 0 ? position / duration : 0}
            onValueChange={(val) => seekTo(val * duration)}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.text}
            style={{ width: '100%', height: 40 }}
          />
          <View className="flex-row justify-between px-1">
            <Text className="text-xs" style={{ color: colors.textMuted }}>{formatDuration(position)}</Text>
            <Text className="text-xs" style={{ color: colors.textMuted }}>{formatDuration(duration)}</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-6 mb-8">
          <Pressable onPress={() => setShuffle(!shuffle)}>
            <Shuffle size={22} color={shuffle ? colors.accent : colors.textMuted} />
          </Pressable>
          <Pressable onPress={previous} className="w-14 h-14 rounded-full items-center justify-center">
            <SkipBack size={28} color={colors.text} fill={colors.text} />
          </Pressable>
          <Pressable
            onPress={togglePlay}
            className="w-18 h-18 rounded-full items-center justify-center"
            style={{ width: 72, height: 72, backgroundColor: colors.accent }}
          >
            {isPlaying ? (
              <Pause size={32} color={colors.background} fill={colors.background} />
            ) : (
              <Play size={32} color={colors.background} fill={colors.background} />
            )}
          </Pressable>
          <Pressable onPress={next} className="w-14 h-14 rounded-full items-center justify-center">
            <SkipForward size={28} color={colors.text} fill={colors.text} />
          </Pressable>
          <Pressable onPress={() => {
            const modes = ['off', 'all', 'one'] as const;
            const idx = modes.indexOf(repeat);
            setRepeat(modes[(idx + 1) % modes.length]);
          }}>
            {repeat === 'one' ? (
              <Repeat1 size={22} color={colors.accent} />
            ) : (
              <Repeat size={22} color={repeat !== 'off' ? colors.accent : colors.textMuted} />
            )}
          </Pressable>
        </View>

        <View className="flex-row items-center gap-8">
          <Pressable onPress={() => toggleSongFavorite(currentTrack)}>
            <Heart
              size={22}
              color={isFav ? colors.accent : colors.textMuted}
              fill={isFav ? colors.accent : 'none'}
            />
          </Pressable>
          <Pressable>
            <ListMusic size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable>
            <AlignLeft size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {queue.length > 1 && (
        <View className="px-4 pb-8">
          <Text className="text-sm font-semibold mb-2" style={{ color: colors.textMuted }}>
            Up Next ({queue.length} tracks)
          </Text>
        </View>
      )}
    </View>
  );
}
