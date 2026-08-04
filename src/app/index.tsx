import { Redirect } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding-store';

export default function Index() {
  const completed = useOnboardingStore((s) => s.completed);

  if (completed) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/onboarding" />;
}
