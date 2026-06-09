import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/use-theme';
import { usePlayerStore } from '@/store/player-store';
import { useFavoritesStore } from '@/store/favorites-store';
import type { Song } from '@/types/media';
import {
  Play,
  ListPlus,
  Heart,
  Share2,
  Music,
} from 'lucide-react-native';

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
  const { play, addToQueue } = usePlayerStore();
  const { favoriteSongIds, toggleSongFavorite } = useFavoritesStore();

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const isFav = song ? favoriteSongIds.includes(song.id) : false;

  const menuItems = song
    ? [
        {
          icon: Play,
          label: 'Play Now',
          onPress: () => {
            play(song);
            bottomSheetRef.current?.dismiss();
          },
        },
        {
          icon: ListPlus,
          label: 'Add to Queue',
          onPress: () => {
            addToQueue(song);
            bottomSheetRef.current?.dismiss();
          },
        },
        {
          icon: Heart,
          label: isFav ? 'Remove from Favorites' : 'Add to Favorites',
          onPress: () => {
            toggleSongFavorite(song);
            bottomSheetRef.current?.dismiss();
          },
        },
        {
          icon: Share2,
          label: 'Share',
          onPress: () => {
            bottomSheetRef.current?.dismiss();
          },
        },
      ]
    : [];

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
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.card,
                }}
              >
                <Music size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 16, fontWeight: '600', color: colors.text }}
                  numberOfLines={1}
                >
                  {song.title}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
                  {song.artist}
                </Text>
              </View>
            </View>
            {menuItems.map((item) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                }}
              >
                <item.icon size={20} color={colors.text} />
                <Text style={{ fontSize: 15, color: colors.text }}>{item.label}</Text>
              </Pressable>
            ))}
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
