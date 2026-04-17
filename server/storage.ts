import { supabase } from "./db";

// TypeScript interfaces matching schema columns (snake_case for Supabase)
export interface User {
  id: string;
  email: string;
  password: string | null;
  full_name: string;
  phone: string | null;
  profile_image: string | null;
  role: string;
  rating: number | null;
  total_rides: number | null;
  is_verified: boolean | null;
  stripe_customer_id: string | null;
  wallet_balance: number | null;
  push_token: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Driver {
  id: string;
  user_id: string;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number | null;
  vehicle_color: string | null;
  license_plate: string;
  is_online: boolean | null;
  is_available: boolean | null;
  current_latitude: number | null;
  current_longitude: number | null;
  total_earnings: number | null;
  document_phvl_url: string | null;
  document_phvl_status: string | null;
  document_logbook_url: string | null;
  document_logbook_status: string | null;
  document_insurance_url: string | null;
  document_insurance_status: string | null;
  document_inspection_url: string | null;
  document_inspection_status: string | null;
  document_dvla_licence_url: string | null;
  document_dvla_licence_status: string | null;
  document_bank_statement_url: string | null;
  document_bank_statement_status: string | null;
  document_dvla_check_code_url: string | null;
  document_dvla_check_code_status: string | null;
  document_national_insurance_url: string | null;
  document_national_insurance_status: string | null;
  document_phdl_url: string | null;
  document_phdl_status: string | null;
  document_profile_photo_url: string | null;
  document_profile_photo_status: string | null;
  created_at: string | null;
}

export interface Ride {
  id: string;
  rider_id: string;
  driver_id: string | null;
  status: string;
  vehicle_type: string;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  dropoff_address: string;
  dropoff_latitude: number;
  dropoff_longitude: number;
  estimated_price: number;
  final_price: number | null;
  estimated_duration: number | null;
  distance: number | null;
  payment_status: string | null;
  payment_intent_id: string | null;
  rider_rating: number | null;
  driver_rating: number | null;
  requested_at: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  payment_method: string | null;
  otp: string | null;
}

export interface Payment {
  id: string;
  ride_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  payment_method: string | null;
  user_name: string | null;
  user_email: string | null;
  created_at: string | null;
  completed_at: string | null;
}

export interface SavedPlace {
  id: string;
  user_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  created_at: string | null;
}

export interface DriverDeduction {
  id: string;
  driver_id: string;
  amount: number;
  type: string;
  reason: string | null;
  created_at: string | null;
}

export interface ScheduledRide {
  id: string;
  rider_id: string;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  dropoff_address: string;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  vehicle_type: string;
  scheduled_at: string;
  estimated_price: number | null;
  status: string;
  created_at: string | null;
}

// Helper to convert snake_case DB rows to camelCase for the API responses
function toCamelUser(row: User) {
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    fullName: row.full_name,
    phone: row.phone,
    profileImage: row.profile_image,
    role: row.role,
    rating: row.rating,
    totalRides: row.total_rides,
    isVerified: row.is_verified,
    stripeCustomerId: row.stripe_customer_id,
    walletBalance: row.wallet_balance || 0,
    pushToken: row.push_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCamelDriver(row: Driver) {
  return {
    id: row.id,
    userId: row.user_id,
    vehicleType: row.vehicle_type,
    vehicleMake: row.vehicle_make,
    vehicleModel: row.vehicle_model,
    vehicleYear: row.vehicle_year,
    vehicleColor: row.vehicle_color,
    licensePlate: row.license_plate,
    isOnline: row.is_online,
    isAvailable: row.is_available,
    currentLatitude: row.current_latitude,
    currentLongitude: row.current_longitude,
    totalEarnings: row.total_earnings,
    documentPhvlUrl: row.document_phvl_url,
    documentPhvlStatus: row.document_phvl_status,
    documentLogbookUrl: row.document_logbook_url,
    documentLogbookStatus: row.document_logbook_status,
    documentInsuranceUrl: row.document_insurance_url,
    documentInsuranceStatus: row.document_insurance_status,
    documentInspectionUrl: row.document_inspection_url,
    documentInspectionStatus: row.document_inspection_status,
    documentDvlaLicenceUrl: row.document_dvla_licence_url,
    documentDvlaLicenceStatus: row.document_dvla_licence_status,
    documentBankStatementUrl: row.document_bank_statement_url,
    documentBankStatementStatus: row.document_bank_statement_status,
    documentDvlaCheckCodeUrl: row.document_dvla_check_code_url,
    documentDvlaCheckCodeStatus: row.document_dvla_check_code_status,
    documentNationalInsuranceUrl: row.document_national_insurance_url,
    documentNationalInsuranceStatus: row.document_national_insurance_status,
    documentPhdlUrl: row.document_phdl_url,
    documentPhdlStatus: row.document_phdl_status,
    documentProfilePhotoUrl: row.document_profile_photo_url,
    documentProfilePhotoStatus: row.document_profile_photo_status,
    createdAt: row.created_at,
  };
}

function toCamelRide(row: Ride) {
  return {
    id: row.id,
    riderId: row.rider_id,
    driverId: row.driver_id,
    status: row.status,
    vehicleType: row.vehicle_type,
    pickupAddress: row.pickup_address,
    pickupLatitude: row.pickup_latitude,
    pickupLongitude: row.pickup_longitude,
    dropoffAddress: row.dropoff_address,
    dropoffLatitude: row.dropoff_latitude,
    dropoffLongitude: row.dropoff_longitude,
    estimatedPrice: row.estimated_price,
    finalPrice: row.final_price,
    estimatedDuration: row.estimated_duration,
    distance: row.distance,
    paymentStatus: row.payment_status,
    paymentIntentId: row.payment_intent_id,
    riderRating: row.rider_rating,
    driverRating: row.driver_rating,
    requestedAt: row.requested_at,
    acceptedAt: row.accepted_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    paymentMethod: row.payment_method,
    otp: row.otp,
  };
}

function toCamelPayment(row: Payment) {
  return {
    id: row.id,
    rideId: row.ride_id,
    userId: row.user_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    stripeChargeId: row.stripe_charge_id,
    paymentMethod: row.payment_method,
    userName: row.user_name,
    userEmail: row.user_email,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function toCamelPlace(row: SavedPlace) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
  };
}

function toCamelDeduction(row: DriverDeduction) {
  return {
    id: row.id,
    driverId: row.driver_id,
    amount: row.amount,
    type: row.type,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export interface IStorage {
  getUser(id: string): Promise<any | undefined>;
  getUserByEmail(email: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  updateUser(id: string, data: any): Promise<any | undefined>;

  getDriver(id: string): Promise<any | undefined>;
  getDriverByUserId(userId: string): Promise<any | undefined>;
  createDriver(driver: any): Promise<any>;
  updateDriver(id: string, data: any): Promise<any | undefined>;
  getOnlineDrivers(): Promise<any[]>;
  getDriverDeductions(driverId: string): Promise<any[]>;

  getRide(id: string): Promise<any | undefined>;
  getRidesByRider(riderId: string): Promise<any[]>;
  getRidesByDriver(driverId: string): Promise<any[]>;
  createRide(ride: any): Promise<any>;
  updateRide(id: string, data: any): Promise<any | undefined>;

  getScheduledRidesByRider(riderId: string): Promise<any[]>;
  createScheduledRide(ride: any): Promise<any>;

  getPayment(id: string): Promise<any | undefined>;
  getPaymentsByUser(userId: string): Promise<any[]>;
  createPayment(payment: any): Promise<any>;
  updatePayment(id: string, data: any): Promise<any | undefined>;

  getSavedPlaces(userId: string): Promise<any[]>;
  createSavedPlace(place: any): Promise<any>;
  deleteSavedPlace(id: string): Promise<void>;
}

export class SupabaseStorage implements IStorage {
  // ── Users ──
  async getUser(id: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return toCamelUser(data as User);
  }

  async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    if (error || !data) return undefined;
    return toCamelUser(data as User);
  }

  async createUser(user: any) {
    const insertData: any = {
      email: user.email,
      full_name: user.fullName,
      password: user.password || null,
      role: user.role || "rider",
    };
    if (user.id) insertData.id = user.id;
    if (user.phone) insertData.phone = user.phone;

    const { data, error } = await supabase
      .from("users")
      .insert(insertData)
      .select()
      .single();
    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return toCamelUser(data as User);
  }

  async updateUser(id: string, updates: any) {
    // Convert camelCase keys to snake_case
    const snakeData: any = {};
    if (updates.fullName !== undefined) snakeData.full_name = updates.fullName;
    if (updates.password !== undefined) snakeData.password = updates.password;
    if (updates.phone !== undefined) snakeData.phone = updates.phone;
    if (updates.profileImage !== undefined) snakeData.profile_image = updates.profileImage;
    if (updates.role !== undefined) snakeData.role = updates.role;
    if (updates.rating !== undefined) snakeData.rating = updates.rating;
    if (updates.totalRides !== undefined) snakeData.total_rides = updates.totalRides;
    if (updates.isVerified !== undefined) snakeData.is_verified = updates.isVerified;
    if (updates.stripeCustomerId !== undefined) snakeData.stripe_customer_id = updates.stripeCustomerId;
    if (updates.walletBalance !== undefined) snakeData.wallet_balance = updates.walletBalance;
    if (updates.pushToken !== undefined) snakeData.push_token = updates.pushToken;
    snakeData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("users")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return undefined;
    return toCamelUser(data as User);
  }

  // ── Drivers ──
  async getDriver(id: string) {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return toCamelDriver(data as Driver);
  }

  async getDriverByUserId(userId: string) {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error || !data) return undefined;
    return toCamelDriver(data as Driver);
  }

  async createDriver(driver: any) {
    const insertData: any = {
      user_id: driver.userId,
      vehicle_type: driver.vehicleType,
      vehicle_make: driver.vehicleMake,
      vehicle_model: driver.vehicleModel,
      license_plate: driver.licensePlate,
      is_online: driver.isOnline ?? false,
      is_available: driver.isAvailable ?? true,
    };
    if (driver.id) insertData.id = driver.id;
    if (driver.vehicleYear) insertData.vehicle_year = driver.vehicleYear;
    if (driver.vehicleColor) insertData.vehicle_color = driver.vehicleColor;

    const { data, error } = await supabase
      .from("drivers")
      .insert(insertData)
      .select()
      .single();
    if (error) throw new Error(`Failed to create driver: ${error.message}`);
    return toCamelDriver(data as Driver);
  }

  async updateDriver(id: string, updates: any) {
    const snakeData: any = {};
    if (updates.isOnline !== undefined) snakeData.is_online = updates.isOnline;
    if (updates.isAvailable !== undefined) snakeData.is_available = updates.isAvailable;
    if (updates.currentLatitude !== undefined) snakeData.current_latitude = updates.currentLatitude;
    if (updates.currentLongitude !== undefined) snakeData.current_longitude = updates.currentLongitude;
    if (updates.totalEarnings !== undefined) snakeData.total_earnings = updates.totalEarnings;
    if (updates.vehicleType !== undefined) snakeData.vehicle_type = updates.vehicleType;
    if (updates.vehicleMake !== undefined) snakeData.vehicle_make = updates.vehicleMake;
    if (updates.vehicleModel !== undefined) snakeData.vehicle_model = updates.vehicleModel;
    if (updates.licensePlate !== undefined) snakeData.license_plate = updates.licensePlate;
    if (updates.vehicleYear !== undefined) snakeData.vehicle_year = updates.vehicleYear;
    if (updates.vehicleColor !== undefined) snakeData.vehicle_color = updates.vehicleColor;
    if (updates.documentPhvlUrl !== undefined) snakeData.document_phvl_url = updates.documentPhvlUrl;
    if (updates.documentPhvlStatus !== undefined) snakeData.document_phvl_status = updates.documentPhvlStatus;
    if (updates.documentLogbookUrl !== undefined) snakeData.document_logbook_url = updates.documentLogbookUrl;
    if (updates.documentLogbookStatus !== undefined) snakeData.document_logbook_status = updates.documentLogbookStatus;
    if (updates.documentInsuranceUrl !== undefined) snakeData.document_insurance_url = updates.documentInsuranceUrl;
    if (updates.documentInsuranceStatus !== undefined) snakeData.document_insurance_status = updates.documentInsuranceStatus;
    if (updates.documentInspectionUrl !== undefined) snakeData.document_inspection_url = updates.documentInspectionUrl;
    if (updates.documentInspectionStatus !== undefined) snakeData.document_inspection_status = updates.documentInspectionStatus;
    if (updates.documentDvlaLicenceUrl !== undefined) snakeData.document_dvla_licence_url = updates.documentDvlaLicenceUrl;
    if (updates.documentDvlaLicenceStatus !== undefined) snakeData.document_dvla_licence_status = updates.documentDvlaLicenceStatus;
    if (updates.documentBankStatementUrl !== undefined) snakeData.document_bank_statement_url = updates.documentBankStatementUrl;
    if (updates.documentBankStatementStatus !== undefined) snakeData.document_bank_statement_status = updates.documentBankStatementStatus;
    if (updates.documentDvlaCheckCodeUrl !== undefined) snakeData.document_dvla_check_code_url = updates.documentDvlaCheckCodeUrl;
    if (updates.documentDvlaCheckCodeStatus !== undefined) snakeData.document_dvla_check_code_status = updates.documentDvlaCheckCodeStatus;
    if (updates.documentNationalInsuranceUrl !== undefined) snakeData.document_national_insurance_url = updates.documentNationalInsuranceUrl;
    if (updates.documentNationalInsuranceStatus !== undefined) snakeData.document_national_insurance_status = updates.documentNationalInsuranceStatus;
    if (updates.documentPhdlUrl !== undefined) snakeData.document_phdl_url = updates.documentPhdlUrl;
    if (updates.documentPhdlStatus !== undefined) snakeData.document_phdl_status = updates.documentPhdlStatus;
    if (updates.documentProfilePhotoUrl !== undefined) snakeData.document_profile_photo_url = updates.documentProfilePhotoUrl;
    if (updates.documentProfilePhotoStatus !== undefined) snakeData.document_profile_photo_status = updates.documentProfilePhotoStatus;

    const { data, error } = await supabase
      .from("drivers")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return undefined;
    return toCamelDriver(data as Driver);
  }

  async getOnlineDrivers() {
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .eq("is_online", true)
      .eq("is_available", true);
    if (error || !data) return [];
    return data.map((d: any) => toCamelDriver(d as Driver));
  }

  async getDriverDeductions(driverId: string) {
    const { data, error } = await supabase
      .from("driver_deductions")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((d: any) => toCamelDeduction(d as DriverDeduction));
  }

  // ── Rides ──
  async getRide(id: string) {
    const { data, error } = await supabase
      .from("rides")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return toCamelRide(data as Ride);
  }

  async getRidesByRider(riderId: string) {
    const { data, error } = await supabase
      .from("rides")
      .select("*")
      .eq("rider_id", riderId)
      .order("requested_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => toCamelRide(r as Ride));
  }

  async getRidesByDriver(driverId: string) {
    const { data, error } = await supabase
      .from("rides")
      .select("*")
      .eq("driver_id", driverId)
      .order("requested_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => toCamelRide(r as Ride));
  }

  async createRide(ride: any) {
    const insertData: any = {
      rider_id: ride.riderId,
      status: ride.status || "pending",
      vehicle_type: ride.vehicleType,
      pickup_address: ride.pickupAddress,
      pickup_latitude: ride.pickupLatitude,
      pickup_longitude: ride.pickupLongitude,
      dropoff_address: ride.dropoffAddress,
      dropoff_latitude: ride.dropoffLatitude,
      dropoff_longitude: ride.dropoffLongitude,
      estimated_price: ride.estimatedPrice,
    };
    if (ride.id) insertData.id = ride.id;
    if (ride.driverId) insertData.driver_id = ride.driverId;
    // Note: otp column doesn't exist in the Supabase rides table yet
    // OTP is managed client-side for now
    if (ride.estimatedDuration) insertData.estimated_duration = ride.estimatedDuration;
    if (ride.distance) insertData.distance = ride.distance;

    console.log('📊 Storage createRide inserting:', JSON.stringify(insertData));
    const { data, error } = await supabase
      .from("rides")
      .insert(insertData)
      .select()
      .single();
    if (error) {
      console.error('📊 Storage createRide error:', error.code, error.message);
      throw new Error(`Failed to create ride: ${error.message}`);
    }
    console.log('📊 Storage createRide success:', data?.id);
    return toCamelRide(data as Ride);
  }

  async updateRide(id: string, updates: any) {
    const snakeData: any = {};
    if (updates.status !== undefined) snakeData.status = updates.status;
    if (updates.driverId !== undefined) snakeData.driver_id = updates.driverId;
    if (updates.finalPrice !== undefined) snakeData.final_price = updates.finalPrice;
    if (updates.paymentStatus !== undefined) snakeData.payment_status = updates.paymentStatus;
    if (updates.riderRating !== undefined) snakeData.rider_rating = updates.riderRating;
    if (updates.driverRating !== undefined) snakeData.driver_rating = updates.driverRating;
    if (updates.acceptedAt !== undefined) snakeData.accepted_at = updates.acceptedAt;
    if (updates.startedAt !== undefined) snakeData.started_at = updates.startedAt;
    if (updates.completedAt !== undefined) snakeData.completed_at = updates.completedAt;
    if (updates.cancelledAt !== undefined) snakeData.cancelled_at = updates.cancelledAt;
    if (updates.cancellationReason !== undefined) snakeData.cancellation_reason = updates.cancellationReason;
    if (updates.paymentMethod !== undefined) snakeData.payment_method = updates.paymentMethod;

    const { data, error } = await supabase
      .from("rides")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return undefined;
    return toCamelRide(data as Ride);
  }

  // ── Scheduled Rides ──
  async createScheduledRide(ride: any) {
    const insertData: any = {
      rider_id: ride.riderId,
      pickup_address: ride.pickupAddress,
      pickup_latitude: ride.pickupLatitude || null,
      pickup_longitude: ride.pickupLongitude || null,
      dropoff_address: ride.dropoffAddress,
      dropoff_latitude: ride.dropoffLatitude || null,
      dropoff_longitude: ride.dropoffLongitude || null,
      vehicle_type: ride.vehicleType || 'economy',
      scheduled_at: ride.scheduledAt,
      estimated_price: ride.estimatedPrice || null,
      status: 'scheduled',
    };
    if (ride.id) insertData.id = ride.id;

    console.log('📅 Storage createScheduledRide inserting:', JSON.stringify(insertData));
    const { data, error } = await supabase
      .from('scheduled_rides')
      .insert(insertData)
      .select()
      .single();
    if (error) {
      console.error('📅 Storage createScheduledRide error:', error.code, error.message);
      throw new Error(`Failed to create scheduled ride: ${error.message}`);
    }
    console.log('📅 Storage createScheduledRide success:', data?.id);
    return data;
  }

  async getScheduledRidesByRider(riderId: string) {
    const { data, error } = await supabase
      .from('scheduled_rides')
      .select('*')
      .eq('rider_id', riderId)
      .order('scheduled_at', { ascending: true });
    if (error || !data) return [];
    return data;
  }

  // ── Payments ──
  async getPayment(id: string) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return toCamelPayment(data as Payment);
  }

  async getPaymentsByUser(userId: string) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((p: any) => toCamelPayment(p as Payment));
  }

  async createPayment(payment: any) {
    let userName = payment.userName;
    let userEmail = payment.userEmail;

    // Auto-fetch user details if not provided by caller
    if (!userName || !userEmail) {
      const { data: userRow } = await supabase.from("users").select("full_name, email").eq("id", payment.userId).single();
      if (userRow) {
        userName = userName || userRow.full_name;
        userEmail = userEmail || userRow.email;
      }
    }

    const insertData: any = {
      ride_id: payment.rideId,
      user_id: payment.userId,
      amount: payment.amount,
      currency: payment.currency || "gbp",
      status: payment.status || "pending",
    };
    if (userName) insertData.user_name = userName;
    if (userEmail) insertData.user_email = userEmail;
    
    if (payment.id) insertData.id = payment.id;
    if (payment.stripePaymentIntentId) insertData.stripe_payment_intent_id = payment.stripePaymentIntentId;
    if (payment.paymentMethod) insertData.payment_method = payment.paymentMethod;

    const { data, error } = await supabase
      .from("payments")
      .insert(insertData)
      .select()
      .single();
    if (error) throw new Error(`Failed to create payment: ${error.message}`);
    return toCamelPayment(data as Payment);
  }

  async updatePayment(id: string, updates: any) {
    const snakeData: any = {};
    if (updates.status !== undefined) snakeData.status = updates.status;
    if (updates.stripeChargeId !== undefined) snakeData.stripe_charge_id = updates.stripeChargeId;
    if (updates.completedAt !== undefined) snakeData.completed_at = updates.completedAt;

    const { data, error } = await supabase
      .from("payments")
      .update(snakeData)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return undefined;
    return toCamelPayment(data as Payment);
  }

  // ── Saved Places ──
  async getSavedPlaces(userId: string) {
    const { data, error } = await supabase
      .from("saved_places")
      .select("*")
      .eq("user_id", userId);
    if (error || !data) return [];
    return data.map((p: any) => toCamelPlace(p as SavedPlace));
  }

  async createSavedPlace(place: any) {
    const insertData: any = {
      user_id: place.userId,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
    };
    if (place.id) insertData.id = place.id;

    const { data, error } = await supabase
      .from("saved_places")
      .insert(insertData)
      .select()
      .single();
    if (error) throw new Error(`Failed to create saved place: ${error.message}`);
    return toCamelPlace(data as SavedPlace);
  }

  async deleteSavedPlace(id: string) {
    const { error } = await supabase
      .from("saved_places")
      .delete()
      .eq("id", id);
    if (error) throw new Error(`Failed to delete saved place: ${error.message}`);
  }
}

export const storage = new SupabaseStorage();
