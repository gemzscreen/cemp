// Line icons for the Games hub (v2.1.0). currentColor, 40 px by default.
const P: Record<string, React.ReactNode> = {
  truss: <><path d="M9 40 L19 22 H45 L55 40 Z" /><path d="M19 22 L27 40 L32 22 L37 40 L45 22" /><path d="M6 50 H58" /></>,
  splice: <><path d="M6 26 H40 M24 38 H58" /><path d="M24 26 v12 M40 26 v12" strokeDasharray="3 4" /><path d="M10 46 H54" /></>,
  pipe: <><path d="M8 18 H30 a6 6 0 0 1 6 6 V40 a6 6 0 0 0 6 6 H56" /><path d="M8 26 H26 a2 2 0 0 1 2 2 V44" /><circle cx="56" cy="46" r="3" /></>,
  qty: <><rect x="10" y="30" width="16" height="10" /><rect x="26" y="30" width="16" height="10" /><rect x="18" y="20" width="16" height="10" /><path d="M46 20 l8 0 M50 16 v8 M44 46 h12" /></>,
  cpm: <><circle cx="12" cy="32" r="5" /><circle cx="32" cy="18" r="5" /><circle cx="32" cy="46" r="5" /><circle cx="52" cy="32" r="5" /><path d="M16 29 L28 21 M16 35 L28 43 M36 21 L48 29 M36 43 L48 35" /></>,
  hazard: <><path d="M32 10 L56 52 H8 Z" /><path d="M32 26 V38" /><circle cx="32" cy="45" r="1.5" /></>,
  beam: <><path d="M8 26 H56 M8 38 H56 M32 26 V38" /><path d="M14 38 l-4 8 h8 z M50 38 l-4 8 h8 z" /><path d="M20 14 v8 M32 12 v10 M44 14 v8" /></>,
};
export default function GameIcon({ name, size = 40 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{P[name]}</svg>;
}
