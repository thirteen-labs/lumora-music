import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Settings, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';

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
  const { colors } = useTheme();

  return (
    <View
      style={[s.wFull, s.overflowHidden, {
        paddingTop: insets.top,
        backgroundColor: colors.pageBackground,
      }]}
    >
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
                    backgroundColor: colors.surface,
                    elevation: 3,
                    shadowColor: '#000',
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                  }]}
                >
                  <Search size={20} color={colors.text} />
                </Pressable>
              )}
              {showSettings && (
                <Pressable
                  onPress={() => router.push('/(tabs)/settings')}
                  style={[s.w11, s.h11, s.roundedFull, s.itemsCenter, s.justifyCenter, {
                    backgroundColor: colors.surface,
                    elevation: 3,
                    shadowColor: '#000',
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
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
