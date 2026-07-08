import { useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Pressable, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Music, ListMusic, Heart, LayoutGrid } from 'lucide-react-native';
import { useRouter, useSegments } from 'expo-router';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const NAV_ITEMS = [
  { key: 'index', labelKey: 'nav.home', icon: LayoutGrid, route: '/(tabs)' },
  { key: 'music', labelKey: 'nav.music', icon: Music, route: '/(tabs)/music' },
  { key: 'favorites', labelKey: 'nav.favorites', icon: Heart, route: '/(tabs)/favorites' },
  { key: 'playlists', labelKey: 'nav.playlists', icon: ListMusic, route: '/(tabs)/playlists' },
] as const;

export function BottomBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { colors } = useTheme();

  const isTabScreen = segments.length > 0 && segments[0] === "(tabs)";

  const getActiveKey = () => {
    if (segments[0] !== "(tabs)") return null;
    const tab = (segments as string[])[1];
    if (tab === "index" || !tab) return null;
    return tab;
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
            style={{ padding: 8, alignItems: 'center' }}
          >
            <Icon
              size={24}
              color={isActive ? colors.accent : colors.textMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
