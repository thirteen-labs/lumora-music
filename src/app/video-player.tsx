import { View, Text, Pressable, Dimensions, StyleSheet, Alert, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { s } from "@/styles";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/hooks/use-theme";
import {
  ChevronLeft,
  Maximize2,
  Minimize2,
  Captions,
  Gauge,
  X,
  Play,
  Pause,
  Lock,
  Unlock,
  RotateCcw,
  RotateCw,
  Scaling,
  MonitorPlay,
  Camera,
  AudioLines,
  MoreHorizontal,
  Share2,
  Trash2,
  Repeat1,
  Heart,
  SkipBack,
  SkipForward,
  Info,
  Settings2,
} from "lucide-react-native";
import {
  useVideoPlayer,
  VideoView,
  type VideoPlayer,
  type AudioTrack,
  isPictureInPictureSupported,
} from "expo-video";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { BottomSheetModal, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import {
  parseSRT,
  parseVTT,
  getActiveCue,
  type SubtitleCue,
} from "@/utils/subtitle-parser";
import { formatDuration, formatFileSize } from "@/utils/cn";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { storage } from "@/services/mmkv";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useVideoProgressStore } from "@/store/video-progress-store";
import { usePlayerStore } from "@/store/player-store";
import { useVideoStore } from "@/store/video-store";
import { useFavoritesStore } from "@/store/favorites-store";
import { showResumeWatchingNotification } from "@/services/notifications";
import type { Song } from "@/types/media";
import * as ScreenOrientation from "expo-screen-orientation";
import { useTranslation } from "@/hooks/use-translation";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

const GESTURE_STORAGE_KEY = 'lumora-gesture-settings';
interface GestureSettings {
  swipeSeek: boolean;
  swipeVolume: boolean;
  swipeBrightness: boolean;
  doubleTapSeek: boolean;
}
function loadGestureSettings(): GestureSettings {
  try {
    const raw = storage.getString(GESTURE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { swipeSeek: true, swipeVolume: true, swipeBrightness: true, doubleTapSeek: true };
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

async function setScreenBrightness(value: number) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Brightness = require('expo-brightness');
    await Brightness.setBrightnessAsync(Math.max(0.01, Math.min(1, value)));
  } catch {}
}

async function getScreenBrightness(): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Brightness = require('expo-brightness');
    return await Brightness.getBrightnessAsync();
  } catch {
    return 1;
  }
}

const SCALE_OPTIONS = [
  { label: "50%", value: 0.5, group: "small" as const },
  { label: "60%", value: 0.6, group: "small" as const },
  { label: "70%", value: 0.7, group: "small" as const },
  { label: "80%", value: 0.8, group: "small" as const },
  { label: "110%", value: 1.1, group: "large" as const },
  { label: "125%", value: 1.25, group: "large" as const },
  { label: "150%", value: 1.5, group: "large" as const },
  { label: "200%", value: 2.0, group: "large" as const },
];

function SeekIndicator({
  visible,
  text,
  side,
}: {
  visible: boolean;
  text: string;
  side: "left" | "right";
}) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = visible
      ? withTiming(1, { duration: 150 })
      : withTiming(0, { duration: 200 });
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
          position: "absolute",
          top: "40%",
          [side]: 40,
          backgroundColor: "rgba(0,0,0,0.7)",
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 10,
          alignItems: "center",
        },
        animatedStyle,
      ]}
    >
      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
        {text}
      </Text>
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
          position: "absolute",
          right: 20,
          top: "35%",
          backgroundColor: "rgba(0,0,0,0.7)",
          borderRadius: 10,
          padding: 10,
          alignItems: "center",
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          gap: 2,
          height: 80,
          alignItems: "flex-end",
        }}
      >
        {Array.from({ length: 15 }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 3,
              height: (i + 1) * 5,
              borderRadius: 1.5,
              backgroundColor: i < bars ? "#fff" : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </View>
      <Text style={{ color: "#fff", fontSize: 12, marginTop: 4 }}>
        {Math.round(volume * 100)}%
      </Text>
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
          position: "absolute",
          left: 20,
          top: "35%",
          backgroundColor: "rgba(0,0,0,0.7)",
          borderRadius: 10,
          padding: 10,
          alignItems: "center",
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          width: 4,
          height: 80,
          borderRadius: 6,
          backgroundColor: "rgba(255,255,255,0.3)",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: 4,
            height: `${brightness * 100}%`,
            borderRadius: 6,
            backgroundColor: "#fff",
          }}
        />
      </View>
      <Text style={{ color: "#fff", fontSize: 12, marginTop: 4 }}>
        {Math.round(brightness * 100)}%
      </Text>
    </Animated.View>
  );
}

async function handleShareVideo(uri: string) {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: "video/*",
        dialogTitle: "Share Video",
      });
    }
  } catch {}
}

function confirmDeleteVideo(uri: string, router: any) {
  Alert.alert(
    "Delete Video",
    "This will permanently delete the file from your device. This cannot be undone.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
            router.back();
          } catch {}
        },
      },
    ],
  );
}

