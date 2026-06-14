import { View, Text, ScrollView, Pressable } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, Folder, Plus, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FOLDERS = [
  { name: 'Internal Music', path: '/storage/emulated/0/Music', count: 245 },
  { name: 'Downloads', path: '/storage/emulated/0/Download', count: 89 },
];

export default function ScanLocationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <View style={[s.flexRow, s.itemsCenter, s.gap3, s.px5, { paddingTop: insets.top + 12 }, s.pb4]}>
        <Pressable onPress={() => router.back()} style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.surface }]}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>Scan Locations</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.px5}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {FOLDERS.map((folder, i) => (
              <View
                key={folder.path}
                style={[s.flexRow, s.itemsCenter, s.gap4, s.p4, { borderBottomWidth: i < FOLDERS.length - 1 ? 1 : 0, borderBottomColor: colors.border + '20' }]}
              >
                <View style={[s.w10, s.h10, s.roundedXl, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.accent + '15' }]}>
                  <Folder size={20} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>{folder.name}</Text>
                  <Text style={[s.textXs, s.mt05, { color: colors.textMuted }]}>{folder.count} songs</Text>
                </View>
                <Pressable style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, { backgroundColor: colors.notification + '20' }]} hitSlop={8}>
                  <Trash2 size={16} color={colors.notification} />
                </Pressable>
              </View>
            ))}
          </View>
          <Pressable style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.gap2, s.mt4, { paddingVertical: 12, borderRadius: 16, backgroundColor: colors.accent + '20' }]}>
            <Plus size={18} color={colors.accent} />
            <Text style={[s.textSm, s.fontSemibold, { color: colors.accent }]}>Add Folder</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
