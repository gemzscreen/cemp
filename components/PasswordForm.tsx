"use client";
import { useActionState, useState } from "react";
import { changePassword, type PwState } from "@/app/(app)/account/actions";

export default function PasswordForm() {
  const [state, action, pending] = useActionState<PwState, FormData>(changePassword, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="panel" style={{ maxWidth: 460 }}>
      <label className="fld"><span>New password</span>
        <input name="password" type={show ? "text" : "password"} autoComplete="new-password" minLength={10} required /></label>
      <label className="fld" style={{ marginTop: ".6rem" }}><span>Repeat new password</span>
        <input name="confirm" type={show ? "text" : "password"} autoComplete="new-password" minLength={10} required /></label>
      <label className="fine" style={{ display: "block", marginTop: ".5rem" }}><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords</label>
      <p className="fine">At least 10 characters, letters and numbers. A long phrase is easiest to remember.</p>
      <button className="btn" disabled={pending} style={{ width: "auto" }}>{pending ? "Saving…" : "Change password"}</button>
      {state.error && <div className="msg err" style={{ marginTop: ".6rem" }}>{state.error}</div>}
      {state.ok && <div className="msg ok" style={{ marginTop: ".6rem" }}>Password changed. Use it next time you sign in on any device.</div>}
    </form>
  );
}
