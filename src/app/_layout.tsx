import "../../global.css";

import { View } from "react-native";
import { Stack, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomBar } from "@/components/bottom-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ThemeProvider } from "@/theme/provider";
import { FontProvider } from "@/components/font-provider";
import { ColorAwareProvider } from "@/components/color-aware-provider";
import { PlayerProvider } from "@/components/player-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toast } from "@/components/toast";
import { StatusBar } from "expo-status-bar";
import { useScanManager } from "@/hooks/use-scan-manager";

function RootStack() {
  const segments = useSegments();
  useScanManager();

  const isTabScreen = segments.length > 0 && segments[0] === "(tabs)";

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <ErrorBoundary name="Screen Content">
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="music/albums"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="music/artists"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="music/genres"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="music/album/[id]"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="music/artist/[id]"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="music/genre/[id]"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="search"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="audio-features"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="sleep-timer"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="statistics"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="smart-playlists"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="tag-edit"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="storage"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="batch-operations"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="library-tools"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="ai-features"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="cloud-sync"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="hidden-files"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="play-time"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="recently-deleted"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="themes"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="accent-color"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="language-settings"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="font-settings"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="crossfade-settings"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="notification-settings"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="backup-restore"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="privacy"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="help-support"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="about"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="recently-played"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="with-lyrics"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="private-folder"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="lyrics-editor"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="background-image-adjuster"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="output-devices"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="audio-quality"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="metadata-editor"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="music/songs"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="player"
              options={{ animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="playlist-picker"
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="system-hidden-files"
              options={{ animation: "slide_from_right" }}
            />
          </Stack>
        </View>
      </ErrorBoundary>
      <ErrorBoundary name="Bottom Bar">
        {isTabScreen && <BottomBar />}
      </ErrorBoundary>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <ThemeProvider>
            <FontProvider>
              <ColorAwareProvider>
                <PlayerProvider>
                  <RootStack />
                  <Toast />
                </PlayerProvider>
              </ColorAwareProvider>
            </FontProvider>
          </ThemeProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
