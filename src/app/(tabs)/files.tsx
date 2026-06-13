import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { MiniPlayer } from '@/components/mini-player';
import { useRouter } from 'expo-router';
import {
  Clock,
  TrendingUp,
  ListMusic,
  Mic2,
  Users,
  Disc3,
  Archive,
  Lock,
  ChevronRight,
} from 'lucide-react-native';

const CATEGORIES = [
  { icon: Clock, label: 'Recently Played', subtitle: 'Your latest listens', route: '/recently-played' },
  { icon: TrendingUp, label: 'Most Played', subtitle: 'Top tracks by play count', route: '/statistics' },
  { icon: ListMusic, label: 'Playlists', subtitle: 'Your custom collections', route: '/playlists' },
  { icon: Mic2, label: 'With Lyrics', subtitle: 'Songs that have lyrics', route: '/with-lyrics' },
  { icon: Users, label: 'Artists', subtitle: 'Browse by artist', route: '/music/artists' },
  { icon: Disc3, label: 'Albums', subtitle: 'Browse by album', route: '/music/albums' },
  { icon: Archive, label: 'Not Used', subtitle: 'Not opened for a long time', route: '/not-used' },
  { icon: Lock, label: 'Private Folder', subtitle: 'Hidden & protected files', route: '/private-folder' },
];

export default function FilesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {CATEGORIES.map((cat, i) => (
              <Pressable
                key={cat.label}
                onPress={() => router.push(cat.route as any)}
                className="flex-row items-center gap-4 p-4"
                style={{ borderBottomWidth: i < CATEGORIES.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.accent + '15' }}>
                  <cat.icon size={20} color={colors.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>{cat.label}</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{cat.subtitle}</Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
      <MiniPlayer />
    </View>
  );
}
