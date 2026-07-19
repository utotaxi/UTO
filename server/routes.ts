//server/routes.ts
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import {
  extractScheduledBookingId,
  setupSocketIO,
  scheduledRideHooks,
} from "./socket";
import {
  authorizeSavedCard,
  capturePaymentIntent,
  chargeSavedCard,
  createPaymentIntent,
  createCustomer,
  confirmPayment,
  createSetupIntent,
  deletePaymentMethod,
  getPaymentMethods,
  refundPayment,
  releaseAuthorization,
} from "./stripe";
import {
  insertUserSchema,
  insertRideSchema,
  insertDriverSchema,
} from "@shared/schema";
import {
  DRIVER_DEDUCTION_TYPE,
  formatScheduledBookingCancellationPenalty,
} from "../shared/driverDeductions";
import { upsertDriverPenaltyDeduction } from "./services/driverDeductions";
import { supabase } from "./db";
import { getDiscountedFare } from "../shared/fare";
import {
  ensureAuthUserForEmail,
  sendSupabasePasswordResetEmail,
  updateSupabaseAuthPassword,
  verifySupabaseRecoveryAccessToken,
  verifySupabaseRecoveryOtp,
} from "./supabaseAuthMail";

/** email → { expiresAt, authUserId? } after Supabase recovery verification */
const verifiedEmails = new Map<
  string,
  { expiresAt: number; authUserId?: string }
