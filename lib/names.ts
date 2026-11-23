// Pure name helpers (safe in client components).
/** Friendly display name: full name, else the e-mail's local part made readable ("gem.tubalado" → "Gem Tubalado"). */
export function displayName(fullName: string | null | undefined, email: string | null | undefined) {
  if (fullName?.trim()) return fullName.trim();
  const local = (email ?? "").split("@")[0];
  return local ? local.split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") : "there";
}
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
export const roleName = (r?: string | null) => ({ admin: "Admin", editor: "Editor", viewer: "Viewer" } as Record<string, string>)[r ?? ""] ?? r ?? "";
/** Honorifics/titles that come before a first name ("Engr. Gemz Tubalado"). */
const TITLE = /^(engr|eng|arch|atty|dr|prof|mr|mrs|ms|miss|sir|hon|ar|ir)\.?$/i;
/** First name, skipping a leading title. withTitle keeps it: "Engr. Gemz". */
export function firstName(name: string, withTitle = false) {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "there";
  const t = TITLE.test(w[0]) && w.length > 1 ? w[0] : "";
  const first = t ? w[1] : w[0];
  return withTitle && t ? `${t} ${first}` : first;
}
