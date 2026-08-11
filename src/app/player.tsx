import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { usePlayerStore } from '@/store/player-store';
import { playerActions } from '@/player/actions';
import { generateUpNext } from '@/player/recommendations';
import { useMusicStore } from '@/store/music-store';
import { useMetadataStore, type MetadataOverride } from '@/store/metadata-store';
import * as ScreenOrientation from 'expo-screen-orientation';
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
  Save,
  RotateCcw,
  Sparkles,
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
import { formatDuration, formatFileSize } from '@/utils/format';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useFavoritesStore } from '@/store/favorites-store';
import { useToastStore } from '@/store/toast-store';
import { Image } from 'expo-image';
import { useLyricsStore } from '@/store/lyrics-store';
import { fetchLyrics, parseSyncedLyrics, hasCachedLyrics, type LyricsResult, type SyncedLine } from '@/services/lyrics';
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useSyncedLyricsScroll } from '@/hooks/use-synced-lyrics-scroll';
import { useTranslation } from '@/hooks/use-translation';
import * as ImagePicker from 'expo-image-picker';
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
  const progress = duration > 0 ? position / duration : 0;

  return (
    <>
      <Slider
        value={progress}
        onValueChange={(val) => playerActions.seekTo(val * duration)}
        minimumValue={0}
        maximumValue={1}
        minimumTrackTintColor={sliderAccent ?? colors.accent}
        maximumTrackTintColor={sliderTrack ?? colors.border}
        thumbTintColor={thumbColor ?? colors.text}
        style={{ width: '100%', height: sliderHeight }}
      />
      <View style={[s.flexRow, s.justifyBetween, s.px3]}>
        <Text style={[s.textXs, { color: colors.textMuted }]}>{formatDuration(position)}</Text>
        {showPercentage && (
          <Text style={[s.textXs, s.fontMedium, { color: sliderAccent ?? colors.accent }]}>
            {Math.round(progress * 100)}%
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
    boxShadow: isDragging.value ? '0 8px 12px rgba(0,0,0,0.25)' : '0 0 0 rgba(0,0,0,0)',
  }));
  const showToast = useToastStore((s) => s.showToast);
  const lyricsMap = useLyricsStore((s) => s.lyricsMap);
  const saveLyrics = useLyricsStore((s) => s.saveLyrics);
  const getOverriddenSong = useMetadataStore((s) => s.getOverriddenSong);
  const setOverride = useMetadataStore((s) => s.setOverride);
  const track = currentTrack ? getOverriddenSong(currentTrack) : null;
  const [editTitle, setEditTitle] = useState(track?.title ?? '');
  const [editArtist, setEditArtist] = useState(track?.artist ?? '');
  const [editAlbum, setEditAlbum] = useState(track?.album ?? '');
  const [editArtwork, setEditArtwork] = useState<string | null>(track?.artwork ?? null);

  const prevTrackRef = useRef(track);
  if (track !== prevTrackRef.current) {
    prevTrackRef.current = track;
    if (track) {
      setEditTitle(track.title);
      setEditArtist(track.artist ?? '');
      setEditAlbum(track.album ?? '');
      setEditArtwork(track.artwork ?? null);
    }
  }

  const syncEditState = useCallback((t: typeof track) => {
    if (!t) return;
    setEditTitle(t.title);
    setEditArtist(t.artist ?? '');
    setEditAlbum(t.album ?? '');
    setEditArtwork(t.artwork ?? null);
  }, []);

useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT).catch((e) => reportWarning('Player', e, 'Failed to lock orientation'));
    return () => { ScreenOrientation.unlockAsync().catch((e) => reportWarning('Player', e, 'Failed to unlock orientation')); };
  }, []);

  const infoSheetRef = useRef<BottomSheetModal>(null);
  const queueSheetRef = useRef<BottomSheetModal>(null);
  const lyricsSheetRef = useRef<BottomSheetModal>(null);

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
      );
    },
    [queueIndex, queue.length, colors, draggedIndex, isDragging, dragTranslateY, setDraggedIndex, dragAnimatedStyle, handlePlayFromQueue, lyricsMap],
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
    playerActions.hideFullPlayer();
    router.back();
  }, [router]);

  const onQueuePress = useCallback(() => queueSheetRef.current?.present(), []);
  const onLyricsPress = useCallback(() => lyricsSheetRef.current?.present(), []);
  const onInfoPress = useCallback(() => {
    syncEditState(track);
    infoSheetRef.current?.present();
  }, [syncEditState, track]);

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

  const translateY = useSharedValue(0);
  const isSwipingDown = useSharedValue(false);
  const isMountedSV = useSharedValue(true);

  useEffect(() => { return () => { isMountedSV.value = false; }; }, [isMountedSV]);

  /* eslint-disable react-hooks/immutability */
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
        runOnJS(playerActions.hideFullPlayer)();
        runOnJS(router.back)();
      }
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      isSwipingDown.value = false;
    }), [router, isMountedSV, isSwipingDown, translateY]);
  /* eslint-enable react-hooks/immutability */

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!currentTrack) {
    return (
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.background }]}>
        <Music size={48} color={colors.textMuted} />
        <Text style={[s.mt4, { color: colors.textMuted }]}>{t('player.no.track')}</Text>
        <Pressable onPress={() => router.back()} style={[s.mt4]}>
          <Text style={{ color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
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
                  {queue.length} tracks
                </Text>
              </View>
              <Pressable
                onPress={handleAddUpNext}
                hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}
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

      {/* Song Info Bottom Sheet */}
      <BottomSheetModal
        ref={infoSheetRef}
        snapPoints={['65%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <View style={{ flex: 1, padding: 20 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
              Song Information
            </Text>

            {/* Artwork */}
            <View style={[s.itemsCenter, s.mb6]}>
              <View style={[s.rounded2xl, s.overflowHidden, { width: 120, height: 120, backgroundColor: colors.card }]}>
                {editArtwork ? (
                  <Image source={{ uri: editArtwork }} style={{ width: 120, height: 120 }} contentFit="cover" />
                ) : (
                  <View style={[s.flex1, s.itemsCenter, s.justifyCenter]}>
                    <Music size={36} color={colors.textMuted} />
                  </View>
                )}
              </View>
              <Pressable
                onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    quality: 0.8,
                    allowsEditing: true,
                    aspect: [1, 1],
                  });
                  if (!result.canceled && result.assets[0]) {
                    setEditArtwork(result.assets[0].uri);
                  }
                }}
                style={[s.mt2, { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.accent + '20' }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent }}>
                  {editArtwork || track?.artwork ? 'Change Artwork' : 'Add Artwork'}
                </Text>
              </Pressable>
            </View>

            {/* Editable fields */}
            <View style={[s.gap4, s.mb6]}>
              <View>
                <Text style={[s.textXs, s.fontSemibold, s.mb1, { color: colors.textMuted }]}>Title</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Track title"
                  placeholderTextColor={colors.textMuted}
                  style={[{ padding: 12, backgroundColor: colors.card, borderRadius: 12, color: colors.text, fontSize: 15 }]}
                />
              </View>
              <View>
                <Text style={[s.textXs, s.fontSemibold, s.mb1, { color: colors.textMuted }]}>Artist</Text>
                <TextInput
                  value={editArtist}
                  onChangeText={setEditArtist}
                  placeholder="Artist name"
                  placeholderTextColor={colors.textMuted}
                  style={[{ padding: 12, backgroundColor: colors.card, borderRadius: 12, color: colors.text, fontSize: 15 }]}
                />
              </View>
              <View>
                <Text style={[s.textXs, s.fontSemibold, s.mb1, { color: colors.textMuted }]}>Album</Text>
                <TextInput
                  value={editAlbum}
                  onChangeText={setEditAlbum}
                  placeholder="Album name"
                  placeholderTextColor={colors.textMuted}
                  style={[{ padding: 12, backgroundColor: colors.card, borderRadius: 12, color: colors.text, fontSize: 15 }]}
                />
              </View>
            </View>

            {/* Technical Info */}
            <Text style={[s.textXs, s.fontBold, s.mb3, { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }]}>
              Technical Information
            </Text>
            <View style={s.gap4}>
              <InfoRow label="Format" value={track?.uri?.split('.').pop()?.toUpperCase() ?? 'NONE'} colors={colors} />
              <InfoRow label="Bitrate" value={track?.bitrate ? `${track.bitrate} kbps` : 'Unknown'} colors={colors} />
              <InfoRow label="Sample Rate" value={track?.sampleRate ? `${track.sampleRate} Hz` : 'Unknown'} colors={colors} />
              <InfoRow label="File Size" value={track?.fileSize ? formatFileSize(track.fileSize) : '0 B'} colors={colors} />
              <InfoRow label="File Path" value={track?.uri ?? 'Unknown'} colors={colors} multiline />
            </View>

            {/* Save / Reset */}
            <View style={[s.flexRow, s.gap4, s.mt6, s.mb4]}>
              <Pressable
                onPress={() => {
                  if (track) {
                    setEditTitle(track.title);
                    setEditArtist(track.artist ?? '');
                    setEditAlbum(track.album ?? '');
                    setEditArtwork(track.artwork ?? null);
                  }
                }}
                style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { backgroundColor: colors.card, paddingVertical: 12, borderRadius: 16 }]}
              >
                <RotateCcw size={16} color={colors.text} />
                <Text style={[s.fontSemibold, { color: colors.text }]}>Reset</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!track) return;
                  const override: MetadataOverride = {};
                  if (editTitle !== track.title) override.title = editTitle;
                  if (editArtist !== (track.artist ?? '')) override.artist = editArtist;
                  if (editAlbum !== (track.album ?? '')) override.album = editAlbum;
                  if (editArtwork !== (track.artwork ?? null)) {
                    if (editArtwork) override.artwork = editArtwork;
                    else override.artwork = '';
                  }
                  if (Object.keys(override).length > 0) {
                    setOverride(track.id, override);
                  }
                  infoSheetRef.current?.dismiss();
                }}
                style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 16 }]}
              >
                <Save size={16} color="#fff" />
                <Text style={[s.fontSemibold, { color: '#fff' }]}>Save</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
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
          blurRadius={40}
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
          <Text style={[s.textSm, s.fontSemibold, { color: m.textSecondary }]}>
            {t('player.now.playing')}
          </Text>
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

            <View style={[s.flexRow, s.itemsCenter, s.justifyCenter, { gap: 24 }]}>
              <Pressable onPress={() => props.toggleSongFavorite(currentTrack)}
                accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
                accessibilityRole={'button' as const}
              >
                <Heart size={22} color={isFav ? m.text : m.textFaint} fill={isFav ? m.text : 'none'} />
              </Pressable>
              <Pressable onPress={props.onQueuePress}
                accessibilityLabel="Open queue"
                accessibilityRole={'button' as const}
              >
                <ListMusic size={22} color={m.textFaint} />
              </Pressable>
              <Pressable onPress={props.onLyricsPress}
                accessibilityLabel="Open lyrics"
                accessibilityRole={'button' as const}
              >
                <AlignLeft size={22} color={m.textFaint} />
              </Pressable>
              <Pressable onPress={props.onInfoPress}
                accessibilityLabel="Open song info"
                accessibilityRole={'button' as const}
              >
                <Info size={22} color={m.textFaint} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});








function InfoRow({ label, value, colors, multiline }: { label: string; value: string; colors: Pick<ThemeColors, 'text' | 'textMuted'>; multiline?: boolean }) {
  return (
    <View style={[multiline ? s.flexCol : s.flexRow, multiline ? s.itemsStart : s.itemsCenter, s.justifyBetween, s.py1]}>
      <Text style={[s.textXs, { color: colors.textMuted, width: multiline ? '100%' : 100 }]}>{label}</Text>
      <Text 
        style={[s.textSm, s.fontMedium, { color: colors.text, flex: 1, textAlign: multiline ? 'left' : 'right' }]} 
        numberOfLines={multiline ? 3 : 1}
      >
        {value}
      </Text>
    </View>
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

