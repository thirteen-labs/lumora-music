import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from "@shopify/flash-list";
import { useTheme } from "@/hooks/use-theme";
import { useMusicStore } from "@/store/music-store";
import { useHiddenFilesStore } from "@/store/hidden-files-store";
import { usePlayerStore } from "@/store/player-store";
import { TopBar } from "@/components/top-bar";
import { Search, X, Clock, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react-native";
import { Artwork } from "@/components/artwork";
import { useState, useMemo, useCallback, useEffect } from "react";
import { fuzzySearch } from "@/utils/fuzzy";
import { useRouter, useFocusEffect } from "expo-router";
import { storage } from "@/services/mmkv";
import { s } from "@/styles";

const RECENT_KEY = "lumora-recent-searches";
const MAX_RECENT = 10;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function loadRecent(): string[] {
  try {
    const raw = storage.getString(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(items: string[]): void {
  try {
    storage.set(RECENT_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('[Search] Failed to save recent searches:', e);
  }
}

function FilterChip({ label, selected, onPress, colors }: { label: string; selected: boolean; onPress: () => void; colors: any }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.px3, s.py1, s.roundedFull, { marginRight: 4, backgroundColor: selected ? colors.accent + '30' : colors.card }]}
    >
      <Text style={[s.textXs, s.fontMedium, { color: selected ? colors.accent : colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const songs = useMusicStore((s) => s.songs);
  const hiddenSongIds = useHiddenFilesStore((s) => s.hiddenSongIds);
  const albums = useMusicStore((s) => s.albums);
  const artists = useMusicStore((s) => s.artists);
  const genres = useMusicStore((s) => s.genres);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterYear, setFilterYear] = useState<string | null>(null);
  const [filterGenre, setFilterGenre] = useState<string | null>(null);
  const [filterExt, setFilterExt] = useState<string | null>(null);
  const [minDuration, setMinDuration] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const allGenres = useMemo(() => [...new Set(genres.map((g) => g.name))].sort(), [genres]);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      setRecentSearches(loadRecent());
    }, [])
  );

  const addRecent = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((r) => r !== trimmed)].slice(0, MAX_RECENT);
      saveRecent(updated);
      return updated;
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    saveRecent([]);
  };

  const selectRecent = (term: string) => {
    setQuery(term);
    addRecent(term);
  };

  const activeFilters: string[] = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return [];
    const filters: string[] = [];
    const tokens = q.split(/\s+/);
    for (const token of tokens) {
      if (token.startsWith('year:')) filters.push(token);
      else if (token.startsWith('genre:')) filters.push(token);
      else if (token.startsWith('ext:')) filters.push(token);
    }
    return filters;
  }, [debouncedQuery]);

  const results = useMemo(() => {
    let q = debouncedQuery.trim();
    if (!q && !filterYear && !filterGenre && !filterExt && !minDuration && !maxDuration)
      return { songs: [], albums: [], artists: [], genres: [] };

    let yearFilter: string | null = filterYear;
    let genreFilter: string | null = filterGenre;
    let extFilter: string | null = filterExt;

    const tokens = q.toLowerCase().split(/\s+/);
    const cleanedTokens = [];
    for (const token of tokens) {
      if (token.startsWith('year:')) {
        yearFilter = token.substring(5);
      } else if (token.startsWith('genre:')) {
        genreFilter = token.substring(6);
      } else if (token.startsWith('ext:')) {
        extFilter = token.substring(4);
      } else {
        cleanedTokens.push(token);
      }
    }

    const baseQuery = cleanedTokens.join(' ').trim();
    const minDur = minDuration ? Number(minDuration) : 0;
    const maxDur = maxDuration ? Number(maxDuration) : Infinity;

    let filteredSongs = songs.filter((s) => !hiddenSongIds.has(s.id));

    if (yearFilter || genreFilter || extFilter || minDur > 0 || maxDur < Infinity) {
      filteredSongs = songs.filter((s) => {
        let match = true;
        if (yearFilter) {
          const year = s.dateAdded ? new Date(s.dateAdded).getFullYear().toString() : '';
          if (year !== yearFilter) match = false;
        }
        if (genreFilter && s.genre?.toLowerCase() !== genreFilter.toLowerCase()) match = false;
        if (extFilter) {
          const ext = s.uri ? s.uri.split('.').pop()?.toLowerCase() || '' : '';
          if (ext !== extFilter) match = false;
        }
        if (minDur > 0 && s.duration < minDur) match = false;
        if (maxDur < Infinity && s.duration > maxDur) match = false;
        return match;
      });
    }

    const getSongFields = (s: any) => {
      const year = s.dateAdded ? new Date(s.dateAdded).getFullYear().toString() : '';
      const ext = s.uri ? s.uri.split('.').pop() || '' : '';
      return [s.title, s.artist, s.album, s.genre || '', year, ext];
    };

    if (!baseQuery && (yearFilter || genreFilter || extFilter)) {
      return {
        songs: filteredSongs,
        albums: genreFilter || extFilter ? [] : albums,
        artists: genreFilter || extFilter ? [] : artists,
        genres: yearFilter || extFilter ? [] : genres,
      };
    }

    const matchedSongs = fuzzySearch(filteredSongs, baseQuery || q, getSongFields);
    const matchedAlbums = fuzzySearch(albums, baseQuery || q, (a) => [
      a.title,
      a.artist,
    ]);
    const matchedArtists = fuzzySearch(artists, baseQuery || q, (a) => [a.name]);
    const matchedGenres = fuzzySearch(genres, baseQuery || q, (g) => [g.name]);
    return {
      songs: matchedSongs.map((r) => r.item),
      albums: matchedAlbums.map((r) => r.item),
      artists: matchedArtists.map((r) => r.item),
      genres: matchedGenres.map((r) => r.item),
    };
  }, [debouncedQuery, filterYear, filterGenre, filterExt, minDuration, maxDuration, songs, albums, artists, genres, hiddenSongIds]);

  const totalResults =
    results.songs.length +
    results.albums.length +
    results.artists.length +
    results.genres.length;

  type ResultItem =
    | {
        type: "song";
        id: string;
        title: string;
        subtitle: string;
        artwork: string | null;
        thumbnail: null;
      }
    | {
        type: "album";
        id: string;
        title: string;
        subtitle: string;
        artwork: string | null;
        thumbnail: null;
      }
    | {
        type: "artist";
        id: string;
        title: string;
        subtitle: string;
        artwork: string | null;
        thumbnail: null;
      }
    | {
        type: "genre";
        id: string;
        title: string;
        subtitle: string;
        artwork: null;
        thumbnail: null;
      };

  const items: ResultItem[] = useMemo(() => [
    ...results.albums.map((a) => ({
      type: "album" as const,
      id: a.id,
      title: a.title,
      subtitle: `${a.artist} · ${a.songCount} songs`,
      artwork: a.artwork,
      thumbnail: null,
    })),
    ...results.artists.map((a) => ({
      type: "artist" as const,
      id: a.id,
      title: a.name,
      subtitle: `${a.songCount} songs`,
      artwork: a.artwork,
      thumbnail: null,
    })),
    ...results.genres.map((g) => ({
      type: "genre" as const,
      id: g.id,
      title: g.name,
      subtitle: `${g.songCount} songs`,
      artwork: null,
      thumbnail: null,
    })),
    ...results.songs.map((s) => ({
      type: "song" as const,
      id: s.id,
      title: s.title,
      subtitle: s.artist,
      artwork: s.artwork,
      thumbnail: null,
    })),
  ], [results]);

  return (
    <View style={[s.flex1, { backgroundColor: colors.background }]}>
      <TopBar title="Search Files" showSearch={false} />
      <View style={[s.px4, s.pt3, s.pb1]}>
        <View
          style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py3, s.rounded3xl, { backgroundColor: colors.surface }]}
        >
          <Search size={20} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => { if (query.trim()) addRecent(query); }}
            placeholder="Search files..."
            placeholderTextColor={colors.textMuted}
            style={[s.flex1, s.textBase, { color: colors.text }]}
            returnKeyType="search"
            accessibilityLabel="Search files"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <Pressable
        onPress={() => setShowFilters(!showFilters)}
        style={[s.flexRow, s.itemsCenter, s.gap2, s.px4, s.py2]}
      >
        <SlidersHorizontal size={14} color={colors.textMuted} />
        <Text style={[s.textXs, { color: colors.textMuted }]}>Filters</Text>
        {showFilters ? <ChevronUp size={14} color={colors.textMuted} /> : <ChevronDown size={14} color={colors.textMuted} />}
      </Pressable>

      {showFilters && (
        <View style={[s.px4, s.py2, s.gap3, { backgroundColor: colors.surface, marginHorizontal: 16, borderRadius: 16, marginBottom: 8 }]}>
          <View>
            <Text style={[s.textXs, s.fontSemibold, s.mb1, { color: colors.textMuted }]}>Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.gap1}>
              {Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i)).map((y) => (
                <FilterChip
                  key={y}
                  label={y}
                  selected={filterYear === y}
                  onPress={() => setFilterYear(filterYear === y ? null : y)}
                  colors={colors}
                />
              ))}
            </ScrollView>
          </View>
          <View>
            <Text style={[s.textXs, s.fontSemibold, s.mb1, { color: colors.textMuted }]}>Genre</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.gap1}>
              {allGenres.map((g) => (
                <FilterChip
                  key={g}
                  label={g}
                  selected={filterGenre === g}
                  onPress={() => setFilterGenre(filterGenre === g ? null : g)}
                  colors={colors}
                />
              ))}
            </ScrollView>
          </View>
          <View>
            <Text style={[s.textXs, s.fontSemibold, s.mb1, { color: colors.textMuted }]}>Extension</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.gap1}>
              {['mp3', 'flac', 'wav', 'aac', 'ogg', 'wma', 'm4a', 'mp4', 'mkv', 'avi'].map((ext) => (
                <FilterChip
                  key={ext}
                  label={ext}
                  selected={filterExt === ext}
                  onPress={() => setFilterExt(filterExt === ext ? null : ext)}
                  colors={colors}
                />
              ))}
            </ScrollView>
          </View>
          <View>
            <Text style={[s.textXs, s.fontSemibold, s.mb1, { color: colors.textMuted }]}>Duration (seconds)</Text>
            <View style={[s.flexRow, s.itemsCenter, s.gap2]}>
              <TextInput
                value={minDuration}
                onChangeText={setMinDuration}
                placeholder="Min"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={[s.flex1, s.px3, s.py2, s.roundedXl, { backgroundColor: colors.card, color: colors.text, fontSize: 13 }]}
              />
              <Text style={{ color: colors.textMuted }}>—</Text>
              <TextInput
                value={maxDuration}
                onChangeText={setMaxDuration}
                placeholder="Max"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                style={[s.flex1, s.px3, s.py2, s.roundedXl, { backgroundColor: colors.card, color: colors.text, fontSize: 13 }]}
              />
              <Pressable
                onPress={() => { setMinDuration(''); setMaxDuration(''); }}
                style={[{ padding: 8 }, s.roundedFull, { backgroundColor: colors.card }]}
              >
                <X size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {activeFilters.length > 0 && (
        <View style={[s.flexRow, s.flexWrap, s.gap2, s.px4, s.pb2]}>
          {activeFilters.map((f) => (
            <View
              key={f}
              style={[s.flexRow, s.itemsCenter, s.gap1, s.px2, s.py1, s.roundedFull, { backgroundColor: colors.accent + '25' }]}
            >
              <Text style={[s.text9, s.fontSemibold, { color: colors.accent }]}>{f}</Text>
              <Pressable onPress={() => setQuery(query.replace(new RegExp(`\\b${f}\\s*`), '').trim())}>
                <X size={12} color={colors.accent} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {!query.trim() ? (
        <View style={[s.px4, s.pt2]}>
          {recentSearches.length > 0 && (
            <>
              <View style={[s.flexRow, s.itemsCenter, s.justifyBetween, s.mb2]}>
                <Text style={[s.textXs, s.fontBold, s.uppercase, { letterSpacing: 1, color: colors.textMuted }]}>
                  Recent Searches
                </Text>
                <Pressable onPress={clearRecent}>
                  <Text style={[s.textXs, { color: colors.accent }]}>Clear</Text>
                </Pressable>
              </View>
              {recentSearches.map((term) => (
                <Pressable
                  key={term}
                  onPress={() => selectRecent(term)}
                  style={[s.flexRow, s.itemsCenter, s.gap3, s.py3]}
                >
                  <Clock size={16} color={colors.textMuted} />
                  <Text style={[s.textSm, { color: colors.text }]}>{term}</Text>
                </Pressable>
              ))}
            </>
          )}
          {recentSearches.length === 0 && (
            <View style={[s.itemsCenter, s.py20]}>
              <Search size={40} color={colors.textMuted} />
              <Text style={[s.mt3, { color: colors.textMuted }]}>
                Search your music, videos & files
              </Text>
              <Text style={[s.mt3, s.textXs, s.textCenter, { color: colors.textMuted }]}>
                Pro tip: Use advanced filters like{'\n'}year:2023, genre:rock, or ext:mp3
              </Text>
            </View>
          )}
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          ListHeaderComponent={
            <Text
              style={[s.px4, s.py2, s.textXs, s.fontBold, s.uppercase, { letterSpacing: 1, color: colors.textMuted }]}
            >
              {totalResults} result{totalResults !== 1 ? "s" : ""} found
            </Text>
          }
          renderItem={({ item }: { item: ResultItem }) => (
            <Pressable
              onPress={() => {
                if (item.type === "song") {
                  const song = songs.find((s) => s.id === item.id);
                  if (song) usePlayerStore.getState().play(song, results.songs);
                } else if (item.type === "album") {
                  router.push({
                    pathname: "/music/album/[id]",
                    params: { id: item.id },
                  });
                } else if (item.type === "artist") {
                  router.push({
                    pathname: "/music/artist/[id]",
                    params: { id: item.id },
                  });
                } else if (item.type === "genre") {
                  router.push({
                    pathname: "/music/genre/[id]",
                    params: { id: item.id },
                  });
                }
              }}
              style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py4]}
            >
              <Artwork
                uri={item.artwork}
                size={44}
                borderRadius={16}
                iconSize={18}
                iconColor={colors.accent}
                backgroundColor={colors.surface}
              />
              <View style={[s.flex1]}>
                <View style={[s.flexRow, s.itemsCenter, s.gap2]}>
                  <Text
                    style={[s.textSm, s.fontMedium, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <View
                    style={[s.px15, s.py05, s.roundedXs, { backgroundColor: colors.accent + "20" }]}
                  >
                    <Text
                      style={[s.text9, s.fontSemibold, s.uppercase, { color: colors.accent }]}
                    >
                      {item.type}
                    </Text>
                  </View>
                </View>
                <Text style={[s.textXs, { color: colors.textMuted }]}>
                  {item.subtitle}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={[s.itemsCenter, s.py20]}>
              <Search size={40} color={colors.textMuted} />
              <Text style={[s.mt3, { color: colors.textMuted }]}>
                No results found
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
