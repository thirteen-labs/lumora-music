import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { TopBar } from '@/components/top-bar';
import { Brain, Sparkles, Sparkles as Wand2, Lock } from 'lucide-react-native';

export default function AIFeaturesScreen() {
  const { colors } = useTheme();

  const features = [
    {
      icon: Wand2,
      title: 'Smart Playlist Generator',
      description: 'Type a description like "Chill coding music" and get an auto-generated playlist.',
    },
    {
      icon: Sparkles,
      title: 'Mood Detection',
      description: 'Analyze BPM, energy, and genre to create mood-based playlists for Relax, Workout, Focus, and Sleep.',
    },
    {
      icon: Brain,
      title: 'Natural Language Search',
      description: 'Query with natural language: "Songs I haven\'t played in months", "My longest tracks", "Recently added jazz".',
    },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="AI Features" showSettings={false} />
      <View className="flex-1 items-center justify-center px-8">
        <View className="rounded-full p-6 mb-6" style={{ backgroundColor: colors.surface }}>
          <Brain size={48} color={colors.accent} />
        </View>
        <Text className="text-2xl font-bold text-center" style={{ color: colors.text }}>
          AI-Powered Features
        </Text>
        <Text className="text-sm text-center mt-3 leading-6" style={{ color: colors.textMuted }}>
          Intelligent features powered by machine learning to enhance your music experience.
        </Text>

        <View className="w-full mt-6 gap-3">
          {features.map((feature) => (
            <View key={feature.title} className="rounded-3xl p-4" style={{ backgroundColor: colors.surface }}>
              <View className="flex-row items-center gap-3 mb-2">
                <feature.icon size={18} color={colors.accent} />
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>{feature.title}</Text>
              </View>
              <Text className="text-xs leading-5" style={{ color: colors.textMuted }}>{feature.description}</Text>
            </View>
          ))}
        </View>

        <View className="rounded-3xl p-5 mt-6 w-full" style={{ backgroundColor: colors.surface }}>
          <View className="flex-row items-center gap-3 mb-3">
            <Lock size={16} color={colors.accent} />
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>Coming Soon</Text>
          </View>
          <Text className="text-xs leading-5" style={{ color: colors.textMuted }}>
            AI features require cloud processing and will be available in a future update. All processing will be privacy-first with on-device options where possible.
          </Text>
        </View>
      </View>
    </View>
  );
}
