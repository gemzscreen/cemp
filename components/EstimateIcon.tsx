// Small line icons for the estimating calculator grid.
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export default function EstimateIcon({ kind, size = 40 }: { kind: string; size?: number }) {
  const g = (() => {
    switch (kind) {
      case "footing": return <><path {...S} d="M6 30 L24 22 L42 30 L24 38 Z" /><path {...S} d="M6 30 V34 L24 42 L42 34 V30" /><path {...S} d="M20 26 V10 L28 8 V24" /><path {...S} d="M20 10 L24 12 L28 8" /></>;
      case "strip": return <><path {...S} d="M4 28 L34 14 L44 18 L14 32 Z" /><path {...S} d="M4 28 V32 L14 36 L44 22 V18" /><path {...S} d="M14 32 V36" /></>;
      case "beam": return <><path {...S} d="M4 20 L36 8 L44 11 L12 23 Z" /><path {...S} d="M4 20 V28 L12 31 L44 19 V11" /><path {...S} d="M12 23 V31" />{[16, 22, 28, 34].map((x) => <path key={x} {...S} strokeWidth={1.2} d={`M${x} ${21 - (x - 12) * 0.37} v7`} />)}</>;
      case "column": return <><path {...S} d="M18 8 L24 5 L30 8 L24 11 Z" /><path {...S} d="M18 8 V40 L24 43 L30 40 V8" /><path {...S} d="M24 11 V43" /></>;
      case "slab": return <><path {...S} d="M4 26 L24 16 L44 26 L24 36 Z" /><path {...S} d="M4 26 V29 L24 39 L44 29 V26" /><path {...S} strokeWidth={1} d="M14 21 L34 31 M24 16 L44 26 M9 23.5 L29 33.5 M14 31 L34 21 M19 33.5 L39 23.5" /></>;
      case "wall": return <><path {...S} d="M8 12 L36 4 L40 6 L12 14 Z" /><path {...S} d="M8 12 V38 L12 40 L40 32 V6" /><path {...S} d="M12 14 V40" /></>;
      case "stairs": return <path {...S} d="M6 40 H14 V32 H22 V24 H30 V16 H38 V8 H42 V40 Z" />;
      case "chb": return <>{[10, 18, 26, 34].map((y, r) => <g key={y}>{[0, 1, 2].map((c) => <rect key={c} {...S} strokeWidth={1.4} x={6 + c * 12 + (r % 2 ? 6 : 0)} y={y} width={12} height={8} />)}</g>)}</>;
      case "plaster": return <><rect {...S} x="12" y="6" width="14" height="36" /><path {...S} d="M26 6 h6 v36 h-6" /><path {...S} d="M36 18 l6 -6 M38 24 l6 -6" /></>;
      case "tank": return <><path {...S} d="M8 16 L24 9 L40 16 L24 23 Z" /><path {...S} d="M8 16 V36 L24 43 L40 36 V16" /><path {...S} d="M24 23 V43" /><path {...S} strokeWidth={1.2} d="M8 24 L24 31 L40 24" /></>;
      case "septic": return <><rect {...S} x="4" y="12" width="40" height="24" /><path {...S} d="M30 12 V36" /><path {...S} strokeWidth={1.2} d="M8 26 q4 -3 8 0 t8 0 t8 0" /><path {...S} d="M1 18 h5 M42 30 h5" /></>;
      case "stand": return <><ellipse {...S} cx="24" cy="8" rx="9" ry="3" /><path {...S} d="M15 8 V18 Q24 22 33 18 V8" /><path {...S} d="M12 20 L10 44 M36 20 L38 44 M12 20 H36 M11 32 H37 M12 20 L37 32 M36 20 L11 32" /></>;
      case "lumber": return <><path {...S} d="M4 28 L34 14 L44 18 L14 32 Z" /><path {...S} d="M4 28 V34 L14 38 L44 24 V18" /><path {...S} d="M14 32 V38" /><path {...S} strokeWidth={1} d="M18 26 q6 -3 12 -6" /></>;
      case "tiles": return <>{[6, 18, 30].map((y) => [6, 18, 30].map((x) => <rect key={`${x}${y}`} {...S} strokeWidth={1.5} x={x} y={y} width={11} height={11} />))}</>;
      case "paint": return <><rect {...S} x="8" y="6" width="26" height="10" rx="2" /><path {...S} d="M34 11 h6 v10 H22 v6" /><rect {...S} x="19" y="27" width="6" height="15" rx="1" /></>;
      case "ceiling": return <><path {...S} d="M4 10 H44" /><path {...S} strokeWidth={1.2} d="M12 10 V22 M24 10 V22 M36 10 V22" /><path {...S} d="M6 22 H42 M6 26 H42" /><path {...S} strokeWidth={1.2} d="M14 22 v4 M24 22 v4 M34 22 v4" /><path {...S} d="M8 36 H40" strokeDasharray="3 3" /></>;
      case "waterproof": return <><path {...S} d="M6 18 V38 H42 V18" /><path {...S} strokeWidth={1.2} d="M9 18 V35 H39 V18" /><path {...S} d="M24 6 C 20 12 18 15 18 18 a6 6 0 0 0 12 0 C 30 15 28 12 24 6 Z" /></>;
      case "gutter": return <><path {...S} d="M4 14 L30 6 L30 12" /><path {...S} d="M26 14 h14 v4 a4 4 0 0 1 -4 4 h-6 a4 4 0 0 1 -4 -4 Z" /><path {...S} d="M34 22 V38 q0 4 -4 4 h-6" /><path {...S} strokeWidth={1.2} d="M18 44 q2 -2 4 0" /></>;
      default: return <rect {...S} x="8" y="8" width="32" height="32" />;
    }
  })();
  return <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>{g}</svg>;
}
