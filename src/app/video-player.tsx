import { View, Text, Pressable, Dimensions, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { ChevronLeft, Maximize2, Minimize2, Subtitles, Gauge, X } from 'lucide-react-native';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useState, useCallback, useRef } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayerScreen() {
  const { colors } = useTheme();
  const { uri, title } = useLocalSearchParams<{ uri: string; title: string }>();
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const speedSheetRef = useRef<BottomSheetModal>(null);
  const subtitleSheetRef = useRef<BottomSheetModal>(null);

  const player = useVideoPlayer(uri ?? '', (p: VideoPlayer) => {
    p.loop = true;
  });

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const changeSpeed = useCallback((speed: number) => {
    setPlaybackRate(speed);
    if (player) {
      player.playbackRate = speed;
    }
    speedSheetRef.current?.dismiss();
  }, [player]);

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
      }
    } catch (e) {
      console.warn('Subtitle pick failed:', e);
    }
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

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
      <View style={styles.fullscreenContainer}>
        <VideoView
          style={styles.fullscreenVideo}
          player={player}
          allowsPictureInPicture
          contentFit="contain"
        />
        <View style={styles.fullscreenControls}>
          <Pressable onPress={toggleFullscreen} style={styles.fullscreenButton}>
            <Minimize2 size={24} color="#fff" />
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center gap-3 px-4 pt-12 pb-4">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ChevronLeft size={28} color={colors.text} />
        </Pressable>
        <Text className="text-base font-semibold flex-1" style={{ color: colors.text }} numberOfLines={1}>
          {title ?? 'Video'}
        </Text>
        <Pressable onPress={toggleFullscreen} className="w-10 h-10 items-center justify-center">
          <Maximize2 size={22} color={colors.text} />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-4">
        <VideoView
          style={styles.video}
          player={player}
          allowsPictureInPicture
          contentFit="contain"
        />
      </View>

      <View className="px-4 pb-4">
        <Text className="text-lg font-bold mb-2" style={{ color: colors.text }}>
          {title ?? 'Untitled'}
        </Text>
        <Text className="text-sm mb-4" style={{ color: colors.textMuted }}>
          Local video
        </Text>

        <View className="flex-row items-center gap-3 mb-4">
          <Pressable
            onPress={() => speedSheetRef.current?.present()}
            className="flex-row items-center gap-2 py-2 px-4 rounded-2xl"
            style={{ backgroundColor: colors.surface }}
          >
            <Gauge size={16} color={colors.accent} />
            <Text className="text-sm font-medium" style={{ color: colors.text }}>
              {playbackRate}x
            </Text>
          </Pressable>

          <Pressable
            onPress={pickSubtitleFile}
            className="flex-row items-center gap-2 py-2 px-4 rounded-2xl"
            style={{ backgroundColor: colors.surface }}
          >
            <Subtitles size={16} color={colors.accent} />
            <Text className="text-sm font-medium" style={{ color: colors.text }}>
              {activeSubtitle ? 'Subtitles On' : 'Add Subtitles'}
            </Text>
          </Pressable>

          {activeSubtitle && (
            <Pressable
              onPress={() => setActiveSubtitle(null)}
              className="py-2 px-3 rounded-2xl"
              style={{ backgroundColor: colors.surface }}
            >
              <X size={16} color={colors.textMuted} />
            </Pressable>
          )}
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
                  borderRadius: 20,
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
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 0.5625,
    borderRadius: 16,
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
});
