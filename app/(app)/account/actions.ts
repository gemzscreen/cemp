"use server";
import { createClient } from "@/lib/supabase/server";

export type PwState = { ok?: boolean; error?: string };

export async function changePassword(_prev: PwState, formData: FormData): Promise<PwState> {
  const pw = String(formData.get("password") ?? ""), confirm = String(formData.get("confirm") ?? "");
  if (pw.length < 10) return { error: "Use at least 10 characters." };
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return { error: "Mix letters and numbers." };
  if (pw !== confirm) return { error: "The two passwords don't match." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("reauthentication") || m.includes("recent")) return { error: "For security, sign out and sign in again, then change your password within a few minutes." };
    if (m.includes("same")) return { error: "The new password must be different from the current one." };
    if (m.includes("pwned") || m.includes("leaked") || m.includes("weak")) return { error: "This password appears in known data leaks or is too weak. Choose another." };
    return { error: error.message };
  }
  return { ok: true };
}
