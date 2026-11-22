"use client";
import { useActionState } from "react";
import { createApiClient, type KeyState } from "@/app/(app)/admin/actions";

export default function ApiKeyForm() {
  const [state, action, pending] = useActionState<KeyState, FormData>(createApiClient, {});
  return (
    <form action={action} className="tool-grid" style={{ alignItems: "end" }}>
      <label className="fld"><span>Client app name</span><input name="name" placeholder="darkwizscroll" required /></label>
      <label className="fld"><span>Scopes</span>
        <span style={{ fontWeight: 400 }}>
          <label><input type="checkbox" name="scope_content" defaultChecked /> content</label>{" "}
          <label><input type="checkbox" name="scope_calc" defaultChecked /> calc</label>
        </span>
      </label>
      <button className="btn" disabled={pending} style={{ width: "auto" }}>{pending ? "Creating…" : "Create API key"}</button>
      {state.error && <div className="msg err" style={{ gridColumn: "1 / -1" }}>{state.error}</div>}
      {state.key && (
        <div style={{ gridColumn: "1 / -1" }}>
          <div className="msg ok">Key for <strong>{state.name}</strong>. Copy it now: it is shown only once and CEMP stores only its hash.</div>
          <div className="key-box" style={{ marginTop: ".5rem" }}>{state.key}</div>
          <p className="fine">Store it as a server-side secret in the client app (e.g. <code>CEMP_API_KEY</code>), never in browser code.</p>
        </div>
      )}
    </form>
  );
}