>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = setupSocketIO(httpServer);

  // Broadcast a scheduled-booking change WITHOUT leaking rider PII (name, phone,
  // addresses, fares, PIN) to every connected client. Consumers only need the
  // change type to trigger a re-fetch from their own access-scoped endpoint, so
  // we send just a minimal signal instead of the full booking row.
  const emitLaterBookingSignal = (type: string, booking: any) => {
    try {
      io.emit("later-booking:update", {
        type,
        bookingId: booking?.id ?? null,
        sourceTable: booking?.source_table ?? null,
        status: booking?.status ?? null,
      });
    } catch (_) {
      /* non-critical */
    }
  };

  const withResolvedUserRole = async (user: any) => {
    if (!user?.id) return user;
    if (String(user.role || "").toLowerCase() === "both") return user;

    try {
      const driver = await storage.getDriverByUserId(user.id);
      if (driver) {
        if (String(user.role || "").toLowerCase() !== "driver") {
          storage.updateUser(user.id, { role: "driver" }).catch((err) => {
            console.warn(
              `⚠️ Could not persist driver role for user ${user.id}:`,
              err,
            );
          });
        }
        return { ...user, role: "driver" };
      }
    } catch (err) {
      console.warn(
        `⚠️ Could not resolve driver role for user ${user.id}:`,
        err,
      );
    }

    return { ...user, role: user.role || "rider" };
  };

  // ─── Health check endpoint (used by Railway for monitoring) ───
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "uto-backend",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ─── Temporary debug endpoint to diagnose production DB issues ───
  app.get("/api/debug/db-check", async (_req: Request, res: Response) => {
    try {
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      const urlPrefix =
        process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || "NOT SET";

      // Try a simple query
      const { data, error, count } = await supabase
        .from("users")
        .select("id, email", { count: "exact" })
        .limit(3);

      // Try the specific user
      const { data: specificUser, error: specificError } = await supabase
        .from("users")
        .select("id, email, full_name")
        .eq("email", "infokrystalai@gmail.com")
        .single();

      res.json({
        envVars: { hasUrl, hasKey, urlPrefix },
        allUsersQuery: {
          count,
          sampleEmails: data?.map((u: any) => u.email) || [],
          error: error?.message || null,
        },
        specificUser: {
          found: !!specificUser,
          data: specificUser,
          error: specificError?.message || null,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Safe migration: ensure payment_method column exists on rides table ───
  try {
    const { error: migrationErr } = await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE rides ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'card';`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE rides ALTER COLUMN payment_method SET DEFAULT 'card';`,
    });
    if (migrationErr) {
      console.log(
        "ℹ️ Could not run ALTER TABLE via RPC — payment_method column may already exist",
      );
    } else {
      console.log("✅ Ensured rides.payment_method column exists");
    }
  } catch (e) {
    console.log("ℹ️ Migration check skipped:", (e as Error).message);
  }

  // ─── Ensure ride_vias table for ASAP intermediate stops (up to 2) ───
  try {
    const { error: viaTableErr } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS public.ride_vias (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ride_id TEXT NOT NULL,
          sequence_order INTEGER NOT NULL CHECK (sequence_order >= 1 AND sequence_order <= 5),
          address TEXT NOT NULL,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (ride_id, sequence_order)
        );
        CREATE INDEX IF NOT EXISTS ride_vias_ride_id_idx ON public.ride_vias (ride_id);
      `,
    });
    if (viaTableErr) {
      console.log(
        "ℹ️ ride_vias ensure skipped (run scripts/ride-vias-migration.sql in Supabase if needed):",
        viaTableErr.message,
      );
    } else {
      console.log("✅ Ensured ride_vias table exists");
    }
  } catch (e) {
    console.log("ℹ️ ride_vias migration check skipped:", (e as Error).message);
  }

  // ─── Safe migration: ensure estimated_fare & vehicle_type columns on later_bookings ───
  try {
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS estimated_fare NUMERIC DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'saloon';`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancellation_note TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS flight_number TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS is_round_trip BOOLEAN DEFAULT FALSE;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'standard';`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS passengers INTEGER DEFAULT 1;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS luggage INTEGER DEFAULT 0;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS distance_miles NUMERIC DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS duration_minutes NUMERIC DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS return_pickup_address TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS return_pickup_latitude NUMERIC DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS return_pickup_longitude NUMERIC DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS return_dropoff_address TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS return_dropoff_latitude NUMERIC DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS return_dropoff_longitude NUMERIC DEFAULT NULL;`,
    });
    // New fields for cancellation penalty & tracking
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS scheduled_pickup_time TIMESTAMP WITH TIME ZONE DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS accepted_by_driver_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS driver_cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS driver_cancel_reason TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS driver_cancel_type TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS late_cancellation_fee NUMERIC DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS driver_penalty_applied BOOLEAN DEFAULT FALSE;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS fare NUMERIC DEFAULT NULL;`,
    });
    // Pre-provided ride PIN + live-dispatch tracking fields
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS otp TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS live_ride_id TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'card';`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS payment_intent_id TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS rider_name TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS rider_phone TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS rider_email TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE later_bookings ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT NULL;`,
    });
    // Same fields for web_booker so admin/web bookings can also go live
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE web_booker ADD COLUMN IF NOT EXISTS otp TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE web_booker ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE web_booker ADD COLUMN IF NOT EXISTS live_ride_id TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE web_booker ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'card';`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE web_booker ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT NULL;`,
    });
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE web_booker ADD COLUMN IF NOT EXISTS payment_intent_id TEXT DEFAULT NULL;`,
    });
    console.log(
      "✅ Ensured later_bookings columns exist (including penalty & tracking fields)",
    );
  } catch (e) {
    console.log("ℹ️ later_bookings migration skipped:", (e as Error).message);
  }

  // ─── Safe migration: ensure badge_no column exists on drivers table ───
  try {
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS badge_no TEXT DEFAULT NULL;`,
    });
    console.log("✅ Ensured drivers.badge_no column exists");
  } catch (e) {
    console.log("ℹ️ drivers.badge_no migration skipped:", (e as Error).message);
  }

  // ─── Safe migration: ensure is_deleted column exists on users table ───
  try {
    await supabase.rpc("exec_sql", {
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;`,
    });
    console.log("✅ Ensured users.is_deleted column exists");
  } catch (e) {
    console.log("ℹ️ users.is_deleted migration skipped:", (e as Error).message);
  }

  app.get("/api/pricing-rules/active", async (req: Request, res: Response) => {
    try {
      const { data, error } = await supabase
        .from("pricing_rules")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return res
          .status(404)
          .json({
            error: "No active configuration found",
            details: error.message,
          });
      }
      res.json(data);
    } catch (e) {
      console.error("/api/pricing-rules/active - Server error", e);
      res.status(500).json({ error: "Error fetching pricing rule" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, fullName, password, role } = req.body;

      // Manual validation — avoids camelCase/snake_case drizzle-zod ambiguity
      if (!email || !fullName) {
        return res
          .status(400)
          .json({ error: "email and fullName are required" });
      }

      console.log(
        `📝 Register attempt: email=${email}, role=${role || "rider"}`,
      );

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // Block registration if the account was soft-deleted
        if (existingUser.isDeleted) {
          console.log(`⛔ Register blocked: account was deleted for ${email}`);
          return res
            .status(403)
            .json({
              error:
                "This account has been deleted. Please contact support if you wish to re-register.",
            });
        }
        console.log(`⚠️ Register: user already exists: ${email}`);
        return res.status(409).json({ error: "User already exists" });
      }

      const user = await storage.createUser({
        email,
        fullName,
        password: password || null,
        role: role || "rider",
      });

      console.log(`✅ Register success: userId=${user.id}, role=${user.role}`);

      let stripeCustomerId = null;
      try {
        stripeCustomerId = await createCustomer(user.email, user.fullName);
        if (stripeCustomerId) {
          await storage.updateUser(user.id, { stripeCustomerId });
        }
      } catch (e) {
        console.warn("Failed to create Stripe customer:", e);
      }

      res.status(201).json({ user: { ...user, stripeCustomerId } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password, fullName, isGoogle } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      console.log(`🔑 Login attempt: email="${email}", isGoogle=${!!isGoogle}`);
      let user = await storage.getUserByEmail(email);
      console.log(
        `🔑 User lookup result: ${user ? `found (id=${user.id})` : "NOT FOUND"}`,
      );

      // If user not found and it's a Google sign-in, auto-create the account
      if (!user) {
        if (isGoogle) {
          try {
            user = await storage.createUser({
              id: `user_${Date.now()}`,
              email,
              fullName: fullName || email.split("@")[0],
              password: "",
              role: "rider",
            });
            console.log(`✅ Auto-created user for Google sign-in: ${email}`);
          } catch (createErr) {
            console.error("Failed to auto-create Google user:", createErr);
            require("fs").writeFileSync(
              "debug.log",
              String(createErr) +
                "\n" +
                JSON.stringify(
                  createErr,
                  Object.getOwnPropertyNames(createErr as Error),
                ),
            );
            return res.status(500).json({ error: "Failed to create account" });
          }
        } else {
          return res.status(401).json({ error: "Invalid credentials" });
        }
      } else if (!isGoogle) {
        // Block login if account is soft-deleted
        if (user.isDeleted) {
          console.log(`⛔ Login blocked: account was deleted for ${email}`);
          return res
            .status(403)
            .json({ error: "This account has been deleted." });
        }
        // Security logic: check if standard login attempts have matching passwords
        if (user.password) {
          // User has a stored password — verify it matches
          if (user.password !== password) {
            return res.status(401).json({ error: "Invalid email or password" });
          }
        } else {
          // User exists but has no password stored (e.g. created via admin panel)
          // Set the provided password as their new password (first-time setup)
          if (password) {
            await storage.updateUser(user.id, { password });
            console.log(`🔐 Password set for existing user: ${email}`);
          }
        }
      }

      // Block login for Google users if account is soft-deleted
      if (user && user.isDeleted) {
        console.log(`⛔ Login blocked: account was deleted for ${email}`);
        return res
          .status(403)
          .json({ error: "This account has been deleted." });
      }

      res.json({ user: await withResolvedUserRole(user) });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/send-reset-otp", async (req: Request, res: Response) => {
    try {
      const rawEmail = String(req.body?.email || "").trim();
      if (!rawEmail) {
        return res.status(400).json({ error: "Email is required" });
      }

      const emailKey = rawEmail.toLowerCase();

      // Case-insensitive lookup — accounts may have been stored with mixed case.
      let user = await storage.getUserByEmail(rawEmail);
      if (!user && rawEmail !== emailKey) {
        user = await storage.getUserByEmail(emailKey);
      }
      if (!user) {
        const { data: byIlike } = await supabase
          .from("users")
          .select("*")
          .ilike("email", emailKey)
          .maybeSingle();
        if (byIlike) {
          user = {
            id: byIlike.id,
            email: byIlike.email,
            fullName: byIlike.full_name,
          } as any;
        }
      }
      if (!user) {
        return res
          .status(404)
          .json({ error: "No account found with this email" });
      }

      // Password-reset emails are sent by Supabase Auth (dashboard SMTP / mailer).
      await ensureAuthUserForEmail(emailKey, user.fullName);

      const redirectTo =
        String(req.body?.redirectTo || "").trim() ||
        "uto://auth/reset-password";

      const sendResult = await sendSupabasePasswordResetEmail(
        emailKey,
        redirectTo,
      );
      if (!sendResult.success) {
        console.error(
          `❌ Password-reset email failed for ${emailKey}:`,
          sendResult.error,
        );
        return res.status(503).json({
          error:
            sendResult.error ||
            "Failed to send verification email. Please try again shortly.",
          success: false,
        });
      }

      res.json({
        success: true,
        message: `Verification email sent to ${emailKey}`,
      });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to send verification code",
      });
    }
  });

  app.post(
    "/api/auth/verify-reset-otp",
    async (req: Request, res: Response) => {
      try {
        const email = String(req.body?.email || "")
          .trim()
          .toLowerCase();
        const code = String(req.body?.code || "").trim();
        if (!email || !code) {
          return res.status(400).json({ error: "Email and code are required" });
        }

        const result = await verifySupabaseRecoveryOtp(email, code);
        if (!result.success) {
          return res.status(400).json({
            error: result.error || "Invalid or expired verification code",
          });
        }

        verifiedEmails.set(email, {
          expiresAt: Date.now() + 10 * 60 * 1000,
          authUserId: result.authUserId,
        });

        res.json({ success: true, message: "Verification successful" });
      } catch (error) {
        console.error("Verify OTP error:", error);
        res.status(500).json({ error: "Validation failed" });
      }
    },
  );

  // Magic-link recovery: client opens uto://… with access_token, then confirms here.
  app.post(
    "/api/auth/confirm-recovery",
    async (req: Request, res: Response) => {
      try {
        const accessToken = String(req.body?.accessToken || "").trim();
        if (!accessToken) {
          return res.status(400).json({ error: "accessToken is required" });
        }

        const result = await verifySupabaseRecoveryAccessToken(accessToken);
        if (!result.success) {
          return res.status(400).json({
            error: result.error || "Invalid or expired recovery link",
          });
        }

        verifiedEmails.set(result.email, {
          expiresAt: Date.now() + 10 * 60 * 1000,
          authUserId: result.authUserId,
        });

        res.json({
          success: true,
          email: result.email,
          message: "Recovery link verified",
        });
      } catch (error) {
        console.error("Confirm recovery error:", error);
        res.status(500).json({ error: "Failed to confirm recovery link" });
      }
    },
  );

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();
      const { newPassword } = req.body;

      if (!email || !newPassword) {
        return res
          .status(400)
          .json({ error: "Email and new password are required" });
      }

      if (String(newPassword).length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters" });
      }

      const verified = verifiedEmails.get(email);

      if (!verified || Date.now() > verified.expiresAt) {
        return res.status(403).json({
          error: "Email verification is required before resetting password",
        });
      }

      let user = await storage.getUserByEmail(email);
      if (!user) {
        const { data: byIlike } = await supabase
          .from("users")
          .select("id, email")
          .ilike("email", email)
          .maybeSingle();
        if (byIlike) {
          user = { id: byIlike.id, email: byIlike.email } as any;
        }
      }
      if (!user) {
        return res
          .status(404)
          .json({ error: "No account found with this email" });
      }

      // Keep Auth + app password in sync (login still uses public.users.password).
      let authUserId = verified.authUserId;
      if (!authUserId) {
        const authUser = await ensureAuthUserForEmail(email, user.fullName);
        authUserId = authUser.id;
      }
      const authUpdate = await updateSupabaseAuthPassword(
        authUserId,
        String(newPassword),
      );
      if (!authUpdate.success) {
        console.error(
          "❌ Failed to update Supabase Auth password:",
          authUpdate.error,
        );
        return res.status(500).json({
          error: authUpdate.error || "Failed to update Auth password",
        });
      }

      await storage.updateUser(user.id, { password: newPassword });
      verifiedEmails.delete(email);

      res.json({ success: true });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.id as string);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user: await withResolvedUserRole(user) });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.put("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.updateUser(req.params.id as string, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user: await withResolvedUserRole(user) });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.post("/api/users/:id/upload", async (req: Request, res: Response) => {
    try {
      const { base64, mimeType } = req.body;
      const user = await storage.getUser(req.params.id as string);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!base64) {
        return res.status(400).json({ error: "Missing base64 image data" });
      }

      const identifier = user.email || user.id;
      const folderName = identifier.replace(/[^a-zA-Z0-9@._-]/g, "_");

      const { supabase: sb } = await import("./db");

      const buffer = Buffer.from(base64, "base64");
      const ext = mimeType?.split("/")[1] || "jpg";
      const fileName = `${folderName}/profile-${Date.now()}.${ext}`;

      const { data, error } = await sb.storage
        .from("avatars")
        .upload(fileName, buffer, {
          contentType: mimeType || "image/jpeg",
          upsert: true,
        });

      if (error) {
        console.error("Supabase storage upload error:", error);
        return res.status(500).json({ error: error.message });
      }

      const { data: publicUrlData } = sb.storage
        .from("avatars")
        .getPublicUrl(fileName);

      await storage.updateUser(user.id, {
        profileImage: publicUrlData.publicUrl,
      });

      res.status(200).json({ url: publicUrlData.publicUrl });
    } catch (error: any) {
      console.error("Profile image upload error:", error);
      res
        .status(500)
        .json({ error: error?.message || "Failed to upload image" });
    }
  });

  app.put("/api/users/:id/push-token", async (req: Request, res: Response) => {
    try {
      const { pushToken } = req.body;
      const user = await storage.updateUser(req.params.id as string, {
        pushToken,
      });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Update push token error:", error);
      res.status(500).json({ error: "Failed to update push token" });
    }
  });

  // ─── Soft Delete Account ───
  app.post(
    "/api/users/:id/delete-account",
    async (req: Request, res: Response) => {
      try {
        const userId = req.params.id as string;
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Helper: attempt the soft-delete update
        const attemptSoftDelete = async () => {
          const { data, error } = await supabase
            .from("users")
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq("id", userId)
            .select()
            .single();
          return { data, error };
        };

        let { data: deletedUser, error: deleteErr } = await attemptSoftDelete();

        // If column is missing from schema cache, create it and retry
        if (deleteErr && deleteErr.message?.includes("is_deleted")) {
          console.warn("⚠️ is_deleted column missing, attempting to add it...");
          try {
            // Try via RPC first
            await supabase.rpc("exec_sql", {
              sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;`,
            });
          } catch (_rpcErr) {
            // RPC may not exist; try via raw REST SQL endpoint as fallback
            try {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
              const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
              if (supabaseUrl && serviceKey) {
                await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    apikey: serviceKey,
                    Authorization: `Bearer ${serviceKey}`,
                  },
                  body: JSON.stringify({
                    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;`,
                  }),
                });
              }
            } catch (_fetchErr) {
              console.warn(
                "⚠️ Could not create is_deleted column via REST either",
              );
            }
          }

          // Retry after attempting column creation
          const retry = await attemptSoftDelete();
          deletedUser = retry.data;
          deleteErr = retry.error;
        }

        if (deleteErr) {
          console.error(
            `❌ Soft-delete failed:`,
            deleteErr.message,
            deleteErr.code,
          );
          return res
            .status(500)
            .json({ error: `Failed to delete account: ${deleteErr.message}` });
        }

        console.log(
          `🗑️ Account soft-deleted: userId=${userId}, email=${user.email}`,
        );
        res.json({
          success: true,
          message: "Account has been deleted successfully.",
        });
      } catch (error) {
        console.error("Delete account error:", error);
        res.status(500).json({ error: "Failed to delete account" });
      }
    },
  );

  app.post("/api/drivers", async (req: Request, res: Response) => {
    try {
      const {
        userId,
        vehicleType,
        vehicleMake,
        vehicleModel,
        licensePlate,
        isOnline,
        isAvailable,
        vehicleYear,
        vehicleColor,
        councilLicence,
        badgeNo,
      } = req.body;

      // Manual validation — userId is always required
      if (!userId) {
        return res.status(400).json({
          error: "userId is required",
        });
      }

      console.log(
        `🚗 Creating driver record: userId=${userId}, council=${councilLicence || "N/A"}, badge=${badgeNo || "N/A"}, plate=${licensePlate || "N/A"}`,
      );

      const driver = await storage.createDriver({
        userId,
        vehicleType: vehicleType || "standard",
        vehicleMake: vehicleMake || "Pending",
        vehicleModel: vehicleModel || "Pending",
        vehicleYear: vehicleYear || null,
        vehicleColor: vehicleColor || null,
        licensePlate: licensePlate || "PENDING",
        councilLicence: councilLicence || null,
        badgeNo: badgeNo || null,
        isOnline: isOnline ?? false,
        isAvailable: isAvailable ?? true,
      });

      console.log(
        `✅ Driver record created: driverId=${driver.id}, userId=${userId}`,
      );
      res.status(201).json({ driver });
    } catch (error) {
      console.error("Create driver error:", error);
      res.status(500).json({ error: "Failed to create driver" });
    }
  });

  app.post("/api/driver/location", async (req: Request, res: Response) => {
    try {
      const { driverId, latitude, longitude, heading, speed } = req.body;

      if (!driverId) {
        return res.status(400).json({ error: "driverId is required" });
      }
      if (latitude == null || longitude == null) {
        return res
          .status(400)
          .json({ error: "latitude and longitude are required" });
      }

      // Clients may send drivers.id OR users.id — resolve to the drivers table id
      // so location always lands on the row dispatch uses for 5-mile matching.
      let resolvedDriverId = String(driverId);
      let resolvedUserId: string | null = null;
      try {
        const { data: byId } = await supabase
          .from("drivers")
          .select("id, user_id")
          .eq("id", resolvedDriverId)
          .maybeSingle();
        if (byId?.id) {
          resolvedDriverId = byId.id;
          resolvedUserId = byId.user_id || null;
        } else {
          const { data: byUser } = await supabase
            .from("drivers")
            .select("id, user_id")
            .eq("user_id", resolvedDriverId)
            .maybeSingle();
          if (byUser?.id) {
            resolvedDriverId = byUser.id;
            resolvedUserId = byUser.user_id || String(driverId);
          }
        }
      } catch (resolveErr) {
        console.warn(
          "⚠️ Could not resolve driver id for location update:",
          resolveErr,
        );
      }

      // Heartbeat: keep the driver online + store latest coords. Availability is
      // still derived from live ride state during dispatch, but is_online must
      // stay true while location updates are flowing or matching will miss them.
      const { data: driver, error: driverUpdateErr } = await supabase
        .from("drivers")
        .update({
          current_latitude: latitude,
          current_longitude: longitude,
          last_seen_at: new Date().toISOString(),
          is_online: true,
        })
        .eq("id", resolvedDriverId)
        .select("id")
        .maybeSingle();

      if (driverUpdateErr || !driver) {
        // Fallback: try by user_id when the client sent an auth user id
        const byUser = await supabase
          .from("drivers")
          .update({
            current_latitude: latitude,
            current_longitude: longitude,
            last_seen_at: new Date().toISOString(),
            is_online: true,
          })
          .eq("user_id", String(driverId))
          .select("id")
          .maybeSingle();
        if (byUser.error || !byUser.data) {
          const fallback = await storage.updateDriver(resolvedDriverId, {
            currentLatitude: latitude,
            currentLongitude: longitude,
            isOnline: true,
          });
          if (!fallback) {
            return res.status(404).json({ error: "Driver not found" });
          }
        } else {
          resolvedDriverId = byUser.data.id;
        }
      }

      // 2. Insert into location history (best-effort — table may not exist yet)
      try {
        await supabase.from("driver_locations").insert({
          driver_id: resolvedDriverId,
          latitude,
          longitude,
          heading: heading ?? null,
          speed: speed ?? null,
        });
      } catch (historyErr) {
        console.warn(
          "⚠️ Could not insert driver_locations history (table may not exist):",
          historyErr,
        );
      }

      // 3. Broadcast location to riders with active rides
      try {
        const activeRides = await storage.getRidesByDriver(resolvedDriverId);
        for (const ride of activeRides) {
          if (["accepted", "arriving", "in_progress"].includes(ride.status)) {
            io.to(`rider:${ride.riderId}`).emit("driver:location", {
              driverId: resolvedDriverId,
              latitude,
              longitude,
              heading,
              speed,
            });
          }
        }
      } catch (broadcastErr) {
        console.warn(
          "⚠️ Could not broadcast driver location to riders:",
          broadcastErr,
        );
      }

      // 4. Return pending assigned later-booking so background location task
      // can surface a local notification when Expo push was missed.
      let pendingAssignedBooking: any = null;
      try {
        const matchIds = Array.from(
          new Set(
            [resolvedDriverId, resolvedUserId, String(driverId)].filter(
              Boolean,
            ),
          ),
        );
        const matchOr = matchIds
          .flatMap((id) => [`assigned_driver_id.eq.${id}`, `driver_id.eq.${id}`])
          .join(",");
        const pendingStatuses = ["scheduled", "marketplace", "assigned"];
        const [laterRes, webRes] = await Promise.all([
          supabase
            .from("later_bookings")
            .select(
              "id, pickup_address, dropoff_address, estimated_fare, driver_fare, status, assigned_driver_id, driver_id, source_table",
            )
            .or(matchOr)
            .in("status", pendingStatuses)
            .limit(5),
          supabase
            .from("web_booker")
            .select(
              "id, pickup_address, dropoff_address, estimated_fare, driver_fare, status, assigned_driver_id, driver_id",
            )
            .or(matchOr)
            .in("status", pendingStatuses)
            .limit(5),
        ]);
        const rows = [
          ...(laterRes.data || []).map((r: any) => ({
            ...r,
            source_table: "later_bookings",
          })),
          ...(webRes.data || []).map((r: any) => ({
            ...r,
            source_table: "web_booker",
          })),
        ].filter((r: any) => {
          const assigned = String(r.assigned_driver_id || r.driver_id || "");
          return matchIds.some((id) => String(id) === assigned);
        });
        if (rows.length > 0) {
          const row = rows[0];
          const fare = Number(row.driver_fare ?? row.estimated_fare ?? 0);
          pendingAssignedBooking = {
            id: row.id,
            pickup_address: row.pickup_address,
            dropoff_address: row.dropoff_address,
            estimated_fare: fare,
            driver_fare: fare,
            status: row.status,
            source_table: row.source_table,
          };
        }
      } catch (pendingErr) {
        console.warn(
          "⚠️ Could not load pending assigned booking for location heartbeat:",
          pendingErr,
        );
      }

      // Also recover the driver's current sequential ASAP offer. This lets the
      // background task show a local alert when Expo push delivery was missed.
      let pendingRideRequest: any = null;
      try {
        pendingRideRequest =
          (await scheduledRideHooks.getPendingDispatchForDriver?.(
            resolvedDriverId,
          )) || null;
      } catch (pendingRideErr) {
        console.warn(
          "⚠️ Could not load pending ASAP offer for location heartbeat:",
          pendingRideErr,
        );
      }

      res.json({
        success: true,
        pendingAssignedBooking,
        pendingRideRequest,
      });
    } catch (error) {
      console.error("Error updating driver location:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  app.get("/api/drivers/online", async (req: Request, res: Response) => {
    try {
      const onlineDrivers = await storage.getOnlineDrivers();
      res.json({ drivers: onlineDrivers });
    } catch (error) {
      console.error("Get online drivers error:", error);
      res.status(500).json({ error: "Failed to get online drivers" });
    }
  });

  app.get("/api/drivers/:id", async (req: Request, res: Response) => {
    try {
      const driver = await storage.getDriver(req.params.id as string);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      res.json({ driver });
    } catch (error) {
      console.error("Get driver error:", error);
      res.status(500).json({ error: "Failed to get driver" });
    }
  });

  app.get(
    "/api/drivers/:id/active-rides",
    async (req: Request, res: Response) => {
      try {
        const requestedDriverId = req.params.id as string;
        if (!requestedDriverId) {
          return res.status(400).json({ error: "Driver id is required" });
        }

        // Accept either drivers.id or users.id to keep this endpoint resilient.
        let resolvedDriverId = requestedDriverId;
        const directDriver = await storage.getDriver(requestedDriverId);
        if (!directDriver) {
          const byUserId = await storage.getDriverByUserId(requestedDriverId);
          if (!byUserId) {
            return res.status(404).json({ error: "Driver not found" });
          }
          resolvedDriverId = byUserId.id;
        }

        const activeStatuses = [
          "accepted",
          "arrived",
          "in_progress",
          "arriving",
          "at_pickup",
        ];
        const { data: rideRows, error: ridesErr } = await supabase
          .from("rides")
          .select("*")
          .eq("driver_id", resolvedDriverId)
          .in("status", activeStatuses)
          .order("accepted_at", { ascending: false, nullsFirst: false });

        if (ridesErr) {
          console.error("Get driver active rides error:", ridesErr);
          return res
            .status(500)
            .json({ error: "Failed to fetch active rides" });
        }

        // A stale DB status must never lock a driver into an old ride after
        // reinstall/login. Terminal timestamps take precedence over status,
        // and non-terminal rides are only restorable for a bounded period.
        const nowMs = Date.now();
        const ACCEPTED_MAX_AGE_MS = 6 * 60 * 60 * 1000;
        const IN_PROGRESS_MAX_AGE_MS = 18 * 60 * 60 * 1000;
        const validRides: any[] = [];

        const closeStaleRide = async (
          ride: any,
          status: "cancelled" | "completed",
          reason: string,
        ) => {
          const payload: Record<string, any> =
            status === "completed"
              ? { status: "completed" }
              : {
                  status: "cancelled",
                  cancelled_at: ride.cancelled_at || new Date().toISOString(),
                  cancelled_by: ride.cancelled_by || "system",
                  cancellation_fee: 0,
                  cancellation_reason: reason,
                };

          let cleanup = await supabase
            .from("rides")
            .update(payload)
            .eq("id", ride.id)
            .in("status", activeStatuses);

          // Older schemas can lack optional cancellation columns.
          if (cleanup.error) {
            cleanup = await supabase
              .from("rides")
              .update(
                status === "completed"
                  ? { status: "completed" }
                  : {
                      status: "cancelled",
                      cancelled_at:
                        ride.cancelled_at || new Date().toISOString(),
                    },
              )
              .eq("id", ride.id)
              .in("status", activeStatuses);
          }

          if (cleanup.error) {
            console.warn(
              `⚠️ Could not close stale active ride ${ride.id}:`,
              cleanup.error.message,
            );
            return;
          }

          const bookingId = extractScheduledBookingId(ride.id);
          if (bookingId) {
            for (const table of ["later_bookings", "web_booker"] as const) {
              try {
                await supabase
                  .from(table)
                  .update({
                    status,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", bookingId);
              } catch (_) {
                // The ride row is already closed; booking sync is best-effort.
              }
            }
          }

          io.to(`driver:${resolvedDriverId}`).emit("ride:update", {
            rideId: ride.id,
            status,
            cancelledBy: status === "cancelled" ? "system" : undefined,
          });
          console.log(
            `🧹 Closed stale driver ride ${ride.id} as ${status}: ${reason}`,
          );
        };

        for (const ride of rideRows || []) {
          if (ride.completed_at) {
            await closeStaleRide(
              ride,
              "completed",
              "completed_timestamp_present",
            );
            continue;
          }
          if (ride.cancelled_at) {
            await closeStaleRide(
              ride,
              "cancelled",
              "cancelled_timestamp_present",
            );
            continue;
          }

          const status = String(ride.status || "").toLowerCase();
          const anchorValue =
            status === "in_progress"
              ? ride.started_at ||
                ride.accepted_at ||
                ride.requested_at ||
                ride.created_at
              : ride.accepted_at || ride.requested_at || ride.created_at;
          const anchorMs = anchorValue
            ? new Date(anchorValue).getTime()
            : Number.NaN;
          const maxAgeMs =
            status === "in_progress"
              ? IN_PROGRESS_MAX_AGE_MS
              : ACCEPTED_MAX_AGE_MS;
          const isStale =
            !Number.isFinite(anchorMs) ||
            anchorMs <= 0 ||
            nowMs - anchorMs > maxAgeMs;

          if (isStale) {
            await closeStaleRide(
              ride,
              "cancelled",
              "stale_active_ride_auto_closed",
            );
            continue;
          }

          // A driver can have only one active ride. Keep the newest valid row
          // and close any older duplicate assignments.
          if (validRides.length > 0) {
            await closeStaleRide(
              ride,
              "cancelled",
              "superseded_duplicate_active_ride",
            );
            continue;
          }

          validRides.push(ride);
        }

        const rides = validRides;
        const riderIds = Array.from(
          new Set(
            (rides || [])
              .map((r: any) => r.rider_id)
              .filter((id: any) => typeof id === "string" && id.length > 0),
          ),
        );

        let riderById = new Map<string, any>();
        if (riderIds.length > 0) {
          const { data: riders, error: riderErr } = await supabase
            .from("users")
            .select("id, full_name, phone")
            .in("id", riderIds);
          if (!riderErr && riders) {
            riderById = new Map((riders as any[]).map((r) => [r.id, r]));
          }
        }

        const normalized = (rides || []).map((ride: any) => {
          const rider = riderById.get(ride.rider_id);
          return {
            id: ride.id,
            riderId: ride.rider_id,
            riderName: rider?.full_name || "Rider",
            riderPhone: rider?.phone || "",
            status: ride.status,
            pickupAddress: ride.pickup_address,
            pickupLatitude: ride.pickup_latitude,
            pickupLongitude: ride.pickup_longitude,
            dropoffAddress: ride.dropoff_address,
            dropoffLatitude: ride.dropoff_latitude,
            dropoffLongitude: ride.dropoff_longitude,
            estimatedPrice: ride.estimated_price,
            finalPrice: ride.final_price,
            discountAmount: ride.discount_amount || 0,
            couponCode: ride.coupon_code || null,
            distance: ride.distance,
            estimatedDuration: ride.estimated_duration,
            paymentMethod: ride.payment_method || "card",
            otp: ride.otp || null,
            walletDeduction: ride.wallet_deduction || 0,
            expectedCollectAmount:
              ride.expected_collect_amount !== undefined &&
              ride.expected_collect_amount !== null
                ? ride.expected_collect_amount
                : Math.max(
                    0,
                    Number(ride.estimated_price || 0) -
                      Number(ride.discount_amount || 0),
                  ),
          };
        });

        res.json({ rides: normalized });
      } catch (error) {
        console.error("Get driver active rides exception:", error);
        res.status(500).json({ error: "Failed to fetch active rides" });
      }
    },
  );

  app.get(
    "/api/drivers/:id/pending-dispatch",
    async (req: Request, res: Response) => {
      try {
        const requestedDriverId = req.params.id as string;
        if (!requestedDriverId) {
          return res.status(400).json({ error: "Driver id is required" });
        }

        let resolvedDriverId = requestedDriverId;
        const directDriver = await storage.getDriver(requestedDriverId);
        if (!directDriver) {
          const byUserId = await storage.getDriverByUserId(requestedDriverId);
          if (!byUserId) {
            return res.status(404).json({ error: "Driver not found" });
          }
          resolvedDriverId = byUserId.id;
        }

        const pendingRide =
          await scheduledRideHooks.getPendingDispatchForDriver?.(
            resolvedDriverId,
          );
        if (!pendingRide) {
          return res.json({ ride: null });
        }

        res.json({ ride: pendingRide });
      } catch (error) {
        console.error("Get pending dispatch exception:", error);
        res.status(500).json({ error: "Failed to fetch pending dispatch" });
      }
    },
  );

  app.get("/api/rides/:rideId/vias", async (req: Request, res: Response) => {
    try {
      const rideId = req.params.rideId as string;
      if (!rideId) return res.status(400).json({ error: "rideId is required" });
      const { data, error } = await supabase
        .from("ride_vias")
        .select("id, ride_id, sequence_order, address, latitude, longitude")
        .eq("ride_id", rideId)
        .order("sequence_order", { ascending: true });
      if (error) {
        return res.status(200).json({ vias: [] });
      }
      res.json({
        vias: (data || []).map((row: any) => ({
          address: row.address,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          sequenceOrder: Number(row.sequence_order),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to load vias" });
    }
  });

  app.post(
    "/api/rides/:rideId/start-trip",
    async (req: Request, res: Response) => {
      try {
        const rideId = req.params.rideId as string;
        const { pin, driverId } = req.body || {};
        if (!rideId || !pin || !driverId) {
          return res
            .status(400)
            .json({ error: "rideId, pin, and driverId are required" });
        }

        let resolvedDriverId = String(driverId);
        const directDriver = await storage.getDriver(resolvedDriverId);
        if (!directDriver) {
          const byUserId = await storage.getDriverByUserId(resolvedDriverId);
          if (!byUserId) {
            return res.status(404).json({ error: "Driver not found" });
          }
          resolvedDriverId = byUserId.id;
        }

        const { data: ride, error: rideErr } = await supabase
          .from("rides")
          .select("id, driver_id, status, otp, rider_id")
          .eq("id", rideId)
          .maybeSingle();

        if (rideErr || !ride) {
          return res.status(404).json({ error: "Ride not found" });
        }

        if (ride.driver_id && ride.driver_id !== resolvedDriverId) {
          return res
            .status(403)
            .json({ error: "This ride is assigned to another driver" });
        }

        if (
          !["accepted", "arrived", "at_pickup", "arriving"].includes(
            String(ride.status || "").toLowerCase(),
          )
        ) {
          return res
            .status(400)
            .json({ error: `Cannot start ride in status: ${ride.status}` });
        }

        const expectedPin = String(ride.otp || "").trim();
        if (!expectedPin || String(pin).trim() !== expectedPin) {
          return res.status(400).json({ error: "Invalid PIN" });
        }

        const startedAt = new Date().toISOString();
        const { data: updatedRide, error: updateErr } = await supabase
          .from("rides")
          .update({
            status: "in_progress",
            started_at: startedAt,
            driver_id: resolvedDriverId,
          })
          .eq("id", rideId)
          .select()
          .single();

        if (updateErr) {
          return res
            .status(500)
            .json({ error: updateErr.message || "Failed to start ride" });
        }

        io.to(`rider:${ride.rider_id}`).emit("ride:update", {
          rideId,
          status: "in_progress",
          startedAt,
        });
        io.to(`driver:${resolvedDriverId}`).emit("ride:update", {
          rideId,
          status: "in_progress",
          startedAt,
        });

        // Keep scheduled booking row in sync when this live ride came from later_bookings / web_booker
        try {
          const schedMatch = String(rideId).match(/^sched_([0-9a-f-]{36})_/i);
          const bookingIdFromRide = schedMatch?.[1] || null;
          // Prefer live_ride_id link; fall back to booking id embedded in sched_ live-ride ids
          // (live_ride_id column may be missing on older schemas).
          await supabase
            .from("later_bookings")
            .update({ status: "in_progress" })
            .eq("live_ride_id", rideId);
          await supabase
            .from("web_booker")
            .update({ status: "in_progress" })
            .eq("live_ride_id", rideId);
          if (bookingIdFromRide) {
            await supabase
              .from("later_bookings")
              .update({ status: "in_progress" })
              .eq("id", bookingIdFromRide);
            await supabase
              .from("web_booker")
              .update({ status: "in_progress" })
              .eq("id", bookingIdFromRide);
          }
        } catch (syncErr) {
          console.warn(
            "⚠️ Could not sync scheduled booking status to in_progress:",
            syncErr,
          );
        }

        res.json({ success: true, ride: updatedRide });
      } catch (error: any) {
        console.error("Start trip error:", error);
        res
          .status(500)
          .json({ error: error?.message || "Failed to start trip" });
      }
    },
  );

  app.get("/api/drivers/user/:userId", async (req: Request, res: Response) => {
    try {
      const driver = await storage.getDriverByUserId(
        req.params.userId as string,
      );
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      res.json({ driver });
    } catch (error) {
      console.error("Get driver by user error:", error);
      res.status(500).json({ error: "Failed to get driver" });
    }
  });

  app.get(
    "/api/drivers/:id/deductions",
    async (req: Request, res: Response) => {
      try {
        const deductions = await storage.getDriverDeductions(
          req.params.id as string,
        );
        // Prevent caching to ensure fresh deductions data
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
        res.json({ deductions });
      } catch (error) {
        console.error("Get driver deductions error:", error);
        res.status(500).json({ error: "Failed to get driver deductions" });
      }
    },
  );

  app.put("/api/drivers/:id", async (req: Request, res: Response) => {
    try {
      const driver = await storage.updateDriver(
        req.params.id as string,
        req.body,
      );
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      res.json({ driver });
    } catch (error) {
      console.error("Update driver error:", error);
      res.status(500).json({ error: "Failed to update driver" });
    }
  });

  app.post("/api/drivers/:id/upload", async (req: Request, res: Response) => {
    try {
      const { base64, docType, mimeType } = req.body;
      const rawDriverId = req.params.id as string;
      let driver = await storage.getDriver(rawDriverId);
      if (!driver) {
        driver = await storage.getDriverByUserId(rawDriverId);
      }
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      if (!base64 || !docType) {
        return res.status(400).json({ error: "Missing base64 or docType" });
      }

      // Fetch the actual user to get their email address for easier folder recognition
      const user = await storage.getUser(driver.userId);
      const identifier = user?.email || driver.userId;
      // Sanitize email string to avoid invalid storage characters
      const folderName = identifier.replace(/[^a-zA-Z0-9@._-]/g, "_");

      // We dynamically import supabase inside the endpoint like later-bookings does
      const { supabase: sb } = await import("./db");

      const buffer = Buffer.from(base64, "base64");
      const ext = mimeType?.split("/")[1] || "jpg";
      const fileName = `${folderName}/${docType}-${Date.now()}.${ext}`;

      const { data, error } = await sb.storage
        .from("driver_documents")
        .upload(fileName, buffer, {
          contentType: mimeType || "image/jpeg",
          upsert: true,
        });

      if (error) {
        console.error("Supabase storage upload error:", error);
        return res.status(500).json({ error: error.message });
      }

      // Generate the public URL
      const { data: publicUrlData } = sb.storage
        .from("driver_documents")
        .getPublicUrl(fileName);
      const publicUrl = publicUrlData.publicUrl;

      if (/^document[A-Za-z0-9]+Url$/.test(docType)) {
        const statusKey = docType.replace(/Url$/, "Status");
        const updatedDriver = await storage.updateDriver(driver.id, {
          [docType]: publicUrl,
          [statusKey]: "pending",
        });
        if (!updatedDriver) {
          console.error(
            `❌ Uploaded ${docType} but failed to persist driver profile ${driver.id}`,
          );
          return res
            .status(500)
            .json({
              error:
                "Document uploaded but failed to save to driver profile. Please try again.",
            });
        }
      }

      res.status(200).json({ url: publicUrl, driverId: driver.id });
    } catch (error: any) {
      console.error("Document upload error:", error);
      res
        .status(500)
        .json({ error: error?.message || "Failed to upload document" });
    }
  });

  app.post("/api/rides", async (req: Request, res: Response) => {
    try {
      const parsed = insertRideSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const ride = await storage.createRide(parsed.data);

      io.emit("ride:new", ride);

      res.status(201).json({ ride });
    } catch (error) {
      console.error("Create ride error:", error);
      res.status(500).json({ error: "Failed to create ride" });
    }
  });

  app.get("/api/rides/:id", async (req: Request, res: Response) => {
    try {
      const ride = await storage.getRide(req.params.id as string);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      res.json({ ride });
    } catch (error) {
      console.error("Get ride error:", error);
      res.status(500).json({ error: "Failed to get ride" });
    }
  });

  app.get("/api/rides/rider/:riderId", async (req: Request, res: Response) => {
    try {
      const rides = await storage.getRidesByRider(req.params.riderId as string);
      res.json({ rides });
    } catch (error) {
      console.error("Get rider rides error:", error);
      res.status(500).json({ error: "Failed to get rides" });
    }
  });

  app.get(
    "/api/rides/driver/:driverId",
    async (req: Request, res: Response) => {
      try {
        const rides = await storage.getRidesByDriver(
          req.params.driverId as string,
        );
        res.json({ rides });
      } catch (error) {
        console.error("Get driver rides error:", error);
        res.status(500).json({ error: "Failed to get rides" });
      }
    },
  );

  app.put("/api/rides/:id", async (req: Request, res: Response) => {
    try {
      const ride = await storage.updateRide(req.params.id as string, req.body);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      io.to(`rider:${ride.riderId}`).emit("ride:update", ride);
      if (ride.driverId) {
        io.to(`driver:${ride.driverId}`).emit("ride:update", ride);
      }

      res.json({ ride });
    } catch (error) {
      console.error("Update ride error:", error);
      res.status(500).json({ error: "Failed to update ride" });
    }
  });

  app.post(
    "/api/payments/create-intent",
    async (req: Request, res: Response) => {
      try {
        const { amount, customerId, rideId, captureMethod } = req.body;

        if (!amount || amount <= 0) {
          return res.status(400).json({ error: "Invalid amount" });
        }

        // Default to manual capture so booking only places a hold; money is
        // taken later on complete / no-show / late rider cancel.
        const result = await createPaymentIntent(amount, "gbp", customerId, {
          captureMethod: captureMethod === "automatic" ? "automatic" : "manual",
          rideId: typeof rideId === "string" ? rideId : undefined,
        });
        if (!result) {
          return res
            .status(500)
            .json({ error: "Failed to create payment intent" });
        }

        res.json(result);
      } catch (error) {
        console.error("Create payment intent error:", error);
        res.status(500).json({ error: "Failed to create payment intent" });
      }
    },
  );

  app.post(
    "/api/payments/authorize-ride",
    async (req: Request, res: Response) => {
      try {
        const { userId, rideId, amount } = req.body;

        if (!userId || !rideId || !amount || amount <= 0) {
          return res
            .status(400)
            .json({
              error: "userId, rideId and a positive amount are required",
            });
        }

        const user = await storage.getUser(userId as string);
        if (!user) return res.status(404).json({ error: "User not found" });

        let customerId = user.stripeCustomerId;
        if (!customerId) {
          customerId = await createCustomer(
            user.email,
            user.fullName || "User",
          );
          if (customerId) {
            await storage.updateUser(userId as string, {
              stripeCustomerId: customerId,
            });
          }
        }

        if (!customerId) {
          return res
            .status(400)
            .json({ error: "No Stripe customer available" });
        }

        const result = await authorizeSavedCard(
          customerId,
          Number(amount),
          String(rideId),
          "gbp",
        );
        if (!result.success) {
          return res
            .status(402)
            .json({ error: result.error || "Failed to authorize saved card" });
        }

        res.json({ success: true, paymentIntentId: result.paymentIntentId });
      } catch (error) {
        console.error("Authorize ride payment error:", error);
        res.status(500).json({ error: "Failed to authorize ride payment" });
      }
    },
  );

  app.get(
    "/api/payments/methods/:userId",
    async (req: Request, res: Response) => {
      try {
        const user = await storage.getUser(req.params.userId as string);
        if (!user) return res.status(404).json({ error: "User not found" });

        if (!user.stripeCustomerId) {
          return res.json([]);
        }

        const methods = await getPaymentMethods(user.stripeCustomerId);
        res.json(methods);
      } catch (error) {
        console.error("Get payment methods error:", error);
        res.status(500).json({ error: "Failed to fetch payment methods" });
      }
    },
  );

  app.delete(
    "/api/payments/methods/:methodId",
    async (req: Request, res: Response) => {
      try {
        const success = await deletePaymentMethod(
          req.params.methodId as string,
        );
        if (success) {
          res.json({ success: true });
        } else {
          res.status(500).json({ error: "Failed to delete payment method" });
        }
      } catch (error) {
        console.error("Delete payment method error:", error);
        res.status(500).json({ error: "Failed to delete payment method" });
      }
    },
  );

  app.post(
    "/api/payments/setup-intent",
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.body;

        if (!userId) {
          return res.status(400).json({ error: "Missing user ID" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        let customerId = user.stripeCustomerId;
        if (!customerId) {
          customerId = await createCustomer(
            user.email,
            user.fullName || "User",
          );
          if (customerId) {
            await storage.updateUser(userId, { stripeCustomerId: customerId });
          } else {
            return res
              .status(500)
              .json({ error: "Failed to create Stripe customer" });
          }
        }

        const result = await createSetupIntent(customerId);
        if (!result) {
          return res
            .status(500)
            .json({ error: "Failed to create setup intent" });
        }

        res.json(result);
      } catch (error) {
        console.error("Create setup intent error:", error);
        res.status(500).json({ error: "Failed to create setup intent" });
      }
    },
  );

  app.post("/api/payments/confirm", async (req: Request, res: Response) => {
    try {
      const { paymentIntentId, rideId, userId, amount } = req.body;

      const success = await confirmPayment(paymentIntentId);

      if (success) {
        await storage.createPayment({
          rideId,
          userId,
          amount,
          currency: "gbp",
          status: "succeeded",
          stripePaymentIntentId: paymentIntentId,
          paymentMethod: "card",
        });

        await storage.updateRide(rideId, {
          paymentStatus: "paid",
          paymentIntentId,
        });
      }

      res.json({ success });
    } catch (error) {
      console.error("Confirm payment error:", error);
      res.status(500).json({ error: "Failed to confirm payment" });
    }
  });

  app.get(
    "/api/users/:userId/wallet/transactions",
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const { data, error } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Fetch wallet transactions error (Supabase):", error);
          return res
            .status(500)
            .json({ error: "Failed to fetch wallet transactions" });
        }

        // Map to camelCase convention if needed, though client uses standard properties
        const transactions =
          data?.map((t: any) => ({
            id: t.id,
            userId: t.user_id,
            rideId: t.ride_id,
            amount: t.amount,
            type: t.type,
            description: t.description,
            createdAt: t.created_at,
          })) || [];

        res.json({ transactions });
      } catch (error) {
        console.error("Server error reading wallet:", error);
        res.status(500).json({ error: "Failed to fetch wallet transactions" });
      }
    },
  );

  app.post(
    "/api/users/:userId/wallet/transactions",
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const { rideId, amount, type, description } = req.body;

        if (!amount || !type) {
          return res
            .status(400)
            .json({ error: "Amount and type are required" });
        }

        const { data, error } = await supabase
          .from("wallet_transactions")
          .insert({
            user_id: userId,
            ride_id: rideId || null,
            amount,
            type,
            description: description || "",
          })
          .select()
          .single();

        if (error) {
          console.error("Insert wallet transaction error:", error);
          return res
            .status(500)
            .json({ error: "Failed to record wallet transaction" });
        }

        res.status(201).json({ transaction: data });
      } catch (error) {
        console.error("Server error recording wallet transaction:", error);
        res.status(500).json({ error: "Failed to record wallet transaction" });
      }
    },
  );
  app.get("/api/places/saved/:userId", async (req: Request, res: Response) => {
    try {
      const places = await storage.getSavedPlaces(req.params.userId as string);
      res.json({ places });
    } catch (error) {
      console.error("Get saved places error:", error);
      res.status(500).json({ error: "Failed to get saved places" });
    }
  });

  app.post("/api/places/saved", async (req: Request, res: Response) => {
    try {
      const place = await storage.createSavedPlace(req.body);
      res.status(201).json({ place });
    } catch (error) {
      console.error("Create saved place error:", error);
      res.status(500).json({ error: "Failed to create saved place" });
    }
  });

  app.delete("/api/places/saved/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteSavedPlace(req.params.id as string);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete saved place error:", error);
      res.status(500).json({ error: "Failed to delete saved place" });
    }
  });

  app.put("/api/places/saved/:id", async (req: Request, res: Response) => {
    try {
      const { name, address } = req.body;
      const snakeData: any = {};
      if (name !== undefined) snakeData.name = name;
      if (address !== undefined) snakeData.address = address;

      const { data, error } = await supabase
        .from("saved_places")
        .update(snakeData)
        .eq("id", req.params.id as string)
        .select()
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Place not found" });
      }
      res.json({ place: data });
    } catch (error) {
      console.error("Update saved place error:", error);
      res.status(500).json({ error: "Failed to update saved place" });
    }
  });

  app.get("/api/places/autocomplete", async (req: Request, res: Response) => {
    try {
      const { input, sessiontoken } = req.query as {
        input?: string;
        sessiontoken?: string;
      };

      if (!input) {
        return res.status(400).json({ error: "Input is required" });
      }

      if (!process.env.GOOGLE_PLACES_API_KEY) {
        console.warn(
          "⚠️ GOOGLE_PLACES_API_KEY is not set — returning mock predictions",
        );
        return res.json({
          predictions: [
            {
              place_id: "mock_1",
              description: "London, UK",
              structured_formatting: {
                main_text: "London",
                secondary_text: "UK",
              },
            },
            {
              place_id: "mock_2",
              description: "Manchester, UK",
              structured_formatting: {
                main_text: "Manchester",
                secondary_text: "UK",
              },
            },
            {
              place_id: "mock_3",
              description: "Birmingham, UK",
              structured_formatting: {
                main_text: "Birmingham",
                secondary_text: "UK",
              },
            },
          ],
        });
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          input as string,
        )}&key=${process.env.GOOGLE_PLACES_API_KEY}&components=country:gb&sessiontoken=${sessiontoken || ""}`,
      );

      const data = await response.json();

      // Handle Google API errors (invalid key, over quota, etc.)
      if (
        data.status &&
        data.status !== "OK" &&
        data.status !== "ZERO_RESULTS"
      ) {
        console.error(
          `❌ Google Places Autocomplete API error: status=${data.status}, message=${data.error_message || "none"}`,
        );
        return res.status(502).json({
          error: `Google Places API error: ${data.error_message || data.status}`,
          predictions: [],
          status: data.status,
        });
      }

      res.json(data);
    } catch (error) {
      console.error("Places autocomplete error:", error);
      res
        .status(500)
        .json({ error: "Failed to get autocomplete results", predictions: [] });
    }
  });

  app.get(
    "/api/places/details/:placeId",
    async (req: Request, res: Response) => {
      try {
        const { placeId } = req.params;

        if (!process.env.GOOGLE_PLACES_API_KEY) {
          console.warn(
            "⚠️ GOOGLE_PLACES_API_KEY is not set — returning mock place details",
          );
          return res.json({
            result: {
              geometry: {
                location: { lat: 51.5074, lng: -0.1278 },
              },
              formatted_address: "London, UK",
            },
          });
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${process.env.GOOGLE_PLACES_API_KEY}`,
        );

        const data = await response.json();

        // Handle Google API errors
        if (data.status && data.status !== "OK") {
          console.error(
            `❌ Google Places Details API error: status=${data.status}, message=${data.error_message || "none"}`,
          );
          return res.status(502).json({
            error: `Google Places API error: ${data.error_message || data.status}`,
            status: data.status,
          });
        }

        res.json(data);
      } catch (error) {
        console.error("Places details error:", error);
        res.status(500).json({ error: "Failed to get place details" });
      }
    },
  );

  // Google Directions API for route polylines
  app.get("/api/directions", async (req: Request, res: Response) => {
    try {
      const { origin, destination, waypoints } = req.query as {
        origin?: string;
        destination?: string;
        waypoints?: string;
      };

      if (!origin || !destination) {
        return res
          .status(400)
          .json({ error: "Origin and destination are required" });
      }

      const generateMockRoute = () => {
        const originCoords = (origin as string).split(",").map(Number);
        const destCoords = (destination as string).split(",").map(Number);
        const viaCoords: number[][] = [];
        if (waypoints) {
          String(waypoints)
            .split("|")
            .map((p) => p.trim())
            .filter(Boolean)
            .forEach((p) => {
              const parts = p.split(",").map(Number);
              if (
                parts.length >= 2 &&
                Number.isFinite(parts[0]) &&
                Number.isFinite(parts[1])
              ) {
                viaCoords.push([parts[0], parts[1]]);
              }
            });
        }

        const pointsChain = [originCoords, ...viaCoords, destCoords];
        const legs: any[] = [];
        const points: { latitude: number; longitude: number }[] = [];

        for (let i = 0; i < pointsChain.length - 1; i++) {
          const a = pointsChain[i];
          const b = pointsChain[i + 1];
          const latDiff = b[0] - a[0];
          const lngDiff = b[1] - a[1];
          const distanceKm =
            Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
          const distanceMeters = Math.round(distanceKm * 1000);
          const durationSeconds = Math.round(distanceKm * 120);
          legs.push({
            distance: {
              text: `${(distanceKm * 0.621371).toFixed(1)} mi`,
              value: distanceMeters,
            },
            duration: {
              text: `${Math.round(durationSeconds / 60)} mins`,
              value: durationSeconds,
            },
            start_location: { lat: a[0], lng: a[1] },
            end_location: { lat: b[0], lng: b[1] },
          });
          const steps = 10;
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            if (i > 0 && s === 0) continue;
            points.push({
              latitude: a[0] + latDiff * t,
              longitude: a[1] + lngDiff * t,
            });
          }
        }

        return {
          routes: [
            {
              overview_polyline: { points: "" },
              legs,
              decodedPolyline: points,
            },
          ],
          status: "OK",
        };
      };

      if (!process.env.GOOGLE_PLACES_API_KEY) {
        return res.json(generateMockRoute());
      }

      let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        origin as string,
      )}&destination=${encodeURIComponent(
        destination as string,
      )}&key=${process.env.GOOGLE_PLACES_API_KEY}&mode=driving&units=imperial&region=gb&alternatives=true&departure_time=now`;

      if (waypoints) {
        url += `&waypoints=${encodeURIComponent(waypoints as string)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" || !data.routes || data.routes.length === 0) {
        console.log(
          "Google Directions API returned non-OK status:",
          data.status,
          "- falling back to mock route",
        );
        return res.json(generateMockRoute());
      }

      // Sort routes by fastest traffic-aware duration (duration_in_traffic preferred)
      data.routes.sort((a: any, b: any) => {
        const durA =
          a.legs?.reduce(
            (sum: number, leg: any) =>
              sum +
              (leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0),
            0,
          ) || Infinity;
        const durB =
          b.legs?.reduce(
            (sum: number, leg: any) =>
              sum +
              (leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0),
            0,
          ) || Infinity;
        return durA - durB;
      });

      // For each route, replace duration with duration_in_traffic if available
      // so clients automatically see traffic-aware times
      for (const route of data.routes) {
        if (route.legs) {
          for (const leg of route.legs) {
            if (leg.duration_in_traffic) {
              // Overwrite the plain duration with the traffic-aware one
              leg.duration = leg.duration_in_traffic;
            }
          }
        }
        if (route.overview_polyline) {
          const encoded = route.overview_polyline.points;
          route.decodedPolyline = decodePolyline(encoded);
        }
      }

      res.json(data);
    } catch (error) {
      console.error("Directions error:", error);
      res.status(500).json({ error: "Failed to get directions" });
    }
  });

  // ── Scheduled Rides ────────────────────────────────────────────
  app.post("/api/scheduled-rides", async (req: Request, res: Response) => {
    try {
      const {
        riderId,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        dropoffAddress,
        dropoffLatitude,
        dropoffLongitude,
        vehicleType,
        scheduledAt,
        estimatedPrice,
      } = req.body;

      if (!riderId || !pickupAddress || !dropoffAddress || !scheduledAt) {
        return res
          .status(400)
          .json({
            error:
              "riderId, pickupAddress, dropoffAddress, and scheduledAt are required",
          });
      }

      // Validate scheduledAt is in the future
      const schedDate = new Date(scheduledAt);
      if (isNaN(schedDate.getTime()) || schedDate <= new Date()) {
        return res
          .status(400)
          .json({ error: "scheduledAt must be a valid future date/time" });
      }

      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 365);
      maxDate.setHours(23, 59, 59, 999);
      if (schedDate > maxDate) {
        return res
          .status(400)
          .json({
            error: "Cannot schedule a ride more than 365 days in advance",
          });
      }

      const now = new Date();
      const timeDiffMs = schedDate.getTime() - now.getTime();
      if (timeDiffMs < 4 * 60 * 60 * 1000) {
        return res
          .status(400)
          .json({ error: "Bookings must be made at least 4 hours in advance" });
      }

      const scheduledRide = await storage.createScheduledRide({
        riderId,
        pickupAddress,
        pickupLatitude: pickupLatitude ?? null,
        pickupLongitude: pickupLongitude ?? null,
        dropoffAddress,
        dropoffLatitude: dropoffLatitude ?? null,
        dropoffLongitude: dropoffLongitude ?? null,
        vehicleType: vehicleType || "economy",
        scheduledAt,
        estimatedPrice: estimatedPrice ?? null,
      });

      res.status(201).json({ scheduledRide });
    } catch (error) {
      console.error("Create scheduled ride error:", error);
      res.status(500).json({ error: "Failed to create scheduled ride" });
    }
  });

  app.get(
    "/api/scheduled-rides/rider/:riderId",
    async (req: Request, res: Response) => {
      try {
        const rides = await storage.getScheduledRidesByRider(
          req.params.riderId as string,
        );
        res.json({ scheduledRides: rides });
      } catch (error) {
        console.error("Get scheduled rides error:", error);
        res.status(500).json({ error: "Failed to get scheduled rides" });
      }
    },
  );

  // ── Later Bookings (Plan Your Ride) ─────────────────────────────────
  // Import supabase directly (db.ts exports `supabase`, not `db`)
  const { supabase: sb } = await import("./db");

  // ── Coupon Validation ───────────────────────────────────────────────
  app.post("/api/coupons/validate", async (req: Request, res: Response) => {
    try {
      const { code, fareAmount } = req.body;
      if (!code)
        return res.status(400).json({ error: "Coupon code is required" });

      const { data: coupon, error } = await sb
        .from("coupons")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        // .eq("is_active", true)
        .single();

      if (error || !coupon) {
        return res
          .status(404)
          .json({ error: "Invalid or expired coupon code" });
      }

      // Check expiry
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return res.status(400).json({ error: "This coupon has expired" });
      }

      // Check usage limit
      if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        return res
          .status(400)
          .json({ error: "This coupon has reached its maximum usage limit" });
      }

      // Check minimum fare
      if (coupon.min_fare && fareAmount && fareAmount < coupon.min_fare) {
        return res
          .status(400)
          .json({
            error: `Minimum fare of £${coupon.min_fare} required for this coupon`,
          });
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discount_type === "percentage" || 1 == 1) {
        discountAmount = fareAmount ? (fareAmount * coupon.discount) / 100 : 0;
      } else {
        discountAmount = coupon.discount;
      }

      // Don't let discount exceed fare
      if (fareAmount && discountAmount > fareAmount) {
        discountAmount = fareAmount;
      }

      res.json({
        valid: true,
        coupon: {
          code: coupon.code,
          discountType:
            coupon.discount_type || (coupon.discount ? "percentage" : "fixed"),
          discountValue: coupon.discount_amount || coupon.discount || 0,
          discountAmount: parseFloat(discountAmount.toFixed(2)),
          description:
            coupon.discount_type === "percentage" || coupon.discount
              ? `${coupon.discount_amount || coupon.discount}% off`
              : `£${coupon.discount_amount} off`,
        },
      });
    } catch (err: any) {
      console.error("Coupon validation error:", err);
      res.status(500).json({ error: "Failed to validate coupon" });
    }
  });

  const missingLaterBookingColumns = new Set<string>();
  const missingLaterBookingAcceptColumns = new Set<string>();
  const missingLaterBookingAssignColumns = new Set<string>();
  const missingLaterBookingDeclineColumns = new Set<string>();
  const announcedAssignedBookingKeys = new Set<string>();
  const assignmentSocketAnnouncedKeys = new Set<string>();
  const missingLaterBookingCancelColumns = new Set<string>();
  const missingLaterBookingActivationColumns = new Set<string>();
  // bookingKey → set of reminder bucket keys already sent (or skipped as missed)
  const scheduledReminderBucketsByBooking = new Map<string, Set<string>>();
  const announcedMarketplaceBookingKeys = new Set<string>();
  let lastMarketplaceReminderKey: string | null = null;

  const sendExpoPushNotification = async (
    token: string,
    title: string,
    body: string,
    data: Record<string, any> = {},
    options: { channelId?: string; ttlSeconds?: number } = {},
  ): Promise<boolean> => {
    if (!token) return false;
    try {
      // Prefer the long-lived ride-request channel so older APKs (without
      // uto-scheduled-v2) still display marketplace / assignment alerts.
      const ttlSeconds = options.ttlSeconds ?? 3600;
      const channelId = options.channelId || "uto-ride-requests-v2";

      // Expo/FCM on Android expects flat string data — null/objects can be dropped.
      const safeData: Record<string, string> = {};
      for (const [key, value] of Object.entries(data || {})) {
        if (value == null) continue;
        if (typeof value === "string") safeData[key] = value;
        else if (typeof value === "number" || typeof value === "boolean")
          safeData[key] = String(value);
        else {
          try {
            safeData[key] = JSON.stringify(value);
          } catch {
            // skip unserializable
          }
        }
      }

      const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: token,
          sound: "default",
          title,
          body,
          data: safeData,
          priority: "high",
          channelId,
          ttl: ttlSeconds,
          expiration: Math.floor(Date.now() / 1000) + ttlSeconds,
          _contentAvailable: true,
          interruptionLevel: "timeSensitive",
          mutableContent: true,
        }),
      });
      const pushBody = await pushRes.json().catch(() => null);
      const ticket = Array.isArray(pushBody?.data)
        ? pushBody.data[0]
        : pushBody?.data;
      const ok = pushRes.ok && (!ticket || ticket.status !== "error");
      if (!ok) {
        console.warn(
          `⚠️ Expo push failed (${pushRes.status}):`,
          JSON.stringify(pushBody).slice(0, 400),
        );
      } else {
        console.log(
          `📲 Expo push ok → ${String(token).slice(0, 22)}… channel=${channelId} type=${safeData?.type || "n/a"}`,
        );
      }
      return ok;
    } catch (err) {
      console.warn("⚠️ Failed to send Expo push notification:", err);
      return false;
    }
  };

  const PENDING_ASSIGNMENT_STATUSES = new Set([
    "scheduled",
    "marketplace",
    "assigned",
    "driver_assigned",
  ]);

  const OPEN_MARKETPLACE_STATUSES = new Set(["scheduled", "marketplace"]);

  const isPendingAssignmentStatus = (status: string) =>
    PENDING_ASSIGNMENT_STATUSES.has(String(status || "").toLowerCase());

  const isOpenMarketplaceStatus = (status: string) =>
    OPEN_MARKETPLACE_STATUSES.has(String(status || "").toLowerCase());

  const resolveDriverIdentity = async (driverIdOrUserId: string) => {
    if (!driverIdOrUserId) return null;
    const byId = await storage.getDriver(driverIdOrUserId);
    if (byId) {
      const driverUser = byId.userId
        ? await storage.getUser(byId.userId)
        : null;
      return {
        tableId: byId.id,
        userId: byId.userId || null,
        fullName: driverUser?.fullName || null,
      };
    }
    const byUser = await storage.getDriverByUserId(driverIdOrUserId);
    if (byUser) {
      const driverUser = byUser.userId
        ? await storage.getUser(byUser.userId)
        : null;
      return {
        tableId: byUser.id,
        userId: byUser.userId || driverIdOrUserId,
        fullName: driverUser?.fullName || null,
      };
    }
    return {
      tableId: driverIdOrUserId,
      userId: driverIdOrUserId,
      fullName: null,
    };
  };

  const resolveDriverPushToken = async (
    driverIdOrUserId: string,
  ): Promise<{
    identity: {
      tableId: string;
      userId: string | null;
      fullName: string | null;
    };
    pushToken: string | null;
  }> => {
    const identity = (await resolveDriverIdentity(driverIdOrUserId)) || {
      tableId: driverIdOrUserId,
      userId: driverIdOrUserId,
      fullName: null,
    };

    const candidateUserIds = Array.from(
      new Set(
        [identity.userId, identity.tableId, driverIdOrUserId]
          .filter(Boolean)
          .map(String),
      ),
    );

    for (const userId of candidateUserIds) {
      const { data: userRow } = await sb
        .from("users")
        .select("push_token")
        .eq("id", userId)
        .maybeSingle();
      if (userRow?.push_token) {
        return { identity, pushToken: userRow.push_token };
      }
    }

    // Last resort: drivers.user_id → users.push_token
    const { data: driverById } = await sb
      .from("drivers")
      .select("id, user_id")
      .eq("id", driverIdOrUserId)
      .maybeSingle();
    const { data: driverByUser } = driverById
      ? { data: null as any }
      : await sb
          .from("drivers")
          .select("id, user_id")
          .eq("user_id", driverIdOrUserId)
          .maybeSingle();
    const driverRow = driverById || driverByUser;
    if (driverRow?.user_id) {
      const { data: userRow } = await sb
        .from("users")
        .select("push_token")
        .eq("id", driverRow.user_id)
        .maybeSingle();
      return {
        identity: {
          tableId: driverRow.id || identity.tableId,
          userId: driverRow.user_id,
          fullName: identity.fullName,
        },
        pushToken: userRow?.push_token || null,
      };
    }

    return { identity, pushToken: null };
  };

  /** All registered driver Expo tokens (online + offline). Deduped by token string. */
  const collectAllDriverPushTokens = async (): Promise<string[]> => {
    const { data: driverRows, error } = await sb
      .from("drivers")
      .select("user_id")
      .not("user_id", "is", null);
    if (error) {
      console.warn(
        "⚠️ Failed to load drivers for push fan-out:",
        error.message,
      );
      return [];
    }

    const driverUserIds = Array.from(
      new Set(
        (driverRows || [])
          .map((row: any) => row.user_id)
          .filter(Boolean)
          .map(String),
      ),
    );
    if (driverUserIds.length === 0) return [];

    const tokens = new Set<string>();
    const chunkSize = 100;
    for (let i = 0; i < driverUserIds.length; i += chunkSize) {
      const chunk = driverUserIds.slice(i, i + chunkSize);
      const { data: users, error: usersErr } = await sb
        .from("users")
        .select("id, push_token")
        .in("id", chunk);
      if (usersErr) {
        console.warn("⚠️ Failed to load driver push tokens:", usersErr.message);
        continue;
      }
      for (const row of users || []) {
        const token = String(row?.push_token || "").trim();
        if (token) tokens.add(token);
      }
    }
    return Array.from(tokens);
  };

  const notifyDriversAboutMarketplaceBooking = async (booking: any) => {
    try {
      // Only broadcast marketplace offers for unassigned bookings.
      const assignedId = booking?.assigned_driver_id || booking?.driver_id;
      if (assignedId) {
        console.warn(
          `⚠️ Skipping marketplace notify for ${booking?.id} — still assigned to ${assignedId}`,
        );
        return false;
      }

      // Always refresh marketplace UIs first — even if nobody has a push token yet.
      try {
        emitLaterBookingSignal("created", booking);
        io.emit("later-booking:marketplace", { type: "created", booking });
      } catch (socketErr) {
        console.warn(
          `⚠️ Marketplace socket emit failed for ${booking?.id}:`,
          socketErr,
        );
      }

      // Notify EVERY driver with a push token (online or offline) — once per booking.
      const tokens = await collectAllDriverPushTokens();
      if (tokens.length === 0) {
        console.warn(
          `⚠️ Marketplace notify: no driver push tokens for booking ${booking?.id}`,
        );
        return false;
      }

      const title = "🗓 New Scheduled Ride";
      const riderLabel =
        booking?.rider_name ||
        booking?.customer_name ||
        booking?.passenger_name ||
        "rider";
      let fareLabel = "";
      try {
        const { payable } = resolveBookingPayableFare(booking);
        fareLabel = payable > 0 ? ` — £${payable.toFixed(2)}` : "";
      } catch {
        const fallback = Number(
          booking?.driver_fare ??
            booking?.estimated_fare ??
            booking?.estimated_price ??
            0,
        );
        fareLabel = fallback > 0 ? ` — £${fallback.toFixed(2)}` : "";
      }
      const body = `A booking has been scheduled by ${riderLabel}${fareLabel}. Open Marketplace to pick up ride ${booking.id}.`;

      // Use the ride-requests channel — present on all shipped APKs. uto-scheduled-v2
      // is missing on older builds and Android silently drops those notifications.
      const results = await Promise.all(
        tokens.map((token) =>
          sendExpoPushNotification(
            token,
            title,
            body,
            {
              type: "scheduled_marketplace_created",
              bookingId: booking.id,
              rideId: booking.id,
              audience: "driver",
              sourceTable: booking.source_table || booking.sourceTable || "",
              target: "Marketplace",
              screen: "Marketplace",
            },
            { channelId: "uto-ride-requests-v2", ttlSeconds: 3600 },
          ),
        ),
      );
      const sent = results.filter(Boolean).length;
      console.log(
        `📲 Marketplace push for booking ${booking.id}: ${sent}/${tokens.length} driver token(s) notified (online+offline)`,
      );
      return sent > 0;
    } catch (notifyErr) {
      console.warn(
        "⚠️ Failed to notify drivers about scheduled booking:",
        notifyErr,
      );
      return false;
    }
  };

  const bookingMatchesDriverIdentity = (
    booking: any,
    identity: { tableId: string; userId: string | null },
  ) => {
    const ids = [booking?.driver_id, booking?.assigned_driver_id]
      .filter(Boolean)
      .map((id: any) => String(id));
    if (ids.length === 0) return false;
    if (ids.includes(String(identity.tableId))) return true;
    if (identity.userId && ids.includes(String(identity.userId))) return true;
    return false;
  };

  const withPendingAssignee = (
    booking: any,
    identity: { tableId: string; userId: string | null },
  ) => {
    const assigneeId = identity.tableId || identity.userId;
    if (!booking || !assigneeId) return booking;
    return {
      ...booking,
      // Ensure socket/push clients always see who the offer is for — even when
      // the DB is missing assigned_driver_id and only stored driver_id (or vice versa).
      assigned_driver_id: booking.assigned_driver_id || assigneeId,
      driver_id: booking.driver_id || assigneeId,
      assigned_user_id: identity.userId || booking.assigned_user_id || null,
      assignment_pending: true,
    };
  };

  const emitAssignedBookingToDriver = (
    booking: any,
    identity: { tableId: string; userId: string | null },
  ) => {
    const bookingForClient = withPendingAssignee(booking, identity);
    const payload = {
      type: "assigned",
      booking: bookingForClient,
      bookingId: bookingForClient?.id,
      rideId: bookingForClient?.id,
    };
    try {
      // Minimal broadcast to refresh marketplace/upcoming lists (no PII).
      emitLaterBookingSignal("assigned", bookingForClient);
      // The full booking goes ONLY to the assigned driver's own rooms — never
      // broadcast to every client. Emit to both id forms in case they joined
      // with userId or tableId, or briefly missed the room join.
      if (identity.tableId)
        io.to(`driver:${identity.tableId}`).emit(
          "later-booking:assigned",
          payload,
        );
      if (identity.userId)
        io.to(`driver:${identity.userId}`).emit(
          "later-booking:assigned",
          payload,
        );
    } catch (err) {
      console.warn(
        `⚠️ Failed to emit assignment socket for booking ${booking?.id}:`,
        err,
      );
    }
  };

  const notifyDriverOfAssignedBooking = async (
    booking: any,
    driverIdOrUserId: string,
    options: { emitSocket?: boolean } = {},
  ): Promise<boolean> => {
    try {
      const { identity, pushToken } =
        await resolveDriverPushToken(driverIdOrUserId);
      const bookingForClient = withPendingAssignee(booking, identity);
      if (options.emitSocket !== false) {
        emitAssignedBookingToDriver(bookingForClient, identity);
      }

      if (!pushToken) {
        console.warn(
          `⚠️ No push token for assigned driver ${driverIdOrUserId} (booking ${booking.id}) — will retry`,
        );
        return false;
      }

      const pickupLabel = bookingForClient.pickup_address || "pickup";
      const fare = Number(
        bookingForClient.driver_fare ?? bookingForClient.estimated_fare ?? 0,
      );
      const fareLabel = fare > 0 ? ` — £${fare.toFixed(2)}` : "";
      const ok = await sendExpoPushNotification(
        pushToken,
        "📋 Ride Assigned To You",
        `Ride ${bookingForClient.id} has been assigned to you (${pickupLabel})${fareLabel}. Open Upcoming to Accept or Decline.`,
        {
          type: "scheduled_booking_assigned",
          bookingId: bookingForClient.id,
          rideId: bookingForClient.id,
          audience: "driver",
          sourceTable: bookingForClient.source_table || "",
          target: "UpcomingBookings",
          screen: "UpcomingBookings",
          assignedDriverId: identity.tableId || "",
          assignedUserId: identity.userId || "",
        },
        { channelId: "uto-ride-requests-v2", ttlSeconds: 3600 },
      );
      if (ok) {
        console.log(
          `📲 Assignment push sent for booking ${bookingForClient.id} → driver ${driverIdOrUserId}`,
        );
      }
      return ok;
    } catch (err) {
      console.warn(
        `⚠️ Failed to notify assigned driver for booking ${booking?.id}:`,
        err,
      );
      return false;
    }
  };

  const announceAssignedBookings = async () => {
    const [laterBookingsRaw, webBookerRaw] = await Promise.all([
      fetchLaterBookingsFromTable("later_bookings"),
      fetchLaterBookingsFromTable("web_booker"),
    ]);

    const candidates = [
      ...laterBookingsRaw.map((row: any) =>
        normalizeLaterBooking(row, "later_bookings"),
      ),
      ...webBookerRaw.map((row: any) =>
        normalizeLaterBooking(row, "web_booker"),
      ),
    ].filter((booking: any) => {
      const status = String(booking.status || "").toLowerCase();
      const assignedId = booking.assigned_driver_id || booking.driver_id;
      // Pending assignment: driver set, but not yet accepted.
      // Includes web_booker "driver_assigned" (normalized to "assigned").
      return (
        !!assignedId &&
        isPendingAssignmentStatus(status) &&
        status !== "driver_accepted"
      );
    });

    const activeKeys = new Set<string>();
    for (const booking of candidates) {
      const assignedId = String(
        booking.assigned_driver_id || booking.driver_id,
      );
      const bookingKey = `${booking.source_table}:${booking.id}:${assignedId}`;
      activeKeys.add(bookingKey);
      if (announcedAssignedBookingKeys.has(bookingKey)) continue;

      const enrichedBooking = stripPinForDrivers(
        (await attachRiderDetails([booking]))[0] || booking,
      );
      // Keep re-emitting socket until push succeeds so a driver who opens the app
      // still gets the local alert even when their push token was missing earlier.
      const pushSent = await notifyDriverOfAssignedBooking(
        enrichedBooking,
        assignedId,
        {
          emitSocket: true,
        },
      );
      assignmentSocketAnnouncedKeys.add(bookingKey);
      if (pushSent) {
        announcedAssignedBookingKeys.add(bookingKey);
      }
    }

    for (const key of Array.from(announcedAssignedBookingKeys)) {
      if (!activeKeys.has(key)) {
        announcedAssignedBookingKeys.delete(key);
      }
    }
    for (const key of Array.from(assignmentSocketAnnouncedKeys)) {
      if (!activeKeys.has(key)) {
        assignmentSocketAnnouncedKeys.delete(key);
      }
    }
  };

  const announceExternalMarketplaceBookings = async () => {
    const [laterBookingsRaw, webBookerRaw] = await Promise.all([
      fetchLaterBookingsFromTable("later_bookings"),
      fetchLaterBookingsFromTable("web_booker"),
    ]);

    const nowTs = Date.now();
    // After redeploy, only re-notify recent upcoming offers (avoid flooding old marketplace rows).
    const MAX_ANNOUNCE_AGE_MS = 6 * 60 * 60 * 1000;

    const marketplaceBookings = [
      ...laterBookingsRaw.map((row: any) =>
        normalizeLaterBooking(row, "later_bookings"),
      ),
      ...webBookerRaw.map((row: any) =>
        normalizeLaterBooking(row, "web_booker"),
      ),
    ].filter((booking: any) => {
      const status = String(booking.status || "").toLowerCase();
      const assignedId = booking.assigned_driver_id || booking.driver_id;
      if (!(isOpenMarketplaceStatus(status) && !assignedId)) return false;
      const pickupTs = pickupTimestamp(booking);
      if (!pickupTs || pickupTs <= nowTs) return false;
      const createdTs = booking.created_at
        ? new Date(booking.created_at).getTime()
        : 0;
      if (!createdTs || nowTs - createdTs > MAX_ANNOUNCE_AGE_MS) return false;
      return true;
    });

    const activeKeys = new Set<string>();
    for (const booking of marketplaceBookings) {
      const bookingKey = `${booking.source_table}:${booking.id}`;
      activeKeys.add(bookingKey);
      if (announcedMarketplaceBookingKeys.has(bookingKey)) continue;

      const enrichedBooking = stripPinForDrivers(
        (await attachRiderDetails([booking]))[0] || booking,
      );
      const pushSent =
        await notifyDriversAboutMarketplaceBooking(enrichedBooking);
      // Only mark announced after a successful push so we keep retrying.
      if (pushSent) {
        announcedMarketplaceBookingKeys.add(bookingKey);
      }
    }

    for (const key of Array.from(announcedMarketplaceBookingKeys)) {
      if (!activeKeys.has(key)) {
        announcedMarketplaceBookingKeys.delete(key);
      }
    }
  };

  // Reminder cadence for accepted scheduled jobs (with sound via Expo push):
  // 3h → 2h → 30m → 15m → 5m before pickup.
  const SCHEDULED_REMINDER_THRESHOLDS: Array<{
    key: string;
    ms: number;
    label: string;
    contactPassenger: boolean;
  }> = (() => {
    const minute = 60 * 1000;
    const hour = 60 * minute;
    return [
      { key: "3h", ms: 3 * hour, label: "3 hours", contactPassenger: false },
      { key: "2h", ms: 2 * hour, label: "2 hours", contactPassenger: false },
      {
        key: "30m",
        ms: 30 * minute,
        label: "30 minutes",
        contactPassenger: true,
      },
      {
        key: "15m",
        ms: 15 * minute,
        label: "15 minutes",
        contactPassenger: true,
      },
      { key: "5m", ms: 5 * minute, label: "5 minutes", contactPassenger: true },
    ];
  })();

  // If we first see a booking more than ~2 minutes past a threshold, treat that
  // reminder as missed (late accept / restart) instead of sending a wrong label.
  const SCHEDULED_REMINDER_MISS_GRACE_MS = 2 * 60 * 1000;

  const getNextScheduledReminderBucket = (
    msUntilPickup: number,
    alreadyHandled: Set<string>,
  ): { key: string; label: string; contactPassenger: boolean } | null => {
    if (msUntilPickup <= 0) return null;

    if (alreadyHandled.size === 0) {
      for (const threshold of SCHEDULED_REMINDER_THRESHOLDS) {
        if (msUntilPickup < threshold.ms - SCHEDULED_REMINDER_MISS_GRACE_MS) {
          alreadyHandled.add(threshold.key);
        }
      }
    }

    for (const threshold of SCHEDULED_REMINDER_THRESHOLDS) {
      if (
        msUntilPickup <= threshold.ms &&
        !alreadyHandled.has(threshold.key)
      ) {
        return threshold;
      }
    }
    return null;
  };

  const getLondonDateTimeParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const byType = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return {
      dateKey: `${byType.year}-${byType.month}-${byType.day}`,
      hour: Number(byType.hour),
      minute: Number(byType.minute),
    };
  };

  const normalizeVehicleType = (value: any): string => {
    if (!value) return "saloon";
    const normalized = String(value)
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    if (normalized === "peoplecarrier" || normalized === "people_carrier")
      return "people_carrier";
    if (normalized === "mini_bus") return "minibus";
    return normalized;
  };

  const firstNonEmpty = (...values: any[]): string | null => {
    for (const value of values) {
      if (value == null) continue;
      const text = String(value).trim();
      if (
        text.length > 0 &&
        text.toLowerCase() !== "null" &&
        text.toLowerCase() !== "undefined"
      ) {
        return text;
      }
    }
    return null;
  };

  const toFiniteNumber = (value: any): number | null => {
    if (value == null || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  /**
   * Payable fare for marketplace / upcoming / driver earnings.
   * App bookings store estimated_fare as already-discounted payable.
   * Some web_booker / admin rows store full fare + discount_amount.
   */
  const resolveBookingPayableFare = (
    booking: any,
  ): { payable: number; discount: number; full: number } => {
    const discount = Math.max(
      0,
      Number(booking?.discount_amount ?? booking?.discountAmount ?? 0),
    );
    const estimated = toFiniteNumber(booking?.estimated_fare);
    const altFull = toFiniteNumber(
      booking?.estimated_price ??
        booking?.fare ??
        booking?.full_fare ??
        booking?.original_fare,
    );
    const driverFareCol = toFiniteNumber(booking?.driver_fare);

    // Explicit driver_fare column when positive
    if (driverFareCol != null && driverFareCol > 0 && discount <= 0) {
      return { payable: driverFareCol, discount: 0, full: driverFareCol };
    }

    // App pattern: estimated_fare is payable, discount stored separately
    // (activation engine reconstructs full as estimated_fare + discount_amount).
    if (estimated != null && estimated > 0) {
      if (altFull != null && altFull > estimated + 0.009 && discount > 0) {
        // estimated is payable, alt is full
        return { payable: estimated, discount, full: altFull };
      }
      if (
        discount > 0 &&
        altFull != null &&
        Math.abs(altFull - estimated) < 0.009
      ) {
        // estimated equals full fare field → subtract discount
        const payable = getDiscountedFare(estimated, discount);
        return { payable, discount, full: estimated };
      }
      // Default: estimated_fare is the payable amount (with or without coupon)
      return {
        payable: estimated,
        discount,
        full:
          discount > 0 ? Number((estimated + discount).toFixed(2)) : estimated,
      };
    }

    if (altFull != null && altFull > 0) {
      const payable = getDiscountedFare(altFull, discount);
      return { payable, discount, full: altFull };
    }

    if (driverFareCol != null && driverFareCol > 0) {
      return {
        payable: getDiscountedFare(driverFareCol, discount),
        discount,
        full: driverFareCol,
      };
    }

    return { payable: 0, discount, full: 0 };
  };

  const normalizeLaterBooking = (
    booking: any,
    sourceTable: "later_bookings" | "web_booker",
  ) => {
    const rawStatus = String(booking?.status || "").toLowerCase();
    // web_booker uses "driver_assigned" for pending admin assignment offers.
    const status =
      rawStatus === "marketplace"
        ? "scheduled"
        : rawStatus === "driver_assigned"
          ? "assigned"
          : rawStatus || "scheduled";
    // Keep accepted driver_id separate from pending assigned_driver_id when both exist.
    const acceptedDriverId = booking?.driver_id ?? null;
    const pendingAssignedId = booking?.assigned_driver_id ?? null;
    const assignedDriverId =
      String(status) === "driver_accepted"
        ? acceptedDriverId || pendingAssignedId
        : pendingAssignedId || acceptedDriverId;
    const storedFare = Number(
      booking?.estimated_fare ?? booking?.estimated_price ?? booking?.fare ?? 0,
    );
    const discountAmount = Math.max(0, Number(booking?.discount_amount ?? 0));
    const {
      payable: payableFare,
      discount: resolvedDiscount,
      full: fullFare,
    } = resolveBookingPayableFare(booking);
    // estimated_fare / driver_fare exposed to drivers = coupon-adjusted payable only.
    const riderFare =
      payableFare > 0
        ? payableFare
        : Number.isFinite(storedFare)
          ? storedFare
          : 0;
    const driverFare = riderFare;

    // Prefer passenger/customer fields stored on the booking row (later_bookings /
    // web_booker) — these are the source of truth for marketplace & upcoming.
    const riderName = firstNonEmpty(
      booking?.rider_name,
      booking?.customer_name,
      booking?.passenger_name,
      booking?.passenger,
      booking?.full_name,
      booking?.name,
      booking?.client_name,
      booking?.booker_name,
    );
    const riderPhone = firstNonEmpty(
      booking?.rider_phone,
      booking?.customer_phone,
      booking?.passenger_phone,
      booking?.phone,
      booking?.mobile,
      booking?.contact_phone,
      booking?.telephone,
    );
    const riderEmail = firstNonEmpty(
      booking?.rider_email,
      booking?.customer_email,
      booking?.passenger_email,
      booking?.email,
      booking?.contact_email,
    );

    const pickupAddress =
      firstNonEmpty(
        booking?.pickup_address,
        booking?.pickup_location,
        booking?.pickupAddress,
        booking?.pickup,
        booking?.from_address,
        booking?.from,
      ) || "";
    const dropoffAddress =
      firstNonEmpty(
        booking?.dropoff_address,
        booking?.dropoff_location,
        booking?.dropoffAddress,
        booking?.dropoff,
        booking?.to_address,
        booking?.to,
        booking?.destination,
      ) || "";

    const passengers = toFiniteNumber(
      booking?.passengers ??
        booking?.passenger_count ??
        booking?.num_passengers ??
        booking?.pax,
    );
    const luggage = toFiniteNumber(
      booking?.luggage ??
        booking?.bags ??
        booking?.suitcases ??
        booking?.num_luggage,
    );
    const distanceMiles = toFiniteNumber(
      booking?.distance_miles ??
        booking?.distance ??
        booking?.trip_distance ??
        booking?.miles,
    );
    const durationMinutes = toFiniteNumber(
      booking?.duration_minutes ??
        booking?.estimated_duration ??
        booking?.duration ??
        booking?.trip_duration,
    );

    return {
      ...booking,
      source_table: sourceTable,
      rider_id:
        booking?.rider_id ?? booking?.user_id ?? booking?.customer_id ?? null,
      rider_name: riderName,
      rider_phone: riderPhone,
      rider_email: riderEmail,
      customer_name: firstNonEmpty(booking?.customer_name, riderName),
      passenger_name: firstNonEmpty(booking?.passenger_name, riderName),
      pickup_address: pickupAddress,
      dropoff_address: dropoffAddress,
      pickup_at:
        booking?.pickup_at ??
        booking?.scheduled_time ??
        booking?.scheduled_pickup_time ??
        booking?.pickup_time ??
        booking?.pickup_datetime ??
        null,
      dropoff_by:
        booking?.dropoff_by ??
        booking?.dropoff_time ??
        booking?.dropoff_datetime ??
        null,
      estimated_fare: riderFare > 0 ? riderFare : null,
      discount_amount: resolvedDiscount > 0 ? resolvedDiscount : discountAmount,
      full_fare: fullFare > 0 ? fullFare : null,
      driver_fare: driverFare > 0 ? driverFare : null,
      vehicle_type: normalizeVehicleType(
        booking?.vehicle_type ??
          booking?.ride_type ??
          booking?.vehicleType ??
          booking?.car_type,
      ),
      booking_type:
        firstNonEmpty(
          booking?.booking_type,
          booking?.service_type,
          booking?.type,
        ) || "standard",
      is_round_trip: !!(
        booking?.is_round_trip ??
        booking?.round_trip ??
        booking?.return_trip
      ),
      flight_number: firstNonEmpty(
        booking?.flight_number,
        booking?.flight_no,
        booking?.flight,
      ),
      passengers: passengers != null ? Math.max(1, Math.round(passengers)) : 1,
      luggage: luggage != null ? Math.max(0, Math.round(luggage)) : 0,
      payment_method:
        firstNonEmpty(booking?.payment_method, booking?.payment_type) || "card",
      // For pending offers expose assigned id; for accepted keep driver_id.
      driver_id:
        String(status) === "driver_accepted"
          ? assignedDriverId
          : acceptedDriverId || assignedDriverId,
      assigned_driver_id: assignedDriverId,
      assigned_driver_name: firstNonEmpty(
        booking?.assigned_driver_name,
        booking?.driver_name,
      ),
      distance_miles: distanceMiles,
      duration_minutes: durationMinutes,
      status,
      // Pending assignment = driver set but not yet accepted
      assignment_pending:
        !!assignedDriverId &&
        isPendingAssignmentStatus(status) &&
        status !== "driver_accepted",
    };
  };

  const pickupTimestamp = (booking: any): number => {
    const value = booking?.pickup_at
      ? new Date(booking.pickup_at).getTime()
      : NaN;
    return Number.isFinite(value) ? value : 0;
  };

  // 4-digit ride PIN, generated server-side at booking time
  const generateRidePin = (): string =>
    Math.floor(1000 + Math.random() * 9000).toString();

  // How long before the scheduled pickup a booking is converted into a live ride
  const SCHEDULED_ACTIVATION_WINDOW_MS = 60 * 60 * 1000;

  // Attach rider name / email / phone to normalized bookings (batched users lookup).
  // Booking-row fields from later_bookings / web_booker always win; users table is fallback only.
  const attachRiderDetails = async (bookings: any[]): Promise<any[]> => {
    const riderIds = Array.from(
      new Set(
        bookings
          .map((b: any) => b?.rider_id)
          .filter((id: any) => typeof id === "string" && id.length > 0),
      ),
    );

    let riderMap = new Map<string, any>();
    if (riderIds.length > 0) {
      try {
        const { data: riders, error } = await sb
          .from("users")
          .select("id, full_name, email, phone")
          .in("id", riderIds);

        if (error || !riders) {
          console.warn(
            "⚠️ Could not fetch rider details for bookings:",
            error?.message,
          );
        } else {
          riderMap = new Map(riders.map((r: any) => [r.id, r]));
        }
      } catch (err) {
        console.warn("⚠️ attachRiderDetails failed:", err);
      }
    }

    return bookings.map((booking: any) => {
      const rider = booking?.rider_id ? riderMap.get(booking.rider_id) : null;
      const riderName = firstNonEmpty(
        booking.rider_name,
        booking.customer_name,
        booking.passenger_name,
        booking.passenger,
        booking.full_name,
        booking.name,
        booking.client_name,
        booking.booker_name,
        rider?.full_name,
      );
      const riderPhone = firstNonEmpty(
        booking.rider_phone,
        booking.customer_phone,
        booking.passenger_phone,
        booking.phone,
        booking.mobile,
        booking.contact_phone,
        booking.telephone,
        rider?.phone,
      );
      const riderEmail = firstNonEmpty(
        booking.rider_email,
        booking.customer_email,
        booking.passenger_email,
        booking.email,
        booking.contact_email,
        rider?.email,
      );

      return {
        ...booking,
        rider_name: riderName,
        rider_phone: riderPhone,
        rider_email: riderEmail,
        customer_name: firstNonEmpty(booking.customer_name, riderName),
        passenger_name: firstNonEmpty(booking.passenger_name, riderName),
      };
    });
  };

  // Drivers must not see the rider's PIN before pickup — strip it from driver-facing responses
  const stripPinForDrivers = (booking: any) => {
    if (!booking || typeof booking !== "object") return booking;
    const { otp, ...rest } = booking;
    return rest;
  };

  const fetchLaterBookingsFromTable = async (
    tableName: "later_bookings" | "web_booker",
    limit = 2000,
  ) => {
    const { data, error } = await sb.from(tableName).select("*").limit(limit);
    if (error) {
      console.warn(`⚠️ Failed to read ${tableName}:`, error.message);
      return [];
    }
    return data || [];
  };

  const updateLaterBookingWithFallbackColumns = async (
    tableName: "later_bookings" | "web_booker",
    bookingId: string,
    initialPayload: any,
    missingColumnsRegistry: Set<string>,
    maxAttempts = 12,
  ) => {
    const payload: any = { ...initialPayload };
    for (const col of missingColumnsRegistry) delete payload[col];

    const discoveredMissingColumns: string[] = [];
    let data: any = null;
    let error: any = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const result = await sb
        .from(tableName)
        .update(payload)
        .eq("id", bookingId)
        .select()
        .maybeSingle();

      data = result.data;
      error = result.error;
      if (!error) break;

      const missingColumn = error.message?.match(
        /Could not find the '([^']+)' column/,
      )?.[1];
      if (!missingColumn || !(missingColumn in payload)) {
        break;
      }

      missingColumnsRegistry.add(missingColumn);
      discoveredMissingColumns.push(missingColumn);
      delete payload[missingColumn];
    }

    return { data, error, discoveredMissingColumns };
  };

  app.post("/api/later-bookings", async (req: Request, res: Response) => {
    try {
      const {
        riderId,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        dropoffAddress,
        dropoffLatitude,
        dropoffLongitude,
        pickupAt,
        dropoffBy,
        vehicleType,
        estimatedFare,
        distanceMiles: clientDistanceMiles,
        durationMinutes: clientDurationMinutes,
        flightNumber,
        isRoundTrip,
        bookingType,
        passengers,
        luggage,
        couponCode,
        discountAmount,
        paymentIntentId,
        returnPickupAddress,
        returnPickupLatitude,
        returnPickupLongitude,
        returnDropoffAddress,
        returnDropoffLatitude,
        returnDropoffLongitude,
      } = req.body;

      if (!riderId || !pickupAddress || !dropoffAddress || !pickupAt) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const pickupTime = new Date(pickupAt);
      const dropoffTime = dropoffBy ? new Date(dropoffBy) : null;
      const now = new Date();

      if (isNaN(pickupTime.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      if (pickupTime <= now) {
        return res
          .status(400)
          .json({ error: `Pickup time (${pickupAt}) must be in the future` });
      }

      const timeDiffMs = pickupTime.getTime() - now.getTime();
      if (timeDiffMs < 4 * 60 * 60 * 1000) {
        return res
          .status(400)
          .json({ error: "Bookings must be made at least 4 hours in advance" });
      }

      const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      maxDate.setHours(23, 59, 59, 999);
      if (pickupTime > maxDate) {
        return res
          .status(400)
          .json({
            error: "Pickup time cannot be more than 365 days in the future",
          });
      }

      if (dropoffTime) {
        const gapMs = dropoffTime.getTime() - pickupTime.getTime();
        if (gapMs < 30 * 60 * 1000) {
          return res
            .status(400)
            .json({
              error: `Minimum 30 minutes required between pickup and dropoff (got ${Math.round(gapMs / 60000)} min)`,
            });
        }
      }

      let finalDropoffTime = dropoffTime;
      if (!finalDropoffTime) {
        const mins = clientDurationMinutes || 30;
        finalDropoffTime = new Date(pickupTime.getTime() + mins * 60000);
      }

      const rider = await storage.getUser(riderId);
      if (!rider) {
        return res.status(404).json({ error: "Rider not found" });
      }

      let stripeCustomerId = rider.stripeCustomerId || null;
      if (!stripeCustomerId) {
        try {
          stripeCustomerId = await createCustomer(
            rider.email,
            rider.fullName || "Rider",
          );
          if (stripeCustomerId) {
            await storage.updateUser(rider.id, { stripeCustomerId });
          }
        } catch (customerErr) {
          console.warn(
            "⚠️ Failed to create Stripe customer for scheduled booking:",
            customerErr,
          );
        }
      }

      const finalEstimatedFare = Math.max(0, Number(estimatedFare ?? 0));
      const appliedDiscount = Math.max(0, Number(discountAmount ?? 0));
      // Hold only — do not take money at schedule time. Capture later on
      // complete / no-show / late rider cancel (same as on-demand rides).
      let bookingPaymentStatus = finalEstimatedFare > 0 ? "authorized" : "free";
      let prepaidPaymentIntentId: string | null = null;

      if (finalEstimatedFare > 0) {
        if (paymentIntentId) {
          const confirmed = await confirmPayment(paymentIntentId);
          if (!confirmed) {
            return res
              .status(400)
              .json({
                error:
                  "Card authorization was not completed. Please try again.",
              });
          }
          prepaidPaymentIntentId = paymentIntentId;
        } else {
          if (!stripeCustomerId) {
            return res
              .status(400)
              .json({
                error: "Please add a card before scheduling this ride.",
              });
          }

          const chargeReference = `later_${riderId}_${Date.now()}`;
          const authResult = await authorizeSavedCard(
            stripeCustomerId,
            finalEstimatedFare,
            chargeReference,
            "gbp",
          );

          if (!authResult.success || !authResult.paymentIntentId) {
            return res.status(400).json({
              error:
                authResult.error ||
                "Could not authorize your card for this scheduled ride. Please try again.",
            });
          }

          prepaidPaymentIntentId = authResult.paymentIntentId;
        }
      }

      // Pre-provide the ride PIN at booking time so the rider can see it in
      // their trip details right away (same PIN is used when the ride goes live)
      const bookingOtp = generateRidePin();

      const insertData: any = {
        rider_id: riderId,
        rider_name: rider.fullName || null,
        rider_phone: rider.phone || null,
        rider_email: rider.email || null,
        customer_name: rider.fullName || null,
        otp: bookingOtp,
        pickup_address: pickupAddress,
        pickup_latitude: pickupLatitude ?? null,
        pickup_longitude: pickupLongitude ?? null,
        dropoff_address: dropoffAddress,
        dropoff_latitude: dropoffLatitude ?? null,
        dropoff_longitude: dropoffLongitude ?? null,
        pickup_at: pickupTime.toISOString(),
        dropoff_by: finalDropoffTime.toISOString(),
        status: "scheduled",
        vehicle_type: vehicleType || "saloon",
        estimated_fare: finalEstimatedFare,
        distance_miles: clientDistanceMiles ?? null,
        duration_minutes: clientDurationMinutes ?? null,
        flight_number: flightNumber ?? null,
        is_round_trip: isRoundTrip ?? false,
        booking_type: bookingType || "standard",
        passengers: passengers ?? 1,
        luggage: luggage ?? 0,
        payment_method: "card",
        payment_status: bookingPaymentStatus,
        payment_intent_id: prepaidPaymentIntentId,
        coupon_code: couponCode ?? null,
        discount_amount: appliedDiscount,
        return_pickup_address: returnPickupAddress ?? null,
        return_pickup_latitude: returnPickupLatitude ?? null,
        return_pickup_longitude: returnPickupLongitude ?? null,
        return_dropoff_address: returnDropoffAddress ?? null,
        return_dropoff_latitude: returnDropoffLatitude ?? null,
        return_dropoff_longitude: returnDropoffLongitude ?? null,
      };

      for (const column of missingLaterBookingColumns) {
        delete insertData[column];
      }

      let data: any = null;
      let error: any = null;
      const discoveredMissingColumns: string[] = [];
      for (let attempt = 0; attempt < 25; attempt += 1) {
        const result = await sb
          .from("later_bookings")
          .insert(insertData)
          .select()
          .single();

        data = result.data;
        error = result.error;
        if (!error) {
          break;
        }

        const missingColumn = error.message?.match(
          /Could not find the '([^']+)' column/,
        )?.[1];
        if (!missingColumn || !(missingColumn in insertData)) {
          break;
        }

        missingLaterBookingColumns.add(missingColumn);
        discoveredMissingColumns.push(missingColumn);
        delete insertData[missingColumn];
      }

      if (discoveredMissingColumns.length > 0) {
        console.info(
          `ℹ️ later_bookings insert skipped missing optional columns: ${discoveredMissingColumns.join(", ")}`,
        );
      }

      if (!error) {
        error = null;
      }

      if (error) {
        console.error("Supabase insert error:", error);
        if (prepaidPaymentIntentId) {
          await releaseAuthorization(prepaidPaymentIntentId);
        }
        return res
          .status(500)
          .json({ error: error.message || "Database error" });
      }

      if (couponCode) {
        const normalizedCouponCode = couponCode?.toUpperCase()?.trim();
        const { error: couponRpcError } = await sb.rpc(
          "increment_coupon_usage",
          { coupon_code: normalizedCouponCode },
        );
        if (couponRpcError) {
          const { data: couponData } = await sb
            .from("coupons")
            .select("used_count")
            .eq("code", normalizedCouponCode)
            .single();
          if (couponData) {
            await sb
              .from("coupons")
              .update({ used_count: (couponData.used_count || 0) + 1 })
              .eq("code", normalizedCouponCode);
          }
        }
      }

      // Notify all drivers that a new marketplace booking is available.
      const createdBooking = stripPinForDrivers(
        normalizeLaterBooking(
          {
            ...data,
            rider_name: data.rider_name || rider.fullName || null,
            rider_phone: data.rider_phone || rider.phone || null,
            rider_email: data.rider_email || rider.email || null,
          },
          "later_bookings",
        ),
      );
      const marketplaceKey = `later_bookings:${data.id}`;
      const pushSent =
        await notifyDriversAboutMarketplaceBooking(createdBooking);
      if (pushSent) {
        announcedMarketplaceBookingKeys.add(marketplaceKey);
      } else {
        announcedMarketplaceBookingKeys.delete(marketplaceKey);
      }

      res
        .status(201)
        .json({ booking: { ...data, ...createdBooking, otp: data.otp } });
    } catch (error: any) {
      console.error("Create later booking error:", error);
      res
        .status(500)
        .json({ error: error?.message || "Failed to create booking" });
    }
  });

  app.get("/api/later-bookings", async (req: Request, res: Response) => {
    try {
      const driverId =
        typeof req.query.driverId === "string" ? req.query.driverId : undefined;
      const nowTs = Date.now();
      const driverIdentity = driverId
        ? await resolveDriverIdentity(driverId)
        : null;

      const [laterBookingsRaw, webBookerRaw] = await Promise.all([
        fetchLaterBookingsFromTable("later_bookings"),
        fetchLaterBookingsFromTable("web_booker"),
      ]);

      const bookings = [
        ...laterBookingsRaw.map((row: any) =>
          normalizeLaterBooking(row, "later_bookings"),
        ),
        ...webBookerRaw.map((row: any) =>
          normalizeLaterBooking(row, "web_booker"),
        ),
      ]
        .filter(
          (booking: any) =>
            booking.pickup_at &&
            booking.pickup_address &&
            booking.dropoff_address,
        )
        .filter((booking: any) => {
          const status = String(booking.status || "").toLowerCase();
          const bookingDriverId =
            booking.driver_id || booking.assigned_driver_id;
          const bookingPickupTs = pickupTimestamp(booking);
          const isAssigned = !!bookingDriverId;

          if (driverId && driverIdentity) {
            // Accepted rides for this driver
            if (status === "driver_accepted") {
              return bookingMatchesDriverIdentity(booking, driverIdentity);
            }
            // Cancelled history for this driver
            if (status === "cancelled") {
              return bookingMatchesDriverIdentity(booking, driverIdentity);
            }
            // Pending assignment offer — only the assigned driver sees it (Upcoming)
            if (
              isPendingAssignmentStatus(status) &&
              status !== "driver_accepted" &&
              isAssigned
            ) {
              return bookingMatchesDriverIdentity(booking, driverIdentity);
            }
            // Open marketplace — unassigned only, outside activation window
            if (isOpenMarketplaceStatus(status) && !isAssigned) {
              return (
                bookingPickupTs >= nowTs + SCHEDULED_ACTIVATION_WINDOW_MS &&
                !booking.activated_at
              );
            }
            return false;
          }

          return (
            status === "scheduled" ||
            status === "driver_accepted" ||
            status === "marketplace" ||
            status === "assigned" ||
            status === "driver_assigned"
          );
        })
        .sort((a: any, b: any) => pickupTimestamp(a) - pickupTimestamp(b));

      const enrichedBookings = (await attachRiderDetails(bookings)).map(
        stripPinForDrivers,
      );

      res.json({ bookings: enrichedBookings });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error?.message || "Failed to fetch bookings" });
    }
  });

  app.get(
    "/api/later-bookings/rider/:riderId",
    async (req: Request, res: Response) => {
      try {
        const riderId = req.params.riderId as string;
        if (!riderId) {
          return res.status(400).json({ error: "riderId is required" });
        }

        const [laterBookingsRaw, webBookerRaw] = await Promise.all([
          fetchLaterBookingsFromTable("later_bookings"),
          fetchLaterBookingsFromTable("web_booker"),
        ]);

        const bookings = [
          ...laterBookingsRaw.map((row: any) =>
            normalizeLaterBooking(row, "later_bookings"),
          ),
          ...webBookerRaw.map((row: any) =>
            normalizeLaterBooking(row, "web_booker"),
          ),
        ]
          .filter((booking: any) => String(booking.rider_id || "") === riderId)
          .sort((a: any, b: any) => pickupTimestamp(a) - pickupTimestamp(b));

        // Ensure every active scheduled booking has a PIN the rider can share at pickup.
        const withPins = [];
        for (const booking of bookings) {
          const status = String(booking.status || "").toLowerCase();
          const needsPin =
            !booking.otp && status !== "cancelled" && status !== "completed";
          if (needsPin && booking.source_table && booking.id) {
            const otp = generateRidePin();
            await updateLaterBookingWithFallbackColumns(
              booking.source_table,
              booking.id,
              { otp },
              missingLaterBookingActivationColumns,
            );
            withPins.push({ ...booking, otp });
          } else {
            withPins.push(booking);
          }
        }

        res.json({ bookings: withPins });
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error?.message || "Failed to fetch bookings" });
      }
    },
  );

  app.get("/api/later-bookings/:id", async (req: Request, res: Response) => {
    try {
      const bookingId = req.params.id as string;

      const webFetch = await sb
        .from("web_booker")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();
      if (webFetch.data) {
        const normalized = normalizeLaterBooking(webFetch.data, "web_booker");
        const [enriched] = await attachRiderDetails([normalized]);
        return res.json({ booking: stripPinForDrivers(enriched) });
      }

      const laterFetch = await sb
        .from("later_bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();
      if (laterFetch.data) {
        const normalized = normalizeLaterBooking(
          laterFetch.data,
          "later_bookings",
        );
        const [enriched] = await attachRiderDetails([normalized]);
        return res.json({ booking: stripPinForDrivers(enriched) });
      }

      return res.status(404).json({ error: "Booking not found" });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: error?.message || "Failed to fetch booking" });
    }
  });

  /**
   * Driver taps Start Trip on an accepted upcoming booking.
   * Creates the live ride on demand (with the rider's booking PIN) so the driver
   * can enter PIN immediately — does not wait for the 60‑minute poller.
   *
   * NOTE: Some Supabase schemas are missing otp / live_ride_id / activated_at on
   * later_bookings / web_booker. Those fields are best-effort; activating the
   * live `rides` row must still succeed so PIN start works.
   */
  app.post(
    "/api/later-bookings/:id/prepare-start",
    async (req: Request, res: Response) => {
      try {
        const bookingId = req.params.id as string;
        const { driverId } = req.body || {};
        if (!bookingId || !driverId) {
          return res
            .status(400)
            .json({ error: "bookingId and driverId are required" });
        }

        const identity = await resolveDriverIdentity(String(driverId));
        if (!identity?.tableId) {
          return res.status(404).json({ error: "Driver not found" });
        }

        let sourceTable: "later_bookings" | "web_booker" | null = null;
        let raw: any = null;
        const laterFetch = await sb
          .from("later_bookings")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();
        if (laterFetch.data) {
          sourceTable = "later_bookings";
          raw = laterFetch.data;
        } else {
          const webFetch = await sb
            .from("web_booker")
            .select("*")
            .eq("id", bookingId)
            .maybeSingle();
          if (webFetch.data) {
            sourceTable = "web_booker";
            raw = webFetch.data;
          }
        }
        if (!sourceTable || !raw) {
          return res.status(404).json({ error: "Booking not found" });
        }

        const booking = normalizeLaterBooking(raw, sourceTable);
        const status = String(booking.status || "").toLowerCase();
        if (status === "completed" || status === "cancelled") {
          return res
            .status(400)
            .json({ error: `Cannot start a ${status} booking` });
        }
        // Allow start for accepted bookings; also tolerate in_progress if a live ride already exists.
        if (status !== "driver_accepted" && status !== "in_progress") {
          return res
            .status(400)
            .json({ error: "Only accepted upcoming bookings can be started" });
        }
        if (!bookingMatchesDriverIdentity(booking, identity)) {
          return res
            .status(403)
            .json({ error: "This booking is assigned to another driver" });
        }

        const nowTs = Date.now();
        const pickupTs = pickupTimestamp(booking);
        const msUntilPickup = pickupTs - nowTs;
        const START_EARLY_MS = SCHEDULED_ACTIVATION_WINDOW_MS; // 60 min before
        const START_LATE_MS = 30 * 60 * 1000; // 30 min after pickup

        // Reuse an existing live ride linked on the booking OR created earlier with sched_ prefix
        // (when live_ride_id column is missing from the booking table).
        let existingLiveId = booking.live_ride_id
          ? String(booking.live_ride_id)
          : null;
        if (!existingLiveId) {
          try {
            const { data: existingByPrefix } = await sb
              .from("rides")
              .select("id, status, driver_id, otp, created_at")
              .like("id", `sched_${bookingId}_%`)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (existingByPrefix?.id)
              existingLiveId = String(existingByPrefix.id);
          } catch (lookupErr) {
            console.warn(
              `⚠️ prepare-start existing ride lookup failed for ${bookingId}:`,
              lookupErr,
            );
          }
        }

        if (!existingLiveId) {
          if (!pickupTs) {
            return res
              .status(400)
              .json({ error: "Booking has no pickup time" });
          }
          if (msUntilPickup > START_EARLY_MS) {
            const mins = Math.ceil(msUntilPickup / 60000);
            return res.status(400).json({
              error: `This ride can be started from 60 minutes before pickup (about ${mins} minutes remaining).`,
              minutesUntilEligible: Math.max(0, mins - 60),
            });
          }
          if (msUntilPickup < -START_LATE_MS) {
            return res
              .status(400)
              .json({
                error: "The pickup window for this booking has expired.",
              });
          }
        }

        // Ensure PIN exists (in-memory + best-effort persist; otp column may be missing)
        let otp =
          typeof booking.otp === "string" && booking.otp.trim()
            ? String(booking.otp).trim()
            : null;
        if (!otp && existingLiveId) {
          const { data: rideForPin } = await sb
            .from("rides")
            .select("otp")
            .eq("id", existingLiveId)
            .maybeSingle();
          if (rideForPin?.otp) otp = String(rideForPin.otp);
        }
        if (!otp) {
          otp = generateRidePin();
        }
        await updateLaterBookingWithFallbackColumns(
          sourceTable,
          bookingId,
          { otp },
          missingLaterBookingActivationColumns,
        );

        if (existingLiveId) {
          const { data: existingRide } = await sb
            .from("rides")
            .select("id, status, driver_id, otp")
            .eq("id", existingLiveId)
            .maybeSingle();

          if (existingRide) {
            const rideStatus = String(existingRide.status || "").toLowerCase();
            if (rideStatus === "completed" || rideStatus === "cancelled") {
              // Stale link — fall through and create a fresh live ride
            } else if (rideStatus === "in_progress") {
              return res.json({
                success: true,
                alreadyStarted: true,
                liveRideId: existingRide.id,
                booking: stripPinForDrivers({
                  ...booking,
                  live_ride_id: existingRide.id,
                  status: "in_progress",
                  otp,
                }),
              });
            } else if (
              [
                "accepted",
                "arrived",
                "at_pickup",
                "arriving",
                "pending",
              ].includes(rideStatus)
            ) {
              if (otp && String(existingRide.otp || "") !== otp) {
                await sb
                  .from("rides")
                  .update({ otp, driver_id: identity.tableId })
                  .eq("id", existingRide.id);
              } else if (
                String(existingRide.driver_id || "") !==
                String(identity.tableId)
              ) {
                await sb
                  .from("rides")
                  .update({ driver_id: identity.tableId })
                  .eq("id", existingRide.id);
              }
              // Best-effort re-link on booking row
              await updateLaterBookingWithFallbackColumns(
                sourceTable,
                bookingId,
                {
                  live_ride_id: existingRide.id,
                  activated_at: new Date().toISOString(),
                  otp,
                },
                missingLaterBookingActivationColumns,
              );
              return res.json({
                success: true,
                liveRideId: existingRide.id,
                booking: stripPinForDrivers({
                  ...booking,
                  live_ride_id: existingRide.id,
                  otp,
                }),
              });
            }
          }
        }

        const [enriched] = await attachRiderDetails([booking]);
        const liveRideId = `sched_${bookingId}_${Date.now().toString(36)}`;
        const rideData = {
          id: liveRideId,
          riderId: enriched.rider_id,
          riderName: enriched.rider_name || "Rider",
          riderPhone: enriched.rider_phone || "",
          riderEmail: enriched.rider_email || "",
          rideType: enriched.vehicle_type || "saloon",
          vehicleType: enriched.vehicle_type || "saloon",
          pickupLocation: {
            address: enriched.pickup_address || "Unknown",
            latitude: Number(enriched.pickup_latitude) || 0,
            longitude: Number(enriched.pickup_longitude) || 0,
          },
          dropoffLocation: {
            address: enriched.dropoff_address || "Unknown",
            latitude: Number(enriched.dropoff_latitude) || 0,
            longitude: Number(enriched.dropoff_longitude) || 0,
          },
          farePrice:
            Number(
              (
                Number(enriched.estimated_fare || 0) +
                Number(enriched.discount_amount || 0)
              ).toFixed(2),
            ) || 0,
          estimatedPrice:
            Number(
              (
                Number(enriched.estimated_fare || 0) +
                Number(enriched.discount_amount || 0)
              ).toFixed(2),
            ) || 0,
          discountAmount: Number(enriched.discount_amount || 0),
          couponCode: enriched.coupon_code || null,
          distanceMiles: Number(enriched.distance_miles) || 0,
          durationMinutes: Number(enriched.duration_minutes) || 0,
          paymentMethod: enriched.payment_method || "card",
          paymentStatus: enriched.payment_status || null,
          paymentIntentId: enriched.payment_intent_id || null,
          otp,
          isScheduledBooking: true,
          scheduledBookingId: bookingId,
          scheduledPickupAt: enriched.pickup_at,
          sourceTable,
        };

        // Activate live ride FIRST — do not block on optional booking columns.
        const handedOver =
          await scheduledRideHooks.activateAcceptedScheduledRide?.(
            rideData,
            identity.tableId,
          );
        if (!handedOver) {
          return res
            .status(500)
            .json({
              error: "Could not activate the live ride. Please try again.",
            });
        }

        // Best-effort: persist live link / PIN on booking when columns exist.
        const markPayload: Record<string, any> = {
          activated_at: new Date().toISOString(),
          live_ride_id: liveRideId,
          otp,
          status: "driver_accepted",
        };
        for (const col of missingLaterBookingActivationColumns)
          delete markPayload[col];
        // Always keep status update even if activation columns are missing
        markPayload.status = "driver_accepted";

        let markResult: {
          data: any;
          error: any;
          discoveredMissingColumns?: string[];
        } = {
          data: null,
          error: null,
          discoveredMissingColumns: [],
        };
        if (Object.keys(markPayload).length > 0) {
          markResult = await updateLaterBookingWithFallbackColumns(
            sourceTable,
            bookingId,
            markPayload,
            missingLaterBookingActivationColumns,
          );
        }
        if (markResult.error) {
          console.warn(
            `⚠️ prepare-start: live ride ${liveRideId} created but booking ${bookingId} could not be updated:`,
            markResult.error.message,
          );
        } else if (markResult.discoveredMissingColumns?.length) {
          console.info(
            `ℹ️ prepare-start skipped missing booking columns: ${markResult.discoveredMissingColumns.join(", ")}`,
          );
        }

        emitLaterBookingSignal("activated", {
          ...enriched,
          live_ride_id: liveRideId,
        });

        console.log(
          `🚀 prepare-start: booking ${bookingId} → live ride ${liveRideId} for driver ${identity.tableId}`,
        );
        return res.json({
          success: true,
          liveRideId,
          booking: stripPinForDrivers({
            ...enriched,
            live_ride_id: liveRideId,
            activated_at: new Date().toISOString(),
            otp,
          }),
        });
      } catch (error: any) {
        console.error("prepare-start error:", error);
        return res
          .status(500)
          .json({ error: error?.message || "Failed to prepare ride start" });
      }
    },
  );

  app.put(
    "/api/later-bookings/:id/accept",
    async (req: Request, res: Response) => {
      try {
        const bookingId = req.params.id as string;
        const { driverId } = req.body;
        const updateData: any = {
          status: "driver_accepted",
          updated_at: new Date().toISOString(),
        };

        if (driverId) {
          const identity = await resolveDriverIdentity(String(driverId));
          updateData.driver_id = identity?.tableId || driverId;
          updateData.assigned_driver_id = identity?.tableId || driverId;
          if (identity?.fullName) {
            updateData.assigned_driver_name = identity.fullName;
          }
          updateData.accepted_by_driver_at = new Date().toISOString();
        }

        let sourceTable: "web_booker" | "later_bookings" | null = null;
        let existingBooking: any = null;
        const webFetch = await sb
          .from("web_booker")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();
        if (webFetch.error) {
          console.warn(
            `⚠️ web_booker accept lookup failed for booking ${bookingId}:`,
            webFetch.error.message,
          );
        }
        if (webFetch.data) {
          sourceTable = "web_booker";
          existingBooking = webFetch.data;
        } else {
          const laterFetch = await sb
            .from("later_bookings")
            .select("*")
            .eq("id", bookingId)
            .maybeSingle();
          if (laterFetch.error) {
            console.warn(
              `⚠️ later_bookings accept lookup failed for booking ${bookingId}:`,
              laterFetch.error.message,
            );
          }
          if (laterFetch.data) {
            sourceTable = "later_bookings";
            existingBooking = laterFetch.data;
          }
        }

        if (!sourceTable) {
          return res.status(404).json({ error: "Booking not found" });
        }

        // Once a booking has been activated (converted to a live ride within the
        // activation window) it can only be accepted through the live dispatch flow.
        if (existingBooking?.activated_at || existingBooking?.live_ride_id) {
          return res
            .status(400)
            .json({
              error: "This booking is now being dispatched as a live ride",
            });
        }

        // If already assigned to a specific driver, only that driver may accept.
        const existingAssignedId =
          existingBooking.assigned_driver_id || existingBooking.driver_id;
        if (existingAssignedId && driverId) {
          const identity = await resolveDriverIdentity(String(driverId));
          if (
            identity &&
            !bookingMatchesDriverIdentity(
              normalizeLaterBooking(existingBooking, sourceTable),
              identity,
            )
          ) {
            return res
              .status(403)
              .json({ error: "This booking is assigned to another driver" });
          }
        }

        const updateResult = await updateLaterBookingWithFallbackColumns(
          sourceTable,
          bookingId,
          updateData,
          missingLaterBookingAcceptColumns,
        );
        if (updateResult.discoveredMissingColumns.length > 0) {
          console.info(
            `ℹ️ ${sourceTable} accept skipped missing optional columns: ${updateResult.discoveredMissingColumns.join(", ")}`,
          );
        }

        if (updateResult.error)
          return res.status(500).json({ error: updateResult.error.message });
        if (!updateResult.data) {
          return res.status(404).json({ error: "Booking not found" });
        }

        const normalizedBooking = normalizeLaterBooking(
          updateResult.data,
          sourceTable,
        );
        const [enrichedBooking] = (
          await attachRiderDetails([normalizedBooking])
        ).map(stripPinForDrivers);
        emitLaterBookingSignal("accepted", enrichedBooking);
        res.json({ booking: enrichedBooking });
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error?.message || "Failed to accept booking" });
      }
    },
  );

  app.put(
    "/api/later-bookings/:id/assign",
    async (req: Request, res: Response) => {
      try {
        const bookingId = req.params.id as string;
        const { driverId, driverName } = req.body || {};
        if (!driverId) {
          return res.status(400).json({ error: "driverId is required" });
        }

        const identity = await resolveDriverIdentity(String(driverId));
        if (!identity) {
          return res.status(404).json({ error: "Driver not found" });
        }

        let sourceTable: "web_booker" | "later_bookings" | null = null;
        let existingBooking: any = null;
        const webFetch = await sb
          .from("web_booker")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();
        if (webFetch.data) {
          sourceTable = "web_booker";
          existingBooking = webFetch.data;
        } else {
          const laterFetch = await sb
            .from("later_bookings")
            .select("*")
            .eq("id", bookingId)
            .maybeSingle();
          if (laterFetch.data) {
            sourceTable = "later_bookings";
            existingBooking = laterFetch.data;
          }
        }
        if (!sourceTable || !existingBooking) {
          return res.status(404).json({ error: "Booking not found" });
        }

        const currentStatus = String(
          existingBooking.status || "",
        ).toLowerCase();
        if (currentStatus === "cancelled" || currentStatus === "completed") {
          return res
            .status(400)
            .json({ error: `Cannot assign a ${currentStatus} booking` });
        }
        if (existingBooking.activated_at || existingBooking.live_ride_id) {
          return res
            .status(400)
            .json({
              error:
                "This booking is already live and cannot be reassigned here",
            });
        }

        let resolvedName = driverName || identity.fullName || null;
        if (!resolvedName && identity.userId) {
          const { data: userRow } = await sb
            .from("users")
            .select("full_name")
            .eq("id", identity.userId)
            .maybeSingle();
          resolvedName = userRow?.full_name || null;
        }

        // Persist the pending assignee on BOTH columns. Schemas differ:
        // - later_bookings often has driver_id but NOT assigned_driver_id
        // - web_booker often has assigned_driver_id but NOT driver_id
        // updateLaterBookingWithFallbackColumns strips missing columns.
        // Never clear driver_id on assign — that wiped pending offers on later_bookings.
        const updateData: any = {
          assigned_driver_id: identity.tableId,
          driver_id: identity.tableId,
          assigned_driver_name: resolvedName,
          // Keep as scheduled/marketplace so accept is still required.
          status: sourceTable === "web_booker" ? "marketplace" : "scheduled",
          updated_at: new Date().toISOString(),
        };

        const updateResult = await updateLaterBookingWithFallbackColumns(
          sourceTable,
          bookingId,
          updateData,
          missingLaterBookingAssignColumns,
        );
        if (updateResult.discoveredMissingColumns.length > 0) {
          console.info(
            `ℹ️ ${sourceTable} assign skipped missing optional columns: ${updateResult.discoveredMissingColumns.join(", ")}`,
          );
        }
        if (updateResult.error) {
          return res.status(500).json({ error: updateResult.error.message });
        }
        if (!updateResult.data) {
          return res.status(404).json({ error: "Booking not found" });
        }

        const normalizedBooking = withPendingAssignee(
          normalizeLaterBooking(updateResult.data, sourceTable),
          identity,
        );
        const [enrichedBooking] = (
          await attachRiderDetails([normalizedBooking])
        ).map(stripPinForDrivers);

        const pushSent = await notifyDriverOfAssignedBooking(
          enrichedBooking,
          identity.tableId,
        );
        const assignKey = `${sourceTable}:${bookingId}:${identity.tableId}`;
        assignmentSocketAnnouncedKeys.add(assignKey);
        if (pushSent) {
          announcedAssignedBookingKeys.add(assignKey);
        }

        res.json({ booking: enrichedBooking });
      } catch (error: any) {
        console.error("Assign later booking error:", error);
        res
          .status(500)
          .json({ error: error?.message || "Failed to assign booking" });
      }
    },
  );

  app.put(
    "/api/later-bookings/:id/decline",
    async (req: Request, res: Response) => {
      try {
        const bookingId = req.params.id as string;
        const { driverId, reason } = req.body || {};

        let sourceTable: "web_booker" | "later_bookings" | null = null;
        let existingBooking: any = null;
        const webFetch = await sb
          .from("web_booker")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();
        if (webFetch.data) {
          sourceTable = "web_booker";
          existingBooking = webFetch.data;
        } else {
          const laterFetch = await sb
            .from("later_bookings")
            .select("*")
            .eq("id", bookingId)
            .maybeSingle();
          if (laterFetch.data) {
            sourceTable = "later_bookings";
            existingBooking = laterFetch.data;
          }
        }
        if (!sourceTable || !existingBooking) {
          return res.status(404).json({ error: "Booking not found" });
        }

        const status = String(existingBooking.status || "").toLowerCase();
        if (status === "driver_accepted") {
          return res.status(400).json({
            error:
              "This booking was already accepted. Use Cancel to release it back to marketplace.",
          });
        }

        if (driverId) {
          const identity = await resolveDriverIdentity(String(driverId));
          if (
            identity &&
            !bookingMatchesDriverIdentity(
              normalizeLaterBooking(existingBooking, sourceTable),
              identity,
            )
          ) {
            return res
              .status(403)
              .json({ error: "This booking is not assigned to you" });
          }
        }

        const statusForReleasedBooking =
          sourceTable === "web_booker" ? "marketplace" : "scheduled";
        const updateData: any = {
          status: statusForReleasedBooking,
          driver_id: null,
          assigned_driver_id: null,
          assigned_driver_name: null,
          accepted_by_driver_at: null,
          updated_at: new Date().toISOString(),
          driver_cancel_reason: reason || "declined_assignment",
          driver_cancelled_at: new Date().toISOString(),
          driver_cancel_type: "declined_assignment",
        };

        const updateResult = await updateLaterBookingWithFallbackColumns(
          sourceTable,
          bookingId,
          updateData,
          missingLaterBookingDeclineColumns,
        );
        if (updateResult.error) {
          return res.status(500).json({ error: updateResult.error.message });
        }
        if (!updateResult.data) {
          return res.status(404).json({ error: "Booking not found" });
        }

        const normalizedBooking = normalizeLaterBooking(
          updateResult.data,
          sourceTable,
        );
        // Force-clear assignment fields for marketplace notify even if a column
        // was skipped by the fallback updater.
        const releasedBooking = stripPinForDrivers({
          ...((await attachRiderDetails([normalizedBooking]))[0] ||
            normalizedBooking),
          driver_id: null,
          assigned_driver_id: null,
          assigned_driver_name: null,
          assignment_pending: false,
          status: statusForReleasedBooking,
        });

        // Clear assignment announcement keys so a future re-assign can notify again
        for (const key of Array.from(announcedAssignedBookingKeys)) {
          if (key.startsWith(`${sourceTable}:${bookingId}:`)) {
            announcedAssignedBookingKeys.delete(key);
          }
        }
        for (const key of Array.from(assignmentSocketAnnouncedKeys)) {
          if (key.startsWith(`${sourceTable}:${bookingId}:`)) {
            assignmentSocketAnnouncedKeys.delete(key);
          }
        }
        // Clear marketplace announce key so this decline re-notifies all drivers
        const marketplaceKey = `${sourceTable}:${bookingId}`;
        announcedMarketplaceBookingKeys.delete(marketplaceKey);

        // Respond first so the declining driver UI feels instant, then notify others.
        res.json({ booking: releasedBooking });

        emitLaterBookingSignal("declined", releasedBooking);
        emitLaterBookingSignal("created", releasedBooking);
        notifyDriversAboutMarketplaceBooking(releasedBooking)
          .then((sent) => {
            if (sent) announcedMarketplaceBookingKeys.add(marketplaceKey);
            else announcedMarketplaceBookingKeys.delete(marketplaceKey);
          })
          .catch((err) => {
            console.warn(
              `⚠️ Marketplace re-notify after decline failed for ${bookingId}:`,
              err,
            );
          });
        return;
      } catch (error: any) {
        console.error("Decline later booking error:", error);
        res
          .status(500)
          .json({ error: error?.message || "Failed to decline booking" });
      }
    },
  );

  app.put(
    "/api/later-bookings/:id/cancel",
    async (req: Request, res: Response) => {
      try {
        const bookingId = req.params.id as string;
        const { cancelledBy, reason } = req.body || {}; // 'rider' | 'driver'

        // ── Fetch current booking (support both web_booker and later_bookings) ──
        let sourceTable: "web_booker" | "later_bookings" | null = null;
        let booking: any = null;

        const webFetch = await sb
          .from("web_booker")
          .select("*")
          .eq("id", bookingId)
          .maybeSingle();
        if (webFetch.error) {
          console.warn(
            `⚠️ web_booker fetch failed for booking ${bookingId}:`,
            webFetch.error.message,
          );
        }
        if (webFetch.data) {
          sourceTable = "web_booker";
          booking = webFetch.data;
        }

        if (!booking) {
          const laterFetch = await sb
            .from("later_bookings")
            .select("*")
            .eq("id", bookingId)
            .maybeSingle();
          if (laterFetch.error) {
            console.warn(
              `⚠️ later_bookings fetch failed for booking ${bookingId}:`,
              laterFetch.error.message,
            );
          }
          if (laterFetch.data) {
            sourceTable = "later_bookings";
            booking = laterFetch.data;
          }
        }

        if (!booking || !sourceTable) {
          return res.status(404).json({ error: "Booking not found" });
        }

        const normalizedBooking = normalizeLaterBooking(booking, sourceTable);
        const currentStatus = String(
          normalizedBooking.status || "",
        ).toLowerCase();
        if (
          currentStatus === "cancelled" ||
          currentStatus === "driver_cancelled" ||
          currentStatus === "driver_cancelled_late"
        ) {
          return res.status(400).json({ error: "Booking already cancelled" });
        }
        if (currentStatus === "completed") {
          return res.status(400).json({ error: "Booking already completed" });
        }

        // If the booking has already gone live (inside activation window) the live
        // ride must be cancelled too. A ride that is already in progress can no
        // longer be cancelled from the scheduled bookings screen.
        const liveRideId = booking.live_ride_id || null;
        if (liveRideId || currentStatus === "in_progress") {
          if (currentStatus === "in_progress") {
            return res
              .status(400)
              .json({
                error:
                  "This ride is already in progress and can no longer be cancelled here",
              });
          }
          if (liveRideId) {
            try {
              const { data: liveRide } = await sb
                .from("rides")
                .select("id, status")
                .eq("id", liveRideId)
                .maybeSingle();
              if (liveRide?.status === "in_progress") {
                return res
                  .status(400)
                  .json({
                    error:
                      "This ride is already in progress and can no longer be cancelled here",
                  });
              }
            } catch (liveRideErr) {
              console.warn(
                `⚠️ Could not check live ride ${liveRideId} before cancelling booking ${bookingId}:`,
                liveRideErr,
              );
            }
          }
        }

        const bookingDriverId =
          normalizedBooking.driver_id || normalizedBooking.assigned_driver_id;
        const riderId = normalizedBooking.rider_id;
        const statusForReleasedBooking =
          sourceTable === "web_booker" ? "marketplace" : "scheduled";

        const now = new Date();
        const pickupTime = new Date(normalizedBooking.pickup_at || "");
        if (isNaN(pickupTime.getTime())) {
          return res
            .status(400)
            .json({ error: "Booking has invalid pickup time" });
        }
        const msUntilPickup = pickupTime.getTime() - now.getTime();
        const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
        const withinThreeHours =
          msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
        const pastPickup = msUntilPickup < 0;
        const estimatedFare = Number(normalizedBooking.estimated_fare || 0);
        const bookingPaymentMethod = String(
          normalizedBooking.payment_method || "card",
        ).toLowerCase();
        const bookingPaymentStatus = String(
          normalizedBooking.payment_status || "",
        ).toLowerCase();
        const bookingPaymentIntentId =
          normalizedBooking.payment_intent_id || null;
        const alreadyCapturedStatusSet = new Set([
          "prepaid",
          "prepaid_retained",
          "paid",
          "card_charged",
          "card_captured",
          "completed",
          "succeeded",
        ]);
        const isAuthorizedHold =
          bookingPaymentMethod === "card" &&
          !!bookingPaymentIntentId &&
          (bookingPaymentStatus === "authorized" ||
            !alreadyCapturedStatusSet.has(bookingPaymentStatus));
        const isAlreadyCaptured =
          bookingPaymentMethod === "card" &&
          !!bookingPaymentIntentId &&
          alreadyCapturedStatusSet.has(bookingPaymentStatus);

        let cancellationFee = 0;
        let refundAmount = 0;
        let penaltyNote = "";

        // Tracking fields
        let statusToSet = "cancelled";
        let driverCancelType = null;
        let driverPenaltyApplied = false;
        let lateCancellationFee = 0;
        let releaseDriverAssignment = false;

        if (cancelledBy === "rider") {
          if (withinThreeHours || pastPickup) {
            // Charge 100% cancellation fee for late cancellation (rider-facing discounted fare)
            const halfFare = estimatedFare * 1;
            cancellationFee = halfFare;
            if (isAlreadyCaptured) {
              penaltyNote = `Late cancellation within 3 hours — 100% fee of £${halfFare.toFixed(2)} retained from prepaid fare.`;
            } else if (isAuthorizedHold) {
              penaltyNote = `Late cancellation within 3 hours — 100% fee of £${halfFare.toFixed(2)} captured from card hold.`;
            } else {
              penaltyNote = `Late cancellation within 3 hours — 100% fee of £${halfFare.toFixed(2)} charged.`;
            }

            // Capture authorized hold, or charge wallet if no card hold exists.
            if (isAuthorizedHold && bookingPaymentIntentId && halfFare > 0) {
              try {
                const captureResult = await capturePaymentIntent(
                  bookingPaymentIntentId,
                  halfFare,
                );
                if (!captureResult.success) {
                  console.warn(
                    `⚠️ Scheduled late-cancel capture failed: ${captureResult.error}`,
                  );
                  // Fall through to wallet charge below
                  const { data: riderRow } = await sb
                    .from("users")
                    .select("wallet_balance, stripe_customer_id")
                    .eq("id", riderId)
                    .single();
                  if (riderRow?.stripe_customer_id) {
                    await releaseAuthorization(bookingPaymentIntentId).catch(
                      () => {},
                    );
                    const chargeResult = await chargeSavedCard(
                      riderRow.stripe_customer_id,
                      halfFare,
                      bookingId,
                      "gbp",
                      "cancellation_fee",
                    );
                    if (!chargeResult.success) {
                      const currentBalance = riderRow?.wallet_balance || 0;
                      const newBalance = Number(
                        (currentBalance - halfFare).toFixed(2),
                      );
                      await sb
                        .from("users")
                        .update({ wallet_balance: newBalance })
                        .eq("id", riderId);
                      await sb.from("wallet_transactions").insert({
                        user_id: riderId,
                        ride_id: null,
                        amount: halfFare,
                        type: "debit",
                        description: `100% Late cancellation fee (£${halfFare.toFixed(2)}) for booking ${bookingId}`,
                      });
                    }
                  }
                } else {
                  console.log(
                    `✅ Scheduled late-cancel captured £${halfFare} for booking ${bookingId}`,
                  );
                }
              } catch (captureErr) {
                console.error(
                  "Failed to capture card for late cancel:",
                  captureErr,
                );
              }
            } else if (!isAlreadyCaptured && riderId && halfFare > 0) {
              try {
                const { data: riderRow } = await sb
                  .from("users")
                  .select("wallet_balance")
                  .eq("id", riderId)
                  .single();
                const currentBalance = riderRow?.wallet_balance || 0;
                const newBalance = Number(
                  (currentBalance - halfFare).toFixed(2),
                );
                await sb
                  .from("users")
                  .update({ wallet_balance: newBalance })
                  .eq("id", riderId);
                await sb.from("wallet_transactions").insert({
                  user_id: riderId,
                  ride_id: null,
                  amount: halfFare,
                  type: "debit",
                  description: `100% Late cancellation fee (£${halfFare.toFixed(2)}) for booking ${bookingId}`,
                });
                console.log(
                  `💸 Late cancel: rider ${riderId} charged 100% fee £${halfFare} (wallet: ${currentBalance} → ${newBalance})`,
                );
              } catch (walletErr) {
                console.error(
                  "Failed to charge rider wallet for late cancel:",
                  walletErr,
                );
              }
            }

            // Credit driver earnings with the 100% cancellation fee (no platform commission)
            if (bookingDriverId && halfFare > 0) {
              try {
                const { data: driverData, error: driverFetchErr } = await sb
                  .from("drivers")
                  .select("total_earnings")
                  .eq("id", bookingDriverId)
                  .single();

                if (driverFetchErr) {
                  console.error(
                    `❌ Failed to fetch driver ${bookingDriverId}:`,
                    driverFetchErr,
                  );
                } else if (!driverData) {
                  console.warn(
                    `⚠️ Driver ${bookingDriverId} not found in database`,
                  );
                } else {
                  const currentEarnings = Number(
                    driverData?.total_earnings || 0,
                  );
                  const newEarnings = Number(
                    (currentEarnings + Math.abs(halfFare)).toFixed(2),
                  );
                  await sb
                    .from("drivers")
                    .update({ total_earnings: newEarnings })
                    .eq("id", bookingDriverId);
                }
              } catch (earningsErr) {
                console.error(
                  `❌ Exception updating driver earnings for driver ${bookingDriverId}:`,
                  earningsErr,
                );
              }
            } else if (halfFare > 0) {
              console.warn(
                `⚠️ No driver assigned to booking ${bookingId} - cannot credit earnings`,
              );
            }
          } else {
            // Free cancellation — release authorization hold (no money was taken yet)
            refundAmount = estimatedFare > 0 ? estimatedFare : 0;
            if (
              (isAuthorizedHold || isAlreadyCaptured) &&
              bookingPaymentIntentId
            ) {
              if (isAlreadyCaptured) {
                const refunded = await refundPayment(bookingPaymentIntentId);
                if (!refunded) {
                  return res
                    .status(500)
                    .json({
                      error:
                        "Failed to refund prepaid amount. Please try again.",
                    });
                }
                penaltyNote = `Free cancellation — more than 3 hours before pickup. Prepaid amount £${refundAmount.toFixed(2)} refunded.`;
              } else {
                const released = await releaseAuthorization(
                  bookingPaymentIntentId,
                );
                if (!released.success && !released.alreadyFinal) {
                  return res
                    .status(500)
                    .json({
                      error: "Failed to release card hold. Please try again.",
                    });
                }
                penaltyNote = `Free cancellation — more than 3 hours before pickup. Card hold of £${refundAmount.toFixed(2)} released.`;
              }
            } else {
              penaltyNote =
                "Free cancellation — more than 3 hours before pickup.";
            }
            console.log(
              `✅ Free cancel: rider ${riderId}, refundAmount=£${refundAmount}`,
            );
          }
        } else if (cancelledBy === "driver") {
          penaltyNote =
            withinThreeHours || pastPickup
              ? "Driver cancelled close to pickup — booking released for ASAP dispatch. No rider charge applies."
              : "Driver cancelled — booking released back to marketplace. No rider charge applies.";
          statusToSet = statusForReleasedBooking;
          driverCancelType =
            withinThreeHours || pastPickup
              ? "released_for_dispatch"
              : "released_to_marketplace";
          driverPenaltyApplied = false;
          lateCancellationFee = 0;
          releaseDriverAssignment = true;
        }

        const updatePayload: any = {
          status: statusToSet,
          updated_at: now.toISOString(),
          cancellation_fee: cancellationFee,
          cancellation_note: penaltyNote,
          cancelled_by: cancelledBy || "rider",
        };
        if (
          cancelledBy === "rider" &&
          (isAlreadyCaptured || isAuthorizedHold)
        ) {
          if (cancellationFee > 0) {
            updatePayload.payment_status = isAlreadyCaptured
              ? "prepaid_retained"
              : "cancellation_fee_card_captured";
          } else if (bookingPaymentIntentId) {
            updatePayload.payment_status = isAlreadyCaptured
              ? "refunded"
              : "authorization_released";
          }
        }
        if (cancelledBy === "driver") {
          if (releaseDriverAssignment) {
            updatePayload.driver_id = null;
            updatePayload.assigned_driver_id = null;
            updatePayload.assigned_driver_name = null;
            updatePayload.accepted_by_driver_at = null;
            // Clear the live-ride link so the activation engine can re-dispatch
            // the booking to other drivers if it's inside the activation window.
            updatePayload.live_ride_id = null;
            updatePayload.activated_at = null;
          }
          updatePayload.driver_cancelled_at = now.toISOString();
          updatePayload.driver_cancel_reason = reason || null;
          updatePayload.driver_cancel_type = driverCancelType;
          updatePayload.late_cancellation_fee = lateCancellationFee;
          updatePayload.driver_penalty_applied = driverPenaltyApplied;
        }

        for (const column of missingLaterBookingCancelColumns) {
          delete updatePayload[column];
        }

        let updateResult = await updateLaterBookingWithFallbackColumns(
          sourceTable,
          bookingId,
          updatePayload,
          missingLaterBookingCancelColumns,
        );
        let data = updateResult.data;
        let error = updateResult.error;
        const discoveredMissingColumns = updateResult.discoveredMissingColumns;

        if (discoveredMissingColumns.length > 0) {
          console.info(
            `ℹ️ ${sourceTable} cancel skipped missing optional columns: ${discoveredMissingColumns.join(", ")}`,
          );
        }

        const statusMayBeUnsupported =
          error &&
          cancelledBy === "driver" &&
          updatePayload.status !== "cancelled" &&
          (error.code === "23514" ||
            error.message?.toLowerCase().includes("status") ||
            error.message?.toLowerCase().includes("constraint"));

        if (statusMayBeUnsupported) {
          updatePayload.status = "cancelled";
          updateResult = await updateLaterBookingWithFallbackColumns(
            sourceTable,
            bookingId,
            updatePayload,
            missingLaterBookingCancelColumns,
          );
          data = updateResult.data;
          error = updateResult.error;
        }

        if (error) {
          console.error("Supabase cancel booking update error:", error);
          return res.status(500).json({ error: error.message });
        }

        if (!data) {
          return res.status(404).json({ error: "Booking not found" });
        }

        // Cancel the live ride spawned from this booking (stops dispatch and/or
        // clears the assigned driver's home screen)
        if (liveRideId) {
          try {
            await scheduledRideHooks.cancelScheduledLiveRide?.(
              liveRideId,
              cancelledBy || "rider",
            );
          } catch (liveCancelErr) {
            console.error(
              `❌ Failed to cancel live ride ${liveRideId} for booking ${bookingId}:`,
              liveCancelErr,
            );
          }
        }

        const normalizedUpdatedBooking = normalizeLaterBooking(
          data,
          sourceTable,
        );
        emitLaterBookingSignal(
          cancelledBy === "driver" ? "released" : "cancelled",
          normalizedUpdatedBooking,
        );
        res.json({
          booking: normalizedUpdatedBooking,
          withinThreeHours,
          cancellationFee,
          penaltyNote,
        });
      } catch (error: any) {
        res
          .status(500)
          .json({ error: error?.message || "Failed to cancel booking" });
      }
    },
  );

  app.post("/api/rides/:id/rating", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        riderRating,
        driverRating,
        riderComment,
        driverComment,
        ratedBy,
      } = req.body;

      const updateData: any = {};

      if (ratedBy === "driver") {
        if (riderRating !== undefined) updateData.rider_rating = riderRating;
        // if (riderComment !== undefined) updateData.rider_comment = riderComment; // Column doesn't exist
      } else if (ratedBy === "rider") {
        if (driverRating !== undefined) updateData.driver_rating = driverRating;
        // if (driverComment !== undefined) updateData.driver_comment = driverComment; // Column doesn't exist
      }

      const { data, error } = await supabase
        .from("rides")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Supabase update error saving rating:", error);
        return res.status(500).json({ error: "Database error saving rating" });
      }

      res.json({ success: true, ride: data });
    } catch (error: any) {
      console.error("Save rating error:", error);
      res
        .status(500)
        .json({ error: error?.message || "Failed to save rating" });
    }
  });

  // Look ahead 3 hours so the 3h reminder can fire.
  const SCHEDULED_DRIVER_REMINDER_WINDOW_MS = 3 * 60 * 60 * 1000;
  // Tick every 60s so 15m / 5m reminders are not missed by a coarse interval.
  const SCHEDULED_DRIVER_REMINDER_TICK_MS = 60 * 1000;

  const triggerScheduledDriverReminders = async () => {
    const nowTs = Date.now();
    const [laterBookingsRaw, webBookerRaw] = await Promise.all([
      fetchLaterBookingsFromTable("later_bookings"),
      fetchLaterBookingsFromTable("web_booker"),
    ]);

    const acceptedBookings = [
      ...laterBookingsRaw.map((row: any) =>
        normalizeLaterBooking(row, "later_bookings"),
      ),
      ...webBookerRaw.map((row: any) =>
        normalizeLaterBooking(row, "web_booker"),
      ),
    ].filter((booking: any) => {
      const status = String(booking.status || "").toLowerCase();
      if (status !== "driver_accepted") return false;
      const assignedDriverId = booking.driver_id || booking.assigned_driver_id;
      if (!assignedDriverId) return false;
      const pickupTs = pickupTimestamp(booking);
      if (!pickupTs) return false;
      const msUntilPickup = pickupTs - nowTs;
      return (
        msUntilPickup > 0 &&
        msUntilPickup <= SCHEDULED_DRIVER_REMINDER_WINDOW_MS
      );
    });

    const activeReminderKeys = new Set<string>();
    for (const booking of acceptedBookings) {
      const pickupTs = pickupTimestamp(booking);
      const msUntilPickup = pickupTs - nowTs;
      const reminderKey = `${booking.source_table}:${booking.id}`;
      activeReminderKeys.add(reminderKey);

      let handled = scheduledReminderBucketsByBooking.get(reminderKey);
      if (!handled) {
        handled = new Set<string>();
        scheduledReminderBucketsByBooking.set(reminderKey, handled);
      }

      const reminderBucket = getNextScheduledReminderBucket(
        msUntilPickup,
        handled,
      );
      if (!reminderBucket) continue;

      const assignedDriverId = booking.driver_id || booking.assigned_driver_id;
      if (!assignedDriverId) continue;

      const { data: driverRow } = await sb
        .from("drivers")
        .select("user_id")
        .or(`id.eq.${assignedDriverId},user_id.eq.${assignedDriverId}`)
        .limit(1)
        .maybeSingle();

      const driverUserId = driverRow?.user_id || assignedDriverId;
      const { data: userRow } = await sb
        .from("users")
        .select("push_token")
        .eq("id", driverUserId)
        .maybeSingle();

      if (!userRow?.push_token) {
        // Still mark handled so we do not retry forever without a token.
        handled.add(reminderBucket.key);
        continue;
      }

      const pickupLabel = booking.pickup_address || "pickup location";
      const dropoffLabel = booking.dropoff_address || "destination";
      const rideDetails = `${pickupLabel} → ${dropoffLabel}`;
      const title =
        reminderBucket.key === "5m"
          ? "Pickup in 5 minutes!"
          : reminderBucket.key === "15m"
            ? "Pickup in 15 minutes"
            : reminderBucket.contactPassenger
              ? "Upcoming booking soon"
              : "Upcoming booking reminder";
      const body = reminderBucket.contactPassenger
        ? `Your ride ${rideDetails} starts in ${reminderBucket.label}. Contact the passenger if needed and head to pickup.`
        : `Your ride ${rideDetails} starts in ${reminderBucket.label}. Please plan to reach the pickup location on time.`;

      await sendExpoPushNotification(
        userRow.push_token,
        title,
        body,
        {
          type: "scheduled_booking_reminder",
          bookingId: booking.id,
          sourceTable: booking.source_table,
          audience: "driver",
          target: "ScheduledJobDetails",
          screen: "ScheduledJobDetails",
          reminderBucket: reminderBucket.key,
        },
        // High-importance scheduled channel with sound.
        { channelId: "uto-scheduled-v2", ttlSeconds: 900 },
      );

      handled.add(reminderBucket.key);
      console.log(
        `🔔 Scheduled reminder ${reminderBucket.key} sent for booking ${booking.id}`,
      );
    }

    for (const key of Array.from(scheduledReminderBucketsByBooking.keys())) {
      if (!activeReminderKeys.has(key)) {
        scheduledReminderBucketsByBooking.delete(key);
      }
    }
  };

  setInterval(
    () => {
      triggerScheduledDriverReminders().catch((err) => {
        console.error("Scheduled driver reminder engine error:", err);
      });
    },
    SCHEDULED_DRIVER_REMINDER_TICK_MS,
  );

  triggerScheduledDriverReminders().catch((err) => {
    console.error("Initial scheduled driver reminder check failed:", err);
  });

  const triggerMarketplaceCheckReminders = async () => {
    const london = getLondonDateTimeParts();
    const shouldSendThisSlot =
      london.hour >= 6 && (london.hour - 6) % 6 === 0 && london.minute < 30;

    if (!shouldSendThisSlot) return;

    const slotKey = `${london.dateKey}:${london.hour}`;
    if (lastMarketplaceReminderKey === slotKey) return;

    const { data: driverRows, error: driverErr } = await sb
      .from("drivers")
      .select("user_id")
      .not("user_id", "is", null);

    if (driverErr) {
      console.warn(
        "⚠️ Could not load drivers for marketplace reminders:",
        driverErr.message,
      );
      return;
    }

    const driverUserIds = Array.from(
      new Set(
        (driverRows || []).map((row: any) => row.user_id).filter(Boolean),
      ),
    );
    if (driverUserIds.length === 0) {
      lastMarketplaceReminderKey = slotKey;
      return;
    }

    const { data: driverUsers, error: usersErr } = await sb
      .from("users")
      .select("id, push_token")
      .in("id", driverUserIds);

    if (usersErr) {
      console.warn(
        "⚠️ Could not load driver push tokens for marketplace reminders:",
        usersErr.message,
      );
      return;
    }

    await Promise.all(
      Array.from(
        new Set(
          (driverUsers || [])
            .map((row: any) => String(row.push_token || "").trim())
            .filter(Boolean),
        ),
      ).map((token) =>
        sendExpoPushNotification(
          token,
          "🗓 Marketplace Check",
          "New scheduled rides may be waiting. Open Marketplace to review available bookings.",
          {
            type: "marketplace_reminder",
            audience: "driver",
            target: "Marketplace",
            screen: "Marketplace",
            slotKey,
          },
          { channelId: "uto-ride-requests-v2", ttlSeconds: 900 },
        ),
      ),
    );

    lastMarketplaceReminderKey = slotKey;
  };

  setInterval(
    () => {
      triggerMarketplaceCheckReminders().catch((err) => {
        console.error("Marketplace reminder engine error:", err);
      });
    },
    30 * 60 * 1000,
  );

  triggerMarketplaceCheckReminders().catch((err) => {
    console.error("Initial marketplace reminder check failed:", err);
  });

  setInterval(() => {
    announceExternalMarketplaceBookings().catch((err) => {
      console.error("Marketplace booking announcement engine error:", err);
    });
  }, 15 * 1000);

  announceExternalMarketplaceBookings().catch((err) => {
    console.error("Initial marketplace booking announcement failed:", err);
  });

  setInterval(() => {
    announceAssignedBookings().catch((err) => {
      console.error("Assigned booking announcement engine error:", err);
    });
  }, 15 * 1000);

  announceAssignedBookings().catch((err) => {
    console.error("Initial assigned booking announcement failed:", err);
  });

  // ─── Scheduled Bookings Live Activation Engine ───
  // Runs every minute. Any booking within 60 minutes of its pickup time is
  // converted into a real live ride:
  //   • already accepted by a driver → lands directly on that driver's home
  //     screen in the "accepted" phase (same flow as an immediate booking).
  //   • still unassigned → dispatched to the nearest online drivers exactly
  //     like an immediate (ASAP) booking.
  // From that point all live-ride policies apply (PIN verification, no-show,
  // rider cancellation rules, completion, etc.).
  const SCHEDULED_ACTIVATION_RETRY_MS = 5 * 60 * 1000; // retry dispatch every 5 min if no driver found
  const SCHEDULED_ACTIVATION_GRACE_MS = 30 * 60 * 1000; // keep trying up to 30 min past pickup

  setInterval(async () => {
    try {
      const [laterBookingsRaw, webBookerRaw] = await Promise.all([
        fetchLaterBookingsFromTable("later_bookings"),
        fetchLaterBookingsFromTable("web_booker"),
      ]);

      const nowTs = Date.now();
      const candidates = [
        ...laterBookingsRaw.map((row: any) =>
          normalizeLaterBooking(row, "later_bookings"),
        ),
        ...webBookerRaw.map((row: any) =>
          normalizeLaterBooking(row, "web_booker"),
        ),
      ].filter((booking: any) => {
        const status = String(booking.status || "").toLowerCase();
        if (status !== "scheduled" && status !== "driver_accepted")
          return false;
        if (!booking.rider_id || !booking.pickup_at) return false;

        const pickupTs = pickupTimestamp(booking);
        if (!pickupTs) return false;
        if (pickupTs > nowTs + SCHEDULED_ACTIVATION_WINDOW_MS) return false; // too early
        if (pickupTs < nowTs - SCHEDULED_ACTIVATION_GRACE_MS) return false; // too stale

        // Already live
        if (booking.live_ride_id) return false;

        // Throttle re-dispatch attempts when no driver was available last time
        if (booking.activated_at) {
          const lastAttempt = new Date(booking.activated_at).getTime();
          if (
            Number.isFinite(lastAttempt) &&
            nowTs - lastAttempt < SCHEDULED_ACTIVATION_RETRY_MS
          )
            return false;
        }

        // If the activation-tracking columns don't exist at all we cannot run
        // safely (would re-dispatch every minute) — skip until migration lands.
        if (
          booking.live_ride_id === undefined &&
          booking.activated_at === undefined
        ) {
          console.warn(
            `⚠️ Skipping activation for booking ${booking.id} — live_ride_id/activated_at columns missing on ${booking.source_table}`,
          );
          return false;
        }

        return true;
      });

      if (candidates.length === 0) return;

      const enrichedCandidates = await attachRiderDetails(candidates);

      for (const booking of enrichedCandidates) {
        try {
          // If the rider already cancelled a prior live attempt for this booking,
          // never create another automatic ride:new for drivers.
          const { data: riderCancelledLive } = await sb
            .from("rides")
            .select("id, cancelled_by, status")
            .like("id", `sched_${booking.id}_%`)
            .eq("status", "cancelled")
            .eq("cancelled_by", "rider")
            .limit(1)
            .maybeSingle();
          if (riderCancelledLive?.id) {
            console.log(
              `⏭️ Skipping activation for booking ${booking.id} — rider previously cancelled live ride ${riderCancelledLive.id}`,
            );
            await updateLaterBookingWithFallbackColumns(
              booking.source_table,
              booking.id,
              { status: "cancelled", live_ride_id: null },
              missingLaterBookingActivationColumns,
            );
            continue;
          }

          // Ensure the booking has a PIN (older bookings may predate PIN generation)
          let otp =
            typeof booking.otp === "string" && booking.otp ? booking.otp : null;
          if (!otp) {
            otp = generateRidePin();
            await updateLaterBookingWithFallbackColumns(
              booking.source_table,
              booking.id,
              { otp },
              missingLaterBookingActivationColumns,
            );
          }

          const liveRideId = `sched_${booking.id}_${Date.now().toString(36)}`;
          const rideData = {
            id: liveRideId,
            riderId: booking.rider_id,
            riderName: booking.rider_name || "Rider",
            riderPhone: booking.rider_phone || "",
            riderEmail: booking.rider_email || "",
            rideType: booking.vehicle_type || "saloon",
            vehicleType: booking.vehicle_type || "saloon",
            pickupLocation: {
              address: booking.pickup_address || "Unknown",
              latitude: Number(booking.pickup_latitude) || 0,
              longitude: Number(booking.pickup_longitude) || 0,
            },
            dropoffLocation: {
              address: booking.dropoff_address || "Unknown",
              latitude: Number(booking.dropoff_latitude) || 0,
              longitude: Number(booking.dropoff_longitude) || 0,
            },
            // Store full pre-discount fare + discountAmount so live-ride math matches ASAP rides.
            farePrice:
              Number(
                (
                  Number(booking.estimated_fare || 0) +
                  Number(booking.discount_amount || 0)
                ).toFixed(2),
              ) || 0,
            estimatedPrice:
              Number(
                (
                  Number(booking.estimated_fare || 0) +
                  Number(booking.discount_amount || 0)
                ).toFixed(2),
              ) || 0,
            discountAmount: Number(booking.discount_amount || 0),
            couponCode: booking.coupon_code || null,
            distanceMiles: Number(booking.distance_miles) || 0,
            durationMinutes: Number(booking.duration_minutes) || 0,
            paymentMethod: booking.payment_method || "card",
            paymentStatus: booking.payment_status || null,
            paymentIntentId: booking.payment_intent_id || null,
            otp,
            isScheduledBooking: true,
            scheduledBookingId: booking.id,
            scheduledPickupAt: booking.pickup_at,
            sourceTable: booking.source_table,
          };

          // Mark as activated BEFORE dispatching so a slow dispatch can't double-fire
          const markResult = await updateLaterBookingWithFallbackColumns(
            booking.source_table,
            booking.id,
            {
              activated_at: new Date().toISOString(),
              live_ride_id: liveRideId,
            },
            missingLaterBookingActivationColumns,
          );
          if (markResult.error || !markResult.data) {
            console.warn(
              `⚠️ Could not mark booking ${booking.id} as activated — skipping this cycle:`,
              markResult.error?.message,
            );
            continue;
          }
          if (
            markResult.data.live_ride_id === undefined &&
            markResult.data.activated_at === undefined
          ) {
            console.warn(
              `⚠️ Activation columns missing on ${booking.source_table} — skipping booking ${booking.id} to avoid dispatch storms`,
            );
            continue;
          }

          const assignedDriverId =
            booking.driver_id || booking.assigned_driver_id;
          if (
            assignedDriverId &&
            String(booking.status).toLowerCase() === "driver_accepted"
          ) {
            console.log(
              `🚀 Activating accepted scheduled booking ${booking.id} → live ride ${liveRideId} (driver ${assignedDriverId})`,
            );
            const handedOver =
              await scheduledRideHooks.activateAcceptedScheduledRide?.(
                rideData,
                assignedDriverId,
              );
            if (!handedOver) {
              // Could not hand over to the assigned driver — release for a later retry
              await updateLaterBookingWithFallbackColumns(
                booking.source_table,
                booking.id,
                { live_ride_id: null },
                missingLaterBookingActivationColumns,
              );
              continue;
            }
          } else {
            console.log(
              `🚀 Dispatching unassigned scheduled booking ${booking.id} → live ride ${liveRideId} (treated like an immediate booking)`,
            );
            await scheduledRideHooks.dispatchScheduledRide?.(rideData);
          }

          emitLaterBookingSignal("activated", {
            ...booking,
            live_ride_id: liveRideId,
          });
        } catch (activationErr) {
          console.error(
            `❌ Failed to activate scheduled booking ${booking?.id}:`,
            activationErr,
          );
        }
      }
    } catch (err) {
      console.error("Scheduled activation engine error:", err);
    }
  }, 60000); // 1 minute interval

  // ─── Stale pending ASAP ride cleanup ───
  // Cancels leftover pending rides so they can never be re-offered to drivers.
  const STALE_PENDING_ASAP_MS = 45 * 60 * 1000;
  setInterval(
    async () => {
      try {
        const cutoff = new Date(
          Date.now() - STALE_PENDING_ASAP_MS,
        ).toISOString();
        const { data, error } = await sb
          .from("rides")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancelled_by: "system",
            cancellation_reason: "stale_pending_auto_cancelled",
          })
          .eq("status", "pending")
          .is("driver_id", null)
          .lt("requested_at", cutoff)
          .select("id");

        if (error) {
          // requested_at may be missing on some schemas — try created_at
          const fallback = await sb
            .from("rides")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
              cancelled_by: "system",
              cancellation_reason: "stale_pending_auto_cancelled",
            })
            .eq("status", "pending")
            .is("driver_id", null)
            .lt("created_at", cutoff)
            .select("id");
          if (fallback.error) {
            console.warn(
              "⚠️ Stale pending ride cleanup failed:",
              fallback.error.message,
            );
          } else if (fallback.data?.length) {
            console.log(
              `🧹 Auto-cancelled ${fallback.data.length} stale pending ride(s)`,
            );
          }
        } else if (data?.length) {
          console.log(`🧹 Auto-cancelled ${data.length} stale pending ride(s)`);
        }
      } catch (err) {
        console.warn("⚠️ Stale pending ride cleanup error:", err);
      }
    },
    5 * 60 * 1000,
  );

  // ─── Driver Payout Methods ────────────────────────────────────────
  app.get(
    "/api/driver-payout-methods/:driverId",
    async (req: Request, res: Response) => {
      try {
        const { data, error } = await sb
          .from("driver_payout_methods")
          .select("*")
          .eq("driver_id", req.params.driverId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          // No rows found is not a real error
          if (error.code === "PGRST116") {
            return res.json(null);
          }
          return res.status(500).json({ error: error.message });
        }
        res.json(data);
      } catch (err: any) {
        res
          .status(500)
          .json({ error: err?.message || "Failed to fetch payout method" });
      }
    },
  );

  app.post(
    "/api/driver-payout-methods/:driverId",
    async (req: Request, res: Response) => {
      try {
        const { account_name, account_no, sort_code, bank_provider } = req.body;
        if (!account_name || !account_no || !sort_code || !bank_provider) {
          return res.status(400).json({ error: "All fields are required" });
        }

        const { data, error } = await sb
          .from("driver_payout_methods")
          .insert({
            driver_id: req.params.driverId,
            account_name,
            account_no,
            sort_code,
            bank_provider,
          })
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json(data);
      } catch (err: any) {
        res
          .status(500)
          .json({ error: err?.message || "Failed to create payout method" });
      }
    },
  );

  app.put(
    "/api/driver-payout-methods/:driverId/:id",
    async (req: Request, res: Response) => {
      try {
        const { account_name, account_no, sort_code, bank_provider } = req.body;

        const { data, error } = await sb
          .from("driver_payout_methods")
          .update({
            account_name,
            account_no,
            sort_code,
            bank_provider,
            updated_at: new Date().toISOString(),
          })
          .eq("id", req.params.id)
          .eq("driver_id", req.params.driverId)
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
      } catch (err: any) {
        res
          .status(500)
          .json({ error: err?.message || "Failed to update payout method" });
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // ════════════════ RIDER PAYOUT METHODS & WITHDRAWALS (NEW) ════════════════════
  // ═══════════════════════════════════════════════════════════════════════════════

  // Get rider payout method
  app.get(
    "/api/rider-payout-methods/:userId",
    async (req: Request, res: Response) => {
      try {
        const { data, error } = await sb
          .from("rider_payout_methods")
          .select("*")
          .eq("user_id", req.params.userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          // No rows found is not a real error
          if (error.code === "PGRST116") {
            return res.json(null);
          }
          return res.status(500).json({ error: error.message });
        }
        res.json(data);
      } catch (err: any) {
        res
          .status(500)
          .json({ error: err?.message || "Failed to fetch payout method" });
      }
    },
  );

  // Create rider payout method
  app.post(
    "/api/rider-payout-methods/:userId",
    async (req: Request, res: Response) => {
      try {
        const { account_name, account_no, sort_code, bank_provider } = req.body;
        if (!account_name || !account_no || !sort_code || !bank_provider) {
          return res.status(400).json({ error: "All fields are required" });
        }

        const { data, error } = await sb
          .from("rider_payout_methods")
          .insert({
            user_id: req.params.userId,
            account_name,
            account_no,
            sort_code,
            bank_provider,
          })
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json(data);
      } catch (err: any) {
        res
          .status(500)
          .json({ error: err?.message || "Failed to create payout method" });
      }
    },
  );

  // Update rider payout method
  app.put(
    "/api/rider-payout-methods/:userId/:id",
    async (req: Request, res: Response) => {
      try {
        const { account_name, account_no, sort_code, bank_provider } = req.body;

        const { data, error } = await sb
          .from("rider_payout_methods")
          .update({
            account_name,
            account_no,
            sort_code,
            bank_provider,
            updated_at: new Date().toISOString(),
          })
          .eq("id", req.params.id)
          .eq("user_id", req.params.userId)
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
      } catch (err: any) {
        res
          .status(500)
          .json({ error: err?.message || "Failed to update payout method" });
      }
    },
  );

  // Request withdrawal (debit from wallet, create withdrawal record)
  app.post("/api/withdrawals/:userId", async (req: Request, res: Response) => {
    try {
      const { amount, payout_method_id } = req.body;
      const userId = req.params.userId;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Amount must be greater than 0" });
      }

      // Get user's current wallet balance
      const { data: userData, error: userError } = await sb
        .from("users")
        .select("wallet_balance")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        return res.status(404).json({ error: "User not found" });
      }

      const currentBalance = userData.wallet_balance || 0;
      if (currentBalance < amount) {
        return res.status(400).json({ error: "Insufficient wallet balance" });
      }

      // Create withdrawal record
      const { data: withdrawalData, error: withdrawalError } = await sb
        .from("withdrawals")
        .insert({
          user_id: userId,
          payout_method_id,
          amount,
          status: "pending",
        })
        .select()
        .single();

      if (withdrawalError) {
        return res.status(500).json({ error: withdrawalError.message });
      }

      // Debit wallet
      const newBalance = currentBalance - amount;
      const { error: updateError } = await sb
        .from("users")
        .update({ wallet_balance: newBalance })
        .eq("id", userId);

      if (updateError) {
        return res.status(500).json({ error: "Failed to update wallet" });
      }

      // Record withdrawal transaction
      try {
        await sb.from("wallet_transactions").insert({
          user_id: userId,
          amount,
          type: "debit",
          description: `Withdrawal request - £${amount.toFixed(2)}`,
        });
      } catch (e: any) {
        console.warn("Failed to record withdrawal transaction:", e?.message);
      }

      res.status(201).json({
        withdrawal: withdrawalData,
        newBalance,
      });
    } catch (err: any) {
      res
        .status(500)
        .json({ error: err?.message || "Failed to process withdrawal" });
    }
  });

  // Get user's withdrawal history
  app.get("/api/withdrawals/:userId", async (req: Request, res: Response) => {
    try {
      const { data, error } = await sb
        .from("withdrawals")
        .select("*")
        .eq("user_id", req.params.userId)
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.json({ withdrawals: data || [] });
    } catch (err: any) {
      res
        .status(500)
        .json({ error: err?.message || "Failed to fetch withdrawals" });
    }
  });

  // Approve/Complete a withdrawal
  app.post(
    "/api/withdrawals/:withdrawalId/approve",
    async (req: Request, res: Response) => {
      try {
        const { withdrawalId } = req.params;
        const { transactionId } = req.body;

        // Get withdrawal details
        const { data: withdrawal, error: fetchError } = await sb
          .from("withdrawals")
          .select("*")
          .eq("id", withdrawalId)
          .single();

        if (fetchError || !withdrawal) {
          return res.status(404).json({ error: "Withdrawal not found" });
        }

        // Update withdrawal status to completed
        const { error: updateError } = await sb
          .from("withdrawals")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            transaction_id: transactionId || null,
          })
          .eq("id", withdrawalId);

        if (updateError) {
          return res.status(500).json({ error: updateError.message });
        }

        console.log(
          `✅ Withdrawal ${withdrawalId} approved - amount £${withdrawal.amount}, user: ${withdrawal.user_id}`,
        );
        res.json({ success: true, message: "Withdrawal approved" });
      } catch (err: any) {
        res
          .status(500)
          .json({ error: err?.message || "Failed to approve withdrawal" });
      }
    },
  );

  // Cancel a withdrawal (and refund wallet)
  app.post(
    "/api/withdrawals/:withdrawalId/cancel",
    async (req: Request, res: Response) => {
      try {
        const { withdrawalId } = req.params;
        const { reason } = req.body;

        // Get withdrawal details
        const { data: withdrawal, error: fetchError } = await sb
          .from("withdrawals")
          .select("*")
          .eq("id", withdrawalId)
          .single();

        if (fetchError || !withdrawal) {
          return res.status(404).json({ error: "Withdrawal not found" });
        }

        if (withdrawal.status !== "pending") {
          return res
            .status(400)
            .json({ error: "Only pending withdrawals can be cancelled" });
        }

        // Update withdrawal status to cancelled
        const { error: updateError } = await sb
          .from("withdrawals")
          .update({
            status: "cancelled",
            notes: reason || "Cancelled",
          })
          .eq("id", withdrawalId);

        if (updateError) {
          return res.status(500).json({ error: updateError.message });
        }

        // Refund the wallet
        const { data: userData, error: userError } = await sb
          .from("users")
          .select("wallet_balance")
          .eq("id", withdrawal.user_id)
          .single();

        if (!userError && userData) {
          const newBalance = (userData.wallet_balance || 0) + withdrawal.amount;
          await sb
            .from("users")
            .update({ wallet_balance: newBalance })
            .eq("id", withdrawal.user_id);

          // Record refund transaction
          await sb.from("wallet_transactions").insert({
            user_id: withdrawal.user_id,
            amount: withdrawal.amount,
            type: "credit",
            description: `Withdrawal cancelled - £${withdrawal.amount.toFixed(2)} refunded`,
          });
        }

        console.log(
          `❌ Withdrawal ${withdrawalId} cancelled - amount £${withdrawal.amount} refunded, user: ${withdrawal.user_id}`,
        );
        res.json({
          success: true,
          message: "Withdrawal cancelled and wallet refunded",
        });
      } catch (err: any) {
        res
          .status(500)
          .json({ error: err?.message || "Failed to cancel withdrawal" });
      }
    },
  );

  // Get all pending withdrawals (for admin)
  app.get(
    "/api/withdrawals/pending/all",
    async (req: Request, res: Response) => {
      try {
        const { data, error } = await sb
          .from("withdrawals")
          .select("*, user:users(email, full_name, wallet_balance)")
          .eq("status", "pending")
          .order("created_at", { ascending: true });

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        res.json({ pending: data || [] });
      } catch (err: any) {
        res
          .status(500)
          .json({
            error: err?.message || "Failed to fetch pending withdrawals",
          });
      }
    },
  );

  return httpServer;
}

