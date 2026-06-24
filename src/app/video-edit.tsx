import { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useVideoStore } from '@/store/video-store';
import { useToastStore } from '@/store/toast-store';
import { formatDuration, formatFileSize } from '@/utils/cn';
import { s } from '@/styles';
import { ChevronLeft, Save, Film } from 'lucide-react-native';

export default function VideoEditScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const videos = useVideoStore((s) => s.videos);

  const video = useMemo(() => videos.find((v) => v.id === videoId), [videoId, videos]);
  const [title, setTitle] = useState(video?.title ?? '');
  const prevIdRef = useRef(videoId);

  useEffect(() => {
    if (video && video.id !== prevIdRef.current) {
      setTitle(video.title);
      prevIdRef.current = video.id;
    }
  }, [video]);

  const handleSave = () => {
    if (!video) return;
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Validation', 'Title cannot be empty');
      return;
    }
    useToastStore.getState().showToast('Changes saved', 'check');
    router.back();
  };

  if (!video) {
    return (
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Video not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.accent }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py3]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <View style={s.flex1}>
          <Text style={[s.textBase, s.fontSemibold, { color: colors.text }]}>Edit Video</Text>
        </View>
        <Pressable onPress={handleSave} hitSlop={8} style={[s.flexRow, s.itemsCenter, s.gap1, s.px3, s.py2, s.rounded2xl, { backgroundColor: colors.accent }]}>
          <Save size={16} color="#fff" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        <View style={[s.itemsCenter, s.gap2]}>
          <View style={{ width: 160, height: 100, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Film size={36} color={colors.accent} />
          </View>
          <Text style={[s.textXs, { color: colors.textMuted }]}>Thumbnail</Text>
        </View>

        <View>
          <Text style={[s.textXs, s.fontMedium, { color: colors.text, marginBottom: 6 }]}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={[s.textSm, s.p3, s.rounded2xl, { backgroundColor: colors.surface, color: colors.text }]}
            placeholderTextColor={colors.textMuted}
            placeholder="Video title"
          />
        </View>

        <View style={[s.rounded2xl, { backgroundColor: colors.surface, padding: 16, gap: 12 }]}>
          <Text style={[s.textXs, s.fontSemibold, s.uppercase, { letterSpacing: 1, color: colors.textMuted }]}>Info</Text>
          <InfoRow label="Duration" value={formatDuration(video.duration)} colors={colors} />
          <InfoRow label="Resolution" value={video.width && video.height ? `${video.width}x${video.height}` : 'Unknown'} colors={colors} />
          <InfoRow label="Size" value={formatFileSize(video.fileSize)} colors={colors} />
          <InfoRow label="Codec" value={video.codec ?? 'Unknown'} colors={colors} />
          <InfoRow label="Frame Rate" value={video.frameRate ? `${video.frameRate} fps` : 'Unknown'} colors={colors} />
          <InfoRow label="Bitrate" value={video.bitrate ? `${(video.bitrate / 1000).toFixed(0)} kbps` : 'Unknown'} colors={colors} />
          <InfoRow label="Language" value={video.language ?? 'Unknown'} colors={colors} />
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[s.flexRow, s.justifyBetween, s.itemsCenter]}>
      <Text style={[s.textXs, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[s.textXs, s.fontMedium, { color: colors.text }]}>{value}</Text>
    </View>
  );
}
