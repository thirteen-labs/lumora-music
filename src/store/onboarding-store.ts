import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { storage } from "@/services/mmkv";
import { reportWarning } from "@/utils/error-handler";

const ONBOARDING_COMPLETED_KEY = "lumora-onboarding-completed";

interface OnboardingState {
  completed: boolean;
  completeOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  immer((set) => ({
    completed: (() => {
      try {
        return storage.getBoolean(ONBOARDING_COMPLETED_KEY) ?? false;
      } catch (e) {
        reportWarning("Onboarding", e, "Failed to load onboarding state");
        return false;
      }
    })(),
    completeOnboarding: () => {
      set((s) => {
        s.completed = true;
      });
      try {
        storage.set(ONBOARDING_COMPLETED_KEY, true);
      } catch (e) {
        reportWarning("Onboarding", e, "Failed to save onboarding state");
      }
    },
  })),
);
