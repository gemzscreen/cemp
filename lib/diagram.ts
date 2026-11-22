// Diagram spec types for Practice cards (v0.2.0).
// Specs are stored as JSON in entry_revisions.diagram and rendered to SVG by components/Diagram.tsx.

export type ZoneStatus = "safe" | "avoid" | "confine" | "neutral";

/** Horizontal member between two supports (slab or beam elevation). */
export type SpanSpec = {
  type: "span";
  member: "slab" | "beam";
  support: "beam" | "column";
  /** Zones left→right; widths are fractions of the span and should sum to 1. */
  zones: { w: number; top?: ZoneStatus; bottom?: ZoneStatus; status?: ZoneStatus }[];
  /** "top-bottom" draws two bands (top bars / bottom bars); "single" one band. */
  bands: "top-bottom" | "single";
  dims?: string[];             // one label per zone
  spanLabel?: string;          // e.g. "Ln = clear span, face to face of supports"
  lap?: { at: number; band: "top" | "bottom" }[]; // lap splice markers (x as fraction)
  joint?: { at: number; label?: string };         // construction joint marker
  diagram?: "moment-continuous" | "shear";
  caption?: string;
};

/** Vertical column between floors. */
export type ColumnSpec = {
  type: "column";
  zones: { h: number; status: ZoneStatus; label?: string }[]; // top→bottom, fractions of clear height
  dims?: string[];
  hoops?: "uniform" | "confined-ends";
  lap?: { from: number; to: number };   // lap region as fractions (top=0)
  caption?: string;
};

/** Cross-section with cover / spacing callouts. */
export type SectionSpec = {
  type: "section";
  shape: "beam" | "column" | "slab";
  b: number; h: number;          // proportions only (mm or relative)
  barsTop?: number; barsBottom?: number; barsPerSide?: number; // column: bars per face
  callouts: { kind: "cover-bottom" | "cover-side" | "clear-spacing" | "cover-top"; label: string }[];
  caption?: string;
};

/** Bolt pattern on a plate, with spacing / edge distance callouts. */
export type BoltsSpec = {
  type: "bolts";
  rows: number; cols: number;
  labels: { pitch?: string; gauge?: string; edge?: string; end?: string };
  load?: { e?: string };  // draw eccentric load arrow with label
  caption?: string;
};

export type DiagramSpec = SpanSpec | ColumnSpec | SectionSpec | BoltsSpec;

export const STATUS_LABEL: Record<ZoneStatus, string> = {
  safe: "SAFE", avoid: "AVOID", confine: "CONFINE", neutral: "",
};
