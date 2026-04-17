import { getApiUrl, apiRequest } from "./query-client";

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  profileImage?: string;
  role: string;
  rating?: number;
  totalRides?: number;
  isVerified?: boolean;
  stripeCustomerId?: string;
  pushToken?: string;
  walletBalance?: number;
}

export interface Driver {
  id: string;
  userId: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear?: number;
  vehicleColor?: string;
  licensePlate: string;
  isOnline: boolean;
  isAvailable: boolean;
  currentLatitude?: number;
  currentLongitude?: number;
  totalEarnings?: number;
}

export interface DriverDeduction {
  id: string;
  driverId: string;
  amount: number;
  type: string;
  reason?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  rideId: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  paymentMethod?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  rideId?: string;
  amount: number;
  type: "credit" | "debit";
  description?: string;
  createdAt: string;
}

export interface Ride {
  id: string;
  riderId: string;
  driverId?: string;
  status: string;
  vehicleType: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  estimatedPrice: number;
  finalPrice?: number;
  estimatedDuration?: number;
  distance?: number;
  paymentStatus?: string;
}

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export const api = {
  auth: {
    async register(email: string, fullName: string, password?: string, role: string = "rider"): Promise<User> {
      const res = await apiRequest("POST", "/api/auth/register", { email, fullName, password, role });
      const data = await res.json();
      return data.user;
    },

    async login(email: string, password?: string, isGoogle?: boolean, fullName?: string): Promise<User> {
      const res = await apiRequest("POST", "/api/auth/login", { email, password, isGoogle, fullName });
      const data = await res.json();
      return data.user;
    },

    async resetPassword(email: string, newPassword?: string): Promise<{ success: boolean }> {
      const res = await apiRequest("POST", "/api/auth/reset-password", { email, newPassword });
      return await res.json();
    },
  },

  users: {
    async get(id: string): Promise<User> {
      const res = await apiRequest("GET", `/api/users/${id}`);
      const data = await res.json();
      return data.user;
    },

    async update(id: string, data: Partial<User>): Promise<User> {
      const res = await apiRequest("PUT", `/api/users/${id}`, data);
      const result = await res.json();
      return result.user;
    },

    async updatePushToken(id: string, pushToken: string): Promise<void> {
      await apiRequest("PUT", `/api/users/${id}/push-token`, { pushToken });
    },

    async uploadProfileImage(id: string, base64: string, mimeType?: string): Promise<string> {
      const res = await apiRequest("POST", `/api/users/${id}/upload`, { base64, mimeType });
      const data = await res.json();
      return data.url;
    },
  },

  drivers: {
    async create(driver: Omit<Driver, "id">): Promise<Driver> {
      const res = await apiRequest("POST", "/api/drivers", driver);
      const data = await res.json();
      return data.driver;
    },

    async get(id: string): Promise<Driver> {
      const res = await apiRequest("GET", `/api/drivers/${id}`);
      const data = await res.json();
      return data.driver;
    },

    async getByUserId(userId: string): Promise<Driver | null> {
      try {
        const res = await apiRequest("GET", `/api/drivers/user/${userId}`);
        const data = await res.json();
        return data.driver;
      } catch {
        return null;
      }
    },

    async update(id: string, data: Partial<Driver>): Promise<Driver> {
      const res = await apiRequest("PUT", `/api/drivers/${id}`, data);
      const result = await res.json();
      return result.driver;
    },

    async getOnline(): Promise<Driver[]> {
      const res = await apiRequest("GET", "/api/drivers/online");
      const data = await res.json();
      return data.drivers;
    },

    async uploadDocument(id: string, base64: string, docType: string, mimeType?: string): Promise<string> {
      const res = await apiRequest("POST", `/api/drivers/${id}/upload`, { base64, docType, mimeType });
      const data = await res.json();
      return data.url;
    },

    async getDeductions(id: string): Promise<DriverDeduction[]> {
      try {
        const res = await apiRequest("GET", `/api/drivers/${id}/deductions`);
        const data = await res.json();
        return data.deductions || [];
      } catch {
        return [];
      }
    },
  },

  rides: {
    async create(ride: Omit<Ride, "id">): Promise<Ride> {
      const res = await apiRequest("POST", "/api/rides", ride);
      const data = await res.json();
      return data.ride;
    },

    async get(id: string): Promise<Ride> {
      const res = await apiRequest("GET", `/api/rides/${id}`);
      const data = await res.json();
      return data.ride;
    },

    async getByRider(riderId: string): Promise<Ride[]> {
      const res = await apiRequest("GET", `/api/rides/rider/${riderId}`);
      const data = await res.json();
      return data.rides;
    },

    async getByDriver(driverId: string): Promise<Ride[]> {
      const res = await apiRequest("GET", `/api/rides/driver/${driverId}`);
      const data = await res.json();
      return data.rides;
    },

    async update(id: string, data: Partial<Ride>): Promise<Ride> {
      const res = await apiRequest("PUT", `/api/rides/${id}`, data);
      const result = await res.json();
      return result.ride;
    },
  },

  payments: {
    async getSavedCards(userId: string): Promise<any[]> {
      const res = await apiRequest("GET", `/api/payments/methods/${userId}`);
      return res.json();
    },

    async deleteSavedCard(methodId: string): Promise<{ success: boolean }> {
      const res = await apiRequest("DELETE", `/api/payments/methods/${methodId}`);
      return res.json();
    },

    async createIntent(amount: number, customerId?: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
      const res = await apiRequest("POST", "/api/payments/create-intent", { amount, customerId });
      return res.json();
    },

    async setupIntent(userId: string): Promise<{ clientSecret: string }> {
      const res = await apiRequest("POST", "/api/payments/setup-intent", { userId });
      return res.json();
    },

    async confirm(paymentIntentId: string, rideId: string, userId: string, amount: number): Promise<boolean> {
      const res = await apiRequest("POST", "/api/payments/confirm", { paymentIntentId, rideId, userId, amount });
      const data = await res.json();
      return data.success;
    },

    async getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
      const res = await apiRequest("GET", `/api/users/${userId}/wallet/transactions`);
      try {
        const data = await res.json();
        return data.transactions || [];
      } catch (e) {
        return [];
      }
    },

    async addWalletTransaction(userId: string, data: { rideId?: string, amount: number, type: "credit" | "debit", description?: string }): Promise<WalletTransaction | null> {
      try {
        const res = await apiRequest("POST", `/api/users/${userId}/wallet/transactions`, data);
        const result = await res.json();
        return result.transaction;
      } catch (e) {
        console.error("Failed to add wallet transaction:", e);
        return null;
      }
    },
  },

  pricingRules: {
    async getActive(): Promise<any> {
      try {
        const res = await apiRequest("GET", "/api/pricing-rules/active");
        if (!res.ok) return null;
        return res.json();
      } catch (e) {
        console.error("Failed to fetch pricing rules:", e);
        return null;
      }
    }
  },

  places: {
    async autocomplete(input: string, sessionToken?: string): Promise<PlacePrediction[]> {
      const baseUrl = getApiUrl();
      const url = new URL("/api/places/autocomplete", baseUrl);
      url.searchParams.set("input", input);
      if (sessionToken) {
        url.searchParams.set("sessiontoken", sessionToken);
      }

      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      return data.predictions || [];
    },

    async getDetails(placeId: string): Promise<{ latitude: number; longitude: number; address: string }> {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/api/places/details/${placeId}`, { credentials: "include" });
      const data = await res.json();

      return {
        latitude: data.result.geometry.location.lat,
        longitude: data.result.geometry.location.lng,
        address: data.result.formatted_address,
      };
    },
  },
  savedPlaces: {
    async getAll(userId: string): Promise<any[]> {
      try {
        const res = await apiRequest("GET", `/api/places/saved/${userId}`);
        const data = await res.json();
        return data.places || [];
      } catch {
        return [];
      }
    },

    async create(place: { userId: string; name: string; address: string; latitude?: number; longitude?: number }): Promise<any> {
      const res = await apiRequest("POST", "/api/places/saved", {
        userId: place.userId,
        name: place.name,
        address: place.address,
        latitude: place.latitude || 0,
        longitude: place.longitude || 0,
      });
      const data = await res.json();
      return data.place;
    },

    async delete(id: string): Promise<boolean> {
      try {
        await apiRequest("DELETE", `/api/places/saved/${id}`);
        return true;
      } catch {
        return false;
      }
    },

    async update(id: string, data: { name?: string; address?: string }): Promise<any> {
      const res = await apiRequest("PUT", `/api/places/saved/${id}`, data);
      const result = await res.json();
      return result.place;
    },
  },
};
