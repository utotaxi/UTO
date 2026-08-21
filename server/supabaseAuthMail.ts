import { createClient, type User as AuthUser } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { supabase } from "./db";

function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
    ""
  );
}

function getAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

/** Anon client — required to trigger Auth email sends (recovery / OTP). */
function createAnonAuthClient() {
  const url = getSupabaseUrl();
  const anonKey = getAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Look up an Auth user by email via the Admin listUsers filter.
 */
export async function getAuthUserByEmail(
  email: string,
): Promise<AuthUser | null> {
  const normalized = email.toLowerCase();
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 50,
    // GoTrue "filter" matches email (partial/full).
    filter: normalized,
  } as any);

  if (error) {
    console.warn("⚠️ Auth admin user lookup failed:", error.message);
    return null;
  }

  const users = data?.users || [];
  return (
    users.find((u) => (u.email || "").toLowerCase() === normalized) || null
  );
}

/**
 * App accounts live in public.users; Supabase recovery emails only go to
 * auth.users. Create a confirmed Auth user when missing so reset emails work.
 */
export async function ensureAuthUserForEmail(
  email: string,
  fullName?: string | null,
): Promise<AuthUser> {
  const existing = await getAuthUserByEmail(email);
  if (existing) return existing;

  const tempPassword = randomBytes(24).toString("base64url");
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exists")
    ) {
      const again = await getAuthUserByEmail(email);
      if (again) return again;
    }
    throw new Error(`Failed to prepare Auth user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Failed to prepare Auth user: no user returned");
  }
  return data.user;
}

/**
 * Ask Supabase Auth to email a password-recovery OTP / magic link.
 * Email delivery uses whatever is configured in the Supabase dashboard
 * (built-in mailer or custom SMTP) — not this app's mailer.ts.
 */
export async function sendSupabasePasswordResetEmail(
  email: string,
  redirectTo?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const anon = createAnonAuthClient();
    const { error } = await anon.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || "uto://auth/reset-password",
    });

    if (error) {
      console.error("❌ Supabase resetPasswordForEmail failed:", error.message);
      return { success: false, error: error.message };
    }

    console.log(`✅ Supabase password-reset email requested for ${email}`);
    return { success: true };
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error("❌ Supabase password-reset send exception:", message);
    return { success: false, error: message };
  }
}

/**
 * Verify the recovery OTP (6–8 digits) from the Supabase Auth email.
 */
export async function verifySupabaseRecoveryOtp(
  email: string,
  token: string,
): Promise<
  | { success: true; authUserId: string }
  | { success: false; error: string }
> {
  try {
    const anon = createAnonAuthClient();
    const { data, error } = await anon.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const authUserId = data.user?.id;
    if (!authUserId) {
      return { success: false, error: "Verification succeeded but no user returned" };
    }

    return { success: true, authUserId };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Confirm a recovery session from a magic-link deep link (access_token).
 */
export async function verifySupabaseRecoveryAccessToken(
  accessToken: string,
): Promise<
  | { success: true; email: string; authUserId: string }
  | { success: false; error: string }
> {
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user?.email) {
      return {
        success: false,
        error: error?.message || "Invalid or expired recovery link",
      };
    }
    return {
      success: true,
      email: data.user.email.toLowerCase(),
      authUserId: data.user.id,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function updateSupabaseAuthPassword(
  authUserId: string,
  newPassword: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const { error } = await supabase.auth.admin.updateUserById(authUserId, {
    password: newPassword,
  });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
