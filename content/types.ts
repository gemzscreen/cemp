// Content-as-code: each release batch is a typed file synced into Supabase from /admin (admin only).
import type { DiagramSpec } from "@/lib/diagram";

export type ClauseRef = { doc?: string; section: string; note?: string }; // doc defaults to NSCP 2015
export type Card = { q: string; a: string };
export type Problem = { statement: string; given: string[]; find: string; steps: string[]; answer: string[]; tool?: string /* entry slug */ };
/** v0.7.0 adds: table (comparisons), cards (flashcards), problem (worked board-type problem).
 *  verified: false shows a "verify" badge on the section (unverified reference data). */
export type Section = {
  kind: "safe" | "avoid" | "text" | "list" | "table" | "cards" | "problem";
  heading?: string; text?: string; items?: string[];
  columns?: string[]; rows?: string[][]; cards?: Card[]; problem?: Problem; verified?: boolean;
};

export type BatchClause = { doc?: string; section: string; title: string; summary: string; equivalent?: string };
export type BatchEntry = {
  slug: string;
  module: "practice" | "tool" | "code" | "education" | "conversion";
  title: string;
  summary: string;
  specialization: string;           // specializations.slug
  tags: string[];                   // tags.slug
  refs: ClauseRef[];
  sections: Section[];
  diagram?: DiagramSpec;
  calc_key?: string;                // module = tool → hand-check computed from lib/calc at sync time
  code_edition?: string;
};
export type Batch = {
  version: string;
  batch_name: string;
  notes: string[];
  clauses: BatchClause[];
  entries: BatchEntry[];
};

/** code_documents lookup keys: short_name + edition */
export const DOCS: Record<string, { short_name: string; edition: string | null }> = {
  NSCP: { short_name: "NSCP", edition: "2015 (7th ed.)" },
  "AISC 360": { short_name: "AISC 360", edition: "360-22" },
  "ACI 318": { short_name: "ACI 318", edition: "318-19" },
  "AWS D1.1": { short_name: "AWS D1.1", edition: null },
  "DPWH Blue Book": { short_name: "DPWH Blue Book", edition: null },
  "RA 11058": { short_name: "RA 11058", edition: null },
  "DOLE DO 198": { short_name: "DOLE DO 198", edition: "2018" },
};
