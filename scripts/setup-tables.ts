// Run this script to create tables in Supabase
// Usage: npx tsx scripts/setup-tables.ts

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTables() {
    console.log("🔧 Setting up database tables in Supabase...\n");

    const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      full_name TEXT NOT NULL,
      phone TEXT,
      profile_image TEXT,
      role TEXT NOT NULL DEFAULT 'rider',
      rating DOUBLE PRECISION DEFAULT 5.0,
      total_rides INTEGER DEFAULT 0,
      is_verified BOOLEAN DEFAULT false,
      stripe_customer_id TEXT,
      push_token TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

    const createDriversTable = `
    CREATE TABLE IF NOT EXISTS drivers (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      user_id VARCHAR NOT NULL REFERENCES users(id),
      vehicle_type TEXT NOT NULL,
      vehicle_make TEXT NOT NULL,
      vehicle_model TEXT NOT NULL,
      vehicle_year INTEGER,
      vehicle_color TEXT,
      license_plate TEXT NOT NULL,
      is_online BOOLEAN DEFAULT false,
      is_available BOOLEAN DEFAULT true,
      current_latitude DOUBLE PRECISION,
      current_longitude DOUBLE PRECISION,
      total_earnings DOUBLE PRECISION DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

    const createRidesTable = `
    CREATE TABLE IF NOT EXISTS rides (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      rider_id VARCHAR NOT NULL REFERENCES users(id),
      driver_id VARCHAR REFERENCES drivers(id),
      status TEXT NOT NULL DEFAULT 'pending',
      vehicle_type TEXT NOT NULL,
      pickup_address TEXT NOT NULL,
      pickup_latitude DOUBLE PRECISION NOT NULL,
      pickup_longitude DOUBLE PRECISION NOT NULL,
      dropoff_address TEXT NOT NULL,
      dropoff_latitude DOUBLE PRECISION NOT NULL,
      dropoff_longitude DOUBLE PRECISION NOT NULL,
      estimated_price DOUBLE PRECISION NOT NULL,
      final_price DOUBLE PRECISION,
      estimated_duration INTEGER,
      distance DOUBLE PRECISION,
      payment_status TEXT DEFAULT 'pending',
      payment_intent_id TEXT,
      rider_rating INTEGER,
      driver_rating INTEGER,
      requested_at TIMESTAMPTZ DEFAULT NOW(),
      accepted_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      cancellation_reason TEXT,
      otp TEXT
    );
  `;

    const createPaymentsTable = `
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      ride_id VARCHAR NOT NULL REFERENCES rides(id),
      user_id VARCHAR NOT NULL REFERENCES users(id),
      amount DOUBLE PRECISION NOT NULL,
      currency TEXT NOT NULL DEFAULT 'gbp',
      status TEXT NOT NULL DEFAULT 'pending',
      stripe_payment_intent_id TEXT,
      stripe_charge_id TEXT,
      payment_method TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
  `;

    const createSavedPlacesTable = `
    CREATE TABLE IF NOT EXISTS saved_places (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      user_id VARCHAR NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

    const createDriverLocationsTable = `
    CREATE TABLE IF NOT EXISTS driver_locations (
      id SERIAL PRIMARY KEY,
      driver_id VARCHAR NOT NULL REFERENCES drivers(id),
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      heading DOUBLE PRECISION,
      speed DOUBLE PRECISION,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );
  `;

    const tables = [
        { name: "users", sql: createUsersTable },
        { name: "drivers", sql: createDriversTable },
        { name: "rides", sql: createRidesTable },
        { name: "payments", sql: createPaymentsTable },
        { name: "saved_places", sql: createSavedPlacesTable },
        { name: "driver_locations", sql: createDriverLocationsTable },
    ];

    for (const table of tables) {
        const { error } = await supabase.rpc("exec_sql", { query: table.sql });
        if (error) {
            // Try direct approach if RPC doesn't exist
            console.log(`⚠️  RPC not available. Please run the SQL manually in Supabase SQL Editor.`);
            console.log(`\n── SQL for all tables ──\n`);
            for (const t of tables) {
                console.log(t.sql);
            }
            return;
        }
        console.log(`✅ Table "${table.name}" ready`);
    }

    console.log("\n🎉 All tables created successfully!");
}

setupTables().catch(console.error);
