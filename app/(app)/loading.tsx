// Shown instantly while a page's server data loads, so navigation never feels frozen.
export default function Loading() {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="spin" aria-hidden /> Loading…
      <div className="skeleton" /><div className="skeleton short" /><div className="skeleton" />
    </div>
  );
}