// Decode Google's encoded polyline format
function decodePolyline(
  encoded: string,
): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

//       const { data: coupon, error } = await sb
//         .from("discount_coupons")
//         .select("*")
//         .eq("code", code.toUpperCase().trim())
//         .eq("is_active", true)
//         .single();

//       if (error || !coupon) {
//         return res.status(404).json({ error: "Invalid or expired coupon code" });
//       }

//       // Check expiry
//       if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
//         return res.status(400).json({ error: "This coupon has expired" });
//       }

//       // Check usage limit
//       if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
//         return res.status(400).json({ error: "This coupon has reached its maximum usage limit" });
//       }

//       // Check minimum fare
//       if (coupon.min_fare && fareAmount && fareAmount < coupon.min_fare) {
//         return res.status(400).json({ error: `Minimum fare of £${coupon.min_fare} required for this coupon` });
//       }

//       // Calculate discount
//       let discountAmount = 0;
//       if (coupon.discount_type === 'percentage') {
//         discountAmount = fareAmount ? (fareAmount * coupon.discount_amount / 100) : 0;
//       } else {
//         discountAmount = coupon.discount_amount;
//       }

//       // Don't let discount exceed fare
//       if (fareAmount && discountAmount > fareAmount) {
//         discountAmount = fareAmount;
//       }

