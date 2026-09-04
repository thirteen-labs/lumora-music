import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Settings, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { BlurView } from 'expo-blur';
import { useSettingsStore } from '@/store/settings-store';

interface TopBarProps {
  showSearch?: boolean;
  showSettings?: boolean;
  title?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export function TopBar({ showSearch = true, showSettings = true, title, showBack = false, rightElement }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const hasImage = !!useSettingsStore((s) => s.backgroundImage);

  return (
    <View
      style={[s.wFull, s.overflowHidden, {
        paddingTop: insets.top,
        backgroundColor: hasImage ? 'transparent' : colors.pageBackground,
        borderBottomWidth: hasImage ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: hasImage ? colors.glassBorder : 'transparent',
      }]}
    >
      {hasImage && (
        <BlurView intensity={26} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      )}
      {hasImage && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceGlass, opacity: 0.92 }]} />
      )}
      <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.px5, s.py3]}>
        <View style={[s.flexRow, s.itemsCenter]}>
          {showBack && (
            <Pressable
              onPress={() => router.back()}
              style={[s.w9, s.h9, s.roundedFull, s.itemsCenter, s.justifyCenter, { marginRight: 8 }]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ChevronLeft size={24} color={colors.text} />
            </Pressable>
          )}
          {title ? (
            <Text style={[s.textLg, s.fontBold, { color: colors.text }]}>
              {title}
            </Text>
          ) : (
            <>
              <Text style={[s.textXl, s.fontBold, { color: colors.text }]}>
                LUM
              </Text>
              <Text style={[{ color: colors.accent, marginHorizontal: 2 }, s.textXl, s.fontBold]}>
                O
              </Text>
              <Text style={[s.textXl, s.fontBold, { color: colors.text }]}>
                RA
              </Text>
            </>
          )}
        </View>

        <View style={[s.flexRow, s.itemsCenter, s.gap2]}>
          {rightElement ? (
            rightElement
          ) : (
            <>
              {showSearch && (
                <Pressable
                  onPress={() => router.push('/search')}
                  style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, {
                    backgroundColor: hasImage ? colors.glass : colors.surface,
                    borderWidth: hasImage ? StyleSheet.hairlineWidth : 0,
                    borderColor: hasImage ? colors.glassBorder : 'transparent',
                    elevation: hasImage ? 0 : 3,
                    shadowColor: '#000',
                    shadowOpacity: hasImage ? 0.08 : 0.15,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                  }]}
                >
                  <Search size={20} color={colors.text} />
                </Pressable>
              )}
              {showSettings && (
                <Pressable
                  onPress={() => router.push('/(tabs)/settings')}
                  style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, {
                    backgroundColor: hasImage ? colors.glass : colors.surface,
                    borderWidth: hasImage ? StyleSheet.hairlineWidth : 0,
                    borderColor: hasImage ? colors.glassBorder : 'transparent',
                    elevation: hasImage ? 0 : 3,
                    shadowColor: '#000',
                    shadowOpacity: hasImage ? 0.08 : 0.15,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                  }]}
                >
                  <Settings size={20} color={colors.text} />
                </Pressable>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}
