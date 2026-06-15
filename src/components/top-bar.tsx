import { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Settings, Music, Video, Folder, ListMusic } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface TopBarProps {
  showSearch?: boolean;
  showSettings?: boolean;
  title?: string;
}

const NAV_ITEMS = [
  { key: 'music', labelKey: 'nav.music', icon: Music, route: '/(tabs)/music' },
  { key: 'videos', labelKey: 'nav.videos', icon: Video, route: '/(tabs)/videos' },
  { key: 'files', labelKey: 'nav.folders', icon: Folder, route: '/(tabs)/files' },
  { key: 'playlists', labelKey: 'nav.playlists', icon: ListMusic, route: '/playlists' },
] as const;

const TAB_KEYS = ['music', 'videos', 'files', 'playlists', 'favorites', 'settings'] as const;

export function TopBar({ showSearch = true, showSettings = true, title }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const isTabScreen = pathname === '/' || TAB_KEYS.some((key) => pathname === `/${key}` || pathname.startsWith(`/${key}/`)) || pathname === '/playlists' || pathname.startsWith('/playlist/');

  const getActiveKey = () => {
    if (pathname.startsWith('/music')) return 'music';
    if (pathname.startsWith('/videos')) return 'videos';
    if (pathname.startsWith('/files')) return 'files';
    if (pathname === '/playlists' || pathname.startsWith('/playlist/')) return 'playlists';
    return null;
  };

  const activeKey = getActiveKey();

  const itemLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const activeKeyRef = useRef(activeKey);
  const sliderX = useSharedValue(0);
  const sliderW = useSharedValue(0);

  useEffect(() => { activeKeyRef.current = activeKey; }, [activeKey]);

  const handleLayout = useCallback((key: string, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    itemLayouts.current[key] = { x, width };
    if (key === activeKeyRef.current) {
      /* eslint-disable react-hooks/immutability */
      sliderX.value = withTiming(x, { duration: 300 });
      sliderW.value = withTiming(width, { duration: 300 });
      /* eslint-enable react-hooks/immutability */
    }
  }, [sliderX, sliderW]);

  useEffect(() => {
    if (activeKey) {
      const pos = itemLayouts.current[activeKey];
      if (pos) {
        /* eslint-disable react-hooks/immutability */
        sliderX.value = withTiming(pos.x, { duration: 300 });
        sliderW.value = withTiming(pos.width, { duration: 300 });
        /* eslint-enable react-hooks/immutability */
      }
    }
  }, [activeKey, sliderX, sliderW]);

  const sliderAnimatedStyle = useAnimatedStyle(() => ({
    width: sliderW.value,
    transform: [{ translateX: sliderX.value }],
  }));

  return (
    <View
      style={[s.wFull, s.overflowHidden, {
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
          <Animated.View
            style={[{
              position: 'absolute',
              bottom: 6,
              height: 2,
              backgroundColor: colors.accent,
              borderRadius: 1,
            }, sliderAnimatedStyle]}
          />
          {NAV_ITEMS.map((item) => {
            const isActive = activeKey === item.key;
            const Icon = item.icon;
            return (
              <Pressable
                key={item.key}
                onPress={() => router.push(item.route as any)}
                onLayout={(e) => handleLayout(item.key, e)}
                style={{ marginHorizontal: 8, alignItems: 'center' }}
              >
                <View
                  style={[s.flexRow, s.itemsCenter, s.roundedFull, s.px3, s.py15, {
                    backgroundColor: isActive ? colors.accent + '18' : 'transparent',
                  }]}
                >
                  <Icon
                    size={18}
                    color={isActive ? colors.accent : colors.textMuted}
                  />
                  <Text
                    style={[s.textXs, s.fontSemibold, s.ml15, { color: isActive ? colors.accent : colors.textMuted }]}
                  >
                    {t(item.labelKey as any)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
