import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/use-theme';
import { usePlayerStore } from '@/store/player-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useToastStore } from '@/store/toast-store';
import { useRouter } from 'expo-router';
import type { Song } from '@/types/media';
import { Image } from 'expo-image';
import {
  Play,
  ListPlus,
  Heart,
  Share2,
  Music,
  FolderPlus,
  Info,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';

export function useSongContextMenu() {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [song, setSong] = useState<Song | null>(null);

  const present = useCallback((target: Song) => {
    setSong(target);
    bottomSheetRef.current?.present();
  }, []);

  return { bottomSheetRef, present, song };
}

interface SongContextMenuProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  song: Song | null;
  onDismiss?: () => void;
}

export function SongContextMenu({ bottomSheetRef, song, onDismiss }: SongContextMenuProps) {
  const { colors } = useTheme();
  const play = usePlayerStore((s) => s.play);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const favoriteSongIds = useFavoritesStore((s) => s.favoriteSongIds);
  const toggleSongFavorite = useFavoritesStore((s) => s.toggleSongFavorite);
  const showToast = useToastStore((s) => s.showToast);
  const router = useRouter();

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const isFav = song ? favoriteSongIds.includes(song.id) : false;

  const dismiss = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  const handleShare = useCallback(async () => {
    if (!song) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing is not available on this device');
        return;
      }
      await Sharing.shareAsync(song.uri, {
        mimeType: 'audio/*',
        dialogTitle: `Share ${song.title}`,
      });
    } catch {
      Alert.alert('Error', 'Could not share this file');
    }
    dismiss();
  }, [song, dismiss]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['40%']}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      onDismiss={onDismiss}
    >
      <BottomSheetView style={{ flex: 1 }}>
        {song && (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 16,
              }}
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.card,
                  overflow: 'hidden',
                }}
              >
                {song.artwork ? (
                  <Image source={{ uri: song.artwork }} style={{ width: 60, height: 60 }} contentFit="cover" />
                ) : (
                  <Music size={24} color={colors.accent} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 17, fontWeight: '600', color: colors.text }}
                  numberOfLines={1}
                >
                  {song.title}
                </Text>
                <Text style={{ fontSize: 14, color: colors.textMuted }} numberOfLines={1}>
                  {song.artist}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => { play(song); dismiss(); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}
            >
              <Play size={20} color={colors.text} />
              <Text style={{ fontSize: 15, color: colors.text }}>Play Now</Text>
            </Pressable>
            <Pressable
              onPress={() => { addToQueue(song); showToast('Added to queue', 'list'); dismiss(); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}
            >
              <ListPlus size={20} color={colors.text} />
              <Text style={{ fontSize: 15, color: colors.text }}>Add to Queue</Text>
            </Pressable>
            <Pressable
              onPress={() => { toggleSongFavorite(song); showToast(isFav ? 'Removed from favorites' : 'Added to favorites', 'heart'); dismiss(); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}
            >
              <Heart size={20} color={colors.text} />
              <Text style={{ fontSize: 15, color: colors.text }}>{isFav ? 'Remove from Favorites' : 'Add to Favorites'}</Text>
            </Pressable>
            <Pressable
              onPress={() => { dismiss(); router.push({ pathname: '/playlist-picker' as any, params: { songId: song.id } }); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}
            >
              <FolderPlus size={20} color={colors.text} />
              <Text style={{ fontSize: 15, color: colors.text }}>Add to Playlist</Text>
            </Pressable>
            <Pressable
              onPress={() => { dismiss(); router.push({ pathname: '/metadata-editor', params: { songId: song.id } }); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}
            >
              <Info size={20} color={colors.text} />
              <Text style={{ fontSize: 15, color: colors.text }}>Info</Text>
            </Pressable>
            <Pressable
              onPress={handleShare}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}
            >
              <Share2 size={20} color={colors.text} />
              <Text style={{ fontSize: 15, color: colors.text }}>Share</Text>
            </Pressable>
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
