//client/context/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

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
  councilLicence: string;
  badgeNo: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (
    email: string,
    password: string,
    isGoogle?: boolean,
    googleFullName?: string,
    requestedRole?: string,
  ) => Promise<User | null>;
  signUp: (
    fullName: string,
    email: string,
    password: string,
    role?: string,
    driverDetails?: DriverDetails,
  ) => Promise<User>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "@uto_user";
const AUTH_STORAGE_KEY = "@uto_auth";

import { api } from "@/lib/api";

async function resolveAccountRole(
  userId: string,
  role?: string,
  requestedRole?: string,
): Promise<string> {
  const normalizedRole = String(role || "rider").toLowerCase();
  const normalizedRequestedRole = String(requestedRole || "").toLowerCase();
  if (normalizedRole === "driver" || normalizedRole === "both")
    return normalizedRole;

  try {
    const driver = await api.drivers.getByUserId(userId);
    if (driver?.id) return "driver";
  } catch (_) {
    // Non-critical — use the role returned by the user endpoint.
  }

  if (normalizedRequestedRole === "driver") return "driver";

  return normalizedRole;
}

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
              const resolvedRole = await resolveAccountRole(
                userData.id,
                userData.role || parsed.role,
              );
              const refreshed: User = {
                ...parsed,
                fullName: userData.fullName || parsed.fullName,
                phone: userData.phone || parsed.phone,
                profileImage: userData.profileImage || parsed.profileImage,
                role: resolvedRole,
                walletBalance:
                  typeof userData.walletBalance === "number"
                    ? userData.walletBalance
                    : parsed.walletBalance || 0,
                rating:
                  typeof userData.rating === "number"
                    ? userData.rating
                    : parsed.rating,
                totalRides:
                  typeof userData.totalRides === "number"
                    ? userData.totalRides
                    : parsed.totalRides,
              };
              setUser(refreshed);
              await AsyncStorage.setItem(
                USER_STORAGE_KEY,
                JSON.stringify(refreshed),
              );
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

  const signIn = async (
    email: string,
    password: string,
    isGoogle: boolean = false,
    googleFullName?: string,
    requestedRole?: string,
  ): Promise<User | null> => {
    try {
      // Use API to login (pass fullName if we have it from google, otherwise undefined)
      // We pass the email name part as a fallback fullName since google doesn't always provide it on just signIn
      const nameFallback = googleFullName || email.split("@")[0];
      const userData = await api.auth.login(
        email,
        password || "default",
        isGoogle,
        nameFallback,
      );
      const resolvedRole = await resolveAccountRole(
        userData.id,
        userData.role,
        requestedRole,
      );
      const mappedUser: User = {
        id: userData.id,
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone || "",
        rating: typeof userData.rating === "number" ? userData.rating : 0.0,
        totalRides:
          typeof userData.totalRides === "number" ? userData.totalRides : 0,
        isGoogleUser: isGoogle,
        role: resolvedRole,
        walletBalance:
          typeof userData.walletBalance === "number"
            ? userData.walletBalance
            : 0,
      };

      setUser(mappedUser);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, "true");
      return mappedUser;
    } catch (error) {
      console.error("Sign in API failed:", error);
      return null;
    }
  };

  const signUp = async (
    fullName: string,
    email: string,
    password: string,
    role: string = "rider",
    driverDetails?: DriverDetails,
  ): Promise<User> => {
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
          vehicleType: "standard", // default fallback since it's required by schema
          councilLicence: driverDetails.councilLicence,
          badgeNo: driverDetails.badgeNo,
          vehicleMake: "Pending", // placeholder — collected later during onboarding
          vehicleModel: "Pending",
          licensePlate: "PENDING",
          isOnline: false,
          isAvailable: true,
        });
        console.log(
          "✅ Driver record created in Supabase for user:",
          userData.id,
        );
      } catch (driverError: any) {
        console.error("⚠️ User created but driver record failed:", driverError);
        // Re-throw so the UI knows driver profile wasn't saved
        throw new Error(
          "Account created but failed to save driver details. Please contact support.",
        );
      }
    }

    // Step 3: Store user locally and mark as authenticated
    const resolvedRole = await resolveAccountRole(
      userData.id,
      userData.role || role,
    );
    const mappedUser: User = {
      id: userData.id,
      fullName: userData.fullName,
      email: userData.email,
      phone: userData.phone || "",
      rating: typeof userData.rating === "number" ? userData.rating : 0.0,
      totalRides:
        typeof userData.totalRides === "number" ? userData.totalRides : 0,
      role: resolvedRole,
      walletBalance:
        typeof userData.walletBalance === "number" ? userData.walletBalance : 0,
    };

    setUser(mappedUser);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, "true");
    return mappedUser;
  };

  const signOut = async () => {
    try {
      // Step 1: Show loading spinner FIRST.
      // RootStackNavigator checks `authLoading` and renders a plain spinner
      // instead of any navigation stack. This cleanly unmounts ALL authenticated
      // screens (and their hooks/contexts) before we change the auth state,
      // preventing the "undefined is not a function" crash that occurs when
      // screens are torn down mid-render during a navigation tree swap.
      setIsLoading(true);

      // Step 2: Clear credentials while loading spinner is showing
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      try {
        await supabase.auth.signOut();
      } catch (_) {
        /* non-critical */
      }

      // Step 3: Now safely clear the user — screens are already gone
      setUser(null);
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      // Step 4: Hide loading — now shows the unauthenticated Welcome screen
      setIsLoading(false);
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
        await api.users.update(user.id, {
          walletBalance: data.walletBalance,
        } as any);
        console.log(
          `✅ [AuthContext] Wallet balance synced to server: £${data.walletBalance}`,
        );
      } catch (err) {
        console.warn(
          "⚠️ [AuthContext] Failed to sync wallet balance to server:",
          err,
        );
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
