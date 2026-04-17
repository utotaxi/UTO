import { Platform } from "react-native";

// UTO Brand Colors - Yellow/Gold on Black
export const UTOColors = {
  // Primary brand color
  primary: "#F7C948",
  primaryDark: "#D4A738",
  primaryLight: "#FFE082",
  
  // Mode colors
  rider: {
    primary: "#F7C948",
    primaryDark: "#D4A738",
    surface: "#1A1A1A",
  },
  driver: {
    primary: "#F7C948",
    primaryDark: "#D4A738",
    surface: "#1A1A1A",
  },
  // Shared
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  border: "#333333",
  disabled: "#555555",
  overlay: "rgba(0, 0, 0, 0.6)",
  
  // Background variations
  background: "#000000",
  backgroundSecondary: "#1A1A1A",
  backgroundCard: "#1F1F1F",
};

export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#6B7280",
    buttonText: "#000000",
    tabIconDefault: "#6B7280",
    tabIconSelected: "#F7C948",
    link: "#F7C948",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F5F5F5",
    backgroundSecondary: "#EBEBEB",
    backgroundTertiary: "#E0E0E0",
    border: "#E5E5E5",
    success: "#10B981",
    error: "#EF4444",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#9CA3AF",
    buttonText: "#000000",
    tabIconDefault: "#6B7280",
    tabIconSelected: "#F7C948",
    link: "#F7C948",
    backgroundRoot: "#000000",
    backgroundDefault: "#1A1A1A",
    backgroundSecondary: "#262626",
    backgroundTertiary: "#333333",
    border: "#333333",
    success: "#10B981",
    error: "#EF4444",
  },
};

// Currency configuration
export const Currency = {
  symbol: "£",
  code: "GBP",
  locale: "en-GB",
};

export const formatPrice = (amount: number): string => {
  return `${Currency.symbol}${amount.toFixed(2)}`;
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
  inputHeight: 52,
  buttonHeight: 56,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  h4: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
    fontFamily: "Inter_400Regular",
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
    fontFamily: "Inter_400Regular",
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
    fontFamily: "Inter_400Regular",
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
    fontFamily: "Inter_500Medium",
  },
  price: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
    fontFamily: Platform.select({
      ios: "ui-monospace",
      android: "monospace",
      default: "monospace",
    }),
  },
  logo: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800" as const,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
};

export const Shadows = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
