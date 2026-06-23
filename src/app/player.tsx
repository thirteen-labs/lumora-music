import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Dimensions, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { usePlayerStore } from '@/store/player-store';
import { useSettingsStore, type NowPlayingLayout } from '@/store/settings-store';
import { useMetadataStore, type MetadataOverride } from '@/store/metadata-store';
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
  PenLine,
  Info,
  Car,
  Maximize2,
  Mic2,
  Save,
  RotateCcw,
} from 'lucide-react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { formatDuration, formatFileSize } from '@/utils/cn';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useFavoritesStore } from '@/store/favorites-store';
import { useToastStore } from '@/store/toast-store';
import { Image } from 'expo-image';
import { useLyricsStore } from '@/store/lyrics-store';
import { fetchLyrics, parseSyncedLyrics, type LyricsResult, type SyncedLine } from '@/services/lyrics';
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useSyncedLyricsScroll } from '@/hooks/use-synced-lyrics-scroll';
import { useTranslation } from '@/hooks/use-translation';
import * as ImagePicker from 'expo-image-picker';
import { s } from '@/styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QUEUE_ITEM_HEIGHT = 64;
const ARTWORK_SIZE = SCREEN_WIDTH * 0.72;

const SeekBar = React.memo(({
  colors,
  sliderAccent,
  sliderTrack,
  thumbColor,
  showDuration = true,
  showPercentage = true,
  sliderHeight = 40,
}: {
  colors: any;
  sliderAccent?: string;
  sliderTrack?: string;
  thumbColor?: string;
  showDuration?: boolean;
  showPercentage?: boolean;
  sliderHeight?: number;
}) => {
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const progress = duration > 0 ? position / duration : 0;

  return (
    <>
      <Slider
        value={progress}
        onValueChange={(val) => seekTo(val * duration)}
        minimumValue={0}
        maximumValue={1}
        minimumTrackTintColor={sliderAccent ?? colors.accent}
        maximumTrackTintColor={sliderTrack ?? colors.border}
        thumbTintColor={thumbColor ?? colors.text}
        style={{ width: '100%', height: sliderHeight }}
      />
      <View style={[s.flexRow, s.justifyBetween, s.px1]}>
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
SeekBar.displayName = 'SeekBar';

export default function PlayerScreen() {
  const { colors } = useTheme();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const setShuffle = usePlayerStore((s) => s.setShuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const setRepeat = usePlayerStore((s) => s.setRepeat);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const hideFullPlayer = usePlayerStore((s) => s.hideFullPlayer);
  const favoriteSongIds = useFavoritesStore((s) => s.favoriteSongIds);
  const toggleSongFavorite = useFavoritesStore((s) => s.toggleSongFavorite);
  const nowPlayingLayout = useSettingsStore((s) => s.nowPlayingLayout);
  const setNowPlayingLayout = useSettingsStore((s) => s.setNowPlayingLayout);
  const router = useRouter();
  const { t } = useTranslation();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const dragTranslateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
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

  const infoSheetRef = useRef<BottomSheetModal>(null);
  const queueSheetRef = useRef<BottomSheetModal>(null);
  const lyricsSheetRef = useRef<BottomSheetModal>(null);
  const layoutSheetRef = useRef<BottomSheetModal>(null);
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
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const renderQueueItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isCurrent = index === queueIndex;
      const isBeingDragged = draggedIndex === index;

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
            runOnJS(reorderQueue)(index, toIndex);
          }
          dragTranslateY.value = 0;
          isDragging.value = false;
          runOnJS(setDraggedIndex)(null);
        });

      return (
        <GestureDetector gesture={gripGesture}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: isCurrent ? colors.accent + '18' : 'transparent',
            }}
          >
            <View style={{ padding: 4 }}>
              <GripVertical size={14} color={isBeingDragged ? colors.accent : colors.textMuted} />
            </View>
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
            {isBeingDragged && (
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.accent + '15', borderRadius: 12 }} pointerEvents="none" />
            )}
          </View>
        </GestureDetector>
      );
    },
    [queueIndex, queue.length, colors, removeFromQueue, reorderQueue, draggedIndex, isDragging, dragTranslateY, setDraggedIndex],
  );

  const isFav = currentTrack ? favoriteSongIds.includes(currentTrack.id) : false;

  const toggleFavWithToast = useCallback(() => {
    const track = usePlayerStore.getState().currentTrack;
    if (!track) return;
    const nextFav = !favoriteSongIds.includes(track.id);
    toggleSongFavorite(track);
    showToast(nextFav ? 'Added to favorites' : 'Removed from favorites', 'heart');
  }, [favoriteSongIds, toggleSongFavorite, showToast]);

  const cycleLayout = useCallback(() => {
    const layouts: NowPlayingLayout[] = ['classic', 'modern', 'minimal', 'driving', 'lyrics'];
    const idx = layouts.indexOf(nowPlayingLayout);
    setNowPlayingLayout(layouts[(idx + 1) % layouts.length]);
  }, [nowPlayingLayout, setNowPlayingLayout]);

  const hideAndGoBack = useCallback(() => {
    hideFullPlayer();
    router.back();
  }, [hideFullPlayer, router]);

  const onQueuePress = useCallback(() => queueSheetRef.current?.present(), []);
  const onLyricsPress = useCallback(() => lyricsSheetRef.current?.present(), []);
  const onInfoPress = useCallback(() => infoSheetRef.current?.present(), []);

  const translateY = useSharedValue(0);
  const isSwipingDown = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isSwipingDown.value = true;
    })
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY * 0.5;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 150) {
        runOnJS(hideFullPlayer)();
        runOnJS(router.back)();
      }
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      isSwipingDown.value = false;
    });

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
      {nowPlayingLayout === 'modern' ? (
        <ModernLayout
          currentTrack={track}
          isPlaying={isPlaying}
          isFav={isFav}
          shuffle={shuffle}
          repeat={repeat}
          colors={colors}
          togglePlay={togglePlay}
          next={next}
          previous={previous}
          setShuffle={setShuffle}
          setRepeat={setRepeat}
          toggleSongFavorite={toggleFavWithToast}
          cycleLayout={cycleLayout}
          hideFullPlayer={hideAndGoBack}
          onQueuePress={onQueuePress}
          onLyricsPress={onLyricsPress}
          onInfoPress={onInfoPress}
        />
      ) : nowPlayingLayout === 'minimal' ? (
        <MinimalLayout
          currentTrack={track}
          isPlaying={isPlaying}
          isFav={isFav}
          shuffle={shuffle}
          repeat={repeat}
          colors={colors}
          togglePlay={togglePlay}
          next={next}
          previous={previous}
          setShuffle={setShuffle}
          setRepeat={setRepeat}
          toggleSongFavorite={toggleFavWithToast}
          cycleLayout={cycleLayout}
          hideFullPlayer={hideAndGoBack}
          onQueuePress={onQueuePress}
          onLyricsPress={onLyricsPress}
          onInfoPress={onInfoPress}
        />
      ) : nowPlayingLayout === 'lyrics' ? (
        <LyricsLayout
          currentTrack={track}
          isPlaying={isPlaying}
          isFav={isFav}
          shuffle={shuffle}
          repeat={repeat}
          colors={colors}
          togglePlay={togglePlay}
          next={next}
          previous={previous}
          setShuffle={setShuffle}
          setRepeat={setRepeat}
          toggleSongFavorite={toggleFavWithToast}
          cycleLayout={cycleLayout}
          hideFullPlayer={hideAndGoBack}
          onQueuePress={onQueuePress}
          onLyricsPress={onLyricsPress}
          onInfoPress={onInfoPress}
          lyrics={lyrics}
          isLyricsLoading={isLyricsLoading}
          lyricsError={lyricsError}
        />
      ) : nowPlayingLayout === 'driving' ? (
        <DrivingLayout
          currentTrack={track}
          isPlaying={isPlaying}
          isFav={isFav}
          shuffle={shuffle}
          repeat={repeat}
          colors={colors}
          togglePlay={togglePlay}
          next={next}
          previous={previous}
          setShuffle={setShuffle}
          setRepeat={setRepeat}
          toggleSongFavorite={toggleFavWithToast}
          cycleLayout={cycleLayout}
          hideFullPlayer={hideAndGoBack}
          onQueuePress={onQueuePress}
          onLyricsPress={onLyricsPress}
          onInfoPress={onInfoPress}
        />
      ) : (
        <ClassicLayout
          currentTrack={track}
          isPlaying={isPlaying}
          isFav={isFav}
          shuffle={shuffle}
          repeat={repeat}
          colors={colors}
          togglePlay={togglePlay}
          next={next}
          previous={previous}
          setShuffle={setShuffle}
          setRepeat={setRepeat}
          toggleSongFavorite={toggleFavWithToast}
          cycleLayout={cycleLayout}
          hideFullPlayer={hideAndGoBack}
          onQueuePress={onQueuePress}
          onLyricsPress={onLyricsPress}
          onInfoPress={onInfoPress}
        />
      )}

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
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
              {t('player.queue')}
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

      {/* Layout Picker Bottom Sheet */}
      <BottomSheetModal
        ref={layoutSheetRef}
        snapPoints={['40%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
            Player Layout
          </Text>
          {(['classic', 'modern', 'minimal', 'driving', 'lyrics'] as const).map((layout) => (
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
              <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                {layout === 'driving' && <Car size={16} color={nowPlayingLayout === layout ? colors.accent : colors.textMuted} />}
                {layout === 'lyrics' && <AlignLeft size={16} color={nowPlayingLayout === layout ? colors.accent : colors.textMuted} />}
                <Text style={{ fontSize: 15, fontWeight: '500', color: nowPlayingLayout === layout ? colors.accent : colors.text }}>
                  {layout.charAt(0).toUpperCase() + layout.slice(1)}
                </Text>
              </View>
              {nowPlayingLayout === layout && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
              )}
            </Pressable>
          ))}
        </View>
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
              <InfoRow label="Format" value={track?.uri.split('.').pop()?.toUpperCase() ?? 'NONE'} colors={colors} />
              <InfoRow label="Bitrate" value={track?.bitrate ? `${track.bitrate} kbps` : 'Unknown'} colors={colors} />
              <InfoRow label="Sample Rate" value={track?.sampleRate ? `${track.sampleRate} Hz` : 'Unknown'} colors={colors} />
              <InfoRow label="File Size" value={track ? formatFileSize(track.fileSize) : '0 B'} colors={colors} />
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
  currentTrack: any;
  isPlaying: boolean;
  isFav: boolean;
  shuffle: boolean;
  repeat: string;
  colors: any;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  setShuffle: (v: boolean) => void;
  setRepeat: (m: any) => void;
  toggleSongFavorite: (song: any) => void;
  cycleLayout: () => void;
  hideFullPlayer: () => void;
  onQueuePress: () => void;
  onLyricsPress: () => void;
  onInfoPress: () => void;
  lyrics?: any;
  isLyricsLoading?: boolean;
  lyricsError?: boolean;
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

const ClassicLayout = React.memo(function ClassicLayout(props: LayoutProps) {
  const { colors, currentTrack, isPlaying, isFav, shuffle, repeat } = props;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { paddingBottom: insets.bottom }]}>
      <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.px4, s.pb4, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={props.hideFullPlayer} style={[s.w11, s.h11, s.itemsCenter, s.justifyCenter]}>
          <ChevronDown size={28} color={colors.text} />
        </Pressable>
        <Text style={[s.textSm, s.fontSemibold, { color: colors.textMuted }]}>
          {t('player.now.playing')}
        </Text>
        <Pressable onPress={props.cycleLayout} style={[s.w11, s.h11, s.itemsCenter, s.justifyCenter]}>
          <LayoutGrid size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, s.px8]}>
        <View
          style={[s.rounded3xl, s.itemsCenter, s.justifyCenter, s.mb8, s.overflowHidden, { width: ARTWORK_SIZE, height: ARTWORK_SIZE, backgroundColor: colors.surface }]}
        >
          {currentTrack.artwork ? (
            <Image source={{ uri: currentTrack.artwork }} style={{ width: ARTWORK_SIZE, height: ARTWORK_SIZE }} contentFit="cover" transition={300} />
          ) : (
            <Music size={64} color={colors.accent} />
          )}
        </View>

        <View style={[s.wFull, s.itemsCenter, s.mb4]}>
          <Text style={[s.textXl, s.fontBold, { color: colors.text }]} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={[s.textBase, s.mt1, { color: colors.textMuted }]} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>

        <SeekBar colors={colors} />

        <View style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap6, s.mb8, s.mt2]}>
          <Pressable onPress={() => props.setShuffle(!shuffle)}>
            <Shuffle size={22} color={shuffle ? colors.accent : colors.textMuted} />
          </Pressable>
          <Pressable onPress={props.previous} style={[s.w14, s.h14, s.roundedFull, s.itemsCenter, s.justifyCenter]}>
            <SkipBack size={28} color={colors.text} fill={colors.text} />
          </Pressable>
          <Pressable onPress={props.togglePlay} style={[s.roundedFull, s.itemsCenter, s.justifyCenter, { width: 72, height: 72, backgroundColor: colors.accent }]}>
            {isPlaying ? (
              <Pause size={32} color={colors.background} fill={colors.background} />
            ) : (
              <Play size={32} color={colors.background} fill={colors.background} />
            )}
          </Pressable>
          <Pressable onPress={props.next} style={[s.w14, s.h14, s.roundedFull, s.itemsCenter, s.justifyCenter]}>
            <SkipForward size={28} color={colors.text} fill={colors.text} />
          </Pressable>
          <RepeatButton repeat={repeat} setRepeat={props.setRepeat} colors={colors} />
        </View>

        <View style={[s.flexRow, s.itemsCenter, s.gap8]}>
          <Pressable onPress={() => props.toggleSongFavorite(currentTrack)}>
            <Heart size={22} color={isFav ? colors.accent : colors.textMuted} fill={isFav ? colors.accent : 'none'} />
          </Pressable>
          <Pressable onPress={props.onQueuePress}>
            <ListMusic size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={props.onLyricsPress}>
            <AlignLeft size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={props.onInfoPress}>
            <Info size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const ModernLayout = React.memo((props: LayoutProps) => {
  const { colors, currentTrack, isPlaying, isFav, shuffle, repeat } = props;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

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
        <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.px4, s.pb4, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={props.hideFullPlayer} style={[s.w11, s.h11, s.itemsCenter, s.justifyCenter]}>
            <ChevronDown size={28} color={m.text} />
          </Pressable>
          <Text style={[s.textSm, s.fontSemibold, { color: m.textSecondary }]}>
            {t('player.now.playing')}
          </Text>
          <Pressable onPress={props.cycleLayout} style={[s.w11, s.h11, s.itemsCenter, s.justifyCenter]}>
            <LayoutGrid size={20} color={m.textSecondary} />
          </Pressable>
        </View>

        <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { paddingHorizontal: 32 }]}>
          <View style={[s.rounded3xl, s.overflowHidden, s.mb8, { width: SCREEN_WIDTH * 0.65, height: SCREEN_WIDTH * 0.65, backgroundColor: m.surface }]}>
            {currentTrack.artwork ? (
              <Image source={{ uri: currentTrack.artwork }} style={{ width: SCREEN_WIDTH * 0.65, height: SCREEN_WIDTH * 0.65 }} contentFit="cover" transition={300} />
            ) : (
              <View style={[s.flex1, s.itemsCenter, s.justifyCenter]}>
                <Music size={64} color={m.textMuted} />
              </View>
            )}
          </View>

          <Text style={[s.text2xl, s.fontBold, { color: m.text }]} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={[s.textBase, s.mt1, { color: m.textSecondary }]} numberOfLines={1}>{currentTrack.artist}</Text>

          <View style={[s.wFull, s.mt8]}>
            <SeekBar
              colors={{ accent: m.text, border: m.sliderMax, text: m.text, textMuted: m.textMuted }}
              sliderAccent={m.text}
              sliderTrack={m.sliderMax}
              thumbColor={colors.accent}
            />
          </View>

          <View style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap6, s.mt4]}>
            <Pressable onPress={() => props.setShuffle(!shuffle)}>
              <Shuffle size={22} color={shuffle ? m.text : m.textFaint} />
            </Pressable>
            <Pressable onPress={props.previous} style={[s.w14, s.h14, s.roundedFull, s.itemsCenter, s.justifyCenter]}>
              <SkipBack size={28} color={m.text} fill={m.text} />
            </Pressable>
            <Pressable onPress={props.togglePlay} style={[s.roundedFull, s.itemsCenter, s.justifyCenter, { width: 72, height: 72, backgroundColor: m.playBg }]}>
              {isPlaying ? (
                <Pause size={32} color={m.text} fill={m.text} />
              ) : (
                <Play size={32} color={m.text} fill={m.text} />
              )}
            </Pressable>
            <Pressable onPress={props.next} style={[s.w14, s.h14, s.roundedFull, s.itemsCenter, s.justifyCenter]}>
              <SkipForward size={28} color={m.text} fill={m.text} />
            </Pressable>
            <RepeatButton repeat={repeat} setRepeat={props.setRepeat} colors={{ ...colors, accent: m.text, textMuted: m.textFaint }} />
          </View>

          <View style={[s.flexRow, s.itemsCenter, s.gap8, s.mt6]}>
            <Pressable onPress={() => props.toggleSongFavorite(currentTrack)}>
              <Heart size={22} color={isFav ? m.text : m.textFaint} fill={isFav ? m.text : 'none'} />
            </Pressable>
            <Pressable onPress={props.onQueuePress}>
              <ListMusic size={22} color={m.textFaint} />
            </Pressable>
            <Pressable onPress={props.onLyricsPress}>
              <AlignLeft size={22} color={m.textFaint} />
            </Pressable>
            <Pressable onPress={props.onInfoPress}>
              <Info size={22} color={m.textFaint} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
});
ModernLayout.displayName = 'ModernLayout';

