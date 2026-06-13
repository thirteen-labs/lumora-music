import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Folder, Plus, Trash2 } from 'lucide-react-native';

const FOLDERS = [
  { name: 'Internal Music', path: '/storage/emulated/0/Music', count: 245 },
  { name: 'Downloads', path: '/storage/emulated/0/Download', count: 89 },
];

export default function ScanLocationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4">
        <Pressable onPress={() => router.back()} className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.surface }}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text className="text-lg font-bold" style={{ color: colors.text }}>Scan Locations</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View className="px-5">
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {FOLDERS.map((folder, i) => (
              <View
                key={folder.path}
                className="flex-row items-center gap-4 p-4"
                style={{ borderBottomWidth: i < FOLDERS.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }}
              >
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.accent + '15' }}>
                  <Folder size={20} color={colors.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>{folder.name}</Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{folder.count} songs</Text>
                </View>
                <Pressable className="w-11 h-11 rounded-full items-center justify-center" style={{ backgroundColor: colors.notification + '20' }} hitSlop={8}>
                  <Trash2 size={16} color={colors.notification} />
                </Pressable>
              </View>
            ))}
          </View>
          <Pressable className="flex-row items-center justify-center gap-2 mt-4 py-3 rounded-2xl" style={{ backgroundColor: colors.accent + '20' }}>
            <Plus size={18} color={colors.accent} />
            <Text className="text-sm font-semibold" style={{ color: colors.accent }}>Add Folder</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
