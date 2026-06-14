import { View, Text, Pressable } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/store/theme-store';
import { themes } from '@/theme/themes';
import { Check } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';

export function ThemeSelector() {
  const { colors } = useTheme();
  const { currentThemeId, setTheme } = useThemeStore();

  return (
    <FlashList
      data={themes}
      numColumns={5}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => {
        const isActive = item.id === currentThemeId;
        return (
          <Pressable
            onPress={() => setTheme(item.id)}
            style={[s.itemsCenter, s.mb4]}
          >
            <View
              style={[s.w12, s.h12, s.roundedFull, s.itemsCenter, s.justifyCenter, s.mb1, {
                backgroundColor: item.colors.surface,
                borderWidth: isActive ? 2 : 1,
                borderColor: isActive ? colors.accent : colors.border,
              }]}
            >
              {isActive && <Check size={16} color={colors.accent} />}
              <View
                style={[s.absolute, s.w3, s.h3, s.roundedFull, { backgroundColor: item.colors.accent, bottom: 0, right: 0 }]}
              />
            </View>
            <Text
              style={[s.text10, s.textCenter, { color: isActive ? colors.accent : colors.textMuted }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}
