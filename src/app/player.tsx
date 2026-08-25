import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { usePlayerStore } from '@/store/player-store';
import { playerActions } from '@/player/actions';
import { generateUpNext } from '@/player/recommendations';
import { useMusicStore } from '@/store/music-store';
import { useMetadataStore } from '@/store/metadata-store';
import { reportWarning } from '@/utils/error-handler';
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
  PenLine,
  Info,
  Sparkles,
  MoreHorizontal,
  Plus,
  Share2,
  AudioLines,
  Clock,
  Disc3,
  User,
  ListPlus,
} from 'lucide-react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { formatDuration } from '@/utils/format';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useFavoritesStore } from '@/store/favorites-store';
import { useToastStore } from '@/store/toast-store';
import { Image } from 'expo-image';
import { useLyricsStore } from '@/store/lyrics-store';
import { usePlaylistStore } from '@/store/playlist-store';
import { fetchLyrics, parseSyncedLyrics, hasCachedLyrics, type LyricsResult, type SyncedLine } from '@/services/lyrics';
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useSyncedLyricsScroll } from '@/hooks/use-synced-lyrics-scroll';
import { useTranslation } from '@/hooks/use-translation';
import * as Sharing from 'expo-sharing';
import type { ThemeColors } from '@/types/theme';
import type { Song } from '@/types/media';
import type { RepeatMode } from '@/types/player';
import { LyricsBadge } from '@/components/lyrics-badge';
import { s } from '@/styles';

const QUEUE_ITEM_HEIGHT = 72;

