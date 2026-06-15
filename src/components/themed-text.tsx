import { Text, type TextProps } from 'react-native';
import { FONT_FAMILY_MAP } from '@/components/font-provider';
import { useSettingsStore } from '@/store/settings-store';

export function ThemedText({ style, ...props }: TextProps) {
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const fontName = FONT_FAMILY_MAP[fontFamily];

  return <Text style={[fontName ? { fontFamily: fontName } : undefined, style]} {...props} />;
}