const MinimalLayout = React.memo((props: LayoutProps) => {
  const { colors, currentTrack, isPlaying, isFav, shuffle, repeat } = props;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { paddingBottom: insets.bottom }]}>
      <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.px4, s.pb4, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={props.hideFullPlayer} style={[s.w11, s.h11, s.itemsCenter, s.justifyCenter]}>
          <ChevronDown size={28} color={colors.text} />
        </Pressable>
        <Text style={[s.textSm, s.fontSemibold, { color: colors.textMuted }]}>
          {t('player.now.playing')}
        </Text>
        <Pressable onPress={props.cycleLayout} style={[s.w11, s.h11, s.itemsCenter, s.justifyCenter]}>
          <LayoutGrid size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={[s.flex1, { paddingHorizontal: 24, justifyContent: 'center' }]}>
        <View style={[s.flexRow, s.itemsCenter, s.gap4, { marginBottom: 32 }]}>
          <View style={[s.rounded2xl, s.overflowHidden, { width: 72, height: 72, backgroundColor: colors.surface }]}>
            {currentTrack.artwork ? (
              <Image source={{ uri: currentTrack.artwork }} style={{ width: 72, height: 72 }} contentFit="cover" transition={200} />
            ) : (
              <View style={[s.flex1, s.itemsCenter, s.justifyCenter]}>
                <Music size={28} color={colors.accent} />
              </View>
            )}
          </View>
          <View style={[s.flex1]}>
            <Text style={[s.textLg, s.fontBold, { color: colors.text }]} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={[s.textSm, s.mt05, { color: colors.textMuted }]} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          <Pressable onPress={() => props.toggleSongFavorite(currentTrack)}>
            <Heart size={22} color={isFav ? colors.accent : colors.textMuted} fill={isFav ? colors.accent : 'none'} />
          </Pressable>
        </View>

        <SeekBar colors={colors} sliderHeight={32} />

        <View style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap5, s.mt4]}>
          <Pressable onPress={() => props.setShuffle(!shuffle)}>
            <Shuffle size={20} color={shuffle ? colors.accent : colors.textMuted} />
          </Pressable>
          <Pressable onPress={props.previous} style={[s.w12, s.h12, s.roundedFull, s.itemsCenter, s.justifyCenter]}>
            <SkipBack size={24} color={colors.text} fill={colors.text} />
          </Pressable>
          <Pressable onPress={props.togglePlay} style={[s.roundedFull, s.itemsCenter, s.justifyCenter, { width: 60, height: 60, backgroundColor: colors.accent }]}>
            {isPlaying ? (
              <Pause size={26} color={colors.background} fill={colors.background} />
            ) : (
              <Play size={26} color={colors.background} fill={colors.background} />
            )}
          </Pressable>
          <Pressable onPress={props.next} style={[s.w12, s.h12, s.roundedFull, s.itemsCenter, s.justifyCenter]}>
            <SkipForward size={24} color={colors.text} fill={colors.text} />
          </Pressable>
          <RepeatButton repeat={repeat} setRepeat={props.setRepeat} colors={colors} />
        </View>

        <View style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap8, s.mt6]}>
          <Pressable onPress={props.onQueuePress}>
            <ListMusic size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={props.onLyricsPress}>
            <AlignLeft size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={props.onInfoPress}>
            <Info size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
});
MinimalLayout.displayName = 'MinimalLayout';