const SeekBar = React.memo(function SeekBar({
  colors,
  sliderAccent,
  sliderTrack,
  thumbColor,
  showDuration = true,
  showPercentage = true,
  sliderHeight = 40,
}: {
  colors: Partial<ThemeColors>;
  sliderAccent?: string;
  sliderTrack?: string;
  thumbColor?: string;
  showDuration?: boolean;
  showPercentage?: boolean;
  sliderHeight?: number;
}) {
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const progress = duration > 0 ? position / duration : 0;
  const displayProgress = dragProgress ?? progress;
  const displayPosition = dragProgress !== null ? dragProgress * duration : position;

  return (
    <>
      <Slider
        value={displayProgress}
        onValueChange={setDragProgress}
        onSlidingComplete={(val) => {
          playerActions.seekTo(val * duration);
          setDragProgress(null);
        }}
        minimumValue={0}
        maximumValue={1}
        minimumTrackTintColor={sliderAccent ?? colors.accent}
        maximumTrackTintColor={sliderTrack ?? colors.border}
        thumbTintColor={thumbColor ?? colors.text}
        style={{ width: '100%', height: sliderHeight }}
      />
      <View style={[s.flexRow, s.justifyBetween, s.px3]}>
        <Text style={[s.textXs, { color: colors.textMuted }]}>{formatDuration(displayPosition)}</Text>
        {showPercentage && (
          <Text style={[s.textXs, s.fontMedium, { color: sliderAccent ?? colors.accent }]}>
            {Math.round(displayProgress * 100)}%
          </Text>
        )}
        {showDuration && (
          <Text style={[s.textXs, { color: colors.textMuted }]}>{formatDuration(duration)}</Text>
        )}
      </View>
    </>
  );
});
export default function PlayerScreen() {
  const { colors } = useTheme();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const favoriteSongIds = useFavoritesStore((s) => s.favoriteSongIds);
  const toggleSongFavorite = useFavoritesStore((s) => s.toggleSongFavorite);

  const router = useRouter();
  const { t } = useTranslation();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const dragTranslateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const dragAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isDragging.value ? dragTranslateY.value : 0 }],
    zIndex: isDragging.value ? 999 : 0,
    elevation: isDragging.value ? 8 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: isDragging.value ? 4 : 0 },
    shadowOpacity: isDragging.value ? 0.25 : 0,
    shadowRadius: isDragging.value ? 12 : 0,
  }));
  const showToast = useToastStore((s) => s.showToast);
  const lyricsMap = useLyricsStore((s) => s.lyricsMap);
  const albums = useMusicStore((s) => s.albums);
  const artists = useMusicStore((s) => s.artists);
  const saveLyrics = useLyricsStore((s) => s.saveLyrics);
  const getOverriddenSong = useMetadataStore((s) => s.getOverriddenSong);
  const track = currentTrack ? getOverriddenSong(currentTrack) : null;

  useEffect(() => {
    let mounted = true;
    // Screen orientation lock is non-essential — guard heavily so a missing
    // native module never crashes the full player (previous native exits).
    (async () => {
      try {
        // Dynamic import avoids hard crash if module is not linked
        const mod = await import('expo-screen-orientation').catch(() => null);
        if (!mounted || !mod?.lockAsync) return;
        await mod.lockAsync(mod.OrientationLock.DEFAULT).catch((e: unknown) => reportWarning('Player', e, 'Failed to lock orientation'));
      } catch (e) {
        reportWarning('Player', e, 'Failed to lock orientation');
      }
    })();
    return () => {
      mounted = false;
      (async () => {
        try {
          const mod = await import('expo-screen-orientation').catch(() => null);
          if (!mod?.unlockAsync) return;
          await mod.unlockAsync().catch((e: unknown) => reportWarning('Player', e, 'Failed to unlock orientation'));
        } catch (e) {
          reportWarning('Player', e, 'Failed to unlock orientation');
        }
      })();
    };
  }, []);

  const queueSheetRef = useRef<BottomSheetModal>(null);
  const lyricsSheetRef = useRef<BottomSheetModal>(null);
  const moreSheetRef = useRef<BottomSheetModal>(null);

  const [lyricsData, setLyricsData] = useState<{
    trackId: string | null;
    lyrics: LyricsResult | null;
    error: boolean;
  }>({ trackId: null, lyrics: null, error: false });

  const localLyricsRaw = currentTrack ? lyricsMap[currentTrack.id] : null;
  const localLyrics = useMemo(
    () => (localLyricsRaw ? parseSyncedLyrics(localLyricsRaw) : null),
    [localLyricsRaw],
  );

  const isLyricsLoading = !localLyrics && currentTrack != null && lyricsData.trackId !== currentTrack.id;
  const lyrics = localLyrics ?? (lyricsData.trackId === currentTrack?.id ? lyricsData.lyrics : null);
  const lyricsError = localLyrics ? false : (lyricsData.trackId === currentTrack?.id ? lyricsData.error : false);

  useEffect(() => {
    if (!currentTrack || localLyrics) return;
    const trackId = currentTrack.id;

    let cancelled = false;

    fetchLyrics(currentTrack.artist, currentTrack.title)
      .then((result) => {
        if (cancelled) return;
        setLyricsData({ trackId, lyrics: result, error: !result });
        if (result?.raw) {
          saveLyrics(trackId, result.raw);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLyricsData({ trackId, lyrics: null, error: true });
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, currentTrack?.artist, currentTrack?.title, localLyrics]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const handlePlayFromQueue = useCallback((index: number) => {
    const state = usePlayerStore.getState();
    const track = state.queue[index];
    if (track) {
      playerActions.play(track, state.queue);
    }
  }, []);

  const renderQueueItem = useCallback(
    ({ item, index }: { item: Song; index: number }) => {
      const isCurrent = index === queueIndex;
      const isBeingDragged = draggedIndex === index;

      const tapGesture = Gesture.Tap().onEnd(() => {
        if (index !== queueIndex) {
          runOnJS(handlePlayFromQueue)(index);
        }
      });

      const gripGesture = Gesture.Pan()
        .activateAfterLongPress(200)
        .onStart(() => {
          isDragging.value = true;
          dragTranslateY.value = 0;
          runOnJS(setDraggedIndex)(index);
        })
        .onUpdate((e) => {
          dragTranslateY.value = e.translationY;
        })
        .onEnd((e) => {
          const moveBy = Math.round(e.translationY / QUEUE_ITEM_HEIGHT);
          const toIndex = Math.max(0, Math.min(queue.length - 1, index + moveBy));
          if (toIndex !== index) {
            runOnJS(playerActions.reorderQueue)(index, toIndex);
          }
          dragTranslateY.value = 0;
          isDragging.value = false;
          runOnJS(setDraggedIndex)(null);
        });

      const composedGesture = Gesture.Exclusive(gripGesture, tapGesture);

  return (
    <View>
      {index === queueIndex && <SectionLabel text={t('queue.now.playing')} colors={colors} />}
      {index === queueIndex + 1 && <SectionLabel text={t('queue.up.next')} colors={colors} />}
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: isCurrent ? colors.accent + '18' : 'transparent',
              },
              isBeingDragged && dragAnimatedStyle,
            ]}
          >
            <View style={{ padding: 4 }}>
              <GripVertical size={14} color={isBeingDragged ? colors.accent : colors.textMuted} />
            </View>
            <View
              style={{
                width: 44,
                height: 44,
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <LyricsBadge colors={colors} show={!!lyricsMap[item.id] || hasCachedLyrics(item.artist, item.title) === true} />
                <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
                  {item.artist} · {formatDuration(item.duration)}
                </Text>
              </View>
            </View>
            {index !== queueIndex && (
              <Pressable
                onPress={() => playerActions.removeFromQueue(index)}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Trash2 size={16} color={colors.textMuted} />
              </Pressable>
            )}
            {isBeingDragged && (
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.accent + '15', borderRadius: 12 }} pointerEvents="none" />
            )}
          </Animated.View>
        </GestureDetector>
    </View>
      );
    },
    [queueIndex, queue.length, colors, draggedIndex, isDragging, dragTranslateY, setDraggedIndex, dragAnimatedStyle, handlePlayFromQueue, lyricsMap, t],
  );

  const isFav = currentTrack ? favoriteSongIds.includes(currentTrack.id) : false;

  const toggleFavWithToast = useCallback(() => {
    const track = usePlayerStore.getState().currentTrack;
    if (!track) return;
    const nextFav = !favoriteSongIds.includes(track.id);
    toggleSongFavorite(track);
    showToast(nextFav ? 'Added to favorites' : 'Removed from favorites', 'heart');
  }, [favoriteSongIds, toggleSongFavorite, showToast]);

  const hideAndGoBack = useCallback(() => {
    try { playerActions.hideFullPlayer(); } catch {}
    try {
      if ((router as any).canGoBack?.()) {
        router.back();
      } else {
        router.replace('/(tabs)' as any);
      }
    } catch {
      try { router.replace('/(tabs)' as any); } catch {}
    }
  }, [router]);

  const onQueuePress = useCallback(() => queueSheetRef.current?.present(), []);
  const onLyricsPress = useCallback(() => lyricsSheetRef.current?.present(), []);
  const onInfoPress = useCallback(() => {
    router.push('/song-info');
  }, [router]);

  const onMorePress = useCallback(() => moreSheetRef.current?.present(), []);

  const handleViewAlbum = useCallback(() => {
    moreSheetRef.current?.dismiss();
    if (!track?.album) {
      showToast('No album information', 'music');
      return;
    }
    const album = albums.find((a) => a.title === track.album);
    if (album) {
      router.push({ pathname: '/music/album/[id]', params: { id: album.id } });
    } else {
      showToast('Album not found in library', 'music');
    }
  }, [track, albums, router, showToast]);

  const handleViewArtist = useCallback(() => {
    moreSheetRef.current?.dismiss();
    if (!track?.artist) {
      showToast('No artist information', 'music');
      return;
    }
    const artist = artists.find((a) => a.name === track.artist);
    if (artist) {
      router.push({ pathname: '/music/artist/[id]', params: { id: artist.id } });
    } else {
      showToast('Artist not found in library', 'music');
    }
  }, [track, artists, router, showToast]);

  const handleShare = useCallback(async () => {
    moreSheetRef.current?.dismiss();
    if (!currentTrack) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        showToast('Sharing not available', 'music');
        return;
      }
      await Sharing.shareAsync(currentTrack.uri, {
        mimeType: 'audio/*',
        dialogTitle: `Share ${currentTrack.title}`,
      });
    } catch {
      showToast('Could not share this file', 'music');
    }
  }, [currentTrack, showToast]);

  const handleMoreAction = useCallback((key: string) => {
    moreSheetRef.current?.dismiss();
    switch (key) {
      case 'playlist':
        if (currentTrack) {
          router.push({ pathname: '/playlist-picker', params: { songId: currentTrack.id } });
        }
        break;
      case 'next':
        if (currentTrack) playerActions.playNext(currentTrack);
        break;
      case 'queue':
        if (currentTrack) playerActions.addToQueue(currentTrack);
        break;
      case 'share':
        handleShare();
        break;
      case 'album':
        handleViewAlbum();
        break;
      case 'artist':
        handleViewArtist();
        break;
      case 'lyrics':
        onLyricsPress();
        break;
      case 'info':
        onInfoPress();
        break;
      case 'audio':
        router.push('/audio-features');
        break;
      case 'sleep':
        router.push('/sleep-timer');
        break;
    }
  }, [currentTrack, router, handleShare, handleViewAlbum, handleViewArtist, onLyricsPress, onInfoPress]);

  // Plain data only — no handlers capturing refs, so it's safe to build/render
  // during render. Presses route through the memoized handleMoreAction above.
  const moreActions = useMemo(() => [
    { key: 'playlist', label: t('menu.add.to.playlist'), icon: Plus, color: colors.accent },
    { key: 'next', label: t('menu.play.next'), icon: SkipForward },
    { key: 'queue', label: t('menu.add.to.queue'), icon: ListPlus },
    { key: 'share', label: t('common.share'), icon: Share2 },
    { key: 'album', label: t('menu.view.album'), icon: Disc3 },
    { key: 'artist', label: t('menu.view.artist'), icon: User },
    { key: 'lyrics', label: t('player.lyrics'), icon: AlignLeft },
    { key: 'info', label: t('menu.song.info'), icon: Info },
    { key: 'audio', label: t('menu.audio.settings'), icon: AudioLines },
    { key: 'sleep', label: t('menu.sleep.timer'), icon: Clock },
  ], [t, colors]);

  const handleAddUpNext = useCallback(() => {
    const state = usePlayerStore.getState();
    if (!state.currentTrack) return;
    const allSongs = useMusicStore.getState().songs;
    const exclude = new Set(state.queue.map((s) => s.id));
    const recs = generateUpNext(state.currentTrack, allSongs, exclude);
    if (recs.length === 0) {
      showToast('No similar tracks found', 'music');
      return;
    }
    usePlayerStore.getState().appendAutoplayTracks(recs);
    showToast(`${recs.length} tracks added to Up Next`, 'music');
  }, [showToast]);

  const handleSaveQueue = useCallback(() => {
    const state = usePlayerStore.getState();
    if (state.queue.length === 0) {
      showToast('Queue is empty', 'music');
      return;
    }
    const id = usePlaylistStore.getState().createPlaylist(`Queue ${new Date().toLocaleDateString()}`);
    usePlaylistStore.getState().addSongsToPlaylist(id, state.queue.map((s) => s.id));
    showToast(t('queue.saved'), 'check');
    queueSheetRef.current?.dismiss();
  }, [showToast, t]);

  const handleClearQueue = useCallback(() => {
    playerActions.clearUpNext();
    queueSheetRef.current?.dismiss();
  }, []);

  const translateY = useSharedValue(0);
  const isSwipingDown = useSharedValue(false);
  const isMountedSV = useSharedValue(true);

  useEffect(() => { return () => { isMountedSV.value = false; }; }, [isMountedSV]);

  /* eslint-disable react-hooks/immutability */
  const safeGoBack = useCallback(() => {
    try { playerActions.hideFullPlayer(); } catch {}
    try {
      if ((router as any).canGoBack?.()) router.back();
      else router.replace('/(tabs)' as any);
    } catch {
      try { router.replace('/(tabs)' as any); } catch {}
    }
  }, [router]);
  const panGesture = useMemo(() => Gesture.Pan()
    .onStart(() => {
      isSwipingDown.value = true;
    })
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY * 0.5;
      }
    })
    .onEnd((e) => {
      if (!isMountedSV.value) return;
      if (e.translationY > 150) {
        runOnJS(safeGoBack)();
      }
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      isSwipingDown.value = false;
    }), [safeGoBack, isMountedSV, isSwipingDown, translateY]);
  /* eslint-enable react-hooks/immutability */

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!currentTrack) {
    return (
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.pageBackground }]}>
        <Music size={48} color={colors.textMuted} />
        <Text style={[s.mt4, { color: colors.textMuted }]}>{t('player.no.track')}</Text>
        <Pressable onPress={() => router.back()} style={[s.mt4]}>
          <Text style={{ color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[s.flex1, animatedStyle]}>
        <ModernLayout
          currentTrack={track}
          isPlaying={isPlaying}
          isFav={isFav}
          shuffle={shuffle}
          repeat={repeat}
          colors={colors}
          togglePlay={playerActions.togglePlay}
          next={playerActions.next}
          previous={playerActions.previous}
          setShuffle={playerActions.setShuffle}
          setRepeat={playerActions.setRepeat}
          toggleSongFavorite={toggleFavWithToast}
          hideFullPlayer={hideAndGoBack}
          onQueuePress={onQueuePress}
          onLyricsPress={onLyricsPress}
          onInfoPress={onInfoPress}
          onMorePress={onMorePress}
        />

      </Animated.View>
      </GestureDetector>

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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
                  {t('player.queue')}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                  {queue.length} tracks • {formatDuration(queue.reduce((sum, s) => sum + (s.duration || 0), 0))}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable
                  onPress={handleSaveQueue}
                  hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}
                  accessibilityLabel={t('queue.save.playlist')}
                  accessibilityRole={'button' as const}
                >
                  <Plus size={14} color={colors.accent} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>{t('queue.save.playlist')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleClearQueue}
                  hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}
                  accessibilityLabel={t('queue.clear.all')}
                  accessibilityRole={'button' as const}
                >
                  <Trash2 size={14} color={colors.textMuted} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted }}>{t('queue.clear.all')}</Text>
                </Pressable>
              </View>
            </View>
            <View style={{ marginTop: 10 }}>
              <Pressable
                onPress={handleAddUpNext}
                hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.accent + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}
                accessibilityLabel="Add Up Next"
                accessibilityRole={'button' as const}
              >
                <Sparkles size={14} color={colors.accent} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>Add Up Next</Text>
              </Pressable>
            </View>
          </View>
          <BottomSheetFlatList
            data={queue}
            keyExtractor={(item: Song) => item.id}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
              {t('player.lyrics')}
            </Text>
            <Pressable
              onPress={() => {
                lyricsSheetRef.current?.dismiss();
                router.push({
                  pathname: '/lyrics-editor',
                  params: {
                    title: currentTrack?.title ?? '',
                    artist: currentTrack?.artist ?? '',
                  },
                });
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.card }}
            >
              <PenLine size={14} color={colors.accent} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent }}>Edit</Text>
            </Pressable>
          </View>
          {isLyricsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 12 }}>
                Searching for lyrics...
              </Text>
            </View>
          ) : lyrics && lyrics.synced.length > 0 ? (
            <SyncedLyricsView synced={lyrics.synced} colors={colors} />
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

       {/* More Bottom Sheet */}
       <BottomSheetModal
         ref={moreSheetRef}
         snapPoints={['70%']}
         backdropComponent={renderBackdrop}
         backgroundStyle={{ backgroundColor: colors.surface }}
         handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
       >
         <BottomSheetScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
           <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
             {t('player.more')}
           </Text>
            {moreActions.map((action) => {
              const Icon = action.icon;
              return (
                <Pressable
                  key={action.key}
                  onPress={() => handleMoreAction(action.key)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 }}
                  accessibilityRole={'button' as const}
                >
                 <Icon size={20} color={action.color ?? colors.text} />
                 <Text style={{ fontSize: 15, color: colors.text }}>{action.label}</Text>
               </Pressable>
             );
           })}
         </BottomSheetScrollView>
       </BottomSheetModal>
    </View>
  );
}

