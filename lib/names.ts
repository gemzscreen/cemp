// Pure name helpers (safe in client components).
/** Friendly display name: full name, else the e-mail's local part made readable ("gem.tubalado" → "Gem Tubalado"). */
export function displayName(fullName: string | null | undefined, email: string | null | undefined) {
  if (fullName?.trim()) return fullName.trim();
  const local = (email ?? "").split("@")[0];
  return local ? local.split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") : "there";
}
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
export const roleName = (r?: string | null) => ({ admin: "Admin", editor: "Editor", viewer: "Viewer" } as Record<string, string>)[r ?? ""] ?? r ?? "";
