import { View, Text, Pressable, Dimensions, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import {
  ChevronLeft, Maximize2, Minimize2, Captions, Gauge, X, Play,
  SkipBack, SkipForward, Lock, Unlock, RotateCcw, RotateCw,
  Scaling, MonitorPlay,
} from 'lucide-react-native';
import { useVideoPlayer, VideoView, type VideoPlayer, isPictureInPictureSupported } from 'expo-video';
import { useState, useCallback, useRef, useEffect } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { parseSRT, parseVTT, getActiveCue, type SubtitleCue } from '@/utils/subtitle-parser';
import { formatDuration } from '@/utils/cn';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useVideoProgressStore } from '@/store/video-progress-store';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTranslation } from '@/hooks/use-translation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const SCALE_OPTIONS = [
  { label: '50%', value: 0.5, group: 'small' as const },
  { label: '60%', value: 0.6, group: 'small' as const },
  { label: '70%', value: 0.7, group: 'small' as const },
  { label: '80%', value: 0.8, group: 'small' as const },
  { label: '110%', value: 1.1, group: 'large' as const },
  { label: '125%', value: 1.25, group: 'large' as const },
  { label: '150%', value: 1.5, group: 'large' as const },
  { label: '200%', value: 2.0, group: 'large' as const },
];

function SeekIndicator({ visible, text, side }: { visible: boolean; text: string; side: 'left' | 'right' }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = visible ? withTiming(1, { duration: 150 }) : withTiming(0, { duration: 200 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: withSpring(visible ? 1 : 0.8) }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: '40%',
          [side]: 40,
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 10,
          alignItems: 'center',
        },
        animatedStyle,
      ]}
    >
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{text}</Text>
    </Animated.View>
  );
}

function VolumeIndicator({ volume }: { volume: number }) {
  const opacity = useSharedValue(0);
  const prevVolume = useRef(volume);

  useEffect(() => {
    if (prevVolume.current !== volume) {
      opacity.value = withTiming(1, { duration: 100 });
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
      }, 600);
      prevVolume.current = volume;
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const bars = Math.round(volume * 15);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          right: 20,
          top: '35%',
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderRadius: 10,
          padding: 10,
          alignItems: 'center',
        },
        animatedStyle,
      ]}
    >
      <View style={{ flexDirection: 'row', gap: 2, height: 80, alignItems: 'flex-end' }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 3,
              height: (i + 1) * 5,
              borderRadius: 1.5,
              backgroundColor: i < bars ? '#fff' : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </View>
      <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>{Math.round(volume * 100)}%</Text>
    </Animated.View>
  );
}

function BrightnessIndicator({ brightness }: { brightness: number }) {
  const opacity = useSharedValue(0);
  const prevBrightness = useRef(brightness);

  useEffect(() => {
    if (prevBrightness.current !== brightness) {
      opacity.value = withTiming(1, { duration: 100 });
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
      }, 600);
      prevBrightness.current = brightness;
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brightness]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 20,
          top: '35%',
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderRadius: 10,
          padding: 10,
          alignItems: 'center',
        },
        animatedStyle,
      ]}
    >
      <View style={{ width: 4, height: 80, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
        <View style={{ width: 4, height: `${brightness * 100}%`, borderRadius: 6, backgroundColor: '#fff' }} />
      </View>
      <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>{Math.round(brightness * 100)}%</Text>
    </Animated.View>
  );
}

