import { View, Text, TextInput } from 'react-native';

interface TagFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  colors: any;
  error?: string;
  keyboardType?: 'default' | 'numeric';
}

export function TagField({ label, value, onChange, onBlur, colors, error, keyboardType }: TagFieldProps) {
  return (
    <View>
      <Text className="text-xs font-medium mb-1" style={{ color: colors.textMuted }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholder={label}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        className="px-4 py-3 rounded-2xl text-sm"
        style={{
          backgroundColor: colors.card,
          color: colors.text,
          borderWidth: error ? 1 : 0,
          borderColor: error ? '#EF4444' : 'transparent',
        }}
      />
      {error && (
        <Text className="text-xs mt-1" style={{ color: '#EF4444' }}>{error}</Text>
      )}
    </View>
  );
}
