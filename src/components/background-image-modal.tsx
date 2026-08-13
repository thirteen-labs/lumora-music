import React from 'react';
import { View, Text, Pressable, Alert, Image as RNImage } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { LayoutGrid, Trash2, X, ImageIcon } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';

interface BackgroundImageModalProps {
  bottomSheetRef: React.RefObject<BottomSheetModal>;
  onSelectImage: (uri: string) => void;
  onRemoveImage: () => void;
  currentImage?: string | null;
}

export const BackgroundImageModal = React.memo(function BackgroundImageModal({
  bottomSheetRef,
  onSelectImage,
  onRemoveImage,
  currentImage,
}: BackgroundImageModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const renderBackdrop = (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
  );

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Allow access to your photo library to choose a background image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      onSelectImage(result.assets[0].uri);
      bottomSheetRef.current?.dismiss();
    }
  };

  const handleRemove = () => {
    onRemoveImage();
    bottomSheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['35%']}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
          {t('settings.image.background')}
        </Text>

        {currentImage ? (
          <View style={{ width: '100%', height: 140, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.card, marginBottom: 16 }}>
            <RNImage
              source={{ uri: currentImage }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={{ width: '100%', height: 140, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <ImageIcon size={32} color={colors.textMuted} />
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 8 }}>{t('settings.no.background')}</Text>
          </View>
        )}

        <Pressable
          onPress={handlePickImage}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.accent + '15', marginBottom: 10 }}
        >
          <LayoutGrid size={18} color={colors.accent} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('settings.select.image')}</Text>
        </Pressable>

        {currentImage && (
          <Pressable
            onPress={handleRemove}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.error + '15', marginBottom: 10 }}
          >
            <Trash2 size={18} color={colors.error} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.error }}>{t('settings.remove.image')}</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => bottomSheetRef.current?.dismiss()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14 }}
        >
          <X size={18} color={colors.textMuted} />
          <Text style={{ fontSize: 14, color: colors.textMuted }}>{t('common.cancel')}</Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});