interface LayoutProps {
  currentTrack: Song | null;
  isPlaying: boolean;
  isFav: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  colors: ThemeColors;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  setShuffle: (v: boolean) => void;
  setRepeat: (m: RepeatMode) => void;
  toggleSongFavorite: (song: Song) => void;
  hideFullPlayer: () => void;
  onQueuePress: () => void;
  onLyricsPress: () => void;
  onInfoPress: () => void;
  onMorePress: () => void;
}

function RepeatButton({ repeat, setRepeat, colors }: { repeat: RepeatMode; setRepeat: (m: RepeatMode) => void; colors: Pick<ThemeColors, 'accent' | 'textMuted'> }) {
  return (
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
  );
}



const ModernLayout = React.memo(function ModernLayout(props: LayoutProps) {
  const { colors, currentTrack, isPlaying, isFav, shuffle, repeat } = props;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  if (!currentTrack) {
    return (
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>
        <Text style={[{ color: '#fff' }]}>{t('player.no.track')}</Text>
      </View>
    );
  }

  const m = {
    text: '#fff',
    textSecondary: 'rgba(255,255,255,0.7)',
    textMuted: 'rgba(255,255,255,0.5)',
    textFaint: 'rgba(255,255,255,0.4)',
    overlay: 'rgba(0,0,0,0.55)',
    surface: 'rgba(255,255,255,0.1)',
    playBg: 'rgba(255,255,255,0.2)',
    sliderMax: 'rgba(255,255,255,0.3)',
  };

  const isLandscape = winW > winH;
  const artworkSize = isLandscape
    ? Math.min(winH * 0.6, winW * 0.35)
    : Math.min(winW * 0.65, winH * 0.35);

  return (
    <View style={[s.flex1, { paddingBottom: insets.bottom }]}>
      {currentTrack.artwork ? (
        <Image
          source={{ uri: currentTrack.artwork }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          blurRadius={20}
          cachePolicy="memory-disk"
          onError={() => {}}
        />
      ) : null}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: m.overlay }} />

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.px4, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={props.hideFullPlayer} style={[s.w11, s.h11, s.itemsCenter, s.justifyCenter]}
            accessibilityLabel="Close player"
            accessibilityRole={'button' as const}
          >
            <ChevronDown size={28} color={m.text} />
          </Pressable>
          <Pressable onPress={props.onMorePress} style={[s.itemsCenter, s.justifyCenter, s.px3]} accessibilityLabel="Now playing options" accessibilityRole={'button' as const}>
            <Text style={[s.textSm, s.fontSemibold, { color: m.textSecondary }]}>
              {t('player.now.playing')}
            </Text>
          </Pressable>
          <View style={{ width: 44, height: 44 }} />
        </View>

        <View style={[s.flex1, isLandscape ? s.flexRow : s.flexCol, s.itemsCenter, isLandscape ? undefined : s.justifyCenter, { paddingHorizontal: 24, gap: isLandscape ? 32 : 24 }]}>
          <View style={[s.rounded3xl, s.overflowHidden, { width: artworkSize, height: artworkSize, backgroundColor: m.surface }]}>
            {currentTrack.artwork ? (
              <Image source={{ uri: currentTrack.artwork }} style={{ width: artworkSize, height: artworkSize }} contentFit="cover" transition={300} />
            ) : (
              <View style={[s.flex1, s.itemsCenter, s.justifyCenter]}>
                <Music size={64} color={m.textMuted} />
              </View>
            )}
          </View>

          <View style={[isLandscape ? { flex: 1 } : { width: '100%' }, { justifyContent: 'center', gap: isLandscape ? 16 : 12 }]}>
            <Text style={[isLandscape ? s.text3xl : s.text2xl, s.fontBold, s.textCenter, { color: m.text }]} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={[isLandscape ? s.textLg : s.textBase, s.textCenter, { color: m.textSecondary }]} numberOfLines={1}>{currentTrack.artist}</Text>

            <View style={{ marginTop: isLandscape ? 8 : 4 }}>
              <SeekBar
                colors={{ accent: m.text, border: m.sliderMax, text: m.text, textMuted: m.textMuted }}
                sliderAccent={m.text}
                sliderTrack={m.sliderMax}
                thumbColor={colors.accent}
              />
            </View>

            <View style={[s.flexRow, s.itemsCenter, s.justifyCenter, { gap: 24 }]}>
              <Pressable onPress={() => props.setShuffle(!shuffle)}
                accessibilityLabel={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
                accessibilityRole={'button' as const}
              >
                <Shuffle size={22} color={shuffle ? m.text : m.textFaint} />
              </Pressable>
              <Pressable onPress={props.previous} style={[s.w14, s.h14, s.roundedFull, s.itemsCenter, s.justifyCenter]}
                accessibilityLabel="Previous track"
                accessibilityRole={'button' as const}
              >
                <SkipBack size={28} color={m.text} fill={m.text} />
              </Pressable>
              <Pressable onPress={props.togglePlay} style={[s.roundedFull, s.itemsCenter, s.justifyCenter, { width: 72, height: 72, backgroundColor: m.playBg }]}
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                accessibilityRole={'button' as const}
              >
                {isPlaying ? (
                  <Pause size={32} color={m.text} fill={m.text} />
                ) : (
                  <Play size={32} color={m.text} fill={m.text} />
                )}
              </Pressable>
              <Pressable onPress={props.next} style={[s.w14, s.h14, s.roundedFull, s.itemsCenter, s.justifyCenter]}
                accessibilityLabel="Next track"
                accessibilityRole={'button' as const}
              >
                <SkipForward size={28} color={m.text} fill={m.text} />
              </Pressable>
              <RepeatButton repeat={repeat} setRepeat={props.setRepeat} colors={{ ...colors, accent: m.text, textMuted: m.textFaint }} />
            </View>

            <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.wFull, { marginTop: 16, paddingHorizontal: 10, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }]}>
              <Pressable onPress={() => props.toggleSongFavorite(currentTrack)}
                accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
                accessibilityRole={'button' as const}
              >
                <Heart size={26} color={isFav ? m.text : m.textFaint} fill={isFav ? m.text : 'none'} />
              </Pressable>
              <Pressable onPress={props.onLyricsPress}
                accessibilityLabel="Open lyrics"
                accessibilityRole={'button' as const}
              >
                <AlignLeft size={26} color={m.textFaint} />
              </Pressable>
              <Pressable onPress={props.onQueuePress}
                accessibilityLabel="Open queue"
                accessibilityRole={'button' as const}
              >
                <ListMusic size={26} color={m.textFaint} />
              </Pressable>
              <Pressable onPress={props.onMorePress}
                accessibilityLabel="More options"
                accessibilityRole={'button' as const}
              >
                <MoreHorizontal size={26} color={m.textFaint} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});








function SectionLabel({ text, colors }: { text: string; colors: Pick<ThemeColors, 'textMuted' | 'accent'> }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 4, paddingHorizontal: 16 }}>
      {text}
    </Text>
  );
}

function SyncedLyricsView({ synced, colors }: { synced: SyncedLine[]; colors: Pick<ThemeColors, 'accent' | 'text' | 'textMuted'> }) {
  const position = usePlayerStore((s) => s.position);
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
              marginBottom: i === synced.length - 1 ? 0 : 4,
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

