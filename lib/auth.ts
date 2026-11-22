// Per-request session + role, shared by the layout and the page (React cache dedupes within one request).
// getClaims() verifies the JWT locally when the project uses asymmetric signing keys (no network call),
// and falls back to the Auth server otherwise. RLS still guards every query.
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getDb = cache(createClient);

export const getMe = cache(async () => {
  const supabase = await getDb();
  const { data } = await supabase.auth.getClaims();
  const id = (data?.claims?.sub as string | undefined) ?? null;
  if (!id) return { supabase, user: null, role: null as string | null, fullName: null as string | null, avatar: null as string | null, jobTitle: null as string | null };
  const { data: p } = await supabase.from("profiles").select("role,full_name,avatar,job_title").eq("id", id).maybeSingle();
  return { supabase, user: { id, email: (data?.claims?.email as string | undefined) ?? null }, role: (p?.role as string | undefined) ?? "viewer",
    fullName: p?.full_name ?? null, avatar: (p?.avatar as string | null) ?? null, jobTitle: (p?.job_title as string | null) ?? null };
});

export { displayName, initials, roleName } from "./names";