//       res.json({
//         valid: true,
//         coupon: {
//           code: coupon.code,
//           discountType: coupon.discount_type,
//           discountValue: coupon.discount_amount,
//           discountAmount: parseFloat(discountAmount.toFixed(2)),
//           description: coupon.discount_type === 'percentage'
//             ? `${coupon.discount_amount}% off`
//             : `£${coupon.discount_amount} off`,
//         },
//       });
//     } catch (err: any) {
//       console.error("Coupon validation error:", err);
//       res.status(500).json({ error: "Failed to validate coupon" });
//     }
//   });

//   const missingLaterBookingColumns = new Set<string>();
//   const missingLaterBookingCancelColumns = new Set<string>();

//   app.post("/api/later-bookings", async (req: Request, res: Response) => {
//     try {
//       const {
//         riderId, pickupAddress, pickupLatitude, pickupLongitude,
//         dropoffAddress, dropoffLatitude, dropoffLongitude, pickupAt, dropoffBy,
//         vehicleType, estimatedFare, distanceMiles: clientDistanceMiles, durationMinutes: clientDurationMinutes,
//         flightNumber, isRoundTrip, bookingType, passengers, luggage,
//         couponCode, discountAmount,
//         returnPickupAddress, returnPickupLatitude, returnPickupLongitude,
//         returnDropoffAddress, returnDropoffLatitude, returnDropoffLongitude,
//       } = req.body;

