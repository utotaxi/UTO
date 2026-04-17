// import { sql } from "drizzle-orm";
// import { pgTable, text, varchar } from "drizzle-orm/pg-core";
// import { createInsertSchema } from "drizzle-zod";
// import { z } from "zod";

// export const users = pgTable("users", {
//   id: varchar("id")
//     .primaryKey()
//     .default(sql`gen_random_uuid()`),
//   username: text("username").notNull().unique(),
//   password: text("password").notNull(),
// });

// export const insertUserSchema = createInsertSchema(users).pick({
//   username: true,
//   password: true,
// });

// export type InsertUser = z.infer<typeof insertUserSchema>;
// export type User = typeof users.$inferSelect;


import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, doublePrecision, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  profileImage: text("profile_image"),
  role: text("role").notNull().default("rider"),
  rating: doublePrecision("rating").default(5.0),
  totalRides: integer("total_rides").default(0),
  isVerified: boolean("is_verified").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  walletBalance: doublePrecision("wallet_balance").default(0),
  pushToken: text("push_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const drivers = pgTable("drivers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  vehicleType: text("vehicle_type").notNull(),
  vehicleMake: text("vehicle_make").notNull(),
  vehicleModel: text("vehicle_model").notNull(),
  vehicleYear: integer("vehicle_year"),
  vehicleColor: text("vehicle_color"),
  licensePlate: text("license_plate").notNull(),
  isOnline: boolean("is_online").default(false),
  isAvailable: boolean("is_available").default(true),
  currentLatitude: doublePrecision("current_latitude"),
  currentLongitude: doublePrecision("current_longitude"),
  totalEarnings: doublePrecision("total_earnings").default(0),
  documentPhvlUrl: text("document_phvl_url"),
  documentPhvlStatus: text("document_phvl_status").default("pending"),
  documentLogbookUrl: text("document_logbook_url"),
  documentLogbookStatus: text("document_logbook_status").default("pending"),
  documentInsuranceUrl: text("document_insurance_url"),
  documentInsuranceStatus: text("document_insurance_status").default("pending"),
  documentInspectionUrl: text("document_inspection_url"),
  documentInspectionStatus: text("document_inspection_status").default("pending"),
  documentDvlaLicenceUrl: text("document_dvla_licence_url"),
  documentDvlaLicenceStatus: text("document_dvla_licence_status").default("pending"),
  documentBankStatementUrl: text("document_bank_statement_url"),
  documentBankStatementStatus: text("document_bank_statement_status").default("pending"),
  documentDvlaCheckCodeUrl: text("document_dvla_check_code_url"),
  documentDvlaCheckCodeStatus: text("document_dvla_check_code_status").default("pending"),
  documentNationalInsuranceUrl: text("document_national_insurance_url"),
  documentNationalInsuranceStatus: text("document_national_insurance_status").default("pending"),
  documentPhdlUrl: text("document_phdl_url"),
  documentPhdlStatus: text("document_phdl_status").default("pending"),
  documentProfilePhotoUrl: text("document_profile_photo_url"),
  documentProfilePhotoStatus: text("document_profile_photo_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rides = pgTable("rides", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  riderId: varchar("rider_id").notNull().references(() => users.id),
  driverId: varchar("driver_id").references(() => drivers.id),
  status: text("status").notNull().default("pending"),
  vehicleType: text("vehicle_type").notNull(),
  pickupAddress: text("pickup_address").notNull(),
  pickupLatitude: doublePrecision("pickup_latitude").notNull(),
  pickupLongitude: doublePrecision("pickup_longitude").notNull(),
  dropoffAddress: text("dropoff_address").notNull(),
  dropoffLatitude: doublePrecision("dropoff_latitude").notNull(),
  dropoffLongitude: doublePrecision("dropoff_longitude").notNull(),
  estimatedPrice: doublePrecision("estimated_price").notNull(),
  finalPrice: doublePrecision("final_price"),
  estimatedDuration: integer("estimated_duration"),
  distance: doublePrecision("distance"),
  paymentStatus: text("payment_status").default("pending"),
  paymentIntentId: text("payment_intent_id"),
  riderRating: integer("rider_rating"),
  driverRating: integer("driver_rating"),
  requestedAt: timestamp("requested_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  paymentMethod: text("payment_method").default("cash"),
  otp: text("otp"),
});

export const payments = pgTable("payments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  rideId: varchar("ride_id").notNull().references(() => rides.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull().default("gbp"),
  status: text("status").notNull().default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeChargeId: text("stripe_charge_id"),
  paymentMethod: text("payment_method"),
  userName: text("user_name"),
  userEmail: text("user_email"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const savedPlaces = pgTable("saved_places", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const driverLocations = pgTable("driver_locations", {
  id: serial("id").primaryKey(),
  driverId: varchar("driver_id").notNull().references(() => drivers.id),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  heading: doublePrecision("heading"),
  speed: doublePrecision("speed"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  createdAt: true,
});

export const insertRideSchema = createInsertSchema(rides).omit({
  id: true,
  requestedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertSavedPlaceSchema = createInsertSchema(savedPlaces).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Ride = typeof rides.$inferSelect;
export type InsertRide = z.infer<typeof insertRideSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type SavedPlace = typeof savedPlaces.$inferSelect;
export type InsertSavedPlace = z.infer<typeof insertSavedPlaceSchema>;
