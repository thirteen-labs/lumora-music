import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';

interface TopBarProps {
  showSearch?: boolean;
  showSettings?: boolean;
  title?: string;
  rightElement?: React.ReactNode;
}

export function TopBar({ showSearch = true, showSettings = true, title, rightElement }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View
      style={[s.wFull, s.overflowHidden, {
        paddingTop: insets.top,
        backgroundColor: colors.background,
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
                    boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
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
                    boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
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
