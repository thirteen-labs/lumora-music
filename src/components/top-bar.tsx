import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Settings, Menu } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/utils/cn';

interface TopBarProps {
  showMenu?: boolean;
  showSearch?: boolean;
  showSettings?: boolean;
  title?: string;
}

export function TopBar({ showMenu = false, showSearch = true, showSettings = true, title }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={{ paddingTop: insets.top }} className="w-full">
      <View
        className="flex-row items-center justify-between px-4 py-3"
        style={{ backgroundColor: colors.background }}
      >
        <View className="flex-row items-center gap-3">
          {showMenu && (
            <Pressable
              onPress={() => {}}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.surface }}
            >
              <Menu size={20} color={colors.text} />
            </Pressable>
          )}
          {title ? (
            <Text className="text-lg font-bold" style={{ color: colors.text }}>{title}</Text>
          ) : (
            <View className="flex-row items-center">
              <Text className="text-xl font-bold tracking-widest" style={{ color: colors.text }}>
                LUM
              </Text>
              <View
                className="w-6 h-6 rounded-full items-center justify-center mx-0.5"
                style={{ backgroundColor: colors.accent }}
              >
                <Text className="text-[10px] font-bold" style={{ color: colors.background }}>O</Text>
              </View>
              <Text className="text-xl font-bold tracking-widest" style={{ color: colors.text }}>
                RA
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          {showSearch && (
            <Pressable
              onPress={() => router.push('/search')}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.surface }}
            >
              <Search size={20} color={colors.text} />
            </Pressable>
          )}
          {showSettings && (
            <Pressable
              onPress={() => router.push('/settings')}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.surface }}
            >
              <Settings size={20} color={colors.text} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
