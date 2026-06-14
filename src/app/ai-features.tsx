import { View, Text } from 'react-native';
import { s } from '@/styles';
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
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="AI Features" showSettings={false} />
      <View style={[s.flex1, s.itemsCenter, s.justifyCenter, s.px8]}>
        <View style={[s.roundedFull, { padding: 24, marginBottom: 24, backgroundColor: colors.surface }]}>
          <Brain size={48} color={colors.accent} />
        </View>
        <Text style={[s.text2xl, s.fontBold, s.textCenter, { color: colors.text }]}>
          AI-Powered Features
        </Text>
        <Text style={[s.textSm, s.textCenter, s.mt3, { color: colors.textMuted, lineHeight: 24 }]}>
          Intelligent features powered by machine learning to enhance your music experience.
        </Text>

        <View style={[s.wFull, s.mt6, s.gap3]}>
          {features.map((feature) => (
            <View key={feature.title} style={[s.rounded3xl, s.p4, { backgroundColor: colors.surface }]}>
              <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb2]}>
                <feature.icon size={18} color={colors.accent} />
                <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>{feature.title}</Text>
              </View>
              <Text style={[s.textXs, { color: colors.textMuted, lineHeight: 20 }]}>{feature.description}</Text>
            </View>
          ))}
        </View>

        <View style={[s.rounded3xl, s.p5, s.mt6, s.wFull, { backgroundColor: colors.surface }]}>
          <View style={[s.flexRow, s.itemsCenter, s.gap3, s.mb3]}>
            <Lock size={16} color={colors.accent} />
            <Text style={[s.textSm, s.fontSemibold, { color: colors.text }]}>Coming Soon</Text>
          </View>
          <Text style={[s.textXs, { color: colors.textMuted, lineHeight: 20 }]}>
            AI features require cloud processing and will be available in a future update. All processing will be privacy-first with on-device options where possible.
          </Text>
        </View>
      </View>
    </View>
  );
}
