import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ListMusic, Play } from 'lucide-react-native';
import { Artwork } from '@/components/artwork';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { withAlpha } from '@/utils/color';
import { useMusicStore } from '@/store/music-store';
import { playerActions } from '@/player/actions';
import type { Playlist } from '@/store/playlist-store';

const DEFAULT_CARD_HEIGHT = 192;
const DEFAULT_IMAGE_HEIGHT = 120;

interface PlaylistCardProps {
  playlist: Playlist;
  cardWidth: number;
  cardHeight?: number;
  imageHeight?: number;
  onPress: () => void;
  onLongPress?: () => void;
  showPlayButton?: boolean;
}

export const PlaylistCard = React.memo(function PlaylistCard({
  playlist,
  cardWidth,
  cardHeight = DEFAULT_CARD_HEIGHT,
  imageHeight = DEFAULT_IMAGE_HEIGHT,
  onPress,
  onLongPress,
  showPlayButton = true,
}: PlaylistCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const songs = useMusicStore((s) => s.songs);

  const songMap = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);

  const firstTwoSongs = useMemo(() => {
    return playlist.songIds
      .slice(0, 2)
      .map((id) => songMap.get(id))
      .filter((s): s is (typeof songs)[0] => Boolean(s));
  }, [playlist.songIds, songMap]);

  const playlistArtwork = useMemo(() => {
    return playlist.artwork || firstTwoSongs[0]?.artwork || null;
  }, [playlist.artwork, firstTwoSongs]);

  const songCount = playlist.songIds.length;

  const handlePlayAll = () => {
    if (songCount === 0) return;
    const allSongs = playlist.songIds
      .map((id) => songMap.get(id))
      .filter((s): s is (typeof songs)[0] => Boolean(s));
    if (allSongs.length > 0) {
      playerActions.play(allSongs[0], allSongs);
    }
  };

  const imageWidth = cardWidth;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.accent + '30',
          marginBottom: 16,
        },
      ]}
    >
      <View style={[styles.imageContainer, { width: imageWidth, height: imageHeight }]}>
        <View style={[styles.image, { backgroundColor: colors.card }]}>
          <Artwork
            uri={playlistArtwork}
            size={imageWidth}
            borderRadius={16}
            iconSize={40}
            iconColor={colors.accent}
            backgroundColor="transparent"
          />
        </View>

        <View
          style={[
            styles.songCountBadge,
            { backgroundColor: withAlpha(colors.background, 0.9), borderRadius: 12 },
          ]}
        >
          <Text style={[styles.songCountText, { color: colors.textMuted, fontSize: 11, fontWeight: '600' }]}>
            {songCount} {songCount === 1 ? t('library.song') : t('library.tracks')}
          </Text>
        </View>

        {showPlayButton && songCount > 0 && (
          <Pressable
            onPress={handlePlayAll}
            style={[
              styles.playButton,
              { backgroundColor: colors.accent, borderRadius: 20 },
            ]}
          >
            <Play size={16} color={colors.background} fill={colors.background} />
          </Pressable>
        )}
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.playlistName, { color: colors.text, fontSize: 13 }]}
          numberOfLines={1}
        >
          {playlist.name}
        </Text>

        {firstTwoSongs.length > 0 ? (
          <View style={styles.songsContainer}>
            {firstTwoSongs.map((song, index) => (
              <View key={song.id} style={styles.songRow}>
                <Artwork
                  uri={song.artwork}
                  size={32}
                  borderRadius={4}
                  iconSize={14}
                  iconColor={colors.accent}
                  backgroundColor={colors.card}
                />
                <View style={styles.songInfo}>
                  <Text style={[styles.songTitle, { color: colors.text, fontSize: 11 }]} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text style={[styles.songArtist, { color: colors.textMuted, fontSize: 10 }]} numberOfLines={1}>
                    {song.artist}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptySongs}>
            <ListMusic size={16} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('playlist.no.songs')}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    overflow: 'hidden',
  },
  songCountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  songCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  playButton: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  playlistName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  songsContainer: {
    gap: 4,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  songArtist: {
    fontSize: 11,
  },
  emptySongs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 12,
  },
});