const DrivingLayout = React.memo((props: LayoutProps) => {
  const { colors, currentTrack, isPlaying } = props;
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { paddingBottom: insets.bottom, backgroundColor: '#000' }]}>
      <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.px6, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={props.hideFullPlayer}>
          <ChevronDown size={32} color="#fff" />
        </Pressable>
        <Car size={24} color={colors.accent} />
        <Pressable onPress={props.cycleLayout}>
          <Maximize2 size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={[s.flex1, s.justifyCenter, s.px8]}>
        {currentTrack.artwork ? (
          <View style={[s.itemsCenter, s.mb6]}>
            <Image
              source={{ uri: currentTrack.artwork }}
              style={{ width: 200, height: 200, borderRadius: 24 }}
              contentFit="cover"
              transition={300}
            />
          </View>
        ) : (
          <View style={[s.itemsCenter, s.mb6]}>
            <View style={[{ width: 200, height: 200, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#222' }]}>
              <Music size={64} color="#666" />
            </View>
          </View>
        )}

        <Text style={[s.text4xl, s.fontBold, s.mb2, { color: '#fff', textAlign: 'center' }]} numberOfLines={2}>
          {currentTrack.title}
        </Text>
        <Text style={[s.text2xl, { color: '#aaa', textAlign: 'center', marginBottom: 60 }]} numberOfLines={1}>
          {currentTrack.artist}
        </Text>

        <View style={[s.flexRow, s.itemsCenter, s.justifyCenter, { gap: 40 }]}>
          <Pressable 
            onPress={props.previous} 
            style={[{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#222' }]}
          >
            <SkipBack size={40} color="#fff" fill="#fff" />
          </Pressable>
          
          <Pressable 
            onPress={props.togglePlay} 
            style={[s.roundedFull, s.itemsCenter, s.justifyCenter, { width: 100, height: 100, backgroundColor: colors.accent }]}
          >
            {isPlaying ? (
              <Pause size={48} color="#000" fill="#000" />
            ) : (
              <Play size={48} color="#000" fill="#000" />
            )}
          </Pressable>

          <Pressable 
            onPress={props.next} 
            style={[{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#222' }]}
          >
            <SkipForward size={40} color="#fff" fill="#fff" />
          </Pressable>
        </View>

        <View style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.mt10, s.gap12]}>
           <Pressable onPress={props.onQueuePress} style={s.itemsCenter}>
              <ListMusic size={24} color="#666" />
              <Text style={[s.textXs, s.mt2, { color: '#666' }]}>Queue</Text>
           </Pressable>
           <Pressable onPress={props.onLyricsPress} style={s.itemsCenter}>
              <Mic2 size={24} color="#666" />
              <Text style={[s.textXs, s.mt2, { color: '#666' }]}>Lyrics</Text>
           </Pressable>
           <Pressable onPress={props.onInfoPress} style={s.itemsCenter}>
              <Info size={24} color="#666" />
              <Text style={[s.textXs, s.mt2, { color: '#666' }]}>Info</Text>
           </Pressable>
        </View>
      </View>
    </View>
  );
});
DrivingLayout.displayName = 'DrivingLayout';

const DISC_IMAGES = [
  { image: require('../../assets/discs/black.png'), color: '#1a1a1a' },
  { image: require('../../assets/discs/blue.png'), color: '#2563eb' },
  { image: require('../../assets/discs/golden.png'), color: '#d97706' },
  { image: require('../../assets/discs/gradient.png'), color: '#7c3aed' },
  { image: require('../../assets/discs/green.png'), color: '#16a34a' },
  { image: require('../../assets/discs/grey.png'), color: '#6b7280' },
  { image: require('../../assets/discs/orange.png'), color: '#ea580c' },
  { image: require('../../assets/discs/pink.png'), color: '#ec4899' },
  { image: require('../../assets/discs/purple.png'), color: '#9333ea' },
  { image: require('../../assets/discs/red.png'), color: '#dc2626' },
  { image: require('../../assets/discs/sky.png'), color: '#0ea5e9' },
  { image: require('../../assets/discs/yellow.png'), color: '#eab308' },
];

const LyricsLayout = React.memo((props: LayoutProps) => {
  const { currentTrack, isPlaying, shuffle, repeat, lyrics = null, isLyricsLoading = false } = props;
  const insets = useSafeAreaInsets();

  const discIndex = useMemo(() => {
    if (!currentTrack) return 0;
    let hash = 0;
    const id = currentTrack.id;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % DISC_IMAGES.length;
  }, [currentTrack]);

  const disc = DISC_IMAGES[discIndex];

  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = 0;
    const anim = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false,
    );
    rotation.value = anim;
    return () => {
      rotation.value = 0;
    };
  }, [rotation]);

  const discAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const discSize = SCREEN_WIDTH * 0.7;

  return (
    <View style={[s.flex1, { backgroundColor: disc.color }]}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: disc.color, opacity: 0.3 }} />

      <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.px4, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={props.hideFullPlayer} style={[s.w11, s.h11, s.itemsCenter, s.justifyCenter]}>
          <ChevronDown size={28} color="#fff" />
        </Pressable>
        <Pressable onPress={props.cycleLayout} style={[s.w11, s.h11, s.itemsCenter, s.justifyCenter]}>
          <LayoutGrid size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>

      <View style={[s.flex1, { flexDirection: 'row', alignItems: 'center' }]}>
        <View style={{ width: discSize * 0.65, height: discSize, justifyContent: 'center', alignItems: 'flex-start', marginLeft: -discSize * 0.25 }}>
          <Animated.View style={[discAnimatedStyle, { width: discSize, height: discSize }]}>
            <Image
              source={disc.image}
              style={{ width: discSize, height: discSize }}
              contentFit="cover"
            />
          </Animated.View>
        </View>

        <View style={[s.flex1, { paddingRight: 16, paddingLeft: 8, gap: 12 }]}>
          <View>
            <Text style={[s.textXl, s.fontBold, { color: '#fff' }]} numberOfLines={1}>
              {currentTrack?.title}
            </Text>
            <Text style={[s.textSm, s.mt05, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>
              {currentTrack?.artist}
            </Text>
          </View>

          <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
            <Pressable onPress={() => props.setShuffle(!shuffle)}>
              <Shuffle size={18} color={shuffle ? '#fff' : 'rgba(255,255,255,0.5)'} />
            </Pressable>
            <Pressable onPress={props.previous}>
              <SkipBack size={22} color="#fff" fill="#fff" />
            </Pressable>
            <Pressable onPress={props.togglePlay} style={[{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }]}>
              {isPlaying ? (
                <Pause size={22} color="#fff" fill="#fff" />
              ) : (
                <Play size={22} color="#fff" fill="#fff" />
              )}
            </Pressable>
            <Pressable onPress={props.next}>
              <SkipForward size={22} color="#fff" fill="#fff" />
            </Pressable>
            <RepeatButton repeat={repeat} setRepeat={props.setRepeat} colors={{ accent: '#fff', textMuted: 'rgba(255,255,255,0.5)' }} />
          </View>

          <View>
            <SeekBar
              colors={{ accent: '#fff', border: 'rgba(255,255,255,0.3)', text: '#fff', textMuted: 'rgba(255,255,255,0.6)' }}
              sliderAccent="#fff"
              sliderTrack="rgba(255,255,255,0.3)"
              thumbColor="#fff"
              showPercentage={false}
              sliderHeight={32}
            />
          </View>
        </View>
      </View>

      {/* Inline lyrics */}
      <View style={{ height: SCREEN_WIDTH * 0.35, marginBottom: insets.bottom + 8 }}>
        {isLyricsLoading ? (
          <View style={[s.flex1, s.itemsCenter, s.justifyCenter]}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
          </View>
        ) : lyrics && lyrics.synced.length > 0 ? (
          <SyncedLyricsView synced={lyrics.synced} colors={{
            accent: '#fff',
            text: 'rgba(255,255,255,0.9)',
            textMuted: 'rgba(255,255,255,0.4)',
          }} />
        ) : lyrics?.lyrics ? (
          <ScrollView style={s.flex1} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 22, textAlign: 'center' }}>
              {lyrics.lyrics}
            </Text>
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
});
LyricsLayout.displayName = 'LyricsLayout';

function InfoRow({ label, value, colors, multiline }: { label: string; value: string; colors: any; multiline?: boolean }) {
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

function SyncedLyricsView({ synced, colors }: { synced: SyncedLine[]; colors: any }) {
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

