"use client";
// v2.2.0: quotation issuer details on /account. Logo resized on the device (max 480 px wide) before upload.
import { useActionState, useState } from "react";
import { updateIssuer, type IssuerState } from "@/app/(app)/account/actions";
import { ISSUER_FIELDS, type Issuer } from "@/lib/issuer";

async function toLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const scale = Math.min(1, 480 / img.width, 240 / img.height);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const png = c.toDataURL("image/png"); // keeps transparency
    return png.length <= 200000 ? png : c.toDataURL("image/jpeg", 0.85);
  } finally { URL.revokeObjectURL(url); }
}

export default function IssuerForm({ initial }: { initial: Issuer }) {
  const [state, action, pending] = useActionState<IssuerState, FormData>(updateIssuer, {});
  const [logo, setLogo] = useState(initial.logo);
  const [removed, setRemoved] = useState(false);
  return (
    <form action={action} className="issuer-form">
      <div className="tool-grid">
        {ISSUER_FIELDS.map((f) => (
          <label key={f.key} className="fld"><span>{f.label}</span>
            <input name={f.key} defaultValue={initial[f.key]} maxLength={f.max} placeholder={f.placeholder} /></label>
        ))}
      </div>
      <div className="issuer-logo">
        {logo && !removed ? <img src={logo} alt="Logo" /> : <span className="fine">No logo</span>}
        <label className="btn ghost" style={{ width: "auto", margin: 0 }}>Choose logo…
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setLogo(await toLogo(f)); setRemoved(false); } }} /></label>
        {logo && !removed && <button type="button" className="linkbtn" onClick={() => setRemoved(true)}>remove</button>}
        <input type="hidden" name="logo" value={removed ? "" : logo} />
        <input type="hidden" name="remove_logo" value={removed ? "1" : "0"} />
      </div>
      <button className="btn" style={{ width: "auto" }} disabled={pending}>{pending ? "Saving…" : "Save quotation details"}</button>
      {state.error && <div className="msg err" style={{ marginTop: ".5rem" }}>{state.error}</div>}
      {state.ok && <div className="msg ok" style={{ marginTop: ".5rem" }}>Saved. New quotations use these details.</div>}
    </form>
  );
}
