"use client";
import { useFormStatus } from "react-dom";

/** Form submit button that shows progress while its server action runs (and blocks double clicks). */
export default function SubmitButton({ children, pending: pendingText = "Working…", hint, className = "btn", style, name, value }: {
  children: React.ReactNode; pending?: string; hint?: string; className?: string; style?: React.CSSProperties; name?: string; value?: string;
}) {
  const { pending, data } = useFormStatus();
  // with several buttons in one form, only the clicked one shows the busy label
  const mine = pending && (!name || data?.get(name) === value);
  return (
    <>
      <button className={className} style={style} name={name} value={value} disabled={pending} aria-busy={mine}>
        {mine ? <><span className="spin" aria-hidden /> {pendingText}</> : children}
      </button>
      {mine && hint && <span className="fine pending-hint">{hint}</span>}
    </>
  );
}
