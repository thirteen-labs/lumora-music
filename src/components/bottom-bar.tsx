import { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Music, Video, Folder, ListMusic } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const NAV_ITEMS = [
  { key: 'music', labelKey: 'nav.music', icon: Music, route: '/(tabs)/music' },
  { key: 'videos', labelKey: 'nav.videos', icon: Video, route: '/(tabs)/videos' },
  { key: 'files', labelKey: 'nav.folders', icon: Folder, route: '/(tabs)/files' },
  { key: 'playlists', labelKey: 'nav.playlists', icon: ListMusic, route: '/playlists' },
] as const;

const TAB_KEYS = ['music', 'videos', 'files', 'playlists', 'favorites', 'settings'] as const;

export function BottomBar() {
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

  const applySlider = useCallback((x: number, width: number) => {
    sliderX.value = withTiming(x, { duration: 300 });
    sliderW.value = withTiming(width, { duration: 300 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLayout = useCallback((key: string, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    itemLayouts.current[key] = { x, width };
    if (key === activeKeyRef.current) {
      applySlider(x, width);
    }
  }, [applySlider]);

  useEffect(() => {
    if (activeKey) {
      const pos = itemLayouts.current[activeKey];
      if (pos) {
        applySlider(pos.x, pos.width);
      }
    }
  }, [activeKey, applySlider]);

  const sliderAnimatedStyle = useAnimatedStyle(() => ({
    width: sliderW.value,
    left: sliderX.value,
  }));

  if (!isTabScreen) return null;

  return (
    <View
      style={[s.flexRow, s.itemsCenter, {
        paddingBottom: insets.bottom + 8,
        paddingTop: 8,
        paddingHorizontal: 8,
        justifyContent: 'space-evenly',
        backgroundColor: colors.background,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }]}
    >
      <Animated.View
        style={[{
          position: 'absolute',
          top: 6,
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
              style={[s.flexRow, s.itemsCenter, s.roundedFull, s.px3, s.py15, { backgroundColor: 'transparent' }]}
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
  );
}
