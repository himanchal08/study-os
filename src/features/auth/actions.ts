"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AuthState = {
  error?: string;
  message?: string;
} | null;

/**
 * Server Action: sign in with email + password.
 * On success, redirect() is called server-side — no useRouter needed.
 */
export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Server-side redirect — the client never needs to call router.push()
  redirect("/");
}

/**
 * Server Action: create account with email + password.
 * Returns a message (check email) or error.
 */
export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Auth callback URL: handled by src/app/auth/callback/route.ts
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { message: "Check your email for a confirmation link." };
}

/** Sign out Server Action (also used by TopBar) */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
