import { View, Text, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useLayoutStore } from '@/store/layout-store';
import { cn } from '@/utils/cn';

const SIZES = [
  { key: 'small' as const, label: 'Small' },
  { key: 'medium' as const, label: 'Medium' },
  { key: 'big' as const, label: 'Big' },
];

export function FileSizeSelector() {
  const { colors } = useTheme();
  const { fileSizeTheme, setFileSizeTheme } = useLayoutStore();

  return (
    <View className="flex-row gap-2">
      {SIZES.map(({ key, label }) => {
        const isActive = fileSizeTheme === key;
        return (
          <Pressable
            key={key}
            onPress={() => setFileSizeTheme(key)}
            className={cn('flex-1 py-3 rounded-2xl items-center')}
            style={{
              backgroundColor: isActive ? colors.accent : colors.surface,
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: isActive ? colors.background : colors.text }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
