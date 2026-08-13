// theme/colors.ts
export const lightColors = {
  background: "#FFFFFF",
  headerBorder: "#D1D1D6",
  text: "#1C1C1E",
  textSecondary: "rgba(0,0,0,0.35)",
  bubbleOwn: "#4F7CFF",
  bubbleOther: "#E8E8ED",
  textOwn: "#FFFFFF",
  textOther: "#1C1C1E",
  inputBackground: "#F2F2F7",
  accent: "#4F7CFF",
  accentMuted: "#B7C6F7",
  statusRead: "#4F7CFF",
  statusDefault: "rgba(255,255,255,0.75)",
  statusFailed: "#FF3B30",
};

export const darkColors = {
  background: "#0B0B0D",
  headerBorder: "#2C2C2E",
  text: "#F2F2F7",
  textSecondary: "rgba(255,255,255,0.4)",
  bubbleOwn: "#4F7CFF",
  bubbleOther: "#26262B",
  textOwn: "#FFFFFF",
  textOther: "#F2F2F7",
  inputBackground: "#1C1C1E",
  accent: "#6E93FF",
  accentMuted: "#33437A",
  statusRead: "#8FB1FF",
  statusDefault: "rgba(255,255,255,0.75)",
  statusFailed: "#FF6961",
};

export type AppColors = typeof lightColors;