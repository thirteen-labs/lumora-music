import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  const { colors } = useTheme();
  return (
    <Text
      className="text-xs font-bold uppercase tracking-wider mb-2 px-1"
      style={{ color: colors.accent }}
    >
      {title}
    </Text>
  );
}