export default function VideoPlayerScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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
  const moreSheetRef = useRef<BottomSheetModal>(null);
  const statsSheetRef = useRef<BottomSheetModal>(null);
  const subtitleStyleSheetRef = useRef<BottomSheetModal>(null);
  const [subSize, setSubSize] = useState(16);
  const [subColor, setSubColor] = useState("#ffffff");
  const [subBg, setSubBg] = useState("rgba(0,0,0,0.7)");

  const [seekText, setSeekText] = useState("");
  const [seekVisible, setSeekVisible] = useState(false);
  const [seekSide, setSeekSide] = useState<"left" | "right">("right");
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1);

  // Seek bar state
  const [currentPosition, setCurrentPosition] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const isScrubbing = useRef(false);
  const scrubValue = useRef(0);
  const seekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isVideoFavorite, toggleVideoFavorite } = useFavoritesStore();
  const videos = useVideoStore((s) => s.videos);
  const sortField = useVideoStore((s) => s.sortField);
  const sortOrder = useVideoStore((s) => s.sortOrder);

  const sortedVideos = useMemo(() => {
    const sorted = [...videos];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'dateAdded': cmp = a.dateAdded - b.dateAdded; break;
        case 'duration': cmp = a.duration - b.duration; break;
        case 'fileSize': cmp = a.fileSize - b.fileSize; break;
        default: cmp = a.dateAdded - b.dateAdded;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [videos, sortField, sortOrder]);
  const currentVideo = useMemo(() => sortedVideos.find(v => v.uri === uri), [sortedVideos, uri]);
  const isFav = currentVideo ? isVideoFavorite(currentVideo.id) : false;

  const playerRef = useRef<VideoPlayer | null>(null);

  const handleVolumeChange = useCallback(
    (val: number) => {
      setVolume(val);
      if (playerRef.current) {
        playerRef.current.volume = val;
      }
    },
    [setVolume],
  );
  const videoViewRef = useRef<any>(null);
  const {
    saveVideoPosition,
    getVideoPosition,
    hasResumePoint,
    clearVideoProgress,
  } = useVideoProgressStore();
  const [showResume, setShowResume] = useState(false);
  const [resumePosition, setResumePosition] = useState(0);

  const [scale, setScale] = useState(1);
  const [contentFit, setContentFit] = useState<any>("contain");
  const [isLocked, setIsLocked] = useState(false);
  const [rotation, setRotation] = useState(0);
  const fitSheetRef = useRef<BottomSheetModal>(null);
  const [isPiPSupported] = useState(() => {
    try {
      return isPictureInPictureSupported();
    } catch {
      return false;
    }
  });
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [videoResolution, setVideoResolution] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<string | null>(null);
  const audioTrackSheetRef = useRef<BottomSheetModal>(null);
  const [screenshotTaken, setScreenshotTaken] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const headerTranslateY = useSharedValue(0);

  const playVideoAsAudio = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.pause();
      } catch {}
      playerRef.current = null;
    }
    // Use player metadata as primary source (always available), store as fallback
    const videos = useVideoStore.getState().videos;
    const video = videos.find((v) => v.uri === uri);
    const actualDuration = video?.duration ?? 0;
    const song: Song = {
      id: video?.id ?? `video-${uri}`,
      uri: uri ?? "",
      title: title ?? "Video",
      artist: "Video",
      album: "Videos",
      albumId: "videos",
      duration: actualDuration,
      fileSize: 0,
      dateAdded: Date.now(),
      artwork: video?.thumbnail ?? null,
      genre: null,
      bitrate: null,
      sampleRate: null,
    };
    usePlayerStore.getState().play(song, [song]);
    router.back();
  }, [uri, title, router]);

  const headerPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((e) => {
          if (e.translationY > 0) {
            headerTranslateY.value = e.translationY * 0.4;
          }
        })
        // eslint-disable-next-line react-hooks/refs
        .onEnd((e) => {
          if (e.translationY > 80) {
            runOnJS(playVideoAsAudio)();
          }
          headerTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        }),
    [playVideoAsAudio], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(
      () => setControlsVisible(false),
      3000,
    );
  }, []);

  const toggleControls = useCallback(() => {
    if (controlsVisible) {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
      setControlsVisible(false);
    } else {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = setTimeout(
        () => setControlsVisible(false),
        3000,
      );
      setControlsVisible(true);
    }
  }, [controlsVisible]);

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (playerRef.current.playing) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
    showControls();
  }, [showControls]);

  // Sync real screen brightness on mount
  useEffect(() => {
    getScreenBrightness().then(setBrightness).catch(() => {});
  }, []);

  const player = useVideoPlayer(uri ?? null, (p: VideoPlayer) => {
    p.loop = false; // loop is toggled by the user via isLooping state
    playerRef.current = p;

    if (uri && hasResumePoint(uri)) {
      const pos = getVideoPosition(uri);
      setResumePosition(pos);
      setShowResume(true);
    }
  });

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener("sourceLoad", (event: any) => {
      const videoTracks = event.availableVideoTracks;
      if (videoTracks && videoTracks.length > 0) {
        const best = videoTracks.reduce((a: any, b: any) => {
          const aPixels = (a.size?.width ?? 0) * (a.size?.height ?? 0);
          const bPixels = (b.size?.width ?? 0) * (b.size?.height ?? 0);
          return bPixels > aPixels ? b : a;
        });
        if (best.size) {
          setVideoResolution({
            width: best.size.width,
            height: best.size.height,
          });
        }
      }

      const audioTracksList = event.availableAudioTracks;
      if (audioTracksList && audioTracksList.length > 1) {
        setAudioTracks(audioTracksList);
        const current = audioTracksList.find((t: any) => t.selected);
        if (current) {
          setActiveAudioTrack(current.id);
        } else if (audioTracksList[0]) {
          setActiveAudioTrack(audioTracksList[0].id);
        }
      } else {
        setAudioTracks([]);
      }
    });
    return () => sub.remove();
  }, [player]);

  const showSeekIndicator = useCallback(
    (text: string, side: "left" | "right") => {
      setSeekText(text);
      setSeekSide(side);
      setSeekVisible(true);
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
      seekTimerRef.current = setTimeout(() => setSeekVisible(false), 800);
    },
    [],
  );

  const seekForward = useCallback(() => {
    if (playerRef.current) {
      const pos = playerRef.current.currentTime;
      const dur = playerRef.current.duration;
      const newPos = Math.min(pos + 10, dur);
      playerRef.current.currentTime = newPos;
      showSeekIndicator(`+10s`, "right");
    }
  }, [showSeekIndicator]);

  const seekBackward = useCallback(() => {
    if (playerRef.current) {
      const pos = playerRef.current.currentTime;
      const newPos = Math.max(pos - 10, 0);
      playerRef.current.currentTime = newPos;
      showSeekIndicator(`-10s`, "left");
    }
  }, [showSeekIndicator]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const entering = !prev;
      if (entering) {
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        ).catch(() => {});
      } else {
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT,
        ).catch(() => {});
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

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => {
      const next = !prev;
      if (playerRef.current) {
        playerRef.current.loop = next;
      }
      return next;
    });
  }, []);

  const handleBrightnessChange = useCallback((val: number) => {
    setBrightness(val);
    setScreenBrightness(val);
  }, []);

  const goToNext = useCallback(() => {
    if (!sortedVideos.length) return;
    const idx = sortedVideos.findIndex(v => v.uri === uri);
    const next = sortedVideos[(idx + 1) % sortedVideos.length];
    if (next) {
      router.replace({ pathname: "/video-player", params: { uri: next.uri, title: next.title } });
    }
  }, [sortedVideos, uri, router]);

  const goToPrev = useCallback(() => {
    if (!sortedVideos.length) return;
    const idx = sortedVideos.findIndex(v => v.uri === uri);
    const prev = sortedVideos[(idx - 1 + sortedVideos.length) % sortedVideos.length];
    if (prev) {
      router.replace({ pathname: "/video-player", params: { uri: prev.uri, title: prev.title } });
    }
  }, [sortedVideos, uri, router]);

  const renderCenterControls = useCallback((fullscreen = false) => {
    if (isLocked) return null;
    if (!fullscreen && showResume) return null;
    if (!controlsVisible) return null;
    const navStyle = fullscreen ? styles.navButton : styles.navButtonSmall;
    const iconSize = fullscreen ? 32 : 24;
    const gap = fullscreen ? 8 : 6;
    const overlayStyle = fullscreen ? styles.controlsOverlayFullscreen : styles.controlsOverlay;
    return (
      <Pressable style={overlayStyle}>
        <View style={[s.flexRow, s.itemsCenter, { gap }]}>
          {sortedVideos.length > 1 && (
            <Pressable onPress={goToPrev} style={navStyle}>
              <SkipBack size={iconSize} color="#fff" fill="#fff" />
            </Pressable>
          )}
          <Pressable onPress={handlePlayPause} style={styles.playButtonLarge}>
            {player?.playing ? (
              <Pause size={32} color="#fff" />
            ) : (
              <Play size={32} color="#fff" fill="#fff" />
            )}
          </Pressable>
          {sortedVideos.length > 1 && (
            <Pressable onPress={goToNext} style={navStyle}>
              <SkipForward size={iconSize} color="#fff" fill="#fff" />
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  }, [isLocked, showResume, controlsVisible, sortedVideos, goToPrev, goToNext, handlePlayPause, player?.playing]);

  // Handle auto-playing next video when current one finishes
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('playToEnd', () => {
      if (!isLooping) {
        goToNext();
      }
    });
    return () => sub.remove();
  }, [player, isLooping, goToNext]);

  const stepFrame = useCallback((direction: 'next' | 'prev') => {
    if (!playerRef.current) return;
    const fps = 30;
    const frameTime = 1 / fps;
    const currentTime = playerRef.current.currentTime;
    playerRef.current.currentTime = direction === 'next' ? currentTime + frameTime : Math.max(0, currentTime - frameTime);
    showControls();
  }, [showControls]);

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
          ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE,
          ).catch(() => {});
        } else {
          ScreenOrientation.unlockAsync().catch(() => {});
        }
      }
      return newLocked;
    });
  }, [isFullscreen]);

  const rotateVideo = useCallback((direction: "cw" | "ccw") => {
    setRotation((prev) => {
      const step = direction === "cw" ? 90 : -90;
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
      console.warn("PiP toggle failed:", e);
    }
  }, [isPiPActive]);

  const handleScreenshot = useCallback(async () => {
    if (!videoViewRef.current) return;
    try {
      const uri = await captureRef(videoViewRef, {
        format: "jpg",
        quality: 0.9,
        result: "tmpfile",
      });
      if (uri) {
        setScreenshotTaken(true);
        setTimeout(() => setScreenshotTaken(false), 2000);
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/jpeg",
            dialogTitle: t("video.screenshot.share"),
          });
        }
      }
    } catch (e) {
      console.warn("Screenshot failed:", e);
    }
  }, [t]);

  const handleAudioTrackChange = useCallback((track: AudioTrack) => {
    if (!playerRef.current) return;
    try {
      playerRef.current.audioTrack = track;
      setActiveAudioTrack(track.id ?? null);
    } catch (e) {
      console.warn("Audio track switch failed:", e);
    }
    audioTrackSheetRef.current?.dismiss();
  }, []);

  const pickSubtitleFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/vtt", "text/srt", "application/x-subrip", "*/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const sub = {
          uri: result.assets[0].uri,
          label: result.assets[0].name ?? "Subtitle",
          language: "und",
        };
        setSubtitles((prev) => [...prev, sub]);
        setActiveSubtitle(sub.uri);

        try {
          const content = await FileSystem.readAsStringAsync(sub.uri, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          const ext = sub.label.split(".").pop()?.toLowerCase();
          parsedCuesRef.current =
            ext === "vtt" ? parseVTT(content) : parseSRT(content);
        } catch {
          console.warn("Failed to parse subtitle file");
        }
      }
    } catch {
      console.warn("Subtitle pick failed");
    }
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const dismissMoreSheet = useCallback(() => {
    moreSheetRef.current?.dismiss();
  }, []);

  const dismissAndPresentAudioTrack = useCallback(() => {
    moreSheetRef.current?.dismiss();
    setTimeout(() => audioTrackSheetRef.current?.present(), 300);
  }, []);

  const moreActions = useMemo(() => [
    { icon: <RotateCw size={20} color={colors.text} />, label: "Rotate CW", onPress: () => { rotateVideo("cw"); dismissMoreSheet(); } },
    { icon: <RotateCcw size={20} color={colors.text} />, label: "Rotate CCW", onPress: () => { rotateVideo("ccw"); dismissMoreSheet(); } },
    { icon: <SkipForward size={20} color={colors.text} />, label: "Next Frame", onPress: () => { stepFrame('next'); dismissMoreSheet(); } },
    { icon: <SkipBack size={20} color={colors.text} />, label: "Prev Frame", onPress: () => { stepFrame('prev'); dismissMoreSheet(); } },
    ...(isPiPSupported ? [{ icon: <MonitorPlay size={20} color={colors.text} />, label: "Picture-in-Picture", onPress: () => { handlePiP(); dismissMoreSheet(); } }] : []),
    { icon: <Camera size={20} color={colors.text} />, label: screenshotTaken ? "Captured!" : "Screenshot", onPress: () => { handleScreenshot(); dismissMoreSheet(); } },
    { icon: <AudioLines size={20} color={colors.text} />, label: "Audio Track", onPress: () => { dismissAndPresentAudioTrack(); } },
    { icon: <Settings2 size={20} color={colors.text} />, label: "Subtitle Style", onPress: () => { dismissMoreSheet(); setTimeout(() => subtitleStyleSheetRef.current?.present(), 300); } },
    { icon: <Info size={20} color={colors.text} />, label: "Stats for Nerds", onPress: () => { dismissMoreSheet(); setTimeout(() => statsSheetRef.current?.present(), 300); } },
    { icon: <Share2 size={20} color={colors.text} />, label: "Share", onPress: () => { dismissMoreSheet(); if (uri) handleShareVideo(uri); } },
    { icon: <Trash2 size={20} color="#ff4444" />, label: "Delete", onPress: () => { dismissMoreSheet(); if (uri) confirmDeleteVideo(uri, router); } },
  ], [rotateVideo, dismissMoreSheet, stepFrame, isPiPSupported, handlePiP, dismissAndPresentAudioTrack, screenshotTaken, handleScreenshot, uri, colors.text, router, subtitleStyleSheetRef, statsSheetRef]);

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

  // Real-time position polling for seek bar
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && !isScrubbing.current) {
        const pos = playerRef.current.currentTime ?? 0;
        const dur = playerRef.current.duration ?? 0;
        setCurrentPosition(pos);
        if (dur > 0 && dur !== videoDuration) setVideoDuration(dur);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [videoDuration]);

  // Buffering detection via status change
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('statusChange', (event: any) => {
      setIsBuffering(event.status === 'loading');
    });
    return () => sub.remove();
  }, [player]);

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
    const { isPlaying, pause } = usePlayerStore.getState();
    if (isPlaying) {
      pause();
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        playerRef.current?.pause();
      } catch {}
      if (currentVideo) {
        showResumeWatchingNotification(currentVideo);
      }
      playerRef.current = null;
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT,
      ).catch(() => {});
    };
  }, [currentVideo]);

  const gestureSettings = useMemo(() => loadGestureSettings(), []);

  const swipeX = useSharedValue(0);
  const swipeY = useSharedValue(0);
  const startVolume = useSharedValue(1);
  const startBrightness = useSharedValue(1);
  const isSwiping = useSharedValue(false);


  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          if (isLocked) return;
          startVolume.value = volume;
          startBrightness.value = brightness;
          isSwiping.value = true;
        })
        // eslint-disable-next-line react-hooks/refs
        .onUpdate((e) => {
          if (isLocked) return;
          swipeX.value = e.translationX;
          swipeY.value = e.translationY;
          
          const dx = e.translationX;
          const dy = e.translationY;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          if (absDy > 20 && absDy > absDx) {
            const screenWidth = SCREEN_WIDTH;
            const startX = e.absoluteX;
            const isLeftSide = startX < screenWidth / 2;

            const delta = -dy / 250;
            const newVal = Math.max(
              0,
              Math.min(
                1,
                (isLeftSide ? startBrightness.value : startVolume.value) + delta,
              ),
            );

            if (isLeftSide && gestureSettings.swipeBrightness) {
              runOnJS(handleBrightnessChange)(newVal);
            } else if (!isLeftSide && gestureSettings.swipeVolume) {
              runOnJS(handleVolumeChange)(newVal);
            }
          }
        })
        // eslint-disable-next-line react-hooks/refs
        .onEnd((e) => {
          if (isLocked) return;
          const dx = e.translationX;
          const dy = e.translationY;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          // Large downward swipe anywhere on the video plays as audio
          if (dy > 150 && absDy > absDx) {
            runOnJS(playVideoAsAudio)();
            return;
          }

          if (gestureSettings.swipeSeek && absDx > absDy && absDx > 50) {
            if (dx > 0) {
              runOnJS(seekForward)();
            } else {
              runOnJS(seekBackward)();
            }
          }

          swipeX.value = 0;
          swipeY.value = 0;
          isSwiping.value = false;
        }),
    [ // eslint-disable-line react-hooks/exhaustive-deps
      isLocked,
      volume,
      brightness,
      gestureSettings,
      seekForward,
      seekBackward,
      handleVolumeChange,
      handleBrightnessChange,
      playVideoAsAudio,
    ],
  );

  const singleTap = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      Gesture.Tap().numberOfTaps(1).onEnd(() => {
        if (isLocked) {
          runOnJS(setIsLocked)(false);
          return;
        }
        runOnJS(toggleControls)();
      }),
    [isLocked, toggleControls, setIsLocked]
  );
  
  const doubleTapLeft = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      Gesture.Tap().numberOfTaps(2).onEnd((e) => {
        if (isLocked) return;
        if (gestureSettings.doubleTapSeek && e.absoluteX < SCREEN_WIDTH * 0.4) {
          runOnJS(seekBackward)();
        }
      }), [isLocked, gestureSettings, seekBackward]
  );

  const doubleTapRight = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      Gesture.Tap().numberOfTaps(2).onEnd((e) => {
        if (isLocked) return;
        if (gestureSettings.doubleTapSeek && e.absoluteX > SCREEN_WIDTH * 0.6) {
          runOnJS(seekForward)();
        }
      }), [isLocked, gestureSettings, seekForward]
  );

  const tapGesture = useMemo(
    () => Gesture.Exclusive(doubleTapLeft, doubleTapRight, singleTap),
    [doubleTapLeft, doubleTapRight, singleTap]
  );

  const composedGestures = Gesture.Simultaneous(panGesture, tapGesture);

  const videoAspectRatio = videoResolution
    ? videoResolution.width / videoResolution.height
    : 16 / 9;

  const videoWidth = SCREEN_WIDTH - 32;
  const videoHeight = videoWidth / videoAspectRatio;

  const videoTransform = [{ scale }, { rotate: `${rotation}deg` }];

  if (!uri) {
    return (
      <View
        style={[
          s.flex1,
          s.itemsCenter,
          s.justifyCenter,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={{ color: colors.textMuted }}>No video URI provided</Text>
        <Pressable onPress={() => router.back()} style={s.mt4}>
          <Text style={{ color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (isFullscreen) {
    return (
      <View style={{ flex: 1 }}>
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
                contentFit={contentFit}
              />
              {/* Buffering spinner - fullscreen */}
              {isBuffering && (
                <View style={styles.bufferingOverlay}>
                  <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
                </View>
              )}
            </View>
          </GestureDetector>
          {/* Fullscreen seek bar + time */}
          {!isLocked && (
            <View style={styles.fullscreenSeekBar}>
              <Text style={styles.timeText}>{formatDuration(currentPosition)}</Text>
              <Slider
                style={{ flex: 1, height: 36 }}
                minimumValue={0}
                maximumValue={Math.max(videoDuration, 1)}
                value={currentPosition}
                onSlidingStart={() => { isScrubbing.current = true; }}
                onValueChange={(v) => { scrubValue.current = v; }}
                onSlidingComplete={(v) => {
                  isScrubbing.current = false;
                  if (playerRef.current) {
                    playerRef.current.currentTime = v;
                    setCurrentPosition(v);
                  }
                }}
                minimumTrackTintColor="#ffffff"
                maximumTrackTintColor="rgba(255,255,255,0.3)"
                thumbTintColor="#ffffff"
              />
              <Text style={styles.timeText}>{formatDuration(videoDuration)}</Text>
            </View>
          )}
          {activeSubtitle && currentCueText && (
            <View
              style={[
                styles.fullscreenSubtitleContainer,
                { bottom: insets.bottom + 60 },
              ]}
            >
              <Text style={[styles.subtitleText, { fontSize: subSize, color: subColor, backgroundColor: subBg }]}>{currentCueText}</Text>
            </View>
          )}
          <SeekIndicator
            visible={seekVisible}
            text={seekText}
            side={seekSide}
          />
          {!isLocked && <VolumeIndicator volume={volume} />}
          {!isLocked && <BrightnessIndicator brightness={brightness} />}

          {isLocked && (
            <View style={styles.lockOverlay}>
              <Pressable onPress={toggleLock} style={styles.lockButton}>
                <Unlock size={28} color="#fff" />
              </Pressable>
            </View>
          )}

          {renderCenterControls(true)}

          {!isLocked && (
            <View
              style={[styles.fullscreenControls, { paddingTop: insets.top + 4 }]}
            >
            <Pressable
              onPress={toggleFullscreen}
              style={styles.fullscreenButton}
            >
              <Minimize2 size={24} color="#fff" />
            </Pressable>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
              {videoResolution && (
                <View
                  style={{
                    backgroundColor: "rgba(0,0,0,0.5)",
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}
                  >
                    {videoResolution.width}x{videoResolution.height}
                  </Text>
                </View>
              )}
              <Pressable onPress={toggleLock} style={styles.fullscreenButton}>
                {isLocked ? (
                  <Lock size={22} color={colors.warning} />
                ) : (
                  <Unlock size={22} color="#fff" />
                )}
              </Pressable>
              {currentVideo && (
                <Pressable onPress={() => toggleVideoFavorite(currentVideo)} style={styles.fullscreenButton}>
                  <Heart size={22} color={isFav ? colors.accent : "#fff"} fill={isFav ? colors.accent : "transparent"} />
                </Pressable>
              )}
              {isPiPSupported && (
                <Pressable onPress={handlePiP} style={styles.fullscreenButton}>
                  <MonitorPlay
                    size={22}
                    color={isPiPActive ? colors.warning : "#fff"}
                  />
                </Pressable>
              )}
              <Pressable
                onPress={handleScreenshot}
                style={styles.fullscreenButton}
              >
                <Camera
                  size={22}
                  color={screenshotTaken ? colors.warning : "#fff"}
                />
              </Pressable>
              {audioTracks.length > 1 && (
                <Pressable
                  onPress={() => audioTrackSheetRef.current?.present()}
                  style={styles.fullscreenButton}
                >
                  <AudioLines size={22} color="#fff" />
                </Pressable>
              )}
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ChevronLeft size={28} color="#fff" />
              </Pressable>
            </View>
          </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.flex1, { backgroundColor: colors.background }]}>
        <GestureDetector gesture={headerPanGesture}>
          <Animated.View
            style={[
              s.flexRow,
              s.itemsCenter,
              s.gap3,
              s.px4,
              s.pb4,
              { paddingTop: insets.top + 4 },
              headerAnimatedStyle,
            ]}
          >
            <Pressable
              onPress={() => router.back()}
              style={[s.w11, s.h11, s.itemsCenter, s.justifyCenter]}
              accessibilityLabel="Go back"
            >
              <ChevronLeft size={28} color={colors.text} />
            </Pressable>
            <Text
              style={[
                s.textBase,
                s.fontSemibold,
                s.flex1,
                { color: colors.text },
              ]}
              numberOfLines={1}
            >
              {title ?? "Video"}
            </Text>
            {currentVideo && (
              <Pressable
                onPress={() => toggleVideoFavorite(currentVideo)}
                style={[s.w11, s.h11, s.itemsCenter, s.justifyCenter]}
              >
                <Heart size={22} color={isFav ? colors.accent : colors.textMuted} fill={isFav ? colors.accent : "transparent"} />
              </Pressable>
            )}
            {videoResolution && (
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 11,
                    fontWeight: "600",
                  }}
                >
                  {videoResolution.width}x{videoResolution.height}
                </Text>
              </View>
            )}
            <Pressable
              onPress={toggleFullscreen}
              style={[s.w11, s.h11, s.itemsCenter, s.justifyCenter]}
              accessibilityLabel="Toggle fullscreen"
            >
              <Maximize2 size={22} color={colors.text} />
            </Pressable>
          </Animated.View>
        </GestureDetector>

        <View style={[s.flex1, s.itemsCenter, s.justifyCenter, s.px4]}>
          <View>
            <GestureDetector gesture={composedGestures}>
              <View>
                <VideoView
                  ref={videoViewRef}
                  style={[
                    styles.video,
                    { height: videoHeight },
                    { transform: videoTransform },
                  ]}
                  player={player}
                  allowsPictureInPicture
                  startsPictureInPictureAutomatically={false}
                  onPictureInPictureStart={() => setIsPiPActive(true)}
                  onPictureInPictureStop={() => setIsPiPActive(false)}
                  contentFit={contentFit}
                />
                {activeSubtitle && currentCueText && (
                  <View
                    style={[
                      styles.subtitleOverlay,
                      { bottom: insets.bottom + 16 },
                    ]}
                  >
                    <Text style={[styles.subtitleText, { fontSize: subSize, color: subColor, backgroundColor: subBg }]}>{currentCueText}</Text>
                  </View>
                )}
                <SeekIndicator
                  visible={seekVisible}
                  text={seekText}
                  side={seekSide}
                />
                {!isLocked && <VolumeIndicator volume={volume} />}
                {!isLocked && <BrightnessIndicator brightness={brightness} />}
                {/* Buffering spinner */}
                {isBuffering && (
                  <View style={styles.bufferingOverlay}>
                    <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
                  </View>
                )}
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
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: "600",
                          color: colors.text,
                          marginBottom: 8,
                        }}
                      >
                        Resume Playback?
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.textMuted,
                          marginBottom: 16,
                        }}
                      >
                        {t("video.resume", {
                          position: formatDuration(resumePosition),
                        })}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <Pressable
                          onPress={handleStartOver}
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 14,
                            backgroundColor: colors.card,
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: colors.text,
                            }}
                          >
                            {t("video.start.over")}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={handleResume}
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 14,
                            backgroundColor: colors.accent,
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <Play
                            size={16}
                            color={colors.background}
                            fill={colors.background}
                          />
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: colors.background,
                            }}
                          >
                            Resume
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </GestureDetector>
            {renderCenterControls(false)}
          </View>
        </View>

        <View style={[s.px4, s.pb4]}>
          <Text style={[s.textLg, s.fontBold, s.mb2, { color: colors.text }]}>
            {title ?? "Untitled"}
          </Text>
          <Text style={[s.textXs, s.mb4, { color: colors.textMuted }]}>
            {currentVideo ? `${formatFileSize(currentVideo.fileSize)} · ` : ''}{videoResolution ? `${videoResolution.width}x${videoResolution.height}` : 'Local video'}
          </Text>

          {/* Seek bar + time display */}
          <View style={[s.flexRow, s.itemsCenter, { gap: 8, marginBottom: 4 }]}>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'], minWidth: 38 }}>
              {formatDuration(currentPosition)}
            </Text>
            <View style={{ flex: 1 }}>
              <Slider
                style={{ height: 36 }}
                minimumValue={0}
                maximumValue={Math.max(videoDuration, 1)}
                value={currentPosition}
                onSlidingStart={() => { isScrubbing.current = true; }}
                onValueChange={(v) => { scrubValue.current = v; }}
                onSlidingComplete={(v) => {
                  isScrubbing.current = false;
                  if (playerRef.current) {
                    playerRef.current.currentTime = v;
                    setCurrentPosition(v);
                  }
                }}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
              />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'], minWidth: 38, textAlign: 'right' }}>
              {formatDuration(videoDuration)}
            </Text>
          </View>

          <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mb3, s.flexWrap]}>
            <Pressable
              onPress={() => speedSheetRef.current?.present()}
              style={[s.flexRow, s.itemsCenter, { gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.surface }]}
            >
              <Gauge size={14} color={colors.accent} />
              <Text style={[s.textXs, s.fontMedium, { color: colors.text }]}>{playbackRate}x</Text>
            </Pressable>

            <Pressable
              onPress={() => scaleSheetRef.current?.present()}
              style={[s.flexRow, s.itemsCenter, { gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.surface }]}
            >
              <Scaling size={14} color={colors.accent} />
              <Text style={[s.textXs, s.fontMedium, { color: colors.text }]}>{Math.round(scale * 100)}%</Text>
            </Pressable>

            <Pressable
              onPress={() => fitSheetRef.current?.present()}
              style={[s.flexRow, s.itemsCenter, { gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.surface }]}
            >
              <Maximize2 size={14} color={colors.accent} />
              <Text style={[s.textXs, s.fontMedium, { color: colors.text }]}>
                {contentFit === "contain" ? "Fit" : contentFit === "cover" ? "Fill" : contentFit === "fill" ? "Stretch" : "Original"}
              </Text>
            </Pressable>

            <Pressable
              onPress={pickSubtitleFile}
              style={[s.flexRow, s.itemsCenter, { gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.surface }]}
            >
              <Captions size={14} color={colors.accent} />
              <Text style={[s.textXs, s.fontMedium, { color: colors.text }]}>
                {activeSubtitle ? "Subs On" : t("video.subtitles")}
              </Text>
            </Pressable>

            {activeSubtitle && (
              <Pressable onPress={() => setActiveSubtitle(null)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.surface }}>
                <X size={14} color={colors.textMuted} />
              </Pressable>
            )}

            <Pressable
              onPress={toggleLock}
              accessibilityLabel={isLocked ? "Unlock controls" : "Lock controls"}
              style={[s.flexRow, s.itemsCenter, { gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: isLocked ? colors.accent + "30" : colors.surface }]}
            >
              {isLocked ? <Lock size={14} color={colors.accent} /> : <Unlock size={14} color={colors.textMuted} />}
              <Text style={[s.textXs, s.fontMedium, { color: isLocked ? colors.accent : colors.text }]}>
                {isLocked ? t("video.unlock") : t("video.lock")}
              </Text>
            </Pressable>

            <Pressable
              onPress={toggleLoop}
              style={[s.flexRow, s.itemsCenter, { gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: isLooping ? colors.accent + '25' : colors.surface }]}
            >
              <Repeat1 size={14} color={isLooping ? colors.accent : colors.textMuted} />
              <Text style={[s.textXs, s.fontMedium, { color: isLooping ? colors.accent : colors.text }]}>
                {isLooping ? 'Loop On' : 'Loop'}
              </Text>
            </Pressable>

            <View style={s.flex1} />

            <Pressable
              onPress={() => moreSheetRef.current?.present()}
              style={[{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.surface }]}
            >
              <MoreHorizontal size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {subtitles.length > 0 && (
            <View style={s.mb2}>
              <Text
                style={[
                  s.textXs,
                  s.fontSemibold,
                  s.mb2,
                  { color: colors.textMuted },
                ]}
              >
                SUBTITLES
              </Text>
              {subtitles.map((sub, i) => (
                <Pressable
                  key={i}
                  onPress={() =>
                    setActiveSubtitle(
                      activeSubtitle === sub.uri ? null : sub.uri,
                    )
                  }
                  style={[
                    s.flexRow,
                    s.itemsCenter,
                    s.justifyBetween,
                    {
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      marginBottom: 4,
                      backgroundColor:
                        activeSubtitle === sub.uri
                          ? colors.accent + "20"
                          : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.textSm,
                      {
                        color:
                          activeSubtitle === sub.uri
                            ? colors.accent
                            : colors.text,
                      },
                    ]}
                  >
                    {sub.label}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setSubtitles((prev) =>
                        prev.filter((_, idx) => idx !== i),
                      );
                      if (activeSubtitle === sub.uri) setActiveSubtitle(null);
                    }}
                  >
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
          snapPoints={["30%"]}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.surface }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        >
          <View style={{ padding: 20 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 16,
              }}
            >
              Playback Speed
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {PLAYBACK_SPEEDS.map((speed) => (
                <Pressable
                  key={speed}
                  onPress={() => changeSpeed(speed)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 18,
                    backgroundColor:
                      playbackRate === speed ? colors.accent : colors.card,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color:
                        playbackRate === speed
                          ? colors.background
                          : colors.text,
                    }}
                  >
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
          snapPoints={["40%"]}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.surface }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        >
          <View style={{ padding: 20 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Video Scale
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.textMuted,
                marginBottom: 16,
              }}
            >
              Small scales (shrink) &amp; Large scales (zoom)
            </Text>

            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.textMuted,
                marginBottom: 8,
              }}
            >
              SMALL
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {SCALE_OPTIONS.filter((s) => s.group === "small").map(
                (option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => changeScale(option.value)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 18,
                      borderRadius: 18,
                      backgroundColor:
                        scale === option.value ? colors.accent : colors.card,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color:
                          scale === option.value
                            ? colors.background
                            : colors.text,
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>

            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.textMuted,
                marginBottom: 8,
              }}
            >
              LARGE
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SCALE_OPTIONS.filter((s) => s.group === "large").map(
                (option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => changeScale(option.value)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 18,
                      borderRadius: 18,
                      backgroundColor:
                        scale === option.value ? colors.accent : colors.card,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color:
                          scale === option.value
                            ? colors.background
                            : colors.text,
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>

            <Pressable
              onPress={() => changeScale(1)}
              style={{
                marginTop: 16,
                paddingVertical: 10,
                borderRadius: 18,
                backgroundColor: scale === 1 ? colors.accent : colors.card,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: scale === 1 ? colors.background : colors.text,
                }}
              >
                Reset (100%)
              </Text>
            </Pressable>
          </View>
        </BottomSheetModal>

        {/* Video Fit Sheet */}
        <BottomSheetModal
          ref={fitSheetRef}
          snapPoints={["35%"]}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.surface }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        >
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text, marginBottom: 16 }}>
              Video Size
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[
                { key: "contain", label: "Fit" },
                { key: "cover", label: "Fill Screen" },
                { key: "fill", label: "Stretch" },
                { key: "scale-down", label: "Original" },
              ].map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => { setContentFit(opt.key); fitSheetRef.current?.dismiss(); }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 18,
                    backgroundColor: contentFit === opt.key ? colors.accent : colors.card,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: contentFit === opt.key ? colors.background : colors.text }}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </BottomSheetModal>

        {/* Audio Track Sheet */}
        <BottomSheetModal
          ref={audioTrackSheetRef}
          snapPoints={["30%"]}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.surface }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        >
          <View style={{ padding: 20 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 16,
              }}
            >
              {t("video.audio.track.title")}
            </Text>
            {audioTracks.map((track: any) => (
              <Pressable
                key={track.id}
                onPress={() => handleAudioTrackChange(track)}
                style={[
                  s.flexRow,
                  s.itemsCenter,
                  s.justifyBetween,
                  {
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 6,
                    backgroundColor:
                      activeAudioTrack === track.id
                        ? colors.accent + "20"
                        : colors.card,
                  },
                ]}
              >
                <View style={s.flex1}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color:
                        activeAudioTrack === track.id
                          ? colors.accent
                          : colors.text,
                    }}
                  >
                    {track.label || `Track ${track.id}`}
                  </Text>
                  {track.language && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {track.language.toUpperCase()}
                    </Text>
                  )}
                </View>
                {activeAudioTrack === track.id && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.accent,
                    }}
                  />
                )}
              </Pressable>
            ))}
          </View>
        </BottomSheetModal>

        {/* More Actions Sheet */}
        <BottomSheetModal
          ref={moreSheetRef}
          snapPoints={["50%"]}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.surface }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        >
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text, marginBottom: 16 }}>
              More Actions
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {/* eslint-disable-next-line react-hooks/refs */}
              {moreActions.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  style={{
                    width: (SCREEN_WIDTH - 40 - 10) / 3 - 10,
                    alignItems: "center",
                    paddingVertical: 16,
                    borderRadius: 16,
                    backgroundColor: colors.card,
                    gap: 8,
                  }}
                >
                  {item.icon}
                  <Text style={{ fontSize: 11, fontWeight: "500", color: item.label === "Delete" ? "#ff4444" : colors.text, textAlign: "center" }} numberOfLines={2}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </BottomSheetModal>
        {/* Subtitle Style Sheet */}
        <BottomSheetModal
          ref={subtitleStyleSheetRef}
          snapPoints={["50%"]}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.surface }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        >
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text, marginBottom: 16 }}>Subtitle Styling</Text>
            
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>Font Size ({subSize}px)</Text>
            <Slider
              style={{ height: 40, marginBottom: 16 }}
              minimumValue={12}
              maximumValue={36}
              value={subSize}
              onValueChange={(v) => setSubSize(Math.round(v))}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.accent}
            />

            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>Text Color</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              {["#ffffff", "#ffff00", "#00ffff", "#ff00ff"].map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setSubColor(c)}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, borderWidth: 2, borderColor: subColor === c ? colors.accent : "transparent" }}
                />
              ))}
            </View>

            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>Background Color</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Dark", val: "rgba(0,0,0,0.7)" },
                { label: "Light", val: "rgba(255,255,255,0.7)" },
                { label: "None", val: "transparent" },
              ].map((bg) => (
                <Pressable
                  key={bg.val}
                  onPress={() => setSubBg(bg.val)}
                  style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, backgroundColor: subBg === bg.val ? colors.accent : colors.card }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: subBg === bg.val ? colors.background : colors.text }}>
                    {bg.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </BottomSheetModal>

        {/* Stats for Nerds Sheet */}
        <BottomSheetModal
          ref={statsSheetRef}
          snapPoints={["40%"]}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.surface }}
          handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
        >
          <View style={{ padding: 20, flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text, marginBottom: 16 }}>Stats for Nerds</Text>
            <View style={s.gap4}>
               <View style={[s.flexRow, s.justifyBetween]}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Resolution</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{videoResolution ? `${videoResolution.width}x${videoResolution.height}` : 'Unknown'}</Text>
               </View>
               <View style={[s.flexRow, s.justifyBetween]}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Format</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{uri?.split('.').pop()?.toUpperCase() ?? 'Unknown'}</Text>
               </View>
               <View style={[s.flexRow, s.justifyBetween]}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Duration</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{formatDuration(videoDuration)}</Text>
               </View>
               <View style={[s.flexRow, s.justifyBetween]}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>File Size</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{currentVideo ? formatFileSize(currentVideo.fileSize) : 'Unknown'}</Text>
               </View>
               <View style={[s.flexRow, s.justifyBetween]}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Status</Text>
                   <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{isBuffering ? "Buffering" : player?.playing ? "Playing" : "Paused"}</Text>
               </View>
            </View>
          </View>
        </BottomSheetModal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: SCREEN_WIDTH - 32,
    borderRadius: 14,
    overflow: "hidden",
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenVideo: {
    width: SCREEN_HEIGHT,
    height: SCREEN_WIDTH,
  },
  fullscreenControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  fullscreenSeekBar: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  timeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    minWidth: 38,
    textAlign: "center",
  },
  bufferingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  fullscreenButton: {
    padding: 8,
  },
  backButton: {
    padding: 8,
  },
  subtitleOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  fullscreenSubtitleContainer: {
    position: "absolute",
    left: 32,
    right: 32,
    alignItems: "center",
  },
  subtitleText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: "hidden",
  },
  resumeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  resumeCard: {
    backgroundColor: "rgba(20,20,30,0.95)",
    borderRadius: 18,
    padding: 24,
    width: "80%",
    alignItems: "center",
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  lockButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  controlsOverlayFullscreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  navButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonSmall: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
});
