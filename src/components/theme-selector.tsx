import { View, Text, Pressable } from 'react-native';
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
            className="items-center mb-4"
            style={{ flex: 1 / 5 }}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center mb-1"
              style={{
                backgroundColor: item.colors.surface,
                borderWidth: isActive ? 2 : 1,
                borderColor: isActive ? colors.accent : colors.border,
              }}
            >
              {isActive && <Check size={16} color={colors.accent} />}
              <View
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
                style={{ backgroundColor: item.colors.accent }}
              />
            </View>
            <Text
              className="text-[10px] text-center"
              style={{ color: isActive ? colors.accent : colors.textMuted }}
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
