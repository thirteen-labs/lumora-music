import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Video, MediaScanStatus } from "@/types/media";
import { fetchVideos, getCachedVideos } from "@/services/video-fetcher";
import { clearThumbnailCache } from "@/services/video-thumbnails";
import { useToastStore } from "@/store/toast-store";

interface VideoState {
  videos: Video[];
  scanStatus: MediaScanStatus;
  scanProgress: { processed: number; total: number } | null;
  fetchVideos: (force?: boolean) => Promise<void>;
  clearVideos: () => void;
}

export const useVideoStore = create<VideoState>()(
  immer((set, get) => ({
    videos: [],
    scanStatus: getCachedVideos().length > 0 ? "complete" : "idle",
    scanProgress: null,

    fetchVideos: async (force?: boolean) => {
      const currentStatus = get().scanStatus;
      if (currentStatus === "scanning") return;

      if (!force) {
        const cached = getCachedVideos();
        if (cached.length > 0) {
          set((state) => {
            state.videos = cached;
            state.scanStatus = "complete";
            state.scanProgress = null;
          });
          return;
        }
      }

      useToastStore.getState().showToast("Scanning videos...", "video");
      try {
        const videos = await fetchVideos(
          (status) => {
            set((state) => {
              state.scanStatus = status;
            });
          },
          (processed, total) => {
            set((state) => {
              state.scanProgress = { processed, total };
            });
          },
        );

        if (videos.length > 0) {
          useToastStore.getState().showToast(`Found ${videos.length} video${videos.length !== 1 ? 's' : ''}`, "check");
        } else {
          useToastStore.getState().showToast("No videos found", "video");
        }

        set((state) => {
          state.videos = videos;
          state.scanStatus = "complete";
          state.scanProgress = null;
        });
      } catch {
        set((state) => {
          state.scanStatus = "error";
          state.scanProgress = null;
        });
        useToastStore.getState().showToast("Video scan failed", "error");
      }
    },

    clearVideos: () => {
      clearThumbnailCache();
      set((state) => {
        state.videos = [];
        state.scanStatus = "idle";
        state.scanProgress = null;
      });
    },
  })),
);
