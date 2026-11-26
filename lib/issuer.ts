// v2.2.0: who issues the quotation (edited on /account, stored in profiles.issuer).
export type Issuer = { company: string; name: string; title: string; prc: string; address: string; contact: string; email: string; tin: string; logo: string };
export const ISSUER_FIELDS: { key: Exclude<keyof Issuer, "logo">; label: string; max: number; placeholder: string }[] = [
  { key: "company", label: "Company / trade name", max: 120, placeholder: "e.g. Skyset Builders (leave blank to quote under your name)" },
  { key: "name", label: "Name on the signature", max: 80, placeholder: "e.g. Engr. Juan Dela Cruz" },
  { key: "title", label: "Title / licences", max: 120, placeholder: "e.g. Civil Engineer · Master Plumber" },
  { key: "prc", label: "PRC licence no(s).", max: 80, placeholder: "e.g. CE 0123456 · MP 0012345" },
  { key: "address", label: "Address", max: 200, placeholder: "Street, barangay, city" },
  { key: "contact", label: "Phone", max: 60, placeholder: "+63 9xx xxx xxxx" },
  { key: "email", label: "E-mail", max: 120, placeholder: "you@example.com" },
  { key: "tin", label: "TIN", max: 30, placeholder: "000-000-000-000" },
];
export function normalizeIssuer(raw: unknown): Issuer {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const s = (k: string, max: number) => (typeof r[k] === "string" ? (r[k] as string).trim().slice(0, max) : "");
  const logo = typeof r.logo === "string" && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(r.logo) && r.logo.length <= 200000 ? r.logo : "";
  return { ...Object.fromEntries(ISSUER_FIELDS.map((f) => [f.key, s(f.key, f.max)])), logo } as Issuer;
}
