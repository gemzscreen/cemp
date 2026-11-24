// 2D direct-stiffness analysis of a pin-jointed plane truss. Units: N and mm.
export type TNode = { x: number; y: number };             // mm
export type TMember = { a: number; b: number; A: number }; // node indices, area mm²
export type Support = { node: number; ux: boolean; uy: boolean };
export type SolveOut = { ok: true; u: number[]; N: number[] } | { ok: false; reason: string };

export const E_STEEL = 200000; // MPa

export function solveTruss(nodes: TNode[], members: TMember[], supports: Support[], loads: number[] /* 2n: Fx, Fy (N) */): SolveOut {
  const n = nodes.length, dof = 2 * n;
  if (!members.length) return { ok: false, reason: "No members yet." };
  const K = Array.from({ length: dof }, () => new Float64Array(dof));
  const geo = members.map((m) => {
    const dx = nodes[m.b].x - nodes[m.a].x, dy = nodes[m.b].y - nodes[m.a].y, L = Math.hypot(dx, dy);
    return { c: dx / L, s: dy / L, L, k: (E_STEEL * m.A) / L };
  });
  members.forEach((m, i) => {
    const { c, s, k } = geo[i];
    const idx = [2 * m.a, 2 * m.a + 1, 2 * m.b, 2 * m.b + 1], v = [-c, -s, c, s];
    for (let p = 0; p < 4; p++) for (let q = 0; q < 4; q++) K[idx[p]][idx[q]] += k * v[p] * v[q];
  });
  const fixed = new Set<number>();
  for (const s of supports) { if (s.ux) fixed.add(2 * s.node); if (s.uy) fixed.add(2 * s.node + 1); }
  const free = [...Array(dof).keys()].filter((d) => !fixed.has(d));
  const m = free.length;
  const A = free.map((r) => Float64Array.from(free.map((c) => K[r][c])));
  const F = Float64Array.from(free.map((d) => loads[d] ?? 0));
  const maxDiag = Math.max(...free.map((d) => K[d][d]), 1);
  // Gaussian elimination with partial pivoting
  for (let col = 0; col < m; col++) {
    let piv = col;
    for (let r = col + 1; r < m; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    if (Math.abs(A[piv][col]) < 1e-9 * maxDiag) return { ok: false, reason: "The structure is unstable (a mechanism): add members so every joint is braced, e.g. triangles." };
    [A[col], A[piv]] = [A[piv], A[col]]; [F[col], F[piv]] = [F[piv], F[col]];
    for (let r = col + 1; r < m; r++) {
      const f = A[r][col] / A[col][col];
      if (f === 0) continue;
      for (let c = col; c < m; c++) A[r][c] -= f * A[col][c];
      F[r] -= f * F[col];
    }
  }
  const x = new Float64Array(m);
  for (let r = m - 1; r >= 0; r--) { let s = F[r]; for (let c = r + 1; c < m; c++) s -= A[r][c] * x[c]; x[r] = s / A[r][r]; }
  const u = new Array(dof).fill(0);
  free.forEach((d, i) => (u[d] = x[i]));
  const N = members.map((mm, i) => {
    const { c, s, k } = geo[i];
    return k * (c * (u[2 * mm.b] - u[2 * mm.a]) + s * (u[2 * mm.b + 1] - u[2 * mm.a + 1])); // + tension
  });
  const umax = Math.max(...u.map(Math.abs));
  if (!isFinite(umax) || umax > 1e7) return { ok: false, reason: "The structure is unstable (a mechanism): add members so every joint is braced, e.g. triangles." };
  return { ok: true, u, N };
}
