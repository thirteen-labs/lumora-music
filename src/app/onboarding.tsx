import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Animated,
  Dimensions,
  StyleSheet,
  type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Check, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-translation';
import { useOnboardingStore } from '@/store/onboarding-store';
import { initializeNotifications } from '@/services/notifications';
import type { TranslationKey } from '@/i18n/translations';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface OnboardingPage {
  image: number;
  eyebrow: TranslationKey;
  title: TranslationKey;
  subtitle: TranslationKey;
}

const PAGES: OnboardingPage[] = [
  {
    image: require('../../assets/onboarding/headphones.jpg'),
    eyebrow: 'onboarding.page1.eyebrow',
    title: 'onboarding.page1.title',
    subtitle: 'onboarding.page1.subtitle',
  },
  {
    image: require('../../assets/onboarding/listen.jpg'),
    eyebrow: 'onboarding.page2.eyebrow',
    title: 'onboarding.page2.title',
    subtitle: 'onboarding.page2.subtitle',
  },
  {
    image: require('../../assets/onboarding/play.jpg'),
    eyebrow: 'onboarding.page3.eyebrow',
    title: 'onboarding.page3.title',
    subtitle: 'onboarding.page3.subtitle',
  },
  {
    image: require('../../assets/onboarding/relax.jpg'),
    eyebrow: 'onboarding.page4.eyebrow',
    title: 'onboarding.page4.title',
    subtitle: 'onboarding.page4.subtitle',
  },
];

const DOT_SIZE = 8;
const DOT_GAP = 10;

const GRADIENT_STEPS = [0, 0.18, 0.36, 0.54, 0.72, 0.88, 1];

function FauxGradient({ height }: { height: number }) {
  return (
    <View
      style={[StyleSheet.absoluteFillObject, { height, justifyContent: 'flex-end' }]}
      pointerEvents="none"
    >
      {GRADIENT_STEPS.map((t) => (
        <View
          key={t}
          style={{ flex: 1, backgroundColor: `rgba(8, 10, 22, ${(t * t) * 0.94})` }}
        />
      ))}
    </View>
  );
}

function AnimatedBlock({ children, key }: { children: ReactNode; key?: any }) {
  const fade = useMemo(() => new Animated.Value(0), []);
  const slide = useMemo(() => new Animated.Value(26), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      {children}
    </Animated.View>
  );
}

function Dots({ count, index, accent }: { count: number; index: number; accent: string }) {
  const [anim] = useState(() => new Animated.Value(index));

  useEffect(() => {
    Animated.spring(anim, {
      toValue: index,
      useNativeDriver: false,
      damping: 18,
      stiffness: 210,
    }).start();
  }, [index, anim]);

  const totalWidth = count * DOT_SIZE + (count - 1) * DOT_GAP;

  return (
    <View style={{ width: totalWidth, height: DOT_SIZE, flexDirection: 'row' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            {
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              backgroundColor: 'rgba(255,255,255,0.28)',
            },
            i < count - 1 && { marginRight: DOT_GAP },
          ]}
        />
      ))}
      <Animated.View
        style={[
          styles.activeDot,
          {
            backgroundColor: accent,
            left: anim.interpolate({
              inputRange: [0, count - 1],
              outputRange: [0, totalWidth - DOT_SIZE],
              extrapolate: 'clamp',
            }),
          },
        ]}
      />
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const listRef = useRef<FlatList<OnboardingPage>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === PAGES.length - 1;
  const page = PAGES[index];

  const finish = () => {
    completeOnboarding();
    router.replace('/(tabs)');
    /* Request notification permission after onboarding — non-blocking */
    initializeNotifications().catch(() => {});
  };

  const goToNext = () => {
    if (isLast) {
      finish();
      return;
    }
    listRef.current?.scrollToOffset({ offset: (index + 1) * SCREEN_W, animated: true });
  };

  const onMomentumEnd = (e: NativeScrollEvent) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setIndex(Math.max(0, Math.min(PAGES.length - 1, next)));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View style={[styles.page, { width: SCREEN_W }]}>
            <Image
              source={item.image}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={350}
            />
          </View>
        )}
      />

      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={styles.scrim} />
        <FauxGradient height={SCREEN_H * 0.52} />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.brand}>
          <Sparkles size={16} color="#fff" strokeWidth={2.2} />
          <Text style={styles.brandText}>Lumora</Text>
        </View>
        <Pressable onPress={finish} hitSlop={12} style={styles.skipButton}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </Pressable>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 30 }]}>
        <AnimatedBlock key={index}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{t(page.eyebrow)}</Text>
          <Text style={styles.title}>{t(page.title)}</Text>
          <Text style={styles.subtitle}>{t(page.subtitle)}</Text>
        </AnimatedBlock>

        <View style={styles.controls}>
          <Dots count={PAGES.length} index={index} accent={colors.accent} />
          <Pressable
            onPress={goToNext}
            style={[styles.cta, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.ctaText}>
              {isLast ? t('onboarding.get.started') : t('onboarding.next')}
            </Text>
            {isLast ? (
              <Check size={18} color="#fff" strokeWidth={3} />
            ) : (
              <ArrowRight size={18} color="#fff" strokeWidth={2.6} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,10,22,0.30)' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.4 },
  skipButton: { paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 14,
    textAlign: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 31,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 39,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 25,
    marginTop: 12,
    maxWidth: 330,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  controls: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 30,
    gap: 20,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    alignSelf: 'stretch',
    borderRadius: 28,
    paddingVertical: 17,
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  activeDot: {
    position: 'absolute',
    top: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 3,
  },
});
