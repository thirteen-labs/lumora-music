import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Settings, ArrowUpDown, Music, Video, Folder, Heart } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

interface TopBarProps {
  showSearch?: boolean;
  showSettings?: boolean;
  title?: string;
}

const NAV_ITEMS = [
  { key: 'music', label: 'Music', icon: Music, route: '/(tabs)/music' },
  { key: 'videos', label: 'Videos', icon: Video, route: '/(tabs)/videos' },
  { key: 'files', label: 'Folders', icon: Folder, route: '/(tabs)/files' },
  { key: 'favorites', label: 'Favorites', icon: Heart, route: '/(tabs)/favorites' },
] as const;

const TAB_KEYS = ['music', 'videos', 'files', 'favorites', 'settings'] as const;

export function TopBar({ showSearch = true, showSettings = true, title }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();

  const isTabScreen = TAB_KEYS.some((key) => pathname.startsWith(`/(tabs)/${key}`)) || pathname === '/(tabs)';

  const getActiveKey = () => {
    if (pathname.startsWith('/(tabs)/music')) return 'music';
    if (pathname.startsWith('/(tabs)/videos')) return 'videos';
    if (pathname.startsWith('/(tabs)/files')) return 'files';
    if (pathname.startsWith('/(tabs)/favorites')) return 'favorites';
    return null;
  };

  const activeKey = getActiveKey();

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.background,
        borderBottomLeftRadius: isTabScreen ? 16 : 0,
        borderBottomRightRadius: isTabScreen ? 16 : 0,
        borderWidth: isTabScreen ? 1 : 0,
        borderColor: colors.border,
      }}
      className="w-full"
    >
      <View className="flex-row items-center justify-between px-5 py-3">
        <View className="flex-row items-center">
          {title ? (
            <Text className="text-lg font-bold" style={{ color: colors.text }}>
              {title}
            </Text>
          ) : (
            <>
              <Text className="text-xl font-bold tracking-wider" style={{ color: colors.text }}>
                LUM
              </Text>
              <View
                className="w-5 h-5 rounded-full items-center justify-center mx-0.5"
                style={{ backgroundColor: colors.accent }}
              >
                <Text className="text-[10px] font-bold" style={{ color: colors.background }}>
                  O
                </Text>
              </View>
              <Text className="text-xl font-bold tracking-wider" style={{ color: colors.text }}>
                RA
              </Text>
            </>
          )}
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => {}}
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{
              backgroundColor: colors.surface,
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
            }}
          >
            <ArrowUpDown size={20} color={colors.text} />
          </Pressable>
          {showSearch && (
            <Pressable
              onPress={() => router.push('/search')}
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{
                backgroundColor: colors.surface,
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
              }}
            >
              <Search size={20} color={colors.text} />
            </Pressable>
          )}
          {showSettings && (
            <Pressable
              onPress={() => router.push('/settings')}
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{
                backgroundColor: colors.surface,
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
              }}
            >
              <Settings size={20} color={colors.text} />
            </Pressable>
          )}
        </View>
      </View>

      {isTabScreen && (
        <View
          className="flex-row items-center justify-center pb-2"
          style={{ paddingHorizontal: 16 }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeKey === item.key;
            const Icon = item.icon;
            return (
              <Pressable
                key={item.key}
                onPress={() => router.push(item.route as any)}
                style={{ marginHorizontal: 8, alignItems: 'center' }}
              >
                <View
                  className="flex-row items-center rounded-full px-3 py-1.5"
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  }}
                >
                  <Icon
                    size={18}
                    color={isActive ? colors.accent : colors.textMuted}
                  />
                  <Text
                    className="text-xs font-semibold ml-1.5"
                    style={{ color: isActive ? colors.accent : colors.textMuted }}
                  >
                    {item.label}
                  </Text>
                </View>
                {isActive && (
                  <View
                    style={{
                      width: '70%',
                      height: 2,
                      backgroundColor: colors.accent,
                      borderRadius: 1,
                      marginTop: 4,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
