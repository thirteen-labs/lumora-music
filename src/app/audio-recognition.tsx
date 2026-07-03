import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore, generateRandomQueue } from '@/store/player-store';
import { useToastStore } from '@/store/toast-store';
import { useRouter } from 'expo-router';
import { recognizeAudio, type RecognitionResult } from '@/services/audio-recognition';
import { Music, ChevronLeft, Mic, Waves, Disc3, AlertCircle } from 'lucide-react-native';
import { s } from '@/styles';
import { Artwork } from '@/components/artwork';

export default function AudioRecognitionScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const songs = useMusicStore((s) => s.songs);
  const [status, setStatus] = useState<'idle' | 'recording' | 'analyzing' | 'matching' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [phaseLabel, setPhaseLabel] = useState('');

  const handleIdentify = useCallback(async () => {
    if (songs.length === 0) {
      useToastStore.getState().showToast('No songs in library. Scan your music first.', 'alert-circle');
      return;
    }
    setStatus('recording');
    setResult(null);
    setPhaseLabel('Preparing...');
    try {
      const res = await recognizeAudio(songs, (phase) => {
        if (phase.includes('Precomputing')) setStatus('analyzing');
        if (phase.includes('Recording')) setStatus('recording');
        if (phase.includes('Analyzing')) setStatus('analyzing');
        if (phase.includes('Matching')) setStatus('matching');
        setPhaseLabel(phase);
      });
      setResult(res);
      setStatus(res.song ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  }, [songs]);

  const handlePlay = useCallback((songId: string) => {
    const song = songs.find((s) => s.id === songId);
    if (song) {
      usePlayerStore.getState().play(song, generateRandomQueue(song, songs));
      router.back();
    }
  }, [songs, router]);

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '20' }]}>
          <Music size={20} color={colors.accent} />
        </View>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Audio Recognition</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.itemsCenter, s.px5, { paddingTop: 24 }]}>
          <View style={[s.itemsCenter, s.justifyCenter, s.mb8]}>
            <View style={[s.roundedFull, s.itemsCenter, s.justifyCenter, {
              width: 160, height: 160,
              backgroundColor: status === 'recording' ? colors.accent + '20' : colors.surface,
              borderWidth: 3,
              borderColor: status === 'recording' ? colors.accent : colors.card,
            }]}>
              {status === 'idle' || status === 'error' ? (
                <Mic size={56} color={status === 'error' ? colors.warning : colors.accent} />
              ) : status === 'done' ? (
                <Disc3 size={56} color={colors.accent} />
              ) : (
                <Waves size={56} color={colors.accent} />
              )}
            </View>
            <Text style={[s.textSm, s.textCenter, s.mt4, { color: colors.textSecondary, maxWidth: 280 }]}>
              {status === 'idle' && 'Tap to identify any song playing around you'}
              {status === 'recording' && 'Listening... Hold your phone near the audio source'}
              {status === 'analyzing' && phaseLabel}
              {status === 'matching' && 'Matching against your library...'}
              {status === 'done' && result?.song ? 'Match found!' : ''}
              {status === 'error' && result && !result.song ? 'No match found. Try a longer sample.' : ''}
              {status === 'error' && !result ? 'Could not access microphone. Check permissions.' : ''}
            </Text>
          </View>

          {status === 'idle' && (
            <Pressable
              onPress={handleIdentify}
              style={[s.flexRow, s.itemsCenter, s.gap2, s.py4, s.px8, s.roundedFull, { backgroundColor: colors.accent }]}
            >
              <Mic size={20} color={colors.background} />
              <Text style={[s.textBase, s.fontBold, { color: colors.background }]}>Identify Song</Text>
            </Pressable>
          )}

          {(status === 'recording' || status === 'analyzing' || status === 'matching') && (
            <Pressable
              onPress={() => { setStatus('idle'); setResult(null); }}
              style={[s.py3, s.px6, s.roundedFull, { backgroundColor: colors.surface }]}
            >
              <Text style={[s.textSm, s.fontMedium, { color: colors.textMuted }]}>Cancel</Text>
            </Pressable>
          )}

          {status === 'done' && (
            <Pressable
              onPress={handleIdentify}
              style={[s.py3, s.px6, s.roundedFull, { backgroundColor: colors.surface }]}
            >
              <Text style={[s.textSm, s.fontMedium, { color: colors.accent }]}>Identify Another</Text>
            </Pressable>
          )}

          {status === 'error' && (
            <Pressable
              onPress={handleIdentify}
              style={[s.flexRow, s.itemsCenter, s.gap2, s.py3, s.px6, s.roundedFull, { backgroundColor: colors.surface }]}
            >
              <Waves size={16} color={colors.accent} />
              <Text style={[s.textSm, s.fontMedium, { color: colors.accent }]}>Try Again</Text>
            </Pressable>
          )}

          {result && result.matches.length > 0 && (
            <View style={[s.wFull, s.mt8]}>
              <Text style={[s.textXs, s.fontSemibold, s.uppercase, s.mb3, { color: colors.textMuted, letterSpacing: 1 }]}>
                {status === 'done' ? 'Best Match' : 'Top Matches'}
              </Text>
              {result.matches.map((match, i) => (
                <Pressable
                  key={match.song.id}
                  onPress={() => handlePlay(match.song.id)}
                  style={[s.flexRow, s.itemsCenter, s.gap3, s.p4, s.rounded2xl, s.mb2, {
                    backgroundColor: i === 0 ? colors.accent + '15' : colors.surface,
                    borderWidth: i === 0 ? 1 : 0,
                    borderColor: i === 0 ? colors.accent + '40' : 'transparent',
                  }]}
                >
                  <Artwork uri={match.song.artwork} size={52} borderRadius={12} iconSize={18} iconColor={colors.accent} backgroundColor={colors.card} />
                  <View style={s.flex1}>
                    <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]} numberOfLines={1}>{match.song.title}</Text>
                    <Text style={[s.textXs, { color: colors.textMuted }]} numberOfLines={1}>{match.song.artist}</Text>
                  </View>
                  <View style={[s.roundedLg, s.px2, s.py1, { backgroundColor: i === 0 ? colors.accent + '30' : colors.card }]}>
                    <Text style={[s.text10, s.fontBold, { color: i === 0 ? colors.accent : colors.textMuted }]}>
                      {Math.round(match.confidence * 100)}%
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mt6, s.px4, s.py3, s.rounded2xl, { backgroundColor: colors.surface }]}>
            <AlertCircle size={14} color={colors.textMuted} />
            <Text style={[s.text10, s.flex1, { color: colors.textMuted }]}>
              Recognition accuracy depends on audio quality and your library size. Works best with clean recordings of studio tracks.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
