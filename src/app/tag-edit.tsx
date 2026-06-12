import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { useRoute, useRouter } from 'expo-router';
import { useMusicStore } from '@/store/music-store';
import { Save, X } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TagField } from '@/components/tag-field';
import { useTranslation } from '@/hooks/use-translation';

const tagSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  album: z.string(),
  genre: z.string(),
  year: z.string(),
});

type TagFormData = z.infer<typeof tagSchema>;

export default function TagEditScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const route = useRoute();
  const songs = useMusicStore((s) => s.songs);

  const songId = (route.params as any)?.songId;
  const song = songs.find((s) => s.id === songId);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema) as any,
    defaultValues: {
      title: song?.title ?? '',
      artist: song?.artist ?? '',
      album: song?.album ?? '',
      genre: song?.genre ?? '',
      year: song?.dateAdded ? new Date(song.dateAdded).getFullYear().toString() : '',
    },
  });

  if (!song) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Text style={{ color: colors.textMuted }}>{t('tag.not.found')}</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text style={{ color: colors.accent }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const handleSave = async (data: TagFormData) => {
    const musicStore = useMusicStore.getState();
    const idx = musicStore.songs.findIndex((s) => s.id === songId);
    if (idx >= 0) {
      useMusicStore.setState((state) => {
        const song = state.songs[idx];
        if (song) {
          song.title = data.title;
          song.artist = data.artist;
          song.album = data.album;
          song.genre = data.genre || null;
        }
      });
    }

    Alert.alert('Saved', t('tag.saved'), [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title={t('tag.title')} showSettings={false} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 py-4 gap-4">
          <View className="rounded-3xl p-4 gap-4" style={{ backgroundColor: colors.surface }}>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <TagField
                  label={t('tag.title.field')}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  error={errors.title?.message}
                  colors={colors}
                />
              )}
            />
            <Controller
              control={control}
              name="artist"
              render={({ field: { onChange, onBlur, value } }) => (
                <TagField
                  label={t('tag.artist.field')}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  error={errors.artist?.message}
                  colors={colors}
                />
              )}
            />
            <Controller
              control={control}
              name="album"
              render={({ field: { onChange, onBlur, value } }) => (
                <TagField
                  label={t('tag.album.field')}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  colors={colors}
                />
              )}
            />
            <Controller
              control={control}
              name="genre"
              render={({ field: { onChange, onBlur, value } }) => (
                <TagField
                  label={t('tag.genre.field')}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  colors={colors}
                />
              )}
            />
            <Controller
              control={control}
              name="year"
              render={({ field: { onChange, onBlur, value } }) => (
                <TagField
                  label={t('tag.year.field')}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  keyboardType="numeric"
                  colors={colors}
                />
              )}
            />
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.back()}
              className="flex-1 py-4 rounded-3xl items-center flex-row justify-center gap-2"
              style={{ backgroundColor: colors.card }}
            >
              <X size={18} color={colors.text} />
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit(handleSave)}
              className="flex-1 py-4 rounded-3xl items-center flex-row justify-center gap-2"
              style={{ backgroundColor: isDirty ? colors.accent : colors.card }}
            >
              <Save size={18} color={isDirty ? colors.background : colors.textMuted} />
              <Text className="text-sm font-semibold" style={{ color: isDirty ? colors.background : colors.textMuted }}>{t('common.save')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
