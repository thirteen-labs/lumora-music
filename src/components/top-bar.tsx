import { useRef, useCallback } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Settings,
  Menu,
  RefreshCw,
  Shuffle,
  Info,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import { BlurView } from 'expo-blur';

interface TopBarProps {
  showMenu?: boolean;
  showSearch?: boolean;
  showSettings?: boolean;
  title?: string;
}

export function TopBar({ showMenu = false, showSearch = true, showSettings = true, title }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const menuRef = useRef<BottomSheetModal>(null);
  const scan = useMusicStore((s) => s.scan);
  const songs = useMusicStore((s) => s.songs);
  const play = usePlayerStore((s) => s.play);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const dismiss = useCallback(() => {
    menuRef.current?.dismiss();
  }, []);

  const handleShuffle = useCallback(() => {
    if (songs.length > 0) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      play(shuffled[0], shuffled);
    }
    dismiss();
  }, [songs, play, dismiss]);

  const handleRescan = useCallback(() => {
    scan();
    dismiss();
  }, [scan, dismiss]);

  const handleAbout = useCallback(() => {
    dismiss();
  }, [dismiss]);

  return (
    <View style={{ paddingTop: insets.top }} className="w-full">
      <BlurView
        intensity={80}
        tint="dark"
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
        style={{ overflow: 'hidden' }}
      >
        <View
          className="flex-row items-center justify-between px-4 py-3"
        >
          <View className="flex-row items-center gap-3">
            {showMenu && (
              <Pressable
                onPress={() => menuRef.current?.present()}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.surface + '80' }}
              >
                <Menu size={20} color={colors.text} />
              </Pressable>
            )}
            {title ? (
              <Text className="text-lg font-bold" style={{ color: colors.text }}>{title}</Text>
            ) : (
              <View className="flex-row items-center">
                <Text className="text-xl font-bold tracking-widest" style={{ color: colors.text }}>
                  LUM
                </Text>
                <View
                  className="w-6 h-6 rounded-full items-center justify-center mx-0.5"
                  style={{ backgroundColor: colors.accent }}
                >
                  <Text className="text-[10px] font-bold" style={{ color: colors.background }}>O</Text>
                </View>
                <Text className="text-xl font-bold tracking-widest" style={{ color: colors.text }}>
                  RA
                </Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-2">
            {showSearch && (
              <Pressable
                onPress={() => router.push('/search')}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.surface + '80' }}
              >
                <Search size={20} color={colors.text} />
              </Pressable>
            )}
            {showSettings && (
              <Pressable
                onPress={() => router.push('/settings')}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.surface + '80' }}
              >
                <Settings size={20} color={colors.text} />
              </Pressable>
            )}
          </View>
        </View>
      </BlurView>

      <BottomSheetModal
        ref={menuRef}
        snapPoints={['40%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ flex: 1 }}>
          <Pressable
            onPress={handleShuffle}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              paddingHorizontal: 20,
              paddingVertical: 14,
            }}
          >
            <Shuffle size={20} color={colors.text} />
            <Text style={{ fontSize: 15, color: colors.text }}>Shuffle All</Text>
          </Pressable>
          <Pressable
            onPress={handleRescan}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              paddingHorizontal: 20,
              paddingVertical: 14,
            }}
          >
            <RefreshCw size={20} color={colors.text} />
            <Text style={{ fontSize: 15, color: colors.text }}>Rescan Library</Text>
          </Pressable>
          <Pressable
            onPress={handleAbout}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              paddingHorizontal: 20,
              paddingVertical: 14,
            }}
          >
            <Info size={20} color={colors.text} />
            <Text style={{ fontSize: 15, color: colors.text }}>About</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}