//       if (!riderId || !pickupAddress || !dropoffAddress || !pickupAt) {
//         return res.status(400).json({ error: "Missing required fields" });
//       }

//       const pickupTime = new Date(pickupAt);
//       const dropoffTime = dropoffBy ? new Date(dropoffBy) : null;
//       const now = new Date();

//       if (isNaN(pickupTime.getTime())) {
//         return res.status(400).json({ error: "Invalid date format" });
//       }

//       if (pickupTime <= now) {
//         return res.status(400).json({ error: `Pickup time (${pickupAt}) must be in the future` });
//       }

//       const timeDiffMs = pickupTime.getTime() - now.getTime();
//       if (timeDiffMs < 4 * 60 * 60 * 1000) {
//         return res.status(400).json({ error: "Bookings must be made at least 4 hours in advance" });
//       }

//       const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
//       maxDate.setHours(23, 59, 59, 999);
//       if (pickupTime > maxDate) {
//         return res.status(400).json({ error: "Pickup time cannot be more than 365 days in the future" });
//       }

//       if (dropoffTime) {
//         const gapMs = dropoffTime.getTime() - pickupTime.getTime();
//         if (gapMs < 30 * 60 * 1000) {
//           return res.status(400).json({ error: `Minimum 30 minutes required between pickup and dropoff (got ${Math.round(gapMs / 60000)} min)` });
//         }
//       }