export default function VideoPlayerScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { uri, title } = useLocalSearchParams<{ uri: string; title: string }>();
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const parsedCuesRef = useRef<SubtitleCue[]>([]);
  const [currentCueText, setCurrentCueText] = useState<string | null>(null);
  const speedSheetRef = useRef<BottomSheetModal>(null);
  const scaleSheetRef = useRef<BottomSheetModal>(null);

  const [seekText, setSeekText] = useState('');
  const [seekVisible, setSeekVisible] = useState(false);
  const [seekSide, setSeekSide] = useState<'left' | 'right'>('right');
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const seekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playerRef = useRef<VideoPlayer | null>(null);
  const videoViewRef = useRef<any>(null);
  const { saveVideoPosition, getVideoPosition, hasResumePoint, clearVideoProgress } = useVideoProgressStore();
  const [showResume, setShowResume] = useState(false);
  const [resumePosition, setResumePosition] = useState(0);

  const [scale, setScale] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isPiPSupported] = useState(() => {
    try { return isPictureInPictureSupported(); } catch { return false; }
  });
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number } | null>(null);

  const player = useVideoPlayer(uri ?? '', (p: VideoPlayer) => {
    p.loop = true;
    playerRef.current = p;

    if (uri && hasResumePoint(uri)) {
      const pos = getVideoPosition(uri);
      setResumePosition(pos);
      setShowResume(true);
    }
  });

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('sourceLoad', (event) => {
      const tracks = event.availableVideoTracks;
      if (tracks && tracks.length > 0) {
        const best = tracks.reduce((a, b) => {
          const aPixels = (a.size?.width ?? 0) * (a.size?.height ?? 0);
          const bPixels = (b.size?.width ?? 0) * (b.size?.height ?? 0);
          return bPixels > aPixels ? b : a;
        });
        if (best.size) {
          setVideoResolution({ width: best.size.width, height: best.size.height });
        }
      }
    });
    return () => sub.remove();
  }, [player]);

  const showSeekIndicator = useCallback((text: string, side: 'left' | 'right') => {
    setSeekText(text);
    setSeekSide(side);
    setSeekVisible(true);
    if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
    seekTimerRef.current = setTimeout(() => setSeekVisible(false), 800);
  }, []);

  const seekForward = useCallback(() => {
    if (playerRef.current) {
      const pos = playerRef.current.currentTime;
      const dur = playerRef.current.duration;
      const newPos = Math.min(pos + 10, dur);
      playerRef.current.currentTime = newPos;
      showSeekIndicator(`+10s`, 'right');
    }
  }, [showSeekIndicator]);

  const seekBackward = useCallback(() => {
    if (playerRef.current) {
      const pos = playerRef.current.currentTime;
      const newPos = Math.max(pos - 10, 0);
      playerRef.current.currentTime = newPos;
      showSeekIndicator(`-10s`, 'left');
    }
  }, [showSeekIndicator]);

  const FRAME_STEP = 1 / 30;

  const stepForward = useCallback(() => {
    if (playerRef.current) {
      const pos = playerRef.current.currentTime;
      const dur = playerRef.current.duration;
      const newPos = Math.min(pos + FRAME_STEP, dur);
      playerRef.current.currentTime = newPos;
      showSeekIndicator(`+1 frame`, 'right');
    }
  }, [showSeekIndicator, FRAME_STEP]);

  const stepBackward = useCallback(() => {
    if (playerRef.current) {
      const pos = playerRef.current.currentTime;
      const newPos = Math.max(pos - FRAME_STEP, 0);
      playerRef.current.currentTime = newPos;
      showSeekIndicator(`-1 frame`, 'left');
    }
  }, [showSeekIndicator, FRAME_STEP]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const entering = !prev;
      if (entering) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
      } else {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => {});
      }
      return entering;
    });
  }, []);

  const changeSpeed = useCallback((speed: number) => {
    setPlaybackRate(speed);
    if (playerRef.current) {
      playerRef.current.playbackRate = speed;
    }
    speedSheetRef.current?.dismiss();
  }, []);

  const changeScale = useCallback((newScale: number) => {
    setScale(newScale);
    scaleSheetRef.current?.dismiss();
  }, []);

  const toggleLock = useCallback(() => {
    setIsLocked((prev) => {
      const newLocked = !prev;
      if (newLocked) {
        const lock = isFullscreen
          ? ScreenOrientation.OrientationLock.LANDSCAPE
          : ScreenOrientation.OrientationLock.PORTRAIT;
        ScreenOrientation.lockAsync(lock).catch(() => {});
      } else {
        if (isFullscreen) {
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
        } else {
          ScreenOrientation.unlockAsync().catch(() => {});
        }
      }
      return newLocked;
    });
  }, [isFullscreen]);

  const rotateVideo = useCallback((direction: 'cw' | 'ccw') => {
    setRotation((prev) => {
      const step = direction === 'cw' ? 90 : -90;
      return (prev + step + 360) % 360;
    });
  }, []);

  const handlePiP = useCallback(async () => {
    if (!videoViewRef.current) return;
    try {
      if (isPiPActive) {
        await videoViewRef.current.stopPictureInPicture();
      } else {
        await videoViewRef.current.startPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP toggle failed:', e);
    }
  }, [isPiPActive]);

  const pickSubtitleFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/vtt', 'text/srt', 'application/x-subrip', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const sub = {
          uri: result.assets[0].uri,
          label: result.assets[0].name ?? 'Subtitle',
          language: 'und',
        };
        setSubtitles((prev) => [...prev, sub]);
        setActiveSubtitle(sub.uri);

        try {
          const content = await FileSystem.readAsStringAsync(sub.uri, { encoding: FileSystem.EncodingType.UTF8 });
          const ext = sub.label.split('.').pop()?.toLowerCase();
          parsedCuesRef.current = ext === 'vtt' ? parseVTT(content) : parseSRT(content);
        } catch {
          console.warn('Failed to parse subtitle file');
        }
      }
    } catch {
      console.warn('Subtitle pick failed');
    }
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  useEffect(() => {
    if (!activeSubtitle) {
      parsedCuesRef.current = [];
    }
  }, [activeSubtitle]);

  useEffect(() => {
    if (!uri || !playerRef.current) return;
    const interval = setInterval(() => {
      if (playerRef.current) {
        const pos = playerRef.current.currentTime;
        const dur = playerRef.current.duration;
        if (pos > 0 && dur > 0) {
          saveVideoPosition(uri, pos, dur);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [uri, saveVideoPosition]);

  const handleResume = useCallback(() => {
    if (playerRef.current && resumePosition > 0) {
      playerRef.current.currentTime = resumePosition;
    }
    setShowResume(false);
  }, [resumePosition]);

  const handleStartOver = useCallback(() => {
    if (uri) {
      clearVideoProgress(uri);
    }
    setShowResume(false);
  }, [uri, clearVideoProgress]);

  useEffect(() => {
    if (parsedCuesRef.current.length === 0 && !activeSubtitle) return;
    const interval = setInterval(() => {
      if (playerRef.current) {
        const pos = playerRef.current.currentTime;
        const cue = getActiveCue(parsedCuesRef.current, pos);
        setCurrentCueText(cue?.text ?? null);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [activeSubtitle]);

  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => {});
    };
  }, []);

  const swipeX = useSharedValue(0);
  const swipeY = useSharedValue(0);
  const startVolume = useSharedValue(1);
  const startBrightness = useSharedValue(1);
  const isSwiping = useSharedValue(false);
  const lastTapTime = useSharedValue(0);
  const lastTapSide = useSharedValue<'left' | 'right' | ''>('');

  /* eslint-disable react-hooks/immutability */
  const handleDoubleTap = useCallback((side: 'left' | 'right') => {
    if (isLocked) return;
    const now = Date.now();
    const lastTap = lastTapTime.value;
    const lastSide = lastTapSide.value;
    if (now - lastTap < 300 && lastSide === side) {
      if (side === 'left') {
        seekBackward();
      } else {
        seekForward();
      }
      lastTapTime.value = 0;
      lastTapSide.value = '';
    } else {
      lastTapTime.value = now;
      lastTapSide.value = side;
    }
  }, [seekBackward, seekForward, lastTapTime, lastTapSide, isLocked]);
  /* eslint-enable react-hooks/immutability */

  const panGesture = Gesture.Pan()
    .onStart(() => {
      if (isLocked) return;
      startVolume.value = volume;
      startBrightness.value = brightness;
      isSwiping.value = true;
    })
    .onUpdate((e) => {
      if (isLocked) return;
      swipeX.value = e.translationX;
      swipeY.value = e.translationY;
    })
    .onEnd((e) => { // eslint-disable-line react-hooks/refs
      if (isLocked) return;
      const dx = e.translationX;
      const dy = e.translationY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > absDy && absDx > 50) {
        if (dx > 0) {
          runOnJS(seekForward)();
        } else {
          runOnJS(seekBackward)();
        }
      } else if (absDy > 30) {
        const screenWidth = SCREEN_WIDTH;
        const startX = e.absoluteX;
        const isLeftSide = startX < screenWidth / 2;

        const delta = -dy / 300;
        const newVal = Math.max(0, Math.min(1, (isLeftSide ? startBrightness.value : startVolume.value) + delta));

        if (isLeftSide) {
          runOnJS(setBrightness)(newVal);
        } else {
          runOnJS(setVolume)(newVal);
          if (playerRef.current) {
            playerRef.current.volume = newVal;
          }
        }
      }

      swipeX.value = 0;
      swipeY.value = 0;
      isSwiping.value = false;
    });

  const tapGesture = Gesture.Tap()
    // eslint-disable-next-line react-hooks/refs
    .onEnd((e) => {
      if (isLocked) {
        runOnJS(setIsLocked)(false);
        return;
      }
      const screenWidth = SCREEN_WIDTH;
      const x = e.absoluteX;
      if (x < screenWidth * 0.3) {
        runOnJS(handleDoubleTap)('left');
      } else if (x > screenWidth * 0.7) {
        runOnJS(handleDoubleTap)('right');
      }
    });

  const composedGestures = Gesture.Simultaneous(panGesture, tapGesture);

  const videoTransform = [
    { scale },
    { rotate: `${rotation}deg` },
  ];

  if (!uri) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#000' }}>
        <Text style={{ color: colors.textMuted }}>No video URI provided</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text style={{ color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (isFullscreen) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.fullscreenContainer}>
          <GestureDetector gesture={composedGestures}>
            <View style={{ flex: 1 }}>
              <VideoView
                ref={videoViewRef}
                style={[styles.fullscreenVideo, { transform: videoTransform }]}
                player={player}
                allowsPictureInPicture
                startsPictureInPictureAutomatically={false}
                onPictureInPictureStart={() => setIsPiPActive(true)}
                onPictureInPictureStop={() => setIsPiPActive(false)}
                contentFit="contain"
              />
            </View>
          </GestureDetector>
          {activeSubtitle && currentCueText && (
            <View style={styles.fullscreenSubtitleContainer}>
              <Text style={styles.subtitleText}>{currentCueText}</Text>
            </View>
          )}
          <SeekIndicator visible={seekVisible} text={seekText} side={seekSide} />
          {!isLocked && <VolumeIndicator volume={volume} />}
          {!isLocked && <BrightnessIndicator brightness={brightness} />}

          {isLocked && (
            <View style={styles.lockOverlay}>
              <Pressable onPress={toggleLock} style={styles.lockButton}>
                <Unlock size={28} color="#fff" />
              </Pressable>
            </View>
          )}

          <View style={styles.fullscreenControls}>
            <Pressable onPress={toggleFullscreen} style={styles.fullscreenButton}>
              <Minimize2 size={24} color="#fff" />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {videoResolution && (
                <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
                    {videoResolution.width}x{videoResolution.height}
                  </Text>
                </View>
              )}
              <Pressable onPress={toggleLock} style={styles.fullscreenButton}>
                {isLocked ? <Lock size={22} color={colors.warning} /> : <Unlock size={22} color="#fff" />}
              </Pressable>
              {isPiPSupported && (
                <Pressable onPress={handlePiP} style={styles.fullscreenButton}>
                  <MonitorPlay size={22} color={isPiPActive ? colors.warning : '#fff'} />
                </Pressable>
              )}
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <ChevronLeft size={28} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <View className="flex-row items-center gap-3 px-4 pt-12 pb-4">
          <Pressable onPress={() => router.back()} className="w-11 h-11 items-center justify-center">
            <ChevronLeft size={28} color={colors.text} />
          </Pressable>
          <Text className="text-base font-semibold flex-1" style={{ color: colors.text }} numberOfLines={1}>
            {title ?? 'Video'}
          </Text>
          {videoResolution && (
            <View style={{ backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                {videoResolution.width}x{videoResolution.height}
              </Text>
            </View>
          )}
          <Pressable onPress={toggleFullscreen} className="w-11 h-11 items-center justify-center">
            <Maximize2 size={22} color={colors.text} />
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center px-4">
          <View>
            <GestureDetector gesture={composedGestures}>
              <View>
                <VideoView
                  ref={videoViewRef}
                  style={[styles.video, { transform: videoTransform }]}
                  player={player}
                  allowsPictureInPicture
                  startsPictureInPictureAutomatically={false}
                  onPictureInPictureStart={() => setIsPiPActive(true)}
                  onPictureInPictureStop={() => setIsPiPActive(false)}
                  contentFit="contain"
                />
                {activeSubtitle && currentCueText && (
                  <View style={styles.subtitleOverlay}>
                    <Text style={styles.subtitleText}>{currentCueText}</Text>
                  </View>
                )}
                <SeekIndicator visible={seekVisible} text={seekText} side={seekSide} />
                {isLocked && (
                  <View style={styles.lockOverlay}>
                    <Pressable onPress={toggleLock} style={styles.lockButton}>
                      <Unlock size={28} color="#fff" />
                    </Pressable>
                  </View>
                )}
                {showResume && (
                  <View style={styles.resumeOverlay}>
                    <View style={styles.resumeCard}>
                      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                        Resume Playback?
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>
                        {t('video.resume', { position: formatDuration(resumePosition) })}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Pressable
                          onPress={handleStartOver}
                          style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center' }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('video.start.over')}</Text>
                        </Pressable>
                        <Pressable
                          onPress={handleResume}
                          style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                        >
                          <Play size={16} color={colors.background} fill={colors.background} />
                          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.background }}>Resume</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </GestureDetector>
          </View>
        </View>

        <View className="px-4 pb-4">
          <Text className="text-lg font-bold mb-2" style={{ color: colors.text }}>
            {title ?? 'Untitled'}
          </Text>
          <Text className="text-sm mb-4" style={{ color: colors.textMuted }}>
            Local video
          </Text>

          <View className="flex-row items-center gap-2 mb-3 flex-wrap">
            <Pressable
              onPress={() => speedSheetRef.current?.present()}
              className="flex-row items-center gap-1.5 py-2 px-3 rounded-2xl"
              style={{ backgroundColor: colors.surface }}
            >
              <Gauge size={14} color={colors.accent} />
              <Text className="text-xs font-medium" style={{ color: colors.text }}>
                {playbackRate}x
              </Text>
            </Pressable>

            <Pressable
              onPress={() => scaleSheetRef.current?.present()}
              className="flex-row items-center gap-1.5 py-2 px-3 rounded-2xl"
              style={{ backgroundColor: colors.surface }}
            >
              <Scaling size={14} color={colors.accent} />
              <Text className="text-xs font-medium" style={{ color: colors.text }}>
                {Math.round(scale * 100)}%
              </Text>
            </Pressable>

            <Pressable
              onPress={toggleLock}
              className="flex-row items-center gap-1.5 py-2 px-3 rounded-2xl"
              style={{ backgroundColor: isLocked ? colors.accent + '30' : colors.surface }}
            >
              {isLocked ? <Lock size={14} color={colors.accent} /> : <Unlock size={14} color={colors.textMuted} />}
              <Text className="text-xs font-medium" style={{ color: isLocked ? colors.accent : colors.text }}>
                {isLocked ? t('video.unlock') : t('video.lock')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => rotateVideo('cw')}
              className="py-2 px-3 rounded-2xl"
              style={{ backgroundColor: colors.surface }}
            >
              <RotateCw size={14} color={colors.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => rotateVideo('ccw')}
              className="py-2 px-3 rounded-2xl"
              style={{ backgroundColor: colors.surface }}
            >
              <RotateCcw size={14} color={colors.textMuted} />
            </Pressable>

            {isPiPSupported && (
              <Pressable
                onPress={handlePiP}
                className="py-2 px-3 rounded-2xl"
                style={{ backgroundColor: isPiPActive ? colors.accent + '30' : colors.surface }}
              >
                <MonitorPlay size={14} color={isPiPActive ? colors.accent : colors.textMuted} />
              </Pressable>
            )}
          </View>

          <View className="flex-row items-center gap-2 mb-3 flex-wrap">
            <Pressable
              onPress={pickSubtitleFile}
              className="flex-row items-center gap-1.5 py-2 px-3 rounded-2xl"
              style={{ backgroundColor: colors.surface }}
            >
              <Captions size={14} color={colors.accent} />
              <Text className="text-xs font-medium" style={{ color: colors.text }}>
                {activeSubtitle ? 'Subs On' : t('video.subtitles')}
              </Text>
            </Pressable>

            {activeSubtitle && (
              <Pressable
                onPress={() => setActiveSubtitle(null)}
                className="py-2 px-3 rounded-2xl"
                style={{ backgroundColor: colors.surface }}
              >
                <X size={14} color={colors.textMuted} />
              </Pressable>
            )}

            <View style={{ flex: 1 }} />

            <Pressable
              onPress={stepBackward}
              className="flex-row items-center gap-1 py-2 px-3 rounded-xl"
              style={{ backgroundColor: colors.surface }}
            >
              <SkipBack size={12} color={colors.accent} />
              <Text className="text-[10px] font-semibold" style={{ color: colors.accent }}>1F</Text>
            </Pressable>
            <Pressable
              onPress={stepForward}
              className="flex-row items-center gap-1 py-2 px-3 rounded-xl"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-[10px] font-semibold" style={{ color: colors.accent }}>1F</Text>
              <SkipForward size={12} color={colors.accent} />
            </Pressable>
          </View>

          {subtitles.length > 0 && (
            <View className="mb-2">
              <Text className="text-xs font-semibold mb-2" style={{ color: colors.textMuted }}>
                SUBTITLES
              </Text>
              {subtitles.map((sub, i) => (
                <Pressable
                  key={i}
                  onPress={() => setActiveSubtitle(activeSubtitle === sub.uri ? null : sub.uri)}
                  className="flex-row items-center justify-between py-2 px-3 rounded-xl mb-1"
                  style={{ backgroundColor: activeSubtitle === sub.uri ? colors.accent + '20' : colors.surface }}
                >
                  <Text className="text-sm" style={{ color: activeSubtitle === sub.uri ? colors.accent : colors.text }}>
                    {sub.label}
                  </Text>
                  <Pressable onPress={() => {
                    setSubtitles((prev) => prev.filter((_, idx) => idx !== i));
                    if (activeSubtitle === sub.uri) setActiveSubtitle(null);
                  }}>
                    <X size={14} color={colors.textMuted} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Speed Sheet */}
        <BottomSheetModal
          ref={speedSheetRef}
          snapPoints={['30%']}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.surface }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        >
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
              Playback Speed
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PLAYBACK_SPEEDS.map((speed) => (
                <Pressable
                  key={speed}
                  onPress={() => changeSpeed(speed)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 18,
                    backgroundColor: playbackRate === speed ? colors.accent : colors.card,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: playbackRate === speed ? colors.background : colors.text,
                  }}>
                    {speed}x
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </BottomSheetModal>

        {/* Scale Sheet */}
        <BottomSheetModal
          ref={scaleSheetRef}
          snapPoints={['40%']}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.surface }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        >
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
              Video Scale
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>
              Small scales (shrink) &amp; Large scales (zoom)
            </Text>

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>
              SMALL
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {SCALE_OPTIONS.filter((s) => s.group === 'small').map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => changeScale(option.value)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    borderRadius: 18,
                    backgroundColor: scale === option.value ? colors.accent : colors.card,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: scale === option.value ? colors.background : colors.text,
                  }}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 }}>
              LARGE
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SCALE_OPTIONS.filter((s) => s.group === 'large').map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => changeScale(option.value)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    borderRadius: 18,
                    backgroundColor: scale === option.value ? colors.accent : colors.card,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: scale === option.value ? colors.background : colors.text,
                  }}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => changeScale(1)}
              style={{
                marginTop: 16,
                paddingVertical: 10,
                borderRadius: 18,
                backgroundColor: scale === 1 ? colors.accent : colors.card,
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: scale === 1 ? colors.background : colors.text,
              }}>
                Reset (100%)
              </Text>
            </Pressable>
          </View>
        </BottomSheetModal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  video: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 0.5625,
    borderRadius: 14,
    overflow: 'hidden',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideo: {
    width: SCREEN_HEIGHT,
    height: SCREEN_WIDTH,
  },
  fullscreenControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  fullscreenButton: {
    padding: 8,
  },
  backButton: {
    padding: 8,
  },
  subtitleOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  fullscreenSubtitleContainer: {
    position: 'absolute',
    bottom: 60,
    left: 32,
    right: 32,
    alignItems: 'center',
  },
  subtitleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  resumeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  resumeCard: {
    backgroundColor: 'rgba(20,20,30,0.95)',
    borderRadius: 18,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
