import { useEffect, useRef, useCallback } from 'react';
import { View, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Music, Settings, LayoutGrid, SlidersHorizontal } from 'lucide-react-native';
import { useRouter, useSegments } from 'expo-router';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { BlurView } from 'expo-blur';
import { useSettingsStore } from '@/store/settings-store';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const NAV_ITEMS = [
  { key: 'index', labelKey: 'nav.home', icon: LayoutGrid, route: '/(tabs)' },
  { key: 'music', labelKey: 'nav.library', icon: Music, route: '/(tabs)/music' },
  { key: 'equalizer', labelKey: 'nav.equalizer', icon: SlidersHorizontal, route: '/(tabs)/equalizer' },
  { key: 'settings', labelKey: 'nav.settings', icon: Settings, route: '/(tabs)/settings' },
] as const;

export function BottomBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const hasImage = !!useSettingsStore((s) => s.backgroundImage);

  const isTabScreen = segments.length > 0 && segments[0] === "(tabs)";

  const getActiveKey = () => {
    if (segments[0] !== "(tabs)") return null;
    const tab = (segments as string[])[1];
    if (!tab) return "index";
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
        paddingBottom: insets.bottom + 6,
        paddingTop: 10,
        paddingHorizontal: 12,
        justifyContent: 'space-evenly',
        backgroundColor: hasImage ? 'transparent' : colors.pageBackground,
        borderTopWidth: hasImage ? StyleSheet.hairlineWidth : 0,
        borderTopColor: hasImage ? colors.glassBorder : 'transparent',
        overflow: 'hidden',
      }]}
    >
      {hasImage && (
        <>
          <BlurView intensity={28} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceGlass, opacity: 0.96 }]} />
        </>
      )}
      <Animated.View
        style={[{
          position: 'absolute',
          top: 6,
          height: 2.5,
          backgroundColor: colors.accent,
          borderRadius: 2,
          shadowColor: colors.accent,
          shadowOpacity: 0.32,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        }, sliderAnimatedStyle]}
      />
      {NAV_ITEMS.map((item) => {
        const isActive = activeKey === item.key;
        const Icon = item.icon;
        return (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.route)}
            onLayout={(e) => handleLayout(item.key, e)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 18,
              alignItems: 'center',
              borderRadius: 14,
              backgroundColor: isActive ? (hasImage ? colors.accentSoft : colors.accent + '14') : 'transparent',
              borderWidth: isActive && hasImage ? StyleSheet.hairlineWidth : 0,
              borderColor: isActive && hasImage ? colors.glassBorder : 'transparent',
            }}
            accessibilityLabel={t(item.labelKey)}
            accessibilityRole={'button' as const}
          >
            <Icon
              size={22}
              color={isActive ? colors.accent : colors.textMuted}
              strokeWidth={isActive ? 2.2 : 1.9}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
