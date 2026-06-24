import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Dimensions, StatusBar, PanResponder, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createVideoPlayer, VideoView } from 'expo-video';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useTheme } from '@/hooks/use-theme';
import { useVideoStore } from '@/store/video-store';
import { useVideoPlayerStore, type ScaleMode, type PlayMode } from '@/store/video-player-store';
import { useVideoProgressStore } from '@/store/video-progress-store';
import { useHiddenFilesStore } from '@/store/hidden-files-store';
import { useRecentlyDeletedStore } from '@/store/recently-deleted-store';
import { useToastStore } from '@/store/toast-store';
import { formatDuration } from '@/utils/cn';
import { s } from '@/styles';
import {
  ChevronDown,
  Gauge,
  MoreHorizontal,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Headphones,
  RotateCw,
  Lock,
  Unlock,
  PenLine,
  PictureInPicture,
  Maximize,
  Repeat,
  Repeat1,
  StopCircle,
  Languages,
  Share2,
  EyeOff,
  Trash2,
  Film,
  Info,
} from 'lucide-react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetFlatList,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import * as Sharing from 'expo-sharing';
import type { Video } from '@/types/media';

const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const CONTROLS_HIDE_DELAY = 4000;
const SWIPE_SEEK_THRESHOLD = 50;
const SEEK_AMOUNT = 10;

