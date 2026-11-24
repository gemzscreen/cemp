// Truss Builder section catalogue: common PH stock shapes.
// Properties are computed from plate geometry (root fillets ignored, slightly conservative).
// Grades: angles ASTM A36 (Fy 248, Fu 400); square tubes ASTM A500 Gr B (Fy 315, Fu 400); round pipe ASTM A500 Gr B (Fy 290, Fu 400).
// Prices are indicative ₱/kg for the game only (verify against current supplier quotes).

export type Family = "L" | "2L" | "SHS" | "CHS";
export type Section = {
  key: string; name: string; family: Family;
  A: number;      // mm²
  rmin: number;   // mm, governing radius of gyration for flexural buckling
  fy: number; fu: number; // MPa
  kgm: number;    // kg/m
  pricekg: number; // ₱/kg (indicative)
  grade: string;
};

const STEEL = 7.85e-6; // kg/mm³

/** Single equal angle b×t: area, geometric-axis I and principal (minor) I about the centroid. */
export function angleProps(b: number, t: number) {
  // two rectangles: vertical leg [0,t]×[0,b], horizontal leg [t,b]×[0,t]
  const R = [{ x0: 0, x1: t, y0: 0, y1: b }, { x0: t, x1: b, y0: 0, y1: t }];
  const A = R.reduce((s, r) => s + (r.x1 - r.x0) * (r.y1 - r.y0), 0);
  const cx = R.reduce((s, r) => s + (r.x1 - r.x0) * (r.y1 - r.y0) * (r.x0 + r.x1) / 2, 0) / A;
  const cy = R.reduce((s, r) => s + (r.x1 - r.x0) * (r.y1 - r.y0) * (r.y0 + r.y1) / 2, 0) / A;
  let Ix = 0, Iy = 0, Ixy = 0;
  for (const r of R) {
    const w = r.x1 - r.x0, h = r.y1 - r.y0, a = w * h, dx = (r.x0 + r.x1) / 2 - cx, dy = (r.y0 + r.y1) / 2 - cy;
    Ix += (w * h ** 3) / 12 + a * dy * dy; Iy += (h * w ** 3) / 12 + a * dx * dx; Ixy += a * dx * dy;
  }
  const avg = (Ix + Iy) / 2, R2 = Math.sqrt(((Ix - Iy) / 2) ** 2 + Ixy ** 2);
  return { A, c: cx, Ix, Iy, Imin: avg - R2, Imax: avg + R2 };
}

function L(b: number, t: number): Section {
  const p = angleProps(b, t);
  return { key: `L${b}x${t}`, name: `L ${b}×${b}×${t}`, family: "L", A: p.A, rmin: Math.sqrt(p.Imin / p.A), fy: 248, fu: 400, kgm: p.A * STEEL * 1000, pricekg: 80, grade: "A36" };
}
/** Two angles back to back with a gap (gusset), stitched so they act together: rmin = min(rx single, ry pair). */
function L2(b: number, t: number, gap = 10): Section {
  const p = angleProps(b, t), d = p.c + gap / 2;
  const ry = Math.sqrt((2 * (p.Iy + p.A * d * d)) / (2 * p.A)), rx = Math.sqrt(p.Ix / p.A);
  return { key: `2L${b}x${t}`, name: `2L ${b}×${b}×${t}`, family: "2L", A: 2 * p.A, rmin: Math.min(rx, ry), fy: 248, fu: 400, kgm: 2 * p.A * STEEL * 1000, pricekg: 80, grade: "A36" };
}
function SHS(b: number, t: number): Section {
  const A = b * b - (b - 2 * t) ** 2, I = (b ** 4 - (b - 2 * t) ** 4) / 12;
  return { key: `SHS${b}x${t}`, name: `SHS ${b}×${b}×${t}`, family: "SHS", A, rmin: Math.sqrt(I / A), fy: 315, fu: 400, kgm: A * STEEL * 1000, pricekg: 90, grade: "A500 Gr B" };
}
function CHS(D: number, t: number, label: string): Section {
  const d = D - 2 * t, A = (Math.PI / 4) * (D * D - d * d), I = (Math.PI / 64) * (D ** 4 - d ** 4);
  return { key: `CHS${D}x${t}`, name: `Pipe ${label} (${D}×${t})`, family: "CHS", A, rmin: Math.sqrt(I / A), fy: 290, fu: 400, kgm: A * STEEL * 1000, pricekg: 90, grade: "A500 Gr B" };
}

export const SECTIONS: Section[] = [
  L(50, 5), L(50, 6), L(65, 6), L(75, 6), L(75, 8), L(90, 8), L(100, 10),
  L2(50, 5), L2(65, 6), L2(75, 8), L2(100, 10),
  SHS(50, 3), SHS(75, 4), SHS(100, 5),
  CHS(60.3, 3.9, "2\""), CHS(88.9, 5.5, "3\""), CHS(114.3, 6.0, "4\""),
];
export const sectionByKey = (k: string) => SECTIONS.find((s) => s.key === k) ?? SECTIONS[3];
export const FAMILY_LABEL: Record<Family, string> = { L: "Single angle", "2L": "Double angle", SHS: "Square tube", CHS: "Round pipe" };