//       // If a coupon was applied, increment its used_count
//       if (couponCode) {
//         const normalizedCouponCode = couponCode?.toUpperCase()?.trim();
//         const { error: couponRpcError } = await sb.rpc('increment_coupon_usage', { coupon_code: normalizedCouponCode });
//         if (couponRpcError) {
//           const { data: couponData } = await sb
//             .from("discount_coupons")
//             .select("used_count")
//             .eq("code", normalizedCouponCode)
//             .single();
//           if (couponData) {
//             await sb
//               .from("discount_coupons")
//               .update({ used_count: (couponData.used_count || 0) + 1 })
//               .eq("code", normalizedCouponCode);
//           }
//         }
//       }

//       let finalDropoffTime = dropoffTime;
//       if (!finalDropoffTime) {
//         const mins = clientDurationMinutes || 30;
//         finalDropoffTime = new Date(pickupTime.getTime() + mins * 60000);
//       }

//       const insertData: any = {
//         rider_id: riderId,
//         pickup_address: pickupAddress,
//         pickup_latitude: pickupLatitude ?? null,
//         pickup_longitude: pickupLongitude ?? null,
//         dropoff_address: dropoffAddress,
//         dropoff_latitude: dropoffLatitude ?? null,
//         dropoff_longitude: dropoffLongitude ?? null,
//         pickup_at: pickupTime.toISOString(),
//         dropoff_by: finalDropoffTime.toISOString(),
//         status: "scheduled",
//         vehicle_type: vehicleType || 'saloon',
//         estimated_fare: estimatedFare ?? null,
//         distance_miles: clientDistanceMiles ?? null,
//         duration_minutes: clientDurationMinutes ?? null,
//         flight_number: flightNumber ?? null,
//         is_round_trip: isRoundTrip ?? false,
//         booking_type: bookingType || 'standard',
//         passengers: passengers ?? 1,
//         luggage: luggage ?? 0,
//         coupon_code: couponCode ?? null,
//         discount_amount: discountAmount ?? 0,
//         return_pickup_address: returnPickupAddress ?? null,
//         return_pickup_latitude: returnPickupLatitude ?? null,
//         return_pickup_longitude: returnPickupLongitude ?? null,
//         return_dropoff_address: returnDropoffAddress ?? null,
//         return_dropoff_latitude: returnDropoffLatitude ?? null,
//         return_dropoff_longitude: returnDropoffLongitude ?? null,
//       };

