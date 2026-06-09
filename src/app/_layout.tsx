import { Stack } from 'expo-router';
import { ThemeProvider } from '@/theme/provider';
import { ColorAwareProvider } from '@/components/color-aware-provider';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/hooks/use-theme';

export default function RootLayout() {
  const { colors } = useTheme();

  return (
    <ThemeProvider>
      <ColorAwareProvider>
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
      </ColorAwareProvider>
    </ThemeProvider>
  );
}
