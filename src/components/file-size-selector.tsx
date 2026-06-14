import { View, Text, Pressable } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';
import { useLayoutStore } from '@/store/layout-store';

const SIZES = [
  { key: 'small' as const, label: 'Small' },
  { key: 'medium' as const, label: 'Medium' },
  { key: 'big' as const, label: 'Big' },
];

export function FileSizeSelector() {
  const { colors } = useTheme();
  const { fileSizeTheme, setFileSizeTheme } = useLayoutStore();

  return (
    <View style={[s.flexRow, s.gap2]}>
      {SIZES.map(({ key, label }) => {
        const isActive = fileSizeTheme === key;
        return (
          <Pressable
            key={key}
            onPress={() => setFileSizeTheme(key)}
            style={[s.flex1, s.py3, s.rounded2xl, s.itemsCenter, {
              backgroundColor: isActive ? colors.accent : colors.surface,
            }]}
          >
            <Text
              style={[s.textSm, s.fontSemibold, { color: isActive ? colors.background : colors.text }]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
