import { Text } from 'react-native';
import { s } from '@/styles';
import { useTheme } from '@/hooks/use-theme';

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[s.textXs, s.fontBold, s.uppercase, s.mb2, s.px1, { color: colors.accent }]}
    >
      {title}
    </Text>
  );
}
