import { useRef, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Settings, Menu } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useMusicStore } from '@/store/music-store';
import { usePlayerStore } from '@/store/player-store';
import {
  RefreshCw,
  Shuffle,
  Info,
} from 'lucide-react-native';

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
  const { songs, scan } = useMusicStore();
  const { play } = usePlayerStore();

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const menuItems = [
    {
      icon: Shuffle,
      label: 'Shuffle All',
      onPress: () => {
        if (songs.length > 0) {
          const shuffled = [...songs].sort(() => Math.random() - 0.5);
          play(shuffled[0], shuffled);
        }
        menuRef.current?.dismiss();
      },
    },
    {
      icon: RefreshCw,
      label: 'Rescan Library',
      onPress: () => {
        scan();
        menuRef.current?.dismiss();
      },
    },
    {
      icon: Info,
      label: 'About',
      onPress: () => {
        menuRef.current?.dismiss();
      },
    },
  ];

  return (
    <View style={{ paddingTop: insets.top }} className="w-full">
      <View
        className="flex-row items-center justify-between px-4 py-3"
        style={{ backgroundColor: colors.background }}
      >
        <View className="flex-row items-center gap-3">
          {showMenu && (
            <Pressable
              onPress={() => menuRef.current?.present()}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.surface }}
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
              style={{ backgroundColor: colors.surface }}
            >
              <Search size={20} color={colors.text} />
            </Pressable>
          )}
          {showSettings && (
            <Pressable
              onPress={() => router.push('/settings')}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.surface }}
            >
              <Settings size={20} color={colors.text} />
            </Pressable>
          )}
        </View>
      </View>

      <BottomSheetModal
        ref={menuRef}
        snapPoints={['40%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={{ flex: 1 }}>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}
            >
              <item.icon size={20} color={colors.text} />
              <Text style={{ fontSize: 15, color: colors.text }}>{item.label}</Text>
            </Pressable>
          ))}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}
