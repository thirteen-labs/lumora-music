import { useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { usePlayerStore } from '@/store/player-store';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ChevronDown,
  Heart,
  ListMusic,
  AlignLeft,
  Music,
  GripVertical,
  Trash2,
} from 'lucide-react-native';
import { formatDuration } from '@/utils/cn';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useFavoritesStore } from '@/store/favorites-store';
import { Image } from 'expo-image';
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetScrollView,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = SCREEN_WIDTH * 0.72;

export default function PlayerScreen() {
  const { colors } = useTheme();
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    togglePlay,
    next,
    previous,
    seekTo,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    queue,
    queueIndex,
    removeFromQueue,
    hideFullPlayer,
  } = usePlayerStore();
  const { favoriteSongIds, toggleSongFavorite } = useFavoritesStore();
  const router = useRouter();

  const queueSheetRef = useRef<BottomSheetModal>(null);
  const lyricsSheetRef = useRef<BottomSheetModal>(null);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const renderQueueItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isCurrent = index === queueIndex;
      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: isCurrent ? colors.accent + '18' : 'transparent',
          }}
        >
          <GripVertical size={16} color={colors.textMuted} />
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.card,
            }}
          >
            <Music size={16} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: isCurrent ? '600' : '400',
                color: isCurrent ? colors.accent : colors.text,
              }}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
              {item.artist} · {formatDuration(item.duration)}
            </Text>
          </View>
          {index !== queueIndex && (
            <Pressable
              onPress={() => removeFromQueue(index)}
              hitSlop={8}
              style={{ padding: 4 }}
            >
              <Trash2 size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      );
    },
    [queueIndex, colors, removeFromQueue],
  );

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
  const progress = duration > 0 ? position / duration : 0;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
        <Pressable
          onPress={() => {
            hideFullPlayer();
            router.back();
          }}
          className="w-10 h-10 items-center justify-center"
        >
          <ChevronDown size={28} color={colors.text} />
        </Pressable>
        <Text className="text-sm font-semibold" style={{ color: colors.textMuted }}>
          Now Playing
        </Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View
          className="rounded-3xl items-center justify-center mb-8 overflow-hidden"
          style={{
            width: ARTWORK_SIZE,
            height: ARTWORK_SIZE,
            backgroundColor: colors.surface,
          }}
        >
          {currentTrack.artwork ? (
            <Image
              source={{ uri: currentTrack.artwork }}
              style={{ width: ARTWORK_SIZE, height: ARTWORK_SIZE }}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <Music size={64} color={colors.accent} />
          )}
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
            value={progress}
            onValueChange={(val) => seekTo(val * duration)}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.text}
            style={{ width: '100%', height: 40 }}
          />
          <View className="flex-row justify-between px-1">
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              {formatDuration(position)}
            </Text>
            <Text className="text-xs" style={{ color: colors.textMuted }}>
              {formatDuration(duration)}
            </Text>
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
            className="rounded-full items-center justify-center"
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
          <Pressable
            onPress={() => {
              const modes = ['off', 'all', 'one'] as const;
              const idx = modes.indexOf(repeat);
              setRepeat(modes[(idx + 1) % modes.length]);
            }}
          >
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
          <Pressable onPress={() => queueSheetRef.current?.present()}>
            <ListMusic size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => lyricsSheetRef.current?.present()}>
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

      {/* Queue Bottom Sheet */}
      <BottomSheetModal
        ref={queueSheetRef}
        snapPoints={['60%', '90%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
              Queue
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              {queue.length} tracks
            </Text>
          </View>
          <BottomSheetFlatList
            data={queue}
            keyExtractor={(item: any) => item.id}
            renderItem={renderQueueItem}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        </View>
      </BottomSheetModal>

      {/* Lyrics Bottom Sheet */}
      <BottomSheetModal
        ref={lyricsSheetRef}
        snapPoints={['60%', '90%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
            Lyrics
          </Text>
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Music size={40} color={colors.textMuted} />
            <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 12 }}>
              No lyrics available
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
              Lyrics will appear here when available
            </Text>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
}
