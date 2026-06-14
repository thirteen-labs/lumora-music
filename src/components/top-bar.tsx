import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Settings, Music, Video, Folder, Heart } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { s } from '@/styles';
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
      style={[s.wFull, {
        paddingTop: insets.top,
        backgroundColor: colors.background,
        borderBottomLeftRadius: isTabScreen ? 16 : 0,
        borderBottomRightRadius: isTabScreen ? 16 : 0,
        borderWidth: isTabScreen ? 1 : 0,
        borderColor: colors.border,
      }]}
    >
      <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.px5, s.py3]}>
        <View style={[s.flexRow, s.itemsCenter]}>
          {title ? (
            <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>
              {title}
            </Text>
          ) : (
            <>
              <Text style={[s.textXl, s.fontBold, { color: colors.text }]}>
                LUM
              </Text>
              <View
                style={[s.w5, s.h5, s.roundedFull, s.itemsCenter, s.justifyCenter, s.mx05, { backgroundColor: colors.accent }]}
              >
                <Text style={[s.text10, s.fontBold, { color: colors.background }]}>
                  O
                </Text>
              </View>
              <Text style={[s.textXl, s.fontBold, { color: colors.text }]}>
                RA
              </Text>
            </>
          )}
        </View>

        <View style={[s.flexRow, s.itemsCenter, s.gap2]}>
          {showSearch && (
            <Pressable
              onPress={() => router.push('/search')}
              style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, {
                backgroundColor: colors.surface,
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
              }]}
            >
              <Search size={20} color={colors.text} />
            </Pressable>
          )}
          {showSettings && (
            <Pressable
              onPress={() => router.push('/settings')}
              style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, {
                backgroundColor: colors.surface,
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
              }]}
            >
              <Settings size={20} color={colors.text} />
            </Pressable>
          )}
        </View>
      </View>

      {isTabScreen && (
        <View
          style={[s.flexRow, s.itemsCenter, s.justifyCenter, s.pb2, { paddingHorizontal: 16 }]}
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
                  style={[s.flexRow, s.itemsCenter, s.roundedFull, s.px3, s.py15, {
                    backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  }]}
                >
                  <Icon
                    size={18}
                    color={isActive ? colors.accent : colors.textMuted}
                  />
                  <Text
                    style={[s.textXs, s.fontSemibold, s.ml15, { color: isActive ? colors.accent : colors.textMuted }]}
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
