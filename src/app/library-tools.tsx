import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { s } from "@/styles";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/hooks/use-translation";
import { TopBar } from "@/components/top-bar";
import { SectionHeader } from "@/components/section-header";
import { reportWarning } from "@/utils/error-handler";
import {
  findDuplicateSongs,
  findNewSongs,
  getKnownFiles,
  findNewFiles,
  findRemovedFiles,
  getScanHistory,
  updateKnownFiles,
  keepBestAndRemoveDuplicates,
} from "@/scanner/enhanced-scanner";
import { useMusicStore } from "@/store/music-store";
import { deleteFiles } from "@/services/file-operations";
import {
  TriangleAlert,
  CircleCheck,
  Music,
  Trash2,
  Search,
  RefreshCw,
  Check,
  Clock,
  ScanLine,
} from "lucide-react-native";
import {
  isBackgroundScanEnabled,
  setBackgroundScanEnabled,
  getScanInterval,
  setScanInterval,
  getLastBackgroundScanTime,
  isBackgroundScanRegistered,
} from "@/services/background-scanner";
import { useState, useCallback, useEffect, useMemo } from "react";

export default function LibraryToolsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const songs = useMusicStore((s) => s.songs);
  const [missingCount, setMissingCount] = useState<number | null>(null);
  const [scanInfo, setScanInfo] = useState<{
    newFiles: number;
    removedFiles: number;
  } | null>(null);
  const [removingGroups, setRemovingGroups] = useState<Set<number>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  // Background scanning state
  const [bgScanEnabled, setBgScanEnabled] = useState(isBackgroundScanEnabled);
  const [bgScanInterval, setBgScanInterval] = useState(getScanInterval);
  const [bgScanRegistered, setBgScanRegistered] = useState(false);
  const [lastBgScan, setLastBgScan] = useState(getLastBackgroundScanTime);

  useEffect(() => {
    isBackgroundScanRegistered().then(setBgScanRegistered).catch((e) => reportWarning('LibraryTools', e, 'Failed to check background scan registration'));
  }, [bgScanEnabled]);

  const INTERVAL_OPTIONS = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '3 hours', value: 180 },
    { label: '6 hours', value: 360 },
    { label: '12 hours', value: 720 },
  ];

  const handleToggleBgScan = (value: boolean) => {
    setBgScanEnabled(value);
    setBackgroundScanEnabled(value);
    if (value) {
      isBackgroundScanRegistered().then(setBgScanRegistered).catch((e) => reportWarning('LibraryTools', e, 'Failed to check background scan registration'));
    } else {
      setBgScanRegistered(false);
    }
  };

  const handleSetInterval = (minutes: number) => {
    setBgScanInterval(minutes);
    setScanInterval(minutes);
  };

  const formatLastScan = (ts: number) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return d.toLocaleDateString() + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const duplicates = useMemo(() => findDuplicateSongs(songs), [songs]);
  const scanHistory = useMemo(() => getScanHistory(), []);

  const handleKeepBest = useCallback(
    async (groupIndex: number) => {
      const group = duplicates[groupIndex];
      if (!group) return;
      setRemovingGroups((prev) => new Set(prev).add(groupIndex));
      try {
        const { kept, removed } = keepBestAndRemoveDuplicates(group);
        await deleteFiles(removed.map((s) => s.uri));
        Alert.alert(
          "Done",
          `Kept "${kept.title}" and removed ${removed.length} duplicate(s).`,
        );
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Failed to delete duplicates");
      } finally {
        setRemovingGroups((prev) => {
          const next = new Set(prev);
          next.delete(groupIndex);
          return next;
        });
      }
    },
    [duplicates],
  );

  const handleDeleteAllDuplicates = useCallback(() => {
    Alert.alert(
      "Delete All Duplicates",
      `This will keep the best copy of each group and delete ${duplicates.reduce((sum, g) => sum + g.duplicates.length, 0)} duplicate file(s). Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            setBatchDeleting(true);
            let deleted = 0;
            let errors = 0;
            for (const group of duplicates) {
              const { removed } = keepBestAndRemoveDuplicates(group);
              const result = await deleteFiles(removed.map((s) => s.uri));
              if (result.success) deleted += removed.length;
              else errors += removed.length;
            }
            setBatchDeleting(false);
            Alert.alert(
              "Complete",
              `Deleted ${deleted} duplicate(s).${errors > 0 ? ` ${errors} failed.` : ""}`,
            );
          },
        },
      ],
    );
  }, [duplicates]);

  const checkMissingFiles = () => {
    const knownUris = new Set(Object.keys(getKnownFiles()));
    const missing = findNewSongs(songs, knownUris);
    setMissingCount(missing.length);
    Alert.alert(
      t("tools.missing"),
      missing.length > 0
        ? t("tools.missing.found", { count: missing.length })
        : t("tools.missing.none"),
    );
  };

  const checkIncrementalScan = () => {
    const currentUris = songs.map((s) => s.uri);
    const newFiles = findNewFiles(currentUris);
    const removedFiles = findRemovedFiles(currentUris);
    setScanInfo({
      newFiles: newFiles.length,
      removedFiles: removedFiles.length,
    });
    Alert.alert(
      t("tools.incremental"),
      t("tools.changes", {
        newFiles: newFiles.length,
        removedFiles: removedFiles.length,
      }),
    );
  };

  const updateScanIndex = () => {
    updateKnownFiles(songs);
    Alert.alert(t("common.ok"), "Scan index updated with current library.");
  };

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title={t("tools.title")} showSettings={false} />
      <ScrollView
        style={s.flex1}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        <View style={[s.px4, s.py4, s.gap6]}>
          {/* Library Health */}
          <View>
            <SectionHeader title={t("tools.health")} />
            <View
              style={[
                s.rounded3xl,
                s.overflowHidden,
                s.p4,
                s.gap3,
                { backgroundColor: colors.surface },
              ]}
            >
              <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                <CircleCheck size={20} color={colors.success} />
                <View style={s.flex1}>
                  <Text
                    style={[s.textSm, s.fontMedium, { color: colors.text }]}
                  >
                    {t("tools.total.songs")}
                  </Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>
                    {t("tools.tracks.in.library", { count: songs.length })}
                  </Text>
                </View>
              </View>
              <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                <TriangleAlert
                  size={20}
                  color={duplicates.length > 0 ? "#F59E0B" : colors.success}
                />
                <View style={s.flex1}>
                  <Text
                    style={[s.textSm, s.fontMedium, { color: colors.text }]}
                  >
                    Duplicate Detection
                  </Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>
                    {duplicates.length > 0
                      ? t("tools.duplicates.found", {
                          count: duplicates.length,
                        })
                      : t("tools.no.duplicates")}
                  </Text>
                </View>
              </View>
              {scanHistory.lastFullScan > 0 && (
                <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                  <RefreshCw size={20} color={colors.accent} />
                  <View style={s.flex1}>
                    <Text
                      style={[s.textSm, s.fontMedium, { color: colors.text }]}
                    >
                      Last Scan
                    </Text>
                    <Text style={[s.textXs, { color: colors.textMuted }]}>
                      {new Date(scanHistory.lastFullScan).toLocaleDateString()}{" "}
                      · {scanHistory.fileCount} files indexed
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Duplicates */}
          {duplicates.length > 0 && (
            <View>
              <SectionHeader title={t("tools.duplicates")} />
              <View
                style={[
                  s.rounded3xl,
                  s.overflowHidden,
                  s.mb3,
                  { backgroundColor: colors.surface },
                ]}
              >
                {duplicates.slice(0, 20).map((group, i) => (
                  <View
                    key={i}
                      style={[
                        s.p4,
                      ]}
                  >
                    <View style={[s.flexRow, s.itemsCenter, s.gap2, s.mb2]}>
                      <Music size={14} color={colors.accent} />
                      <Text
                        style={[
                          s.textSm,
                          s.fontMedium,
                          s.flex1,
                          { color: colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {group.song.title}
                      </Text>
                      <Text style={[s.textXs, { color: colors.textMuted }]}>
                        {t("tools.copy", {
                          count: group.duplicates.length + 1,
                        })}
                      </Text>
                    </View>
                    <Text
                      style={[s.textXs, { color: colors.textMuted }, s.mb2]}
                    >
                      by {group.song.artist} · {group.song.album}
                    </Text>
                    <Pressable
                      onPress={() => handleKeepBest(i)}
                      disabled={removingGroups.has(i)}
                      style={[
                        s.flexRow,
                        s.itemsCenter,
                        s.justifyCenter,
                        s.gap2,
                        {
                          paddingVertical: 8,
                          borderRadius: 12,
                          backgroundColor: colors.accent + "20",
                        },
                      ]}
                    >
                      {removingGroups.has(i) ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <>
                          <Check size={14} color={colors.accent} />
                          <Text
                            style={[
                              s.textXs,
                              s.fontSemibold,
                              { color: colors.accent },
                            ]}
                          >
                            Keep Best & Delete Others
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
              <Pressable
                onPress={handleDeleteAllDuplicates}
                disabled={batchDeleting}
                style={[
                  s.flexRow,
                  s.itemsCenter,
                  s.justifyCenter,
                  s.gap2,
                  {
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: colors.accent,
                  },
                ]}
              >
                {batchDeleting ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <>
                    <Trash2 size={16} color={colors.background} />
                    <Text
                      style={[
                        s.textSm,
                        s.fontSemibold,
                        { color: colors.background },
                      ]}
                    >
                      Delete All Duplicates (
                      {duplicates.reduce(
                        (sum, g) => sum + g.duplicates.length,
                        0,
                      )}{" "}
                      files)
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* Missing Files */}
          <View>
            <SectionHeader title={t("tools.missing")} />
            <View
              style={[
                s.rounded3xl,
                s.p4,
                s.gap3,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[s.textSm, { color: colors.text }]}>
                {t("tools.missing.desc")}
              </Text>
              <Pressable
                onPress={checkMissingFiles}
                style={[
                  s.flexRow,
                  s.itemsCenter,
                  s.justifyCenter,
                  s.gap2,
                  {
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: colors.accent,
                  },
                ]}
              >
                <Trash2 size={16} color={colors.background} />
                <Text
                  style={[
                    s.textSm,
                    s.fontSemibold,
                    { color: colors.background },
                  ]}
                >
                  {t("tools.missing.check")}
                </Text>
              </Pressable>
              {missingCount !== null && (
                <Text
                  style={[s.textXs, s.textCenter, { color: colors.textMuted }]}
                >
                  {missingCount > 0
                    ? t("tools.missing.found", { count: missingCount })
                    : t("tools.missing.none")}
                </Text>
              )}
            </View>
          </View>

          {/* Incremental Scan */}
          <View>
            <SectionHeader title={t("tools.incremental")} />
            <View
              style={[
                s.rounded3xl,
                s.p4,
                s.gap3,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[s.textSm, { color: colors.text }]}>
                {t("tools.incremental.desc")}
              </Text>
              <View style={[s.flexRow, s.gap2]}>
                <Pressable
                  onPress={checkIncrementalScan}
                  style={[
                    s.flex1,
                    s.flexRow,
                    s.itemsCenter,
                    s.justifyCenter,
                    s.gap2,
                    {
                      paddingVertical: 12,
                      borderRadius: 16,
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <Search size={16} color={colors.accent} />
                  <Text
                    style={[s.textSm, s.fontSemibold, { color: colors.text }]}
                  >
                    {t("tools.check.changes")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={updateScanIndex}
                  style={[
                    s.flex1,
                    s.flexRow,
                    s.itemsCenter,
                    s.justifyCenter,
                    s.gap2,
                    {
                      paddingVertical: 12,
                      borderRadius: 16,
                      backgroundColor: colors.accent,
                    },
                  ]}
                >
                  <RefreshCw size={16} color={colors.background} />
                  <Text
                    style={[
                      s.textSm,
                      s.fontSemibold,
                      { color: colors.background },
                    ]}
                  >
                    {t("tools.update.index")}
                  </Text>
                </Pressable>
              </View>
              {scanInfo !== null && (
                <Text
                  style={[s.textXs, s.textCenter, { color: colors.textMuted }]}
                >
                  {t("tools.changes", {
                    newFiles: scanInfo.newFiles,
                    removedFiles: scanInfo.removedFiles,
                  })}
                </Text>
              )}
            </View>
          </View>
          {/* Background Scanning */}
          <View>
            <SectionHeader title="Background Scanning" />
            <View
              style={[
                s.rounded3xl,
                s.p4,
                s.gap4,
                { backgroundColor: colors.surface },
              ]}
            >
              {/* Enable toggle row */}
              <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                <View
                  style={[
                    s.w10,
                    s.h10,
                    s.roundedXl,
                    s.itemsCenter,
                    s.justifyCenter,
                    { backgroundColor: colors.accent + '18' },
                  ]}
                >
                  <ScanLine size={20} color={colors.accent} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>
                    Auto-scan in background
                  </Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>
                    {bgScanEnabled
                      ? bgScanRegistered
                        ? 'Active — scanning periodically'
                        : 'Enabled — registering…'
                      : 'Disabled'}
                  </Text>
                </View>
                <Switch
                  value={bgScanEnabled}
                  onValueChange={handleToggleBgScan}
                  trackColor={{ false: colors.border, true: colors.accent + '80' }}
                  thumbColor={bgScanEnabled ? colors.accent : colors.textMuted}
                />
              </View>

              {/* Last scan time */}
              <View style={[s.flexRow, s.itemsCenter, s.gap3]}>
                <View
                  style={[
                    s.w10,
                    s.h10,
                    s.roundedXl,
                    s.itemsCenter,
                    s.justifyCenter,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Clock size={18} color={colors.textMuted} />
                </View>
                <View style={s.flex1}>
                  <Text style={[s.textSm, s.fontMedium, { color: colors.text }]}>Last background scan</Text>
                  <Text style={[s.textXs, { color: colors.textMuted }]}>
                    {formatLastScan(lastBgScan)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setLastBgScan(getLastBackgroundScanTime())}
                  hitSlop={8}
                >
                  <RefreshCw size={16} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Interval picker */}
              <View>
                <Text style={[s.textXs, s.fontMedium, s.mb2, { color: colors.textMuted }]}>
                  SCAN INTERVAL
                </Text>
                <View style={[s.flexRow, { flexWrap: 'wrap', gap: 8 }]}>
                  {INTERVAL_OPTIONS.map((opt) => {
                    const active = bgScanInterval === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => handleSetInterval(opt.value)}
                        style={[
                          {
                            paddingHorizontal: 14,
                            paddingVertical: 7,
                            borderRadius: 20,
                            backgroundColor: active ? colors.accent : colors.card,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.textXs,
                            s.fontSemibold,
                            { color: active ? '#fff' : colors.textMuted },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[s.textXs, s.mt2, { color: colors.textMuted }]}>
                  Note: Android may enforce a minimum interval (~15 min).
                </Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
