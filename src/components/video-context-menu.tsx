import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/use-theme';
import { useHiddenFilesStore } from '@/store/hidden-files-store';
import { useRecentlyDeletedStore } from '@/store/recently-deleted-store';
import { useToastStore } from '@/store/toast-store';
import type { Video } from '@/types/media';
import { EyeOff, Trash2, Share2, Film, Info } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';

export function useVideoContextMenu() {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [video, setVideo] = useState<Video | null>(null);

  const present = useCallback((target: Video) => {
    setVideo(target);
    bottomSheetRef.current?.present();
  }, []);

  return { bottomSheetRef, present, video };
}

interface VideoContextMenuProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  video: Video | null;
  onDismiss?: () => void;
}

export function VideoContextMenu({ bottomSheetRef, video, onDismiss }: VideoContextMenuProps) {
  const { colors } = useTheme();
  const hideVideo = useHiddenFilesStore((s) => s.hideVideo);
  const addDeleted = useRecentlyDeletedStore((s) => s.addDeleted);
  const showToast = useToastStore((s) => s.showToast);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const dismiss = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, [bottomSheetRef]);

  const handleHide = useCallback(() => {
    if (!video) return;
    Alert.alert(
      'Hide Video',
      `Hide "${video.title}" from your library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hide',
          style: 'destructive',
          onPress: () => {
            hideVideo(video.id);
            showToast('Video hidden', 'eye-off');
            dismiss();
          },
        },
      ],
    );
  }, [video, hideVideo, showToast, dismiss]);

  const handleDelete = useCallback(() => {
    if (!video) return;
    Alert.alert(
      'Delete Video',
      `Move "${video.title}" to recently deleted?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            addDeleted({
              id: video.id,
              title: video.title,
              uri: video.uri,
              type: 'video',
              fileSize: video.fileSize,
              duration: video.duration,
            });
            showToast('Video moved to recently deleted', 'trash-2');
            dismiss();
          },
        },
      ],
    );
  }, [video, addDeleted, showToast, dismiss]);

  const handleShare = useCallback(async () => {
    if (!video) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing is not available on this device');
        return;
      }
      await Sharing.shareAsync(video.uri, {
        mimeType: 'video/*',
        dialogTitle: `Share ${video.title}`,
      });
    } catch {
      Alert.alert('Error', 'Could not share this file');
    }
    dismiss();
  }, [video, dismiss]);

  const handleInfo = useCallback(() => {
    if (!video) return;
    Alert.alert(
      video.title,
      [
        video.duration > 0 ? `Duration: ${Math.floor(video.duration / 60)}:${String(Math.floor(video.duration % 60)).padStart(2, '0')}` : null,
        video.width && video.height ? `Resolution: ${video.width}x${video.height}` : null,
        video.fileSize > 0 ? `Size: ${(video.fileSize / 1024 / 1024).toFixed(1)} MB` : null,
        video.codec ? `Codec: ${video.codec}` : null,
        video.frameRate ? `Frame Rate: ${video.frameRate} fps` : null,
        video.bitrate ? `Bitrate: ${(video.bitrate / 1000).toFixed(0)} kbps` : null,
        video.language ? `Language: ${video.language}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    );
    dismiss();
  }, [video, dismiss]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['38%']}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      onDismiss={onDismiss}
    >
      <BottomSheetView style={{ flex: 1 }}>
        {video && (
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
                <Film size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 16, fontWeight: '600', color: colors.text }}
                  numberOfLines={1}
                >
                  {video.title}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
                  {video.duration > 0 ? `${Math.floor(video.duration / 60)}:${String(Math.floor(video.duration % 60)).padStart(2, '0')}` : ''}
                  {video.width && video.height ? ` · ${video.width}x${video.height}` : ''}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={handleInfo}
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
              onPress={handleHide}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}
            >
              <EyeOff size={20} color={colors.text} />
              <Text style={{ fontSize: 15, color: colors.text }}>Hide</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}
            >
              <Trash2 size={20} color={colors.text} />
              <Text style={{ fontSize: 15, color: colors.text }}>Delete</Text>
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