//       for (const column of missingLaterBookingColumns) {
//         delete insertData[column];
//       }

//       let data: any = null;
//       let error: any = null;
//       const discoveredMissingColumns: string[] = [];
//       for (let attempt = 0; attempt < 25; attempt += 1) {
//         const result = await sb
//           .from("later_bookings")
//           .insert(insertData)
//           .select()
//           .single();

//         data = result.data;
//         error = result.error;
//         if (!error) {
//           break;
//         }

//         const missingColumn = error.message?.match(/Could not find the '([^']+)' column/)?.[1];
//         if (!missingColumn || !(missingColumn in insertData)) {
//           break;
//         }

//         missingLaterBookingColumns.add(missingColumn);
//         discoveredMissingColumns.push(missingColumn);
//         delete insertData[missingColumn];
//       }

//       if (discoveredMissingColumns.length > 0) {
//         console.info(`ℹ️ later_bookings insert skipped missing optional columns: ${discoveredMissingColumns.join(", ")}`);
//       }

//       if (!error) {
//         error = null;
//       }

//       if (error) {
//         console.error("Supabase insert error:", error);
//         return res.status(500).json({ error: error.message || "Database error" });
//       }
//       io.emit("later-booking:update", { type: "created", booking: data });
//       res.status(201).json({ booking: data });
//     } catch (error: any) {
//       console.error("Create later booking error:", error);
//       res.status(500).json({ error: error?.message || "Failed to create booking" });
//     }
//   });

//   app.get("/api/later-bookings", async (req: Request, res: Response) => {
//     try {
//       const { driverId } = req.query;

//       let query = sb
//         .from("later_bookings")
//         .select("*")
//         .order("pickup_at", { ascending: true });

