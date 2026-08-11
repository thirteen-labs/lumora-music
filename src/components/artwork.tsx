import { memo, useState, useEffect } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Music } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { resolveArtworkForDisplay } from '@/services/artwork-resolver';

interface ArtworkProps {
  uri: string | null | undefined;
  size: number;
  borderRadius?: number;
  iconSize?: number;
  iconColor?: string;
  backgroundColor?: string;
}

export const Artwork = memo(function Artwork({ uri, size, borderRadius, iconSize, iconColor, backgroundColor }: ArtworkProps) {
  const { colors } = useTheme();
  const r = borderRadius ?? size * 0.2;
  const iSize = iconSize ?? size * 0.4;
  const [failed, setFailed] = useState(false);
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (uri) {
      resolveArtworkForDisplay(uri).then((resolved) => {
        if (!cancelled) setResolvedUri(resolved);
      });
    } else {
      setResolvedUri(null);
    }
    return () => { cancelled = true; };
  }, [uri]);

  if (resolvedUri && !failed) {
    return (
      <Image
        source={{ uri: resolvedUri }}
        style={{ width: size, height: size, borderRadius: r }}
        contentFit="cover"
        transition={200}
        onError={() => setFailed(true)}
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
      <Music size={iSize} color={iconColor ?? colors.accent} />
    </View>
  );
});
