import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
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
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title={t('timer.title')} showSettings={false} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="px-4 py-4 gap-6">
          {/* Active Timer */}
          {timer.active && remaining > 0 && (
            <View
              className="rounded-3xl overflow-hidden p-6 items-center"
              style={{ backgroundColor: colors.surface }}
            >
              <Moon size={40} color={colors.accent} />
              <Text
                className="text-3xl font-bold mt-4"
                style={{ color: colors.text }}
              >
                {formatRemaining(remaining)}
              </Text>
              <Text
                className="text-sm mt-2"
                style={{ color: colors.textMuted }}
              >
                Timer ends at{" "}
                {new Date(timer.endTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Pressable
                onPress={timer.cancel}
                className="mt-4 px-8 py-3 rounded-full"
                style={{ backgroundColor: colors.card }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.accent }}
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
              className="rounded-3xl overflow-hidden"
              style={{ backgroundColor: colors.surface }}
            >
              {SLEEP_TIMER_OPTIONS.map((option, i) => (
                <Pressable
                  key={option.minutes}
                  onPress={() => timer.start(option.minutes)}
                  className="flex-row items-center justify-between p-4"
                  style={{
                    borderBottomWidth:
                      i < SLEEP_TIMER_OPTIONS.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View className="flex-row items-center gap-3">
                    <Clock size={18} color={colors.accent} />
                    <Text
                      className="text-sm font-medium"
                      style={{ color: colors.text }}
                    >
                      {option.label}
                    </Text>
                  </View>
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.card }}
                  >
                    <Text
                      className="text-xs"
                      style={{ color: colors.textMuted }}
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
              className="rounded-3xl overflow-hidden p-4"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text
                    className="text-sm font-medium"
                    style={{ color: colors.text }}
                  >
                    {t('timer.stop.end')}
                  </Text>
                  <Text
                    className="text-xs mt-0.5"
                    style={{ color: colors.textMuted }}
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
                  className="w-14 h-8 rounded-full items-center justify-end px-1"
                  style={{
                    backgroundColor: timer.stopAtEndOfTrack
                      ? colors.accent
                      : colors.card,
                  }}
                >
                  <View
                    className="w-6 h-6 rounded-full"
                    style={{
                      backgroundColor: "#fff",
                      transform: [
                        { translateX: timer.stopAtEndOfTrack ? 0 : -22 },
                      ],
                    }}
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
