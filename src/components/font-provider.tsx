import { useEffect, useState, type ReactNode } from "react";
import * as Font from "expo-font";
import { View, ActivityIndicator } from "react-native";
import { useSettingsStore } from "@/store/settings-store";

const FONT_MAP: Record<string, () => Promise<void>> = {
  system: async () => {},
  serif: async () => {
    await Font.loadAsync({
      PlayfairDisplay: require("../../assets/fonts/PlayfairDisplay-Regular.ttf"),
    });
  },
  rounded: async () => {
    await Font.loadAsync({
      Nunito: require("../../assets/fonts/Nunito-Regular.ttf"),
    });
  },
  mono: async () => {
    await Font.loadAsync({
      JetBrainsMono: require("../../assets/fonts/JetBrainsMono-Regular.ttf"),
    });
  },
  poppins: async () => {
    await Font.loadAsync({
      Poppins: require("../../assets/fonts/Poppins-Regular.ttf"),
      "Poppins-Bold": require("../../assets/fonts/Poppins-Bold.ttf"),
    });
  },
  inter: async () => {
    await Font.loadAsync({
      Inter: require("../../assets/fonts/Inter-Regular.ttf"),
      "Inter-Bold": require("../../assets/fonts/Inter-Bold.ttf"),
    });
  },
};

export const FONT_FAMILY_MAP: Record<string, string | undefined> = {
  system: undefined,
  serif: "PlayfairDisplay",
  rounded: "Nunito",
  mono: "JetBrainsMono",
  poppins: "Poppins",
  inter: "Inter",
};

interface FontProviderProps {
  children: ReactNode;
}

export function FontProvider({ children }: FontProviderProps) {
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const [loadedFont, setLoadedFont] = useState<string | null>(null);

  const loaded = loadedFont === fontFamily;

  useEffect(() => {
    let cancelled = false;

    async function loadFonts() {
      try {
        const loader = FONT_MAP[fontFamily];
        if (loader) {
          await loader();
        }
      } catch (e) {
        console.warn("Failed to load font:", e);
      }
      if (!cancelled) {
        setLoadedFont(fontFamily);
      }
    }

    loadFonts();

    return () => {
      cancelled = true;
    };
  }, [fontFamily]);

  if (!loaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return <>{children}</>;
}
