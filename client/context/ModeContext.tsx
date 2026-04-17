import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppMode = "rider" | "driver";
export type UserRole = "rider" | "driver" | "both";

interface ModeContextType {
  currentMode: AppMode;
  switchMode: (mode: AppMode) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  canSwitchToDriver: boolean;
  isLoading: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = "@uto_mode";
const ROLE_STORAGE_KEY = "@uto_role";

export function ModeProvider({ children }: { children: ReactNode }) {
  const [currentMode, setCurrentMode] = useState<AppMode>("rider");
  const [userRole, setUserRoleState] = useState<UserRole>("rider");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredValues();
  }, []);

  const loadStoredValues = async () => {
    try {
      const [storedMode, storedRole] = await Promise.all([
        AsyncStorage.getItem(MODE_STORAGE_KEY),
        AsyncStorage.getItem(ROLE_STORAGE_KEY),
      ]);
      
      if (storedRole) {
        setUserRoleState(storedRole as UserRole);
      }
      
      if (storedMode && (storedRole === "both" || storedRole === storedMode)) {
        setCurrentMode(storedMode as AppMode);
      }
    } catch (error) {
      console.error("Failed to load mode/role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = async (mode: AppMode) => {
    if (userRole === "rider" && mode === "driver") return;
    if (userRole === "driver" && mode === "rider") return;
    
    setCurrentMode(mode);
    try {
      await AsyncStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch (error) {
      console.error("Failed to save mode:", error);
    }
  };

  const setUserRole = async (role: UserRole) => {
    setUserRoleState(role);
    try {
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, role);
      if (role === "rider") {
        setCurrentMode("rider");
        await AsyncStorage.setItem(MODE_STORAGE_KEY, "rider");
      } else if (role === "driver") {
        setCurrentMode("driver");
        await AsyncStorage.setItem(MODE_STORAGE_KEY, "driver");
      }
    } catch (error) {
      console.error("Failed to save role:", error);
    }
  };

  const canSwitchToDriver = userRole === "both" || userRole === "driver";

  return (
    <ModeContext.Provider
      value={{
        currentMode,
        switchMode,
        userRole,
        setUserRole,
        canSwitchToDriver,
        isLoading,
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
}
