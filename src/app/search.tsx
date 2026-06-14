import { View, Text, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from "@shopify/flash-list";
import { useTheme } from "@/hooks/use-theme";
import { useMusicStore } from "@/store/music-store";
import { useVideoStore } from "@/store/video-store";
import { usePlayerStore } from "@/store/player-store";
import { TopBar } from "@/components/top-bar";
import { Search, X, Clock } from "lucide-react-native";
import { Artwork } from "@/components/artwork";
import { useState, useMemo, useCallback, useEffect } from "react";
import { formatDuration } from "@/utils/cn";
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
  } catch {}
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { songs, albums, artists, genres } = useMusicStore();
  const { videos } = useVideoStore();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
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

  const results = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q)
      return { songs: [], videos: [], albums: [], artists: [], genres: [] };
    const matchedSongs = fuzzySearch(songs, q, (s) => [
      s.title,
      s.artist,
      s.album,
    ]);
    const matchedVideos = fuzzySearch(videos, q, (v) => [v.title]);
    const matchedAlbums = fuzzySearch(albums, q, (a) => [
      a.title,
      a.artist,
    ]);
    const matchedArtists = fuzzySearch(artists, q, (a) => [a.name]);
    const matchedGenres = fuzzySearch(genres, q, (g) => [g.name]);
    return {
      songs: matchedSongs.map((r) => r.item),
      videos: matchedVideos.map((r) => r.item),
      albums: matchedAlbums.map((r) => r.item),
      artists: matchedArtists.map((r) => r.item),
      genres: matchedGenres.map((r) => r.item),
    };
  }, [debouncedQuery, songs, videos, albums, artists, genres]);

  const totalResults =
    results.songs.length +
    results.videos.length +
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
        type: "video";
        id: string;
        title: string;
        subtitle: string;
        artwork: null;
        thumbnail: string | null;
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
    ...results.videos.map((v) => ({
      type: "video" as const,
      id: v.id,
      title: v.title,
      subtitle: formatDuration(v.duration),
      artwork: null,
      thumbnail: v.thumbnail,
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
            onChangeText={(text) => {
              setQuery(text);
              if (text.trim()) addRecent(text);
            }}
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
                  style={[s.flexRow, s.itemsCenter, s.gap3, s.py3, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
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
                } else if (item.type === "video") {
                  const video = videos.find((v) => v.id === item.id);
                  if (video) {
                    router.push({
                      pathname: "/video-player",
                      params: { uri: video.uri, title: video.title },
                    });
                  }
                }
              }}
              style={[s.flexRow, s.itemsCenter, s.gap3, s.px4, s.py3, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              <Artwork
                uri={item.artwork ?? item.thumbnail}
                size={40}
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
