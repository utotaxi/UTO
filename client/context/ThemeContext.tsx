import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme as useSystemColorScheme } from "react-native";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
    themeMode: ThemeMode;
    effectiveScheme: "light" | "dark";
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@uto_theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
    const systemScheme = useSystemColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");

    useEffect(() => {
        loadStoredTheme();
    }, []);

    const loadStoredTheme = async () => {
        try {
            const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            if (stored === "light" || stored === "dark" || stored === "system") {
                setThemeModeState(stored);
            }
        } catch (error) {
            console.error("Failed to load theme:", error);
        }
    };

    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
        } catch (error) {
            console.error("Failed to save theme:", error);
        }
    };

    const toggleTheme = () => {
        const newMode = effectiveScheme === "dark" ? "light" : "dark";
        setThemeMode(newMode);
    };

    const effectiveScheme: "light" | "dark" =
        themeMode === "system" ? (systemScheme ?? "dark") : themeMode;

    return (
        <ThemeContext.Provider
            value={{
                themeMode,
                effectiveScheme,
                setThemeMode,
                toggleTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeMode() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useThemeMode must be used within a ThemeProvider");
    }
    return context;
}
