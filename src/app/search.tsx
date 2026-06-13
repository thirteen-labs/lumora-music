import { View, Text, TextInput, FlatList, Pressable } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useMusicStore } from "@/store/music-store";
import { useVideoStore } from "@/store/video-store";
import { usePlayerStore } from "@/store/player-store";
import { TopBar } from "@/components/top-bar";
import { Search, X, Clock } from "lucide-react-native";
import { Artwork } from "@/components/artwork";
import { useState, useMemo, useCallback } from "react";
import { formatDuration } from "@/utils/cn";
import { fuzzySearch } from "@/utils/fuzzy";
import { useRouter, useFocusEffect } from "expo-router";
import { storage } from "@/services/mmkv";

const RECENT_KEY = "lumora-recent-searches";
const MAX_RECENT = 10;

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
  const { songs, albums, artists, genres } = useMusicStore();
  const { videos } = useVideoStore();
  const [query, setQuery] = useState("");
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
    const updated = [trimmed, ...recentSearches.filter((r) => r !== trimmed)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    saveRecent(updated);
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
    if (!query.trim())
      return { songs: [], videos: [], albums: [], artists: [], genres: [] };
    const matchedSongs = fuzzySearch(songs, query, (s) => [
      s.title,
      s.artist,
      s.album,
    ]);
    const matchedVideos = fuzzySearch(videos, query, (v) => [v.title]);
    const matchedAlbums = fuzzySearch(albums, query, (a) => [
      a.title,
      a.artist,
    ]);
    const matchedArtists = fuzzySearch(artists, query, (a) => [a.name]);
    const matchedGenres = fuzzySearch(genres, query, (g) => [g.name]);
    return {
      songs: matchedSongs.map((r) => r.item),
      videos: matchedVideos.map((r) => r.item),
      albums: matchedAlbums.map((r) => r.item),
      artists: matchedArtists.map((r) => r.item),
      genres: matchedGenres.map((r) => r.item),
    };
  }, [query, songs, videos, albums, artists, genres]);

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

  const items: ResultItem[] = [
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
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TopBar title="Search Files" showSearch={false} />
      <View className="px-4 pt-3 pb-1">
        <View
          className="flex-row items-center gap-3 px-4 py-3 rounded-3xl"
          style={{ backgroundColor: colors.surface }}
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
            className="flex-1 text-base"
            style={{ color: colors.text }}
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
        <View className="px-4 pt-2">
          {recentSearches.length > 0 && (
            <>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold uppercase tracking-widest" style={{ color: colors.textMuted }}>
                  Recent Searches
                </Text>
                <Pressable onPress={clearRecent}>
                  <Text className="text-xs" style={{ color: colors.accent }}>Clear</Text>
                </Pressable>
              </View>
              {recentSearches.map((term) => (
                <Pressable
                  key={term}
                  onPress={() => selectRecent(term)}
                  className="flex-row items-center gap-3 py-3"
                  style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Clock size={16} color={colors.textMuted} />
                  <Text className="text-sm" style={{ color: colors.text }}>{term}</Text>
                </Pressable>
              ))}
            </>
          )}
          {recentSearches.length === 0 && (
            <View className="items-center py-20">
              <Search size={40} color={colors.textMuted} />
              <Text className="mt-3" style={{ color: colors.textMuted }}>
                Search your music, videos & files
              </Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListHeaderComponent={
            <Text
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest"
              style={{ color: colors.textMuted }}
            >
              {totalResults} result{totalResults !== 1 ? "s" : ""} found
            </Text>
          }
          renderItem={({ item }) => (
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
              className="flex-row items-center gap-3 px-4 py-3"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <Artwork
                uri={item.artwork ?? item.thumbnail}
                size={40}
                borderRadius={16}
                iconSize={18}
                iconColor={colors.accent}
                backgroundColor={colors.surface}
              />
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text
                    className="text-sm font-medium"
                    style={{ color: colors.text }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <View
                    className="px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: colors.accent + "20" }}
                  >
                    <Text
                      className="text-[9px] font-semibold uppercase"
                      style={{ color: colors.accent }}
                    >
                      {item.type}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs" style={{ color: colors.textMuted }}>
                  {item.subtitle}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Search size={40} color={colors.textMuted} />
              <Text className="mt-3" style={{ color: colors.textMuted }}>
                No results found
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
