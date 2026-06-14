import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s } from '@/styles';
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/hooks/use-translation";
import { TopBar } from "@/components/top-bar";
import { SectionHeader } from "@/components/section-header";
import {
  useSleepTimerStore,
  SLEEP_TIMER_OPTIONS,
} from "@/store/sleep-timer-store";
import { Clock, Moon } from "lucide-react-native";

export default function SleepTimerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const timer = useSleepTimerStore();
  const [remaining, setRemaining] = useState(
    timer.active ? timer.getRemainingMs() : 0,
  );

  useEffect(() => {
    if (!timer.active) return;
    const interval = setInterval(() => {
      const ms = timer.getRemainingMs();
      setRemaining(ms);
      if (ms <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.active, timer.endTime]);

  const formatRemaining = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={t('timer.title')} showSettings={false} />
      <ScrollView
        style={s.flex1}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        <View style={[s.px4, s.py4, s.gap6]}>
          {/* Active Timer */}
          {timer.active && remaining > 0 && (
            <View
              style={[s.rounded3xl, s.overflowHidden, { padding: 24, alignItems: 'center', backgroundColor: colors.surface }]}
            >
              <Moon size={40} color={colors.accent} />
              <Text
                style={[s.text3xl, s.fontBold, s.mt4, { color: colors.text }]}
              >
                {formatRemaining(remaining)}
              </Text>
              <Text
                style={[s.textSm, s.mt2, { color: colors.textMuted }]}
              >
                Timer ends at{" "}
                {new Date(timer.endTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Pressable
                onPress={timer.cancel}
                style={[s.mt4, s.px8, { paddingVertical: 12, borderRadius: 9999, backgroundColor: colors.card }]}
              >
                <Text
                  style={[s.textSm, s.fontSemibold, { color: colors.accent }]}
                >
                  {t('timer.cancel')}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Timer Presets */}
          <View>
            <SectionHeader title={t('timer.set')} />
            <View
              style={[s.rounded3xl, s.overflowHidden, { backgroundColor: colors.surface }]}
            >
              {SLEEP_TIMER_OPTIONS.map((option, i) => (
                <Pressable
                  key={option.minutes}
                  onPress={() => timer.start(option.minutes)}
                  style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.p4, {
                    borderBottomWidth:
                      i < SLEEP_TIMER_OPTIONS.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }]}
                >
                  <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                    <Clock size={18} color={colors.accent} />
                    <Text
                      style={[s.textSm, s.fontMedium, { color: colors.text }]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  <View
                    style={[{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card }]}
                  >
                    <Text
                      style={[s.textXs, { color: colors.textMuted }]}
                    >
                      +
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Stop at end of track */}
          <View>
            <SectionHeader title={t('timer.options')} />
            <View
              style={[s.rounded3xl, s.overflowHidden, s.p4, { backgroundColor: colors.surface }]}
            >
              <View style={[s.flexRow, s.itemsCenter, s.justifyBetween]}>
                <View style={s.flex1}>
                  <Text
                    style={[s.textSm, s.fontMedium, { color: colors.text }]}
                  >
                    {t('timer.stop.end')}
                  </Text>
                  <Text
                    style={[s.textXs, s.mt05, { color: colors.textMuted }]}
                  >
                    {t('timer.stop.end.desc')}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (timer.active) {
                      timer.start(timer.totalMinutes, !timer.stopAtEndOfTrack);
                    } else {
                      timer.start(60, !timer.stopAtEndOfTrack);
                    }
                  }}
                  style={[{ width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 4, backgroundColor: timer.stopAtEndOfTrack ? colors.accent : colors.card }]}
                >
                  <View
                    style={[{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", transform: [{ translateX: timer.stopAtEndOfTrack ? 0 : -22 }] }]}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
