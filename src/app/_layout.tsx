import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '@/theme/provider';
import { ColorAwareProvider } from '@/components/color-aware-provider';
import { PlayerProvider } from '@/components/player-provider';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/hooks/use-theme';

export default function RootLayout() {
  const { colors } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ColorAwareProvider>
          <PlayerProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="music/songs"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="music/albums"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="music/artists"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="music/genres"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="search"
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="player"
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="video-player"
                options={{ animation: 'slide_from_bottom' }}
              />
            </Stack>
          </PlayerProvider>
        </ColorAwareProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
