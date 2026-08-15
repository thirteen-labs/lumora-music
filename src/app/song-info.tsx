import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '@/hooks/use-translation';
import { usePlayerStore } from '@/store/player-store';
import { useMusicStore } from '@/store/music-store';
import { useMetadataStore, type MetadataOverride } from '@/store/metadata-store';
import { formatDuration, formatFileSize } from '@/utils/format';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { s } from '@/styles';
import { ChevronRight, Music, Save, RotateCcw, PenLine, FolderOpen } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

function InfoRow({ label, value, colors, multiline }: { label: string; value: string; colors: { text: string; textMuted: string }; multiline?: boolean }) {
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

export default function SongInfoScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();

  const { songId } = useLocalSearchParams<{ songId?: string }>();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const songs = useMusicStore((s) => s.songs);
  const getOverriddenSong = useMetadataStore((s) => s.getOverriddenSong);
  const setOverride = useMetadataStore((s) => s.setOverride);
  const albums = useMusicStore((s) => s.albums);
  const artists = useMusicStore((s) => s.artists);

  const rawSong = songId ? songs.find((s) => s.id === songId) ?? null : currentTrack;
  const track = rawSong ? getOverriddenSong(rawSong) : null;

  const [editTitle, setEditTitle] = useState(track?.title ?? '');
  const [editArtist, setEditArtist] = useState(track?.artist ?? '');
  const [editAlbum, setEditAlbum] = useState(track?.album ?? '');
  const [editArtwork, setEditArtwork] = useState<string | null>(track?.artwork ?? null);
  const [editing, setEditing] = useState(false);

  const prevIdRef = useRef(track?.id);
  if (track?.id !== prevIdRef.current) {
    prevIdRef.current = track?.id;
    setEditTitle(track?.title ?? '');
    setEditArtist(track?.artist ?? '');
    setEditAlbum(track?.album ?? '');
    setEditArtwork(track?.artwork ?? null);
    setEditing(false);
  }

  const handleSave = useCallback(() => {
    if (!track) return;
    const override: MetadataOverride = {
      title: editTitle,
      artist: editArtist,
      album: editAlbum,
      artwork: editArtwork ?? '',
    };
    setOverride(track.id, override);
    setEditing(false);
  }, [track, editTitle, editArtist, editAlbum, editArtwork, setOverride]);

  const handleReset = useCallback(() => {
    if (!track) return;
    setEditTitle(track.title);
    setEditArtist(track.artist ?? '');
    setEditAlbum(track.album ?? '');
    setEditArtwork(track.artwork ?? null);
  }, [track]);

  const changeArtwork = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setEditArtwork(result.assets[0].uri);
    }
  }, []);

  const album = track?.album ? albums.find((a) => a.title === track.album) : undefined;
  const artist = track?.artist ? artists.find((a) => a.name === track.artist) : undefined;

  const goAlbum = useCallback(() => {
    if (album) router.push({ pathname: '/music/album/[id]', params: { id: album.id } });
  }, [album, router]);
  const goArtist = useCallback(() => {
    if (artist) router.push({ pathname: '/music/artist/[id]', params: { id: artist.id } });
  }, [artist, router]);

  return (
    <View style={[s.flex1, { backgroundColor: colors.pageBackground }]}>
      <TopBar
        title={t('menu.song.info')}
        showBack
        rightElement={
          track ? (
            <Pressable
              onPress={() => (editing ? handleSave() : setEditing(true))}
              style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}
            >
              {editing ? <Save size={18} color={colors.accent} /> : <PenLine size={18} color={colors.accent} />}
            </Pressable>
          ) : undefined
        }
      />

      {!track ? (
        <View style={[s.flex1, s.itemsCenter, s.justifyCenter, s.px8]}>
          <Music size={48} color={colors.textMuted} />
          <Text style={[s.mt3, s.textSm, { color: colors.textMuted }]}>No track is currently playing</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {/* Artwork */}
          <View style={[s.itemsCenter, s.mb6]}>
            <View style={[s.rounded2xl, s.overflowHidden, { width: 140, height: 140, backgroundColor: colors.card }]}>
              {editArtwork || track.artwork ? (
                <Image source={{ uri: (editArtwork ?? track.artwork) as string }} style={{ width: 140, height: 140 }} contentFit="cover" />
              ) : (
                <View style={[s.flex1, s.itemsCenter, s.justifyCenter]}>
                  <Music size={40} color={colors.textMuted} />
                </View>
              )}
            </View>
            {editing && (
              <Pressable
                onPress={changeArtwork}
                style={[s.mt2, { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.accent + '20' }]}
              >
                <Text style={[s.textXs, s.fontSemibold, { color: colors.accent }]}>
                  {editArtwork || track.artwork ? 'Change Artwork' : 'Add Artwork'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Title / Artist / Album */}
          {editing ? (
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
          ) : (
            <View style={[s.mb6]}>
              <Text style={[s.text2xl, s.fontBold, { color: colors.text }]} numberOfLines={2}>
                {track.title}
              </Text>
              <Text style={[s.textBase, { color: colors.textMuted }]} numberOfLines={1}>
                {track.artist || 'Unknown Artist'}
              </Text>
              {track.album ? (
                <Text style={[s.textSm, { color: colors.textMuted }]} numberOfLines={1}>
                  {track.album}
                </Text>
              ) : null}
            </View>
          )}

          {/* Quick links */}
          <View style={[s.flexRow, s.gap3, s.mb6]}>
            <Pressable
              onPress={goAlbum}
              disabled={!album}
              style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { opacity: album ? 1 : 0.4, backgroundColor: colors.card, paddingVertical: 12, borderRadius: 16 }]}
            >
              <FolderOpen size={16} color={colors.text} />
              <Text style={[s.fontSemibold, { color: colors.text }]}>Album</Text>
            </Pressable>
            <Pressable
              onPress={goArtist}
              disabled={!artist}
              style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { opacity: artist ? 1 : 0.4, backgroundColor: colors.card, paddingVertical: 12, borderRadius: 16 }]}
            >
              <ChevronRight size={16} color={colors.text} />
              <Text style={[s.fontSemibold, { color: colors.text }]}>Artist</Text>
            </Pressable>
          </View>

          {/* Technical Info */}
          <Text style={[s.textXs, s.fontBold, s.mb3, { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }]}>
            Technical Information
          </Text>
          <View style={s.gap4}>
            <InfoRow label="Format" value={track.uri?.split('.').pop()?.toUpperCase() ?? 'NONE'} colors={colors} />
            <InfoRow label="Duration" value={track.duration ? formatDuration(track.duration) : 'Unknown'} colors={colors} />
              <InfoRow label="Bitrate" value={track.bitrate ? `${track.bitrate} kbps` : 'Unknown'} colors={colors} />
              <InfoRow label="Sample Rate" value={track.sampleRate ? `${track.sampleRate} Hz` : 'Unknown'} colors={colors} />
              <InfoRow label="Channels" value={track.channels ? (track.channels === 1 ? 'Mono' : track.channels === 2 ? 'Stereo' : `${track.channels} ch`) : 'Unknown'} colors={colors} />
              <InfoRow label="Codec" value={track.codec ? track.codec.toUpperCase() : 'Unknown'} colors={colors} />
            <InfoRow label="File Size" value={track.fileSize ? formatFileSize(track.fileSize) : '0 B'} colors={colors} />
            <InfoRow label="File Path" value={track.uri ?? 'Unknown'} colors={colors} multiline />
          </View>

          {/* Edit actions */}
          {editing && (
            <View style={[s.flexRow, s.gap4, s.mt6]}>
              <Pressable
                onPress={handleReset}
                style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { backgroundColor: colors.card, paddingVertical: 12, borderRadius: 16 }]}
              >
                <RotateCcw size={16} color={colors.text} />
                <Text style={[s.fontSemibold, { color: colors.text }]}>Reset</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={[s.flex1, s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, { backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 16 }]}
              >
                <Save size={16} color="#fff" />
                <Text style={[s.fontSemibold, { color: '#fff' }]}>Save</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      <MiniPlayer />
    </View>
  );
}
