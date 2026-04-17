import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  profileImage?: string;
  rating: number;
  totalRides: number;
  isGoogleUser?: boolean;
  role?: string;
  stripeCustomerId?: string;
  walletBalance?: number;
}

export interface DriverDetails {
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  licensePlate: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string, isGoogle?: boolean, googleFullName?: string) => Promise<boolean>;
  signUp: (fullName: string, email: string, password: string, role?: string, driverDetails?: DriverDetails) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "@uto_user";
const AUTH_STORAGE_KEY = "@uto_auth";

import { api } from "@/lib/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedUser && storedAuth === "true") {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        // Background sync: refresh wallet balance and other fields from the server
        if (parsed.id) {
          try {
            const userData = await api.users.get(parsed.id);
            if (userData) {
              const refreshed: User = {
                ...parsed,
                fullName: userData.fullName || parsed.fullName,
                phone: userData.phone || parsed.phone,
                profileImage: userData.profileImage || parsed.profileImage,
                role: userData.role || parsed.role,
                walletBalance: typeof userData.walletBalance === 'number' ? userData.walletBalance : (parsed.walletBalance || 0),
                rating: typeof userData.rating === 'number' ? userData.rating : parsed.rating,
                totalRides: typeof userData.totalRides === 'number' ? userData.totalRides : parsed.totalRides,
              };
              setUser(refreshed);
              await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(refreshed));
            }
          } catch (_) {
            // Non-critical — use cached values
          }
        }
      }
    } catch (error) {
      console.error("Failed to load auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string, isGoogle: boolean = false, googleFullName?: string): Promise<boolean> => {
    try {
      // Use API to login (pass fullName if we have it from google, otherwise undefined)
      // We pass the email name part as a fallback fullName since google doesn't always provide it on just signIn
      const nameFallback = googleFullName || email.split('@')[0];
      const userData = await api.auth.login(email, password || "default", isGoogle, nameFallback);
      const mappedUser: User = {
        id: userData.id,
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone || "",
        rating: typeof userData.rating === 'number' ? userData.rating : 0.0,
        totalRides: typeof userData.totalRides === 'number' ? userData.totalRides : 0,
        isGoogleUser: isGoogle,
        role: userData.role,
        walletBalance: typeof userData.walletBalance === 'number' ? userData.walletBalance : 0,
      };

      setUser(mappedUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, "true");
      return true;
    } catch (error) {
      console.error("Sign in API failed:", error);
      return false;
    }
  };

  const signUp = async (fullName: string, email: string, password: string, role: string = "rider", driverDetails?: DriverDetails): Promise<boolean> => {
    // NOTE: No local fallback here — sign-up MUST persist to Supabase.
    // If the API call fails, we throw so the UI can show the error to the user.

    // Step 1: Register the user account
    let userData: any;
    try {
      userData = await api.auth.register(email, fullName, password, role);
    } catch (error: any) {
      console.error("Sign up failed — user not created in Supabase:", error);
      // Re-throw so SignUpScreen shows the error
      throw error;
    }

    // Step 2: If registering as a driver, also create the driver record
    if (role === "driver" && driverDetails) {
      try {
        await api.drivers.create({
          userId: userData.id,
          vehicleType: driverDetails.vehicleType,
          vehicleMake: driverDetails.vehicleMake,
          vehicleModel: driverDetails.vehicleModel,
          licensePlate: driverDetails.licensePlate,
          isOnline: false,
          isAvailable: true,
        });
        console.log("✅ Driver record created in Supabase for user:", userData.id);
      } catch (driverError: any) {
        console.error("⚠️ User created but driver record failed:", driverError);
        // Re-throw so the UI knows driver profile wasn't saved
        throw new Error("Account created but failed to save vehicle details. Please contact support.");
      }
    }

    // Step 3: Store user locally and mark as authenticated
    const mappedUser: User = {
      id: userData.id,
      fullName: userData.fullName,
      email: userData.email,
      phone: userData.phone || "",
      rating: typeof userData.rating === 'number' ? userData.rating : 0.0,
      totalRides: typeof userData.totalRides === 'number' ? userData.totalRides : 0,
      role: userData.role,
      walletBalance: typeof userData.walletBalance === 'number' ? userData.walletBalance : 0,
    };

    setUser(mappedUser);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, "true");
    return true;
  };

  const signOut = async () => {
    try {
      setUser(null);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));

    // Persist wallet balance changes to the server so it's always in sync
    if (data.walletBalance !== undefined) {
      try {
        await api.users.update(user.id, { walletBalance: data.walletBalance } as any);
        console.log(`✅ [AuthContext] Wallet balance synced to server: £${data.walletBalance}`);
      } catch (err) {
        console.warn('⚠️ [AuthContext] Failed to sync wallet balance to server:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