export default function VideoPlayerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { videoId } = useLocalSearchParams<{ videoId?: string }>();

  const playerRef = useRef<ReturnType<typeof createVideoPlayer> | null>(null);
  const videoViewRef = useRef<React.ElementRef<typeof VideoView> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSeekingRef = useRef(false);
  const videoRef = useRef<Video | null>(null);

  const currentVideo = useVideoPlayerStore((s) => s.currentVideo);
  const queue = useVideoPlayerStore((s) => s.queue);
  const queueIndex = useVideoPlayerStore((s) => s.queueIndex);
  const isPlaying = useVideoPlayerStore((s) => s.isPlaying);
  const playbackSpeed = useVideoPlayerStore((s) => s.playbackSpeed);
  const isControlsLocked = useVideoPlayerStore((s) => s.isControlsLocked);
  const isPortrait = useVideoPlayerStore((s) => s.isPortrait);
  const isAudioOnly = useVideoPlayerStore((s) => s.isAudioOnly);
  const scaleMode = useVideoPlayerStore((s) => s.scaleMode);
  const playMode = useVideoPlayerStore((s) => s.playMode);
  const isFloatingWindow = useVideoPlayerStore((s) => s.isFloatingWindow);
  const play = useVideoPlayerStore((s) => s.play);
  const togglePlay = useVideoPlayerStore((s) => s.togglePlay);
  const setSpeed = useVideoPlayerStore((s) => s.setSpeed);
  const next = useVideoPlayerStore((s) => s.next);
  const previous = useVideoPlayerStore((s) => s.previous);
  const lockControls = useVideoPlayerStore((s) => s.lockControls);
  const unlockControls = useVideoPlayerStore((s) => s.unlockControls);
  const setOrientation = useVideoPlayerStore((s) => s.setOrientation);
  const toggleAudioOnly = useVideoPlayerStore((s) => s.toggleAudioOnly);
  const setScaleMode = useVideoPlayerStore((s) => s.setScaleMode);
  const setPlayMode = useVideoPlayerStore((s) => s.setPlayMode);
  const toggleFloatingWindow = useVideoPlayerStore((s) => s.toggleFloatingWindow);
  const removeFromQueue = useVideoPlayerStore((s) => s.removeFromQueue);

  const videos = useVideoStore((s) => s.videos);

  const [player, setPlayer] = useState<ReturnType<typeof createVideoPlayer> | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [slidingValue, setSlidingValue] = useState<number | null>(null);
  const [windowDims, setWindowDims] = useState(() => Dimensions.get('window'));

  const speedSheetRef = useRef<BottomSheetModal>(null);
  const menuSheetRef = useRef<BottomSheetModal>(null);
  const queueSheetRef = useRef<BottomSheetModal>(null);

  const video = currentVideo;

  useEffect(() => {
    videoRef.current = video;
  }, [video]);

  useEffect(() => {
    if (!currentVideo && videoId && videos.length > 0) {
      const found = videos.find((v) => v.id === videoId);
      if (found) play(found, videos);
    }
  }, [videoId, videos, currentVideo, play]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p || !video) return;
    if (isPlaying) p.play();
    else p.pause();
  }, [isPlaying, video]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    if (playerRef.current && video) {
      playerRef.current.muted = isAudioOnly;
    }
  }, [isAudioOnly, video]);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      const isLandscape = window.width > window.height;
      setWindowDims(window);
      setOrientation(!isLandscape);
    });
    return () => sub.remove();
  }, [setOrientation]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      const vid = videoRef.current;
      if (playerRef.current && vid) {
        useVideoProgressStore.getState().setProgress(vid.id, playerRef.current.currentTime, playerRef.current.duration);
      }
    };
  }, []);

  const setupPlayer = useCallback((uri: string) => {
    if (playerRef.current) {
      playerRef.current.replaceAsync(uri);
      const p = playerRef.current;
      setCurrentTime(p.currentTime ?? 0);
      setDuration(p.duration ?? 0);
      return;
    }

    const p = createVideoPlayer(uri);
    playerRef.current = p;
    setPlayer(p);
    p.timeUpdateEventInterval = 0.25;
    p.loop = false;

    const statusSub = p.addListener('statusChange', (e) => {
      if (e.status === 'readyToPlay') {
        setDuration(p.duration);
      }
    });

    const timeSub = p.addListener('timeUpdate', (e) => {
      if (!isSeekingRef.current) {
        setCurrentTime(e.currentTime);
      }
      setDuration(p.duration);
    });

    const endSub = p.addListener('playToEnd', () => {
      const store = useVideoPlayerStore.getState();
      const mode = store.playMode;
      if (mode === 'loop-one') {
        p.replay();
        return;
      }
      if (mode === 'pause-after-play') {
        store.pause();
        return;
      }
      const idx = store.queueIndex;
      if (idx < store.queue.length - 1) {
        store.next();
      } else {
        p.replay();
      }
    });

    return () => {
      statusSub.remove();
      timeSub.remove();
      endSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!video) return;
    setupPlayer(video.uri);

    const saved = useVideoProgressStore.getState().getProgress(video.id);
    if (saved && saved.position > 3 && saved.position < saved.duration - 3) {
      Alert.alert(
        'Resume Playback',
        `Resume from ${formatDuration(saved.position)}?`,
        [
          { text: 'Start Over', style: 'cancel' },
          {
            text: 'Resume',
            onPress: () => {
              if (playerRef.current) {
                playerRef.current.currentTime = saved.position;
                setCurrentTime(saved.position);
              }
            },
          },
        ],
      );
    }
  }, [video, setupPlayer]);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!video || !isPlaying) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    progressIntervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (p) {
        useVideoProgressStore.getState().setProgress(video.id, p.currentTime, p.duration);
      }
    }, 5000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [video, isPlaying]);

  const seekTo = useCallback((time: number) => {
    if (!playerRef.current) return;
    playerRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const seekBy = useCallback((seconds: number) => {
    if (!playerRef.current) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    playerRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration, currentTime]);

  useEffect(() => {
    if (showControls && !isControlsLocked) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setShowControls(false), CONTROLS_HIDE_DELAY);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [showControls, isControlsLocked]);

  const videoContentFit = scaleMode === 'fill' ? 'fill' : 'contain';

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    p.loop = playMode === 'loop-one';
  }, [playMode]);

  const handleFloatingWindow = useCallback(() => {
    if (isFloatingWindow) {
      videoViewRef.current?.stopPictureInPicture();
    } else {
      videoViewRef.current?.startPictureInPicture();
    }
    toggleFloatingWindow();
  }, [isFloatingWindow, toggleFloatingWindow]);

  const handleSpeedPress = useCallback(() => {
    speedSheetRef.current?.present();
  }, []);

  const handleMenuPress = useCallback(() => {
    menuSheetRef.current?.present();
  }, []);

  const handleLockPress = useCallback(() => {
    if (isControlsLocked) {
      unlockControls();
      setShowControls(true);
      queueSheetRef.current?.dismiss();
    } else {
      lockControls();
      setShowControls(false);
      queueSheetRef.current?.present();
    }
  }, [isControlsLocked, lockControls, unlockControls]);

  const handleQueueItemPress = useCallback((item: Video) => {
    const idx = queue.findIndex((v) => v.id === item.id);
    if (idx >= 0 && idx !== queueIndex) {
      useVideoPlayerStore.getState().play(item, queue);
    }
    queueSheetRef.current?.dismiss();
  }, [queue, queueIndex]);

  const handleRemoveFromQueue = useCallback((index: number) => {
    removeFromQueue(index);
  }, [removeFromQueue]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const displayTime = slidingValue ?? currentTime;
  const progress = duration > 0 ? displayTime / duration : 0;

  const goBack = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
    router.back();
  }, [router]);

  const seekByRef = useRef(seekBy);
  const isControlsLockedRef = useRef(isControlsLocked);

  useEffect(() => {
    seekByRef.current = seekBy;
  }, [seekBy]);

  useEffect(() => {
    isControlsLockedRef.current = isControlsLocked;
  }, [isControlsLocked]);

  const [swipePanResponder, setSwipePanResponder] = useState<ReturnType<typeof PanResponder.create> | null>(null);

  useEffect(() => {
    setSwipePanResponder(PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        if (isControlsLockedRef.current) return false;
        return Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_SEEK_THRESHOLD) {
          seekByRef.current(SEEK_AMOUNT);
        } else if (gs.dx < -SWIPE_SEEK_THRESHOLD) {
          seekByRef.current(-SEEK_AMOUNT);
        }
      },
    }));
  }, []);

  if (!video) {
    return (
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: '#000' }]}>
        <Text style={{ color: '#fff', fontSize: 16 }}>No video selected</Text>
        <Pressable onPress={goBack} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.accent, fontSize: 15 }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[s.flex1, { backgroundColor: '#000' }]}>
      <StatusBar hidden />

      <View style={s.flex1}>
        <VideoView
          ref={videoViewRef}
          player={player}
          style={{
            width: isPortrait ? windowDims.width : windowDims.height,
            height: isPortrait ? windowDims.height : windowDims.width,
          }}
          nativeControls={false}
          contentFit={videoContentFit}
        />

        {showControls && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'space-between',
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: 16,
            }}
            pointerEvents="box-none"
            {...(swipePanResponder?.panHandlers ?? {})}
          >
              <View style={[s.flexRow, s.itemsCenter, { gap: 12 }]}>
                <Pressable onPress={goBack} hitSlop={12} style={{ padding: 4 }}>
                  <ChevronDown size={24} color="#fff" />
                </Pressable>

                <View style={s.flex1}>
                  <Text
                    style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}
                    numberOfLines={1}
                  >
                    {video.title}
                  </Text>
                </View>

                <Pressable onPress={handleSpeedPress} hitSlop={8} style={{ padding: 4 }}>
                  <Gauge size={22} color="#fff" />
                </Pressable>
                <Pressable onPress={handleMenuPress} hitSlop={8} style={{ padding: 4 }}>
                  <MoreHorizontal size={22} color="#fff" />
                </Pressable>
              </View>

              <View style={[s.itemsCenter]}>
                <View style={[s.flexRow, s.itemsCenter, s.justifyCenter, { gap: 40 }]}>
                  <Pressable onPress={previous} hitSlop={16} style={{ padding: 8 }}>
                    <SkipBack size={28} color="#fff" />
                  </Pressable>
                  <Pressable onPress={togglePlay} hitSlop={16} style={{ padding: 8 }}>
                    {isPlaying ? (
                      <Pause size={36} color="#fff" />
                    ) : (
                      <Play size={36} color="#fff" />
                    )}
                  </Pressable>
                  <Pressable onPress={next} hitSlop={16} style={{ padding: 8 }}>
                    <SkipForward size={28} color="#fff" />
                  </Pressable>
                </View>
              </View>

              <View style={{ gap: 12, backgroundColor: `${colors.accent}18`, paddingTop: 12, paddingBottom: 6, paddingHorizontal: 10, borderRadius: 14 }}>
                <View
                  style={[s.flexRow, s.itemsCenter, { gap: 8 }]}
                >
                  <Text style={{ fontSize: 12, color: '#fff', fontVariant: ['tabular-nums'], width: 40, textAlign: 'center' }}>
                    {formatDuration(displayTime)}
                  </Text>
                  <View style={s.flex1}>
                    <Slider
                      value={progress}
                      onValueChange={(val) => {
                        isSeekingRef.current = true;
                        setSlidingValue(val * duration);
                      }}
                      onSlidingComplete={(val) => {
                        isSeekingRef.current = false;
                        setSlidingValue(null);
                        seekTo(val * duration);
                        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
                        hideTimerRef.current = setTimeout(() => setShowControls(false), CONTROLS_HIDE_DELAY);
                      }}
                      minimumValue={0}
                      maximumValue={1}
                      minimumTrackTintColor="#fff"
                      maximumTrackTintColor="rgba(255,255,255,0.3)"
                      thumbTintColor="#fff"
                      style={{ width: '100%', height: 40 }}
                    />
                  </View>
                  <Text style={{ fontSize: 12, color: '#fff', fontVariant: ['tabular-nums'], width: 40, textAlign: 'center' }}>
                    {formatDuration(duration)}
                  </Text>
                </View>

                <View style={[s.flexRow, s.itemsCenter, s.justifyCenter, { gap: 48 }]}>
                  <Pressable
                    onPress={toggleAudioOnly}
                    hitSlop={12}
                    style={[s.itemsCenter, s.gap1]}
                  >
                    <Headphones size={22} color={isAudioOnly ? colors.accent : '#fff'} />
                    <Text style={{ fontSize: 10, color: isAudioOnly ? colors.accent : 'rgba(255,255,255,0.7)' }}>
                      Audio
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setOrientation(!isPortrait)}
                    hitSlop={12}
                    style={[s.itemsCenter, s.gap1]}
                  >
                    <RotateCw size={22} color="#fff" />
                    <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                      {isPortrait ? 'Rotate' : 'Fit'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleLockPress}
                    hitSlop={12}
                    style={[s.itemsCenter, s.gap1]}
                  >
                    {isControlsLocked ? (
                      <Unlock size={22} color={colors.accent} />
                    ) : (
                      <Lock size={22} color="#fff" />
                    )}
                    <Text style={{ fontSize: 10, color: isControlsLocked ? colors.accent : 'rgba(255,255,255,0.7)' }}>
                      {isControlsLocked ? 'Unlock' : 'Lock'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
      </View>

      <BottomSheetModal
        ref={speedSheetRef}
        snapPoints={['28%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Text style={[s.textBase, s.fontSemibold, { color: colors.text, marginBottom: 16 }]}>
            Playback Speed
          </Text>
          <View style={[s.flexRow, s.flexWrap, s.gap3, { justifyContent: 'center' }]}>
            {PLAYBACK_SPEEDS.map((speed) => (
              <Pressable
                key={speed}
                onPress={() => {
                  setSpeed(speed);
                  speedSheetRef.current?.dismiss();
                }}
                style={[
                  s.itemsCenter,
                  s.justifyCenter,
                  s.rounded2xl,
                  {
                    width: 80,
                    height: 64,
                    backgroundColor: playbackSpeed === speed ? colors.accent : colors.card,
                  },
                ]}
              >
                <Text
                  style={[
                    s.textBase,
                    s.fontSemibold,
                    { color: playbackSpeed === speed ? '#fff' : colors.text },
                  ]}
                >
                  {speed}x
                </Text>
              </Pressable>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={menuSheetRef}
        snapPoints={['70%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>
          <Text style={[s.textBase, s.fontSemibold, { color: colors.text, marginBottom: 12 }]}>
            More Options
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {video && (
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, s.rounded2xl, { backgroundColor: colors.card, marginBottom: 16 }]}>
                <View style={{ width: 72, height: 48, borderRadius: 8, backgroundColor: colors.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  <Film size={24} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>{video.title}</Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>
                    {formatDuration(video.duration)}{video.width && video.height ? ` · ${video.width}x${video.height}` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    menuSheetRef.current?.dismiss();
                    router.push({ pathname: '/video-edit', params: { videoId: video.id } });
                  }}
                  hitSlop={8}
                  style={{ padding: 8 }}
                >
                  <PenLine size={20} color={colors.accent} />
                </Pressable>
              </View>
            )}

            <Text style={[s.textXs, s.fontSemibold, s.uppercase, { letterSpacing: 1, color: colors.textMuted, marginBottom: 8 }]}>
              Display
            </Text>
            <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.p3, s.rounded2xl, { backgroundColor: colors.card, marginBottom: 16 }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                <PictureInPicture size={20} color={colors.text} />
                <Text style={[s.textSm, { color: colors.text }]}>Floating Window</Text>
              </View>
              <Pressable
                onPress={handleFloatingWindow}
                style={[s.rounded2xl, { width: 44, height: 24, backgroundColor: isFloatingWindow ? colors.accent : colors.border, justifyContent: 'center', paddingHorizontal: 3 }]}
              >
                <View style={[s.roundedFull, { width: 18, height: 18, backgroundColor: '#fff', alignSelf: isFloatingWindow ? 'flex-end' : 'flex-start' }]} />
              </Pressable>
            </View>

            <Text style={[s.textXs, s.fontSemibold, s.uppercase, { letterSpacing: 1, color: colors.textMuted, marginBottom: 8 }]}>
              Scale
            </Text>
            <View style={[s.flexRow, s.gap2, { marginBottom: 16 }]}>
              {(['16:9', 'fill', 'fit', '4:3'] as ScaleMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setScaleMode(mode)}
                  style={[
                    s.flex1,
                    s.itemsCenter,
                    s.justifyCenter,
                    s.py3,
                    s.rounded2xl,
                    { backgroundColor: scaleMode === mode ? colors.accent : colors.card },
                  ]}
                >
                  <Text style={[s.textXs, s.fontSemibold, { color: scaleMode === mode ? '#fff' : colors.text }]}>
                    {mode === 'fill' ? <Maximize size={18} color={scaleMode === mode ? '#fff' : colors.text} /> : mode}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[s.textXs, s.fontSemibold, s.uppercase, { letterSpacing: 1, color: colors.textMuted, marginBottom: 8 }]}>
              Video Quality
            </Text>
            <View style={[s.flexRow, s.flexWrap, s.gap2, { marginBottom: 16 }]}>
              {['144p', '240p', '360p', '480p', '720p', '1080p', '2160p'].map((q) => {
                const height = parseInt(q);
                const isCurrent = video ? Math.abs((video.height ?? 0) - height) < 50 : false;
                return (
                  <Pressable
                    key={q}
                    onPress={() => useToastStore.getState().showToast(`Quality: ${q}`, 'video')}
                    style={[
                      s.itemsCenter,
                      s.justifyCenter,
                      s.px3,
                      s.py2,
                      s.rounded2xl,
                      { backgroundColor: isCurrent ? colors.accent : colors.card },
                    ]}
                  >
                    <Text style={[s.textXs, s.fontSemibold, { color: isCurrent ? '#fff' : colors.text }]}>{q}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[s.textXs, s.fontSemibold, s.uppercase, { letterSpacing: 1, color: colors.textMuted, marginBottom: 8 }]}>
              Play Mode
            </Text>
            <View style={[s.rounded2xl, { backgroundColor: colors.card, marginBottom: 16, overflow: 'hidden' }]}>
              {([
                { key: 'loop-one' as PlayMode, icon: Repeat1, label: 'Loop One' },
                { key: 'loop-all' as PlayMode, icon: Repeat, label: 'Loop All' },
                { key: 'pause-after-play' as PlayMode, icon: StopCircle, label: 'Pause After Play' },
              ]).map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setPlayMode(item.key)}
                  style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, playMode === item.key && { backgroundColor: `${colors.accent}20` }]}
                >
                  <item.icon size={20} color={playMode === item.key ? colors.accent : colors.text} />
                  <Text style={[s.textSm, s.flex1, { color: playMode === item.key ? colors.accent : colors.text }]}>
                    {item.label}
                  </Text>
                  {playMode === item.key && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
                  )}
                </Pressable>
              ))}
            </View>

            <Text style={[s.textXs, s.fontSemibold, s.uppercase, { letterSpacing: 1, color: colors.textMuted, marginBottom: 8 }]}>
              Audio
            </Text>
            <View style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, s.rounded2xl, { backgroundColor: colors.card, marginBottom: 16 }]}>
              <Languages size={20} color={colors.text} />
              <Text style={[s.textSm, { color: colors.text }]}>Audio Track</Text>
              <Text style={[s.textXs, s.flex1, { color: colors.textMuted, textAlign: 'right' }]}>
                {video?.language ?? 'Default'}
              </Text>
            </View>

            <Text style={[s.textXs, s.fontSemibold, s.uppercase, { letterSpacing: 1, color: colors.textMuted, marginBottom: 8 }]}>
              Actions
            </Text>
            <View style={[s.rounded2xl, { backgroundColor: colors.card, marginBottom: 16, overflow: 'hidden' }]}>
              <Pressable
                onPress={async () => {
                  if (!video) return;
                  try {
                    const avail = await Sharing.isAvailableAsync();
                    if (!avail) { Alert.alert('Sharing not available'); return; }
                    await Sharing.shareAsync(video.uri, { mimeType: 'video/*', dialogTitle: `Share ${video.title}` });
                  } catch { Alert.alert('Error', 'Could not share'); }
                  menuSheetRef.current?.dismiss();
                }}
                style={[s.flexRow, s.itemsCenter, s.gap3, s.p3]}
              >
                <Share2 size={20} color={colors.text} />
                <Text style={[s.textSm, { color: colors.text }]}>Share</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!video) return;
                  Alert.alert('Hide Video', `Hide "${video.title}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Hide', style: 'destructive',
                      onPress: () => {
                        useHiddenFilesStore.getState().hideVideo(video.id);
                        useToastStore.getState().showToast('Video hidden', 'eye-off');
                        menuSheetRef.current?.dismiss();
                        goBack();
                      },
                    },
                  ]);
                }}
                style={[s.flexRow, s.itemsCenter, s.gap3, s.p3]}
              >
                <EyeOff size={20} color={colors.text} />
                <Text style={[s.textSm, { color: colors.text }]}>Hide</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!video) return;
                  menuSheetRef.current?.dismiss();
                  router.push({ pathname: '/video-edit', params: { videoId: video.id } });
                }}
                style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, { borderTopWidth: 1, borderTopColor: colors.border }]}
              >
                <Info size={20} color={colors.text} />
                <Text style={[s.textSm, { color: colors.text }]}>Info</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!video) return;
                  Alert.alert('Delete Video', `Move "${video.title}" to recently deleted?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete', style: 'destructive',
                      onPress: () => {
                        useRecentlyDeletedStore.getState().addDeleted({
                          id: video.id, title: video.title, uri: video.uri,
                          type: 'video', fileSize: video.fileSize, duration: video.duration,
                        });
                        useToastStore.getState().showToast('Video moved to recently deleted', 'trash-2');
                        menuSheetRef.current?.dismiss();
                        goBack();
                      },
                    },
                  ]);
                }}
                style={[s.flexRow, s.itemsCenter, s.gap3, s.p3, { borderTopWidth: 1, borderTopColor: colors.border }]}
              >
                <Trash2 size={20} color="#ef4444" />
                <Text style={[s.textSm, { color: '#ef4444' }]}>Delete</Text>
              </Pressable>
            </View>
          </ScrollView>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={queueSheetRef}
        snapPoints={['50%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>
          <Text style={[s.textBase, s.fontSemibold, { color: colors.text, marginBottom: 12 }]}>
            Playlist Queue ({queue.length})
          </Text>
          <BottomSheetFlatList
            data={queue}
            keyExtractor={(item: Video) => item.id}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => handleQueueItemPress(item)}
                style={[
                  s.flexRow,
                  s.itemsCenter,
                  s.gap3,
                  s.py3,
                  index === queueIndex && { backgroundColor: `${colors.accent}20`, borderRadius: 10, paddingHorizontal: 8, marginHorizontal: -8 },
                ]}
              >
                <View style={{ width: 20 }}>
                  {index === queueIndex ? (
                    <Play size={14} color={colors.accent} fill={colors.accent} />
                  ) : (
                    <Text style={[s.textXs, { color: colors.textMuted, width: 14, textAlign: 'center' }]}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                <View style={{ width: 40, height: 28, borderRadius: 4, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>VID</Text>
                </View>
                <View style={s.flex1}>
                  <Text
                    style={[s.textSm, s.fontMedium, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </View>
                {queue.length > 1 && (
                  <Pressable
                    onPress={() => handleRemoveFromQueue(index)}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Trash2 size={16} color={colors.textMuted} />
                  </Pressable>
                )}
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}
