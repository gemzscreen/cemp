// Small line icons for the header (v2.1.0). Replaces the ⌂ / ✎ / ▲ text glyphs, which render differently
// (or as colour emoji) on each phone and PC. 18 px, currentColor, so they follow the link colour.
const PATHS: Record<string, React.ReactNode> = {
  // dashboard: 2 × 2 tiles, one tall
  dashboard: <><rect x="3" y="3" width="7.5" height="10" rx="1.6" /><rect x="13.5" y="3" width="7.5" height="6" rx="1.6" /><rect x="13.5" y="12" width="7.5" height="9" rx="1.6" /><rect x="3" y="16" width="7.5" height="5" rx="1.6" /></>,
  // learn: open book
  learn: <><path d="M12 6.5C10.2 5 7.4 4.5 3.5 4.8v13.4c3.9-.3 6.7.2 8.5 1.8 1.8-1.6 4.6-2.1 8.5-1.8V4.8C16.6 4.5 13.8 5 12 6.5Z" /><path d="M12 6.5V20" /></>,
  // games: game pad
  games: <><path d="M7 8h10a4 4 0 0 1 3.9 4.9l-.8 3.6a2.4 2.4 0 0 1-4.2 1L14.5 16h-5l-1.4 1.5a2.4 2.4 0 0 1-4.2-1l-.8-3.6A4 4 0 0 1 7 8Z" /><path d="M8 11v3M6.5 12.5h3" /><circle cx="15.8" cy="11.6" r=".6" fill="currentColor" /><circle cx="17.4" cy="13.4" r=".6" fill="currentColor" /></>,
  // scroll: phone with a card and a swipe arrow
  scroll: <><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><rect x="8.5" y="6" width="7" height="8" rx="1" /><path d="M12 16.5v2.5M10.6 17.8 12 19l1.4-1.2" /></>,
  // projects: clipboard with lines
  projects: <><rect x="5" y="4.5" width="14" height="16.5" rx="2" /><path d="M9 4.5V3.5h6v1M8.5 10h7M8.5 13.5h7M8.5 17h4.5" /></>,
};

export default function NavIcon({ name, size = 18 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg className="nav-ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
