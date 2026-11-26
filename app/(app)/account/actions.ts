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

export type ProfileState = { ok?: boolean; error?: string };

/** Name, job title and photo. Role and e-mail are admin-only (DB trigger). Photo = small data URL resized in the browser. */
export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const fullName = String(formData.get("full_name") ?? "").trim().replace(/\s+/g, " ");
  const jobTitle = String(formData.get("job_title") ?? "").trim();
  const avatar = String(formData.get("avatar") ?? "");
  const homeStd = String(formData.get("home_standard") ?? "ph");
  if (fullName.length < 2 || fullName.length > 80) return { error: "Name: 2 to 80 characters." };
  if (!["ph", "bn", "intl"].includes(homeStd)) return { error: "Choose a home standard." };
  if (jobTitle.length > 120) return { error: "Title: up to 120 characters." };
  if (avatar && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)) return { error: "Photo must be a PNG, JPEG or WebP image." };
  if (avatar.length > 200000) return { error: "Photo is too large: choose a smaller image." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  const { error } = await supabase.from("profiles").update({
    full_name: fullName, job_title: jobTitle || null, home_standard: homeStd, avatar: formData.get("remove_avatar") === "1" ? null : avatar || undefined,
  }).eq("id", user.id);
  if (error) return { error: error.message };
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/", "layout");
  return { ok: true };
}

export type IssuerState = { ok?: boolean; error?: string };
/** v2.2.0: quotation issuer details (company, signatory, licences, contact, logo). Own row only (RLS). */
export async function updateIssuer(_prev: IssuerState, formData: FormData): Promise<IssuerState> {
  const { normalizeIssuer } = await import("@/lib/issuer");
  const raw = Object.fromEntries(formData.entries());
  if (raw.logo && !/^data:image\/(png|jpeg|webp);base64,/.test(String(raw.logo))) return { error: "Logo must be a PNG, JPEG or WebP image." };
  if (String(raw.logo ?? "").length > 200000) return { error: "Logo is too large: choose a smaller image." };
  const issuer = normalizeIssuer({ ...raw, logo: formData.get("remove_logo") === "1" ? "" : raw.logo });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  const { error } = await supabase.from("profiles").update({ issuer }).eq("id", user.id);
  if (error) return { error: error.message };
  return { ok: true };
}
