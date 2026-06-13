import { View } from 'react-native';
import { Image } from 'expo-image';
import { Music } from 'lucide-react-native';

interface ArtworkProps {
  uri: string | null | undefined;
  size: number;
  borderRadius?: number;
  iconSize?: number;
  iconColor?: string;
  backgroundColor?: string;
}

export function Artwork({ uri, size, borderRadius, iconSize, iconColor, backgroundColor }: ArtworkProps) {
  const r = borderRadius ?? size * 0.2;
  const iSize = iconSize ?? size * 0.4;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: r }}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: backgroundColor ?? 'transparent',
      }}
    >
      <Music size={iSize} color={iconColor ?? '#7C82F8'} />
    </View>
  );
}