//       if (driverId) {
//         const nowIso = new Date().toISOString();
//         // Driver sees unassigned scheduled rides (in the future) OR rides that they previously accepted
//         query = query.or(`and(status.eq.scheduled,pickup_at.gte.${nowIso}),and(status.eq.driver_accepted,driver_id.eq.${driverId}),and(status.eq.cancelled,driver_id.eq.${driverId})`);
//       } else {
//         query = query.in("status", ["scheduled", "driver_accepted"]);
//       }

//       const { data, error } = await query;

//       if (error) return res.status(500).json({ error: error.message });
//       res.json({ bookings: data || [] });
//     } catch (error: any) {
//       res.status(500).json({ error: error?.message || "Failed to fetch bookings" });
//     }
//   });

//   app.get("/api/later-bookings/rider/:riderId", async (req: Request, res: Response) => {
//     try {
//       const { data, error } = await sb
//         .from("later_bookings")
//         .select("*")
//         .eq("rider_id", req.params.riderId as string)
//         .order("pickup_at", { ascending: true });

//       if (error) return res.status(500).json({ error: error.message });
//       res.json({ bookings: data || [] });
//     } catch (error: any) {
//       res.status(500).json({ error: error?.message || "Failed to fetch bookings" });
//     }
//   });

//   app.put("/api/later-bookings/:id/accept", async (req: Request, res: Response) => {
//     try {
//       const { driverId } = req.body;
//       const updateData: any = {
//         status: "driver_accepted",
//         updated_at: new Date().toISOString(),
//         accepted_by_driver_at: new Date().toISOString()
//       };

//       if (driverId) {
//         updateData.driver_id = driverId;
//       }

//       let { data, error } = await sb
//         .from("later_bookings")
//         .update(updateData)
//         .eq("id", req.params.id as string)
//         .select()
//         .single();

//       // If accepted_by_driver_at column doesn't exist, retry without it
//       if (error && error.message?.includes("accepted_by_driver_at")) {
//         console.warn("⚠️ accepted_by_driver_at column missing, retrying without it");
//         delete updateData.accepted_by_driver_at;
//         const retry = await sb
//           .from("later_bookings")
//           .update(updateData)
//           .eq("id", req.params.id as string)
//           .select()
//           .single();
//         data = retry.data;
//         error = retry.error;
//       }

//       if (error) return res.status(500).json({ error: error.message });
//       io.emit("later-booking:update", { type: "accepted", booking: data });
//       res.json({ booking: data });
//     } catch (error: any) {
//       res.status(500).json({ error: error?.message || "Failed to accept booking" });
//     }
//   });

//   app.put("/api/later-bookings/:id/cancel", async (req: Request, res: Response) => {
//     try {
//       const { cancelledBy, reason } = req.body || {}; // 'rider' | 'driver'

//       // ── Fetch current booking ──
//       const { data: booking, error: fetchErr } = await sb
//         .from("later_bookings")
//         .select("*")
//         .eq("id", req.params.id as string)
//         .single();

//       if (fetchErr || !booking) {
//         return res.status(404).json({ error: "Booking not found" });
//       }

//       if (booking.status === 'cancelled' || booking.status === 'driver_cancelled' || booking.status === 'driver_cancelled_late') {
//         return res.status(400).json({ error: "Booking already cancelled" });
//       }

//       const now = new Date();
//       const pickupTime = new Date(booking.pickup_at);
//       const msUntilPickup = pickupTime.getTime() - now.getTime();
//       const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
//       const withinThreeHours = msUntilPickup >= 0 && msUntilPickup <= THREE_HOURS_MS;
//       const pastPickup = msUntilPickup < 0;
//       const estimatedFare = booking.estimated_fare || 0;

//       let cancellationFee = 0;
//       let refundAmount = 0;
//       let penaltyNote = '';

//       // Tracking fields
//       let statusToSet = 'cancelled';
//       let driverCancelType = null;
//       let driverPenaltyApplied = false;
//       let lateCancellationFee = 0;
//       let releaseDriverAssignment = false;

//       if (cancelledBy === 'rider') {
//         if (withinThreeHours || pastPickup) {
//           // Charge 100% cancellation fee for late cancellation
//           const halfFare = estimatedFare * 1;
//           cancellationFee = halfFare;
//           penaltyNote = `Late cancellation within 3 hours — 100% fee of £${halfFare.toFixed(2)} charged.`;

//           // Deduct from rider wallet (allowing negative balance)
//           if (booking.rider_id && halfFare > 0) {
//             try {
//               const { data: riderRow } = await sb.from('users').select('wallet_balance').eq('id', booking.rider_id).single();
//               const currentBalance = riderRow?.wallet_balance || 0;
//               const newBalance = Number((currentBalance - halfFare).toFixed(2));
//               await sb.from('users').update({ wallet_balance: newBalance }).eq('id', booking.rider_id);
//               // Record wallet transaction
//               await sb.from('wallet_transactions').insert({
//                 user_id: booking.rider_id,
//                 ride_id: null,
//                 amount: halfFare,
//                 type: 'debit',
//                 description: `100% Late cancellation fee (£${halfFare.toFixed(2)}) for booking ${booking.id}`,
//               });
//               console.log(`💸 Late cancel: rider ${booking.rider_id} charged 100% fee £${halfFare} (wallet: ${currentBalance} → ${newBalance})`);
//             } catch (walletErr) {
//               console.error('Failed to charge rider wallet for late cancel:', walletErr);
//             }
//           }

//           // Credit driver earnings with the 100% cancellation fee (no platform commission)
//           if (booking.driver_id && halfFare > 0) {
//             try {
//               const { data: driverData, error: driverFetchErr } = await sb.from('drivers').select('total_earnings').eq('id', booking.driver_id).single();

//               if (driverFetchErr) {
//                 console.error(`❌ Failed to fetch driver ${booking.driver_id}:`, driverFetchErr);
//               } else if (!driverData) {
//                 console.warn(`⚠️ Driver ${booking.driver_id} not found in database`);
//               } else {
//                 const currentEarnings = Number(driverData?.total_earnings || 0);
//                 const newEarnings = Number((currentEarnings + Math.abs(halfFare)).toFixed(2));
//                 await sb.from('drivers').update({ total_earnings: newEarnings }).eq('id', booking.driver_id);
//               }
//             } catch (earningsErr) {
//               console.error(`❌ Exception updating driver earnings for driver ${booking.driver_id}:`, earningsErr);
//             }
//           } else if (halfFare > 0) {
//             console.warn(`⚠️ No driver assigned to booking ${booking.id} - cannot credit earnings`);
//           }
//         } else {
//           // Free cancellation — issue full refund
//           refundAmount = estimatedFare > 0 ? estimatedFare : 0;
//           penaltyNote = 'Free cancellation — more than 3 hours before pickup.';
//           // If they prepaid something, refund it (stub — payment logic would go here)
//           console.log(`✅ Free cancel: rider ${booking.rider_id}, refund would be £${refundAmount}`);
//         }
//       } else if (cancelledBy === 'driver') {
//         // Driver cancellation within 3 hours: 50% penalty
//         if (withinThreeHours || pastPickup) {
//           const driverPenalty = estimatedFare * 0.5;
//           penaltyNote = `Driver late cancellation — 50% penalty of £${driverPenalty.toFixed(2)} applies.`;
//           statusToSet = 'scheduled';
//           driverCancelType = 'late_cancellation';
//           driverPenaltyApplied = true;
//           lateCancellationFee = driverPenalty;
//           releaseDriverAssignment = true;

//           if (booking.driver_id && driverPenalty > 0) {
//             try {
//               // Add a deduction record for the driver
//               await sb.from('driver_deductions').insert({
//                 driver_id: booking.driver_id,
//                 amount: driverPenalty,
//                 type: 'late_cancel_penalty',
//                 reason: `Late cancellation penalty (50%) for scheduled booking ${booking.id}`,
//               });

//               // Also deduct from driver's total_earnings
//               const { data: driverData } = await sb.from('drivers').select('total_earnings').eq('id', booking.driver_id).single();
//               const currentEarnings = Number(driverData?.total_earnings || 0);
//               const newEarnings = Number((currentEarnings - driverPenalty).toFixed(2));
//               await sb.from('drivers').update({ total_earnings: newEarnings }).eq('id', booking.driver_id);

//             } catch (penaltyErr) {
//               console.error('Failed to record driver penalty:', penaltyErr);
//             }
//           }
//         } else {
//           penaltyNote = 'Driver cancelled more than 3 hours before pickup — no penalty.';
//           statusToSet = 'scheduled';
//           driverCancelType = 'free_cancellation';
//           releaseDriverAssignment = true;
//         }
//       }

//       const updatePayload: any = {
//         status: statusToSet,
//         updated_at: now.toISOString(),
//         cancellation_fee: cancellationFee,
//         cancellation_note: penaltyNote,
//         cancelled_by: cancelledBy || 'rider',
//       };

//       if (cancelledBy === 'driver') {
//         if (releaseDriverAssignment) {
//           updatePayload.driver_id = null;
//           updatePayload.accepted_by_driver_at = null;
//         }
//         updatePayload.driver_cancelled_at = now.toISOString();
//         updatePayload.driver_cancel_reason = reason || null;
//         updatePayload.driver_cancel_type = driverCancelType;
//         updatePayload.late_cancellation_fee = lateCancellationFee;
//         updatePayload.driver_penalty_applied = driverPenaltyApplied;
//       }

//       for (const column of missingLaterBookingCancelColumns) {
//         delete updatePayload[column];
//       }

//       let data: any = null;
//       let error: any = null;
//       const discoveredMissingColumns: string[] = [];
//       for (let attempt = 0; attempt < 12; attempt += 1) {
//         const result = await sb
//           .from("later_bookings")
//           .update(updatePayload)
//           .eq("id", req.params.id as string)
//           .select()
//           .single();

//         data = result.data;
//         error = result.error;
//         if (!error) {
//           break;
//         }

//         const missingColumn = error.message?.match(/Could not find the '([^']+)' column/)?.[1];
//         if (!missingColumn || !(missingColumn in updatePayload)) {
//           break;
//         }

//         missingLaterBookingCancelColumns.add(missingColumn);
//         discoveredMissingColumns.push(missingColumn);
//         delete updatePayload[missingColumn];
//       }

//       if (discoveredMissingColumns.length > 0) {
//         console.info(`ℹ️ later_bookings cancel skipped missing optional columns: ${discoveredMissingColumns.join(", ")}`);
//       }

//       const statusMayBeUnsupported =
//         error &&
//         cancelledBy === 'driver' &&
//         updatePayload.status !== 'cancelled' &&
//         (error.code === '23514' ||
//           error.message?.toLowerCase().includes('status') ||
//           error.message?.toLowerCase().includes('constraint'));

//       if (statusMayBeUnsupported) {
//         updatePayload.status = 'cancelled';
//         const retry = await sb
//           .from("later_bookings")
//           .update(updatePayload)
//           .eq("id", req.params.id as string)
//           .select()
//           .single();

//         data = retry.data;
//         error = retry.error;
//       }

//       if (error) {
//         console.error("Supabase cancel booking update error:", error);
//         return res.status(500).json({ error: error.message });
//       }
//       io.emit("later-booking:update", {
//         type: cancelledBy === 'driver' ? "released" : "cancelled",
//         booking: data,
//       });
//       res.json({ booking: data, withinThreeHours, cancellationFee, penaltyNote });
//     } catch (error: any) {
//       res.status(500).json({ error: error?.message || "Failed to cancel booking" });
//     }
//   });

//   app.post("/api/rides/:id/rating", async (req: Request, res: Response) => {
//     try {
//       const { id } = req.params;
//       const { riderRating, driverRating, riderComment, driverComment, ratedBy } = req.body;

//       const updateData: any = {};

//       if (ratedBy === "driver") {
//         if (riderRating !== undefined) updateData.rider_rating = riderRating;
//         // if (riderComment !== undefined) updateData.rider_comment = riderComment; // Column doesn't exist
//       } else if (ratedBy === "rider") {
//         if (driverRating !== undefined) updateData.driver_rating = driverRating;
//         // if (driverComment !== undefined) updateData.driver_comment = driverComment; // Column doesn't exist
//       }

//       const { data, error } = await supabase
//         .from("rides")
//         .update(updateData)
//         .eq("id", id)
//         .select()
//         .single();

//       if (error) {
//         console.error("Supabase update error saving rating:", error);
//         return res.status(500).json({ error: "Database error saving rating" });
//       }

//       res.json({ success: true, ride: data });
//     } catch (error: any) {
//       console.error("Save rating error:", error);
//       res.status(500).json({ error: error?.message || "Failed to save rating" });
//     }
//   });

//   // ─── Scheduled Bookings Escalation Engine ───
//   // Runs every minute to evaluate scheduled bookings that haven't been accepted yet.
//   setInterval(async () => {
//     try {
//       const { data: scheduledRides, error } = await supabase
//         .from('later_bookings')
//         .select('*')
//         .eq('status', 'scheduled')
//         .gte('pickup_at', new Date().toISOString());

//       if (error || !scheduledRides) return;

//       const now = new Date().getTime();

//       for (const ride of scheduledRides) {
//         const pickupTime = new Date(ride.pickup_at).getTime();
//         const minsUntilPickup = (pickupTime - now) / 60000;

//         // 15 Minutes -> URGENT ASAP Priority Job
//         if (minsUntilPickup <= 15) {
//           // Broadcast to all online drivers as an urgent ride
//           io.emit('ride:urgent_scheduled', {
//             ...ride,
//             id: `urgent_sched_${ride.id}`, // prefix to avoid UI clashes if needed, or pass as is
//             isUrgentScheduled: true,
//             title: 'URGENT SCHEDULED RIDE',
//             subtitle: 'Pickup soon',
//           });
//           continue;
//         }

//         // 30 Minutes -> Urgent Push
//         if (minsUntilPickup <= 30 && minsUntilPickup > 29) { // Run once when crossing 30
//           // (In a real scenario, this uses Expo Push Notifications to available drivers)
//           console.log(`[ESCALATION] Urgent Push for scheduled ride ${ride.id} (30 mins until pickup)`);
//         }

//         // 60 Minutes -> Standard Push
//         if (minsUntilPickup <= 60 && minsUntilPickup > 59) { // Run once when crossing 60
//           console.log(`[ESCALATION] Push for scheduled ride ${ride.id} (60 mins until pickup)`);
//         }
//       }
//     } catch (err) {
//       console.error('Escalation engine error:', err);
//     }
//   }, 60000); // 1 minute interval

//   // ─── Driver Payout Methods ────────────────────────────────────────
//   app.get("/api/driver-payout-methods/:driverId", async (req: Request, res: Response) => {
//     try {
//       const { data, error } = await sb
//         .from("driver_payout_methods")
//         .select("*")
//         .eq("driver_id", req.params.driverId)
//         .order("created_at", { ascending: false })
//         .limit(1)
//         .single();

//       if (error) {
//         // No rows found is not a real error
//         if (error.code === 'PGRST116') {
//           return res.json(null);
//         }
//         return res.status(500).json({ error: error.message });
//       }
//       res.json(data);
//     } catch (err: any) {
//       res.status(500).json({ error: err?.message || "Failed to fetch payout method" });
//     }
//   });

//   app.post("/api/driver-payout-methods/:driverId", async (req: Request, res: Response) => {
//     try {
//       const { account_name, account_no, sort_code, bank_provider } = req.body;
//       if (!account_name || !account_no || !sort_code || !bank_provider) {
//         return res.status(400).json({ error: "All fields are required" });
//       }

//       const { data, error } = await sb
//         .from("driver_payout_methods")
//         .insert({
//           driver_id: req.params.driverId,
//           account_name,
//           account_no,
//           sort_code,
//           bank_provider,
//         })
//         .select()
//         .single();

//       if (error) return res.status(500).json({ error: error.message });
//       res.status(201).json(data);
//     } catch (err: any) {
//       res.status(500).json({ error: err?.message || "Failed to create payout method" });
//     }
//   });

//   app.put("/api/driver-payout-methods/:driverId/:id", async (req: Request, res: Response) => {
//     try {
//       const { account_name, account_no, sort_code, bank_provider } = req.body;

//       const { data, error } = await sb
//         .from("driver_payout_methods")
//         .update({
//           account_name,
//           account_no,
//           sort_code,
//           bank_provider,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", req.params.id)
//         .eq("driver_id", req.params.driverId)
//         .select()
//         .single();

//       if (error) return res.status(500).json({ error: error.message });
//       res.json(data);
//     } catch (err: any) {
//       res.status(500).json({ error: err?.message || "Failed to update payout method" });
//     }
//   });

//   // ═══════════════════════════════════════════════════════════════════════════════
//   // ════════════════ RIDER PAYOUT METHODS & WITHDRAWALS (NEW) ════════════════════
//   // ═══════════════════════════════════════════════════════════════════════════════

//   // Get rider payout method
//   app.get("/api/rider-payout-methods/:userId", async (req: Request, res: Response) => {
//     try {
//       const { data, error } = await sb
//         .from("rider_payout_methods")
//         .select("*")
//         .eq("user_id", req.params.userId)
//         .order("created_at", { ascending: false })
//         .limit(1)
//         .single();

//       if (error) {
//         // No rows found is not a real error
//         if (error.code === 'PGRST116') {
//           return res.json(null);
//         }
//         return res.status(500).json({ error: error.message });
//       }
//       res.json(data);
//     } catch (err: any) {
//       res.status(500).json({ error: err?.message || "Failed to fetch payout method" });
//     }
//   });

//   // Create rider payout method
//   app.post("/api/rider-payout-methods/:userId", async (req: Request, res: Response) => {
//     try {
//       const { account_name, account_no, sort_code, bank_provider } = req.body;
//       if (!account_name || !account_no || !sort_code || !bank_provider) {
//         return res.status(400).json({ error: "All fields are required" });
//       }

//       const { data, error } = await sb
//         .from("rider_payout_methods")
//         .insert({
//           user_id: req.params.userId,
//           account_name,
//           account_no,
//           sort_code,
//           bank_provider,
//         })
//         .select()
//         .single();

//       if (error) return res.status(500).json({ error: error.message });
//       res.status(201).json(data);
//     } catch (err: any) {
//       res.status(500).json({ error: err?.message || "Failed to create payout method" });
//     }
//   });

//   // Update rider payout method
//   app.put("/api/rider-payout-methods/:userId/:id", async (req: Request, res: Response) => {
//     try {
//       const { account_name, account_no, sort_code, bank_provider } = req.body;

//       const { data, error } = await sb
//         .from("rider_payout_methods")
//         .update({
//           account_name,
//           account_no,
//           sort_code,
//           bank_provider,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", req.params.id)
//         .eq("user_id", req.params.userId)
//         .select()
//         .single();

//       if (error) return res.status(500).json({ error: error.message });
//       res.json(data);
//     } catch (err: any) {
//       res.status(500).json({ error: err?.message || "Failed to update payout method" });
//     }
//   });

//   // Request withdrawal (debit from wallet, create withdrawal record)
//   app.post("/api/withdrawals/:userId", async (req: Request, res: Response) => {
//     try {
//       const { amount, payout_method_id } = req.body;
//       const userId = req.params.userId;

//       if (!amount || amount <= 0) {
//         return res.status(400).json({ error: "Amount must be greater than 0" });
//       }

//       // Get user's current wallet balance
//       const { data: userData, error: userError } = await sb
//         .from("users")
//         .select("wallet_balance")
//         .eq("id", userId)
//         .single();

//       if (userError || !userData) {
//         return res.status(404).json({ error: "User not found" });
//       }

//       const currentBalance = userData.wallet_balance || 0;
//       if (currentBalance < amount) {
//         return res.status(400).json({ error: "Insufficient wallet balance" });
//       }

//       // Create withdrawal record
//       const { data: withdrawalData, error: withdrawalError } = await sb
//         .from("withdrawals")
//         .insert({
//           user_id: userId,
//           payout_method_id,
//           amount,
//           status: "pending",
//         })
//         .select()
//         .single();

//       if (withdrawalError) {
//         return res.status(500).json({ error: withdrawalError.message });
//       }

//       // Debit wallet
//       const newBalance = currentBalance - amount;
//       const { error: updateError } = await sb
//         .from("users")
//         .update({ wallet_balance: newBalance })
//         .eq("id", userId);

//       if (updateError) {
//         return res.status(500).json({ error: "Failed to update wallet" });
//       }

//       // Record withdrawal transaction
//       try {
//         await sb
//           .from("wallet_transactions")
//           .insert({
//             user_id: userId,
//             amount,
//             type: "debit",
//             description: `Withdrawal request - £${amount.toFixed(2)}`,
//           });
//       } catch (e: any) {
//         console.warn("Failed to record withdrawal transaction:", e?.message);
//       }

//       res.status(201).json({
//         withdrawal: withdrawalData,
//         newBalance,
//       });
//     } catch (err: any) {
//       res.status(500).json({ error: err?.message || "Failed to process withdrawal" });
//     }
//   });

//   // Get user's withdrawal history
//   app.get("/api/withdrawals/:userId", async (req: Request, res: Response) => {
//     try {
//       const { data, error } = await sb
//         .from("withdrawals")
//         .select("*")
//         .eq("user_id", req.params.userId)
//         .order("created_at", { ascending: false });

//       if (error) {
//         return res.status(500).json({ error: error.message });
//       }

//       res.json({ withdrawals: data || [] });
//     } catch (err: any) {
//       res.status(500).json({ error: err?.message || "Failed to fetch withdrawals" });
//     }
//   });

//   // Approve/Complete a withdrawal
//   app.post("/api/withdrawals/:withdrawalId/approve", async (req: Request, res: Response) => {
//     try {
//       const { withdrawalId } = req.params;
//       const { transactionId } = req.body;

//       // Get withdrawal details
//       const { data: withdrawal, error: fetchError } = await sb
//         .from("withdrawals")
//         .select("*")
//         .eq("id", withdrawalId)
//         .single();

//       if (fetchError || !withdrawal) {
//         return res.status(404).json({ error: "Withdrawal not found" });
//       }

//       // Update withdrawal status to completed
//       const { error: updateError } = await sb
//         .from("withdrawals")
//         .update({
//           status: "completed",
//           completed_at: new Date().toISOString(),
//           transaction_id: transactionId || null,
//         })
//         .eq("id", withdrawalId);

//       if (updateError) {
//         return res.status(500).json({ error: updateError.message });
//       }

//       console.log(`✅ Withdrawal ${withdrawalId} approved - amount £${withdrawal.amount}, user: ${withdrawal.user_id}`);
//       res.json({ success: true, message: "Withdrawal approved" });
//     } catch (err: any) {
//       res.status(500).json({ error: err?.message || "Failed to approve withdrawal" });
//     }
//   });

//   // Cancel a withdrawal (and refund wallet)
//   app.post("/api/withdrawals/:withdrawalId/cancel", async (req: Request, res: Response) => {
//     try {
//       const { withdrawalId } = req.params;
//       const { reason } = req.body;

//       // Get withdrawal details
//       const { data: withdrawal, error: fetchError } = await sb
//         .from("withdrawals")
//         .select("*")
//         .eq("id", withdrawalId)
//         .single();

//       if (fetchError || !withdrawal) {
//         return res.status(404).json({ error: "Withdrawal not found" });
//       }

//       if (withdrawal.status !== "pending") {
//         return res.status(400).json({ error: "Only pending withdrawals can be cancelled" });
//       }

//       // Update withdrawal status to cancelled
//       const { error: updateError } = await sb
//         .from("withdrawals")
//         .update({
//           status: "cancelled",
//           notes: reason || "Cancelled",
//         })
//         .eq("id", withdrawalId);

//       if (updateError) {
//         return res.status(500).json({ error: updateError.message });
//       }

//       // Refund the wallet
//       const { data: userData, error: userError } = await sb
//         .from("users")
//         .select("wallet_balance")
//         .eq("id", withdrawal.user_id)
//         .single();

//       if (!userError && userData) {
//         const newBalance = (userData.wallet_balance || 0) + withdrawal.amount;
//         await sb
//           .from("users")
//           .update({ wallet_balance: newBalance })
//           .eq("id", withdrawal.user_id);

//         // Record refund transaction
//         await sb
//           .from("wallet_transactions")
//           .insert({
//             user_id: withdrawal.user_id,
//             amount: withdrawal.amount,
//             type: "credit",
//             description: `Withdrawal cancelled - £${withdrawal.amount.toFixed(2)} refunded`,
//           });
//       }

//       console.log(`❌ Withdrawal ${withdrawalId} cancelled - amount £${withdrawal.amount} refunded, user: ${withdrawal.user_id}`);
//       res.json({ success: true, message: "Withdrawal cancelled and wallet refunded" });
//     } catch (err: any) {
//       res.status(500).json({ error: err?.message || "Failed to cancel withdrawal" });
//     }
//   });

//   // Get all pending withdrawals (for admin)
//   app.get("/api/withdrawals/pending/all", async (req: Request, res: Response) => {
//     try {
//       const { data, error } = await sb
//         .from("withdrawals")
//         .select("*, user:users(email, full_name, wallet_balance)")
//         .eq("status", "pending")
//         .order("created_at", { ascending: true });

//       if (error) {
//         return res.status(500).json({ error: error.message });
//       }

//       res.json({ pending: data || [] });
//     } catch (err: any) {
//       res.status(500).json({ error: err?.message || "Failed to fetch pending withdrawals" });
//     }
//   });

//   return httpServer;

// }

// // Decode Google's encoded polyline format
// function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
//   const points: { latitude: number; longitude: number }[] = [];
//   let index = 0;
//   let lat = 0;
//   let lng = 0;

//   while (index < encoded.length) {
//     let b;
//     let shift = 0;
//     let result = 0;

//     do {
//       b = encoded.charCodeAt(index++) - 63;
//       result |= (b & 0x1f) << shift;
//       shift += 5;
//     } while (b >= 0x20);

//     const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
//     lat += dlat;

//     shift = 0;
//     result = 0;

//     do {
//       b = encoded.charCodeAt(index++) - 63;
//       result |= (b & 0x1f) << shift;
//       shift += 5;
//     } while (b >= 0x20);

//     const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
//     lng += dlng;

//     points.push({
//       latitude: lat / 1e5,
//       longitude: lng / 1e5,
//     });
//   }

//   return points;
// }
