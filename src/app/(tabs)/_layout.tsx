import { Tabs } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Music, Video, Heart, Settings, Home, Folder } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.surface,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          position: 'absolute',
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint={Platform.OS === 'ios' ? 'systemChromeMaterial' : 'dark'}
            blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: Platform.OS === 'android' ? colors.surface + 'CC' : undefined,
            }}
          />
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="music"
        options={{
          title: 'Music',
          tabBarIcon: ({ color, size }) => <Music size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="videos"
        options={{
          title: 'Videos',
          tabBarIcon: ({ color, size }) => <Video size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="files"
        options={{
          title: 'Files',
          tabBarIcon: ({ color, size }) => <Folder size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
