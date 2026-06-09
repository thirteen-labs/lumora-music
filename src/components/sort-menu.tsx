import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import type { SortOption } from '@/types/media';
import { Check } from 'lucide-react-native';

interface SortMenuProps {
  options: SortOption[];
  active: SortOption;
  onSelect: (option: SortOption) => void;
}

export function SortMenu({ options, active, onSelect }: SortMenuProps) {
  const { colors } = useTheme();

  return (
    <View className="flex-row flex-wrap gap-2 p-4">
      {options.map((option) => {
        const isActive = option.field === active.field && option.order === active.order;
        return (
          <Pressable
            key={`${option.field}-${option.order}`}
            onPress={() => onSelect(option)}
            className="flex-row items-center gap-2 px-4 py-2 rounded-full"
            style={{
              backgroundColor: isActive ? colors.accent : colors.surface,
            }}
          >
            {isActive && <Check size={14} color={colors.background} />}
            <Text
              className="text-sm font-medium"
              style={{ color: isActive ? colors.background : colors.text }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
