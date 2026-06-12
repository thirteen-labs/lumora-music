import { useCallback, useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { usePlayerStore } from '@/store/player-store';
import { useSettingsStore, type NowPlayingLayout } from '@/store/settings-store';
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
  LayoutGrid,
} from 'lucide-react-native';
import { formatDuration } from '@/utils/cn';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useFavoritesStore } from '@/store/favorites-store';
import { Image } from 'expo-image';
import { fetchLyrics, type LyricsResult, type SyncedLine } from '@/services/lyrics';
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useSyncedLyricsScroll } from '@/hooks/use-synced-lyrics-scroll';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = SCREEN_WIDTH * 0.72;

export default function PlayerScreen() {
  const { colors } = useTheme();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const setShuffle = usePlayerStore((s) => s.setShuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const setRepeat = usePlayerStore((s) => s.setRepeat);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const hideFullPlayer = usePlayerStore((s) => s.hideFullPlayer);
  const favoriteSongIds = useFavoritesStore((s) => s.favoriteSongIds);
  const toggleSongFavorite = useFavoritesStore((s) => s.toggleSongFavorite);
  const nowPlayingLayout = useSettingsStore((s) => s.nowPlayingLayout);
  const setNowPlayingLayout = useSettingsStore((s) => s.setNowPlayingLayout);
  const router = useRouter();

  const queueSheetRef = useRef<BottomSheetModal>(null);
  const lyricsSheetRef = useRef<BottomSheetModal>(null);
  const layoutSheetRef = useRef<BottomSheetModal>(null);
  const [lyricsData, setLyricsData] = useState<{
    trackId: string | null;
    lyrics: LyricsResult | null;
    error: boolean;
  }>({ trackId: null, lyrics: null, error: false });

  const isLyricsLoading = currentTrack != null && lyricsData.trackId !== currentTrack.id;
  const lyrics = lyricsData.trackId === currentTrack?.id ? lyricsData.lyrics : null;
  const lyricsError = lyricsData.trackId === currentTrack?.id ? lyricsData.error : false;

  useEffect(() => {
    if (!currentTrack) return;
    const trackId = currentTrack.id;

    let cancelled = false;

    fetchLyrics(currentTrack.artist, currentTrack.title)
      .then((result) => {
        if (cancelled) return;
        setLyricsData({ trackId, lyrics: result, error: !result });
      })
      .catch(() => {
        if (cancelled) return;
        setLyricsData({ trackId, lyrics: null, error: true });
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, currentTrack?.artist, currentTrack?.title]);

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
              borderRadius: 12,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.card,
            }}
          >
            {item.artwork ? (
              <Image source={{ uri: item.artwork }} style={{ width: 40, height: 40 }} contentFit="cover" />
            ) : (
              <Music size={16} color={colors.accent} />
            )}
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

  const cycleLayout = () => {
    const layouts: NowPlayingLayout[] = ['classic', 'modern', 'minimal'];
    const idx = layouts.indexOf(nowPlayingLayout);
    setNowPlayingLayout(layouts[(idx + 1) % layouts.length]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {nowPlayingLayout === 'modern' ? (
        <ModernLayout
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          progress={progress}
          isFav={isFav}
          shuffle={shuffle}
          repeat={repeat}
          colors={colors}
          togglePlay={togglePlay}
          next={next}
          previous={previous}
          seekTo={seekTo}
          setShuffle={setShuffle}
          setRepeat={setRepeat}
          toggleSongFavorite={toggleSongFavorite}
          cycleLayout={cycleLayout}
          hideFullPlayer={() => { hideFullPlayer(); router.back(); }}
          onQueuePress={() => queueSheetRef.current?.present()}
          onLyricsPress={() => lyricsSheetRef.current?.present()}
        />
      ) : nowPlayingLayout === 'minimal' ? (
        <MinimalLayout
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          progress={progress}
          isFav={isFav}
          shuffle={shuffle}
          repeat={repeat}
          colors={colors}
          togglePlay={togglePlay}
          next={next}
          previous={previous}
          seekTo={seekTo}
          setShuffle={setShuffle}
          setRepeat={setRepeat}
          toggleSongFavorite={toggleSongFavorite}
          cycleLayout={cycleLayout}
          hideFullPlayer={() => { hideFullPlayer(); router.back(); }}
          onQueuePress={() => queueSheetRef.current?.present()}
          onLyricsPress={() => lyricsSheetRef.current?.present()}
        />
      ) : (
        <ClassicLayout
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          progress={progress}
          isFav={isFav}
          shuffle={shuffle}
          repeat={repeat}
          colors={colors}
          togglePlay={togglePlay}
          next={next}
          previous={previous}
          seekTo={seekTo}
          setShuffle={setShuffle}
          setRepeat={setRepeat}
          toggleSongFavorite={toggleSongFavorite}
          cycleLayout={cycleLayout}
          hideFullPlayer={() => { hideFullPlayer(); router.back(); }}
          onQueuePress={() => queueSheetRef.current?.present()}
          onLyricsPress={() => lyricsSheetRef.current?.present()}
        />
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
          {isLyricsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 12 }}>
                Searching for lyrics...
              </Text>
            </View>
          ) : lyrics && lyrics.synced.length > 0 ? (
            <SyncedLyricsView synced={lyrics.synced} position={position} colors={colors} />
          ) : lyrics?.lyrics ? (
            <Text style={{ fontSize: 15, color: colors.text, lineHeight: 26 }}>
              {lyrics.lyrics}
            </Text>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Music size={40} color={colors.textMuted} />
              <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 12 }}>
                No lyrics available
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                {lyricsError ? 'Could not find lyrics for this track' : 'Lyrics will appear here when available'}
              </Text>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Layout Picker Bottom Sheet */}
      <BottomSheetModal
        ref={layoutSheetRef}
        snapPoints={['30%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
            Player Layout
          </Text>
          {(['classic', 'modern', 'minimal'] as const).map((layout) => (
            <Pressable
              key={layout}
              onPress={() => { setNowPlayingLayout(layout); layoutSheetRef.current?.dismiss(); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 16,
                marginBottom: 8,
                backgroundColor: nowPlayingLayout === layout ? colors.accent + '20' : colors.card,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '500', color: nowPlayingLayout === layout ? colors.accent : colors.text }}>
                {layout.charAt(0).toUpperCase() + layout.slice(1)}
              </Text>
              {nowPlayingLayout === layout && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
              )}
            </Pressable>
          ))}
        </View>
      </BottomSheetModal>
    </View>
  );
}

interface LayoutProps {
  currentTrack: any;
  isPlaying: boolean;
  position: number;
  duration: number;
  progress: number;
  isFav: boolean;
  shuffle: boolean;
  repeat: string;
  colors: any;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (pos: number) => void;
  setShuffle: (v: boolean) => void;
  setRepeat: (m: any) => void;
  toggleSongFavorite: (song: any) => void;
  cycleLayout: () => void;
  hideFullPlayer: () => void;
  onQueuePress: () => void;
  onLyricsPress: () => void;
}

function RepeatButton({ repeat, setRepeat, colors }: { repeat: string; setRepeat: (m: any) => void; colors: any }) {
  return (
    <Pressable
      onPress={() => {
        const modes = ['off', 'all', 'one'] as const;
        const idx = modes.indexOf(repeat as any);
        setRepeat(modes[(idx + 1) % modes.length]);
      }}
    >
      {repeat === 'one' ? (
        <Repeat1 size={22} color={colors.accent} />
      ) : (
        <Repeat size={22} color={repeat !== 'off' ? colors.accent : colors.textMuted} />
      )}
    </Pressable>
  );
}

function ClassicLayout(props: LayoutProps) {
  const { colors, currentTrack, isPlaying, progress, isFav, shuffle, repeat, duration } = props;

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
        <Pressable onPress={props.hideFullPlayer} className="w-10 h-10 items-center justify-center">
          <ChevronDown size={28} color={colors.text} />
        </Pressable>
        <Text className="text-sm font-semibold" style={{ color: colors.textMuted }}>
          Now Playing
        </Text>
        <Pressable onPress={props.cycleLayout} className="w-10 h-10 items-center justify-center">
          <LayoutGrid size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View
          className="rounded-3xl items-center justify-center mb-8 overflow-hidden"
          style={{ width: ARTWORK_SIZE, height: ARTWORK_SIZE, backgroundColor: colors.surface }}
        >
          {currentTrack.artwork ? (
            <Image source={{ uri: currentTrack.artwork }} style={{ width: ARTWORK_SIZE, height: ARTWORK_SIZE }} contentFit="cover" transition={300} />
          ) : (
            <Music size={64} color={colors.accent} />
          )}
        </View>

        <View className="w-full items-center mb-4">
          <Text className="text-xl font-bold" style={{ color: colors.text }} numberOfLines={1}>{currentTrack.title}</Text>
          <Text className="text-base mt-1" style={{ color: colors.textMuted }} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>

        <Slider value={progress} onValueChange={(val) => props.seekTo(val * duration)} minimumValue={0} maximumValue={1}
          minimumTrackTintColor={colors.accent} maximumTrackTintColor={colors.border} thumbTintColor={colors.text}
          style={{ width: '100%', height: 40 }} />
        <View className="flex-row justify-between px-1 w-full">
          <Text className="text-xs" style={{ color: colors.textMuted }}>{formatDuration(props.position)}</Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>{formatDuration(duration)}</Text>
        </View>

        <View className="flex-row items-center justify-center gap-6 mb-8 mt-2">
          <Pressable onPress={() => props.setShuffle(!shuffle)}>
            <Shuffle size={22} color={shuffle ? colors.accent : colors.textMuted} />
          </Pressable>
          <Pressable onPress={props.previous} className="w-14 h-14 rounded-full items-center justify-center">
            <SkipBack size={28} color={colors.text} fill={colors.text} />
          </Pressable>
          <Pressable onPress={props.togglePlay} className="rounded-full items-center justify-center" style={{ width: 72, height: 72, backgroundColor: colors.accent }}>
            {isPlaying ? (
              <Pause size={32} color={colors.background} fill={colors.background} />
            ) : (
              <Play size={32} color={colors.background} fill={colors.background} />
            )}
          </Pressable>
          <Pressable onPress={props.next} className="w-14 h-14 rounded-full items-center justify-center">
            <SkipForward size={28} color={colors.text} fill={colors.text} />
          </Pressable>
          <RepeatButton repeat={repeat} setRepeat={props.setRepeat} colors={colors} />
        </View>

        <View className="flex-row items-center gap-8">
          <Pressable onPress={() => props.toggleSongFavorite(currentTrack)}>
            <Heart size={22} color={isFav ? colors.accent : colors.textMuted} fill={isFav ? colors.accent : 'none'} />
          </Pressable>
          <Pressable onPress={props.onQueuePress}>
            <ListMusic size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={props.onLyricsPress}>
            <AlignLeft size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ModernLayout(props: LayoutProps) {
  const { colors, currentTrack, isPlaying, progress, isFav, shuffle, repeat, duration } = props;

  return (
    <View className="flex-1">
      {currentTrack.artwork ? (
        <Image
          source={{ uri: currentTrack.artwork }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          blurRadius={40}
        />
      ) : null}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' }} />

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
          <Pressable onPress={props.hideFullPlayer} className="w-10 h-10 items-center justify-center">
            <ChevronDown size={28} color="#fff" />
          </Pressable>
          <Text className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Now Playing
          </Text>
          <Pressable onPress={props.cycleLayout} className="w-10 h-10 items-center justify-center">
            <LayoutGrid size={20} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View className="rounded-3xl overflow-hidden mb-8" style={{ width: SCREEN_WIDTH * 0.65, height: SCREEN_WIDTH * 0.65, backgroundColor: 'rgba(255,255,255,0.1)' }}>
            {currentTrack.artwork ? (
              <Image source={{ uri: currentTrack.artwork }} style={{ width: SCREEN_WIDTH * 0.65, height: SCREEN_WIDTH * 0.65 }} contentFit="cover" transition={300} />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Music size={64} color="rgba(255,255,255,0.5)" />
              </View>
            )}
          </View>

          <Text className="text-2xl font-bold" style={{ color: '#fff' }} numberOfLines={1}>{currentTrack.title}</Text>
          <Text className="text-base mt-1" style={{ color: 'rgba(255,255,255,0.6)' }} numberOfLines={1}>{currentTrack.artist}</Text>

          <View className="w-full mt-8">
            <Slider value={progress} onValueChange={(val) => props.seekTo(val * duration)} minimumValue={0} maximumValue={1}
              minimumTrackTintColor="#fff" maximumTrackTintColor="rgba(255,255,255,0.3)" thumbTintColor="#fff"
              style={{ width: '100%', height: 40 }} />
            <View className="flex-row justify-between px-1">
              <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDuration(props.position)}</Text>
              <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDuration(duration)}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-center gap-6 mt-4">
            <Pressable onPress={() => props.setShuffle(!shuffle)}>
              <Shuffle size={22} color={shuffle ? '#fff' : 'rgba(255,255,255,0.4)'} />
            </Pressable>
            <Pressable onPress={props.previous} className="w-14 h-14 rounded-full items-center justify-center">
              <SkipBack size={28} color="#fff" fill="#fff" />
            </Pressable>
            <Pressable onPress={props.togglePlay} className="rounded-full items-center justify-center" style={{ width: 72, height: 72, backgroundColor: 'rgba(255,255,255,0.2)' }}>
              {isPlaying ? (
                <Pause size={32} color="#fff" fill="#fff" />
              ) : (
                <Play size={32} color="#fff" fill="#fff" />
              )}
            </Pressable>
            <Pressable onPress={props.next} className="w-14 h-14 rounded-full items-center justify-center">
              <SkipForward size={28} color="#fff" fill="#fff" />
            </Pressable>
            <RepeatButton repeat={repeat} setRepeat={props.setRepeat} colors={{ ...colors, accent: '#fff', textMuted: 'rgba(255,255,255,0.4)' }} />
          </View>

          <View className="flex-row items-center gap-8 mt-6">
            <Pressable onPress={() => props.toggleSongFavorite(currentTrack)}>
              <Heart size={22} color={isFav ? '#fff' : 'rgba(255,255,255,0.4)'} fill={isFav ? '#fff' : 'none'} />
            </Pressable>
            <Pressable onPress={props.onQueuePress}>
              <ListMusic size={22} color="rgba(255,255,255,0.4)" />
            </Pressable>
            <Pressable onPress={props.onLyricsPress}>
              <AlignLeft size={22} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function MinimalLayout(props: LayoutProps) {
  const { colors, currentTrack, isPlaying, progress, isFav, shuffle, repeat, duration } = props;

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
        <Pressable onPress={props.hideFullPlayer} className="w-10 h-10 items-center justify-center">
          <ChevronDown size={28} color={colors.text} />
        </Pressable>
        <Text className="text-sm font-semibold" style={{ color: colors.textMuted }}>
          Now Playing
        </Text>
        <Pressable onPress={props.cycleLayout} className="w-10 h-10 items-center justify-center">
          <LayoutGrid size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <View className="rounded-2xl overflow-hidden" style={{ width: 72, height: 72, backgroundColor: colors.surface }}>
            {currentTrack.artwork ? (
              <Image source={{ uri: currentTrack.artwork }} style={{ width: 72, height: 72 }} contentFit="cover" transition={200} />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Music size={28} color={colors.accent} />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text className="text-lg font-bold" style={{ color: colors.text }} numberOfLines={1}>{currentTrack.title}</Text>
            <Text className="text-sm mt-0.5" style={{ color: colors.textMuted }} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          <Pressable onPress={() => props.toggleSongFavorite(currentTrack)}>
            <Heart size={22} color={isFav ? colors.accent : colors.textMuted} fill={isFav ? colors.accent : 'none'} />
          </Pressable>
        </View>

        <Slider value={progress} onValueChange={(val) => props.seekTo(val * duration)} minimumValue={0} maximumValue={1}
          minimumTrackTintColor={colors.accent} maximumTrackTintColor={colors.border} thumbTintColor={colors.text}
          style={{ width: '100%', height: 32 }} />
        <View className="flex-row justify-between px-1">
          <Text className="text-xs" style={{ color: colors.textMuted }}>{formatDuration(props.position)}</Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>{formatDuration(duration)}</Text>
        </View>

        <View className="flex-row items-center justify-center gap-5 mt-4">
          <Pressable onPress={() => props.setShuffle(!shuffle)}>
            <Shuffle size={20} color={shuffle ? colors.accent : colors.textMuted} />
          </Pressable>
          <Pressable onPress={props.previous} className="w-12 h-12 rounded-full items-center justify-center">
            <SkipBack size={24} color={colors.text} fill={colors.text} />
          </Pressable>
          <Pressable onPress={props.togglePlay} className="rounded-full items-center justify-center" style={{ width: 60, height: 60, backgroundColor: colors.accent }}>
            {isPlaying ? (
              <Pause size={26} color={colors.background} fill={colors.background} />
            ) : (
              <Play size={26} color={colors.background} fill={colors.background} />
            )}
          </Pressable>
          <Pressable onPress={props.next} className="w-12 h-12 rounded-full items-center justify-center">
            <SkipForward size={24} color={colors.text} fill={colors.text} />
          </Pressable>
          <RepeatButton repeat={repeat} setRepeat={props.setRepeat} colors={colors} />
        </View>

        <View className="flex-row items-center justify-center gap-8 mt-6">
          <Pressable onPress={props.onQueuePress}>
            <ListMusic size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={props.onLyricsPress}>
            <AlignLeft size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SyncedLyricsView({ synced, position, colors }: { synced: SyncedLine[]; position: number; colors: any }) {
  const { scrollRef, registerLine, activeIdx } = useSyncedLyricsScroll(synced, position);

  return (
    <ScrollView
      ref={scrollRef}
      style={{ paddingVertical: 8 }}
      contentContainerStyle={{ paddingVertical: 80 }}
      showsVerticalScrollIndicator={false}
    >
      {synced.map((line, i) => {
        const isActive = i === activeIdx;
        const isPast = activeIdx >= 0 && i < activeIdx;
        return (
          <Text
            key={`${i}-${line.time}`}
            onLayout={(e) => registerLine(i, e.nativeEvent.layout.y)}
            style={{
              fontSize: isActive ? 20 : 16,
              fontWeight: isActive ? '700' : '400',
              color: isActive ? colors.accent : isPast ? colors.textMuted + '80' : colors.text + '60',
              lineHeight: isActive ? 32 : 28,
              marginBottom: 4,
              textAlign: 'center',
            }}
          >
            {line.text}
          </Text>
        );
      })}
    </ScrollView>
  );
}
