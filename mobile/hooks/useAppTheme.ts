// hooks/useAppTheme.ts
import { useColorScheme } from "react-native";
import { lightColors, darkColors } from "../theme/colors";

export function useAppTheme() {
  const scheme = useColorScheme(); // "light" | "dark" | null
  const colors = scheme === "dark" ? darkColors : lightColors;
  return { colors, isDark: scheme === "dark" };
}