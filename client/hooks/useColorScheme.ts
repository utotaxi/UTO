import { useThemeMode } from "@/context/ThemeContext";

export function useColorScheme(): "light" | "dark" {
    try {
        const { effectiveScheme } = useThemeMode();
        return effectiveScheme;
    } catch {
        // Fallback when ThemeProvider isn't available yet
        return "dark";
    }
}
