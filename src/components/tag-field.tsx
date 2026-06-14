import { View, Text, TextInput } from 'react-native';
import { s } from '@/styles';

interface TagFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  colors: any;
  error?: string;
  keyboardType?: 'default' | 'numeric';
  accessibilityLabel?: string;
}

export function TagField({ label, value, onChange, onBlur, colors, error, keyboardType, accessibilityLabel }: TagFieldProps) {
  return (
    <View>
      <Text style={[s.textXs, s.fontMedium, s.mb1, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholder={label}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        style={[s.px4, s.py3, s.rounded2xl, s.textSm, {
          backgroundColor: colors.card,
          color: colors.text,
          borderWidth: error ? 1 : 0,
          borderColor: error ? colors.notification : 'transparent',
        }]}
        accessibilityLabel={accessibilityLabel ?? label}
      />
      {error && (
        <Text style={[s.textXs, s.mt1, { color: colors.notification }]}>{error}</Text>
      )}
    </View>
  );
}
