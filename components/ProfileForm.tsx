"use client";
import { useActionState, useRef, useState } from "react";
import { updateProfile, type ProfileState } from "@/app/(app)/account/actions";
import Avatar from "@/components/Avatar";

/** Resize a picked image to a 192 px square JPEG data URL (center crop), ~15–30 KB. */
async function toAvatar(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const S = 192, side = Math.min(img.width, img.height), c = document.createElement("canvas");
    c.width = S; c.height = S;
    c.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
    return c.toDataURL("image/jpeg", 0.85);
  } finally { URL.revokeObjectURL(url); }
}

export default function ProfileForm({ initial }: { initial: { fullName: string; jobTitle: string; avatar: string | null; email: string; homeStd: string } }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});
  const [name, setName] = useState(initial.fullName);
  const [avatar, setAvatar] = useState<string | null>(initial.avatar);
  const [removed, setRemoved] = useState(false);
  const [picErr, setPicErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => {
    setPicErr(null);
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|heic|heif|gif)$/.test(f.type) && !/\.(png|jpe?g|webp)$/i.test(f.name)) return setPicErr("Choose a photo (JPG, PNG or WebP).");
    try { setAvatar(await toAvatar(f)); setRemoved(false); } catch { setPicErr("Couldn't read that image. Try a JPG or PNG."); }
  };
  return (
    <form action={action} className="panel profile-form">
      <div className="pf-photo">
        <Avatar name={name || initial.email} src={removed ? null : avatar} size={96} />
        <div>
          <button type="button" className="btn ghost" style={{ width: "auto", marginTop: 0 }} onClick={() => fileRef.current?.click()}>{avatar && !removed ? "Change photo" : "Upload photo"}</button>
          {avatar && !removed && <button type="button" className="linkbtn" onClick={() => setRemoved(true)}>remove</button>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <p className="fine" style={{ marginTop: ".4rem" }}>Square crop, resized on your device before upload.</p>
          {picErr && <div className="msg err">{picErr}</div>}
        </div>
      </div>
      <input type="hidden" name="avatar" value={!removed && avatar && avatar !== initial.avatar ? avatar : ""} />
      <input type="hidden" name="remove_avatar" value={removed ? "1" : "0"} />
      <div className="tool-grid">
        <label className="fld"><span>Display name</span><input name="full_name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} placeholder="e.g. Gemz Tubalado" /></label>
        <label className="fld"><span>Title / position</span><input name="job_title" defaultValue={initial.jobTitle} maxLength={120} placeholder="e.g. Civil Engineer · Master Plumber" /></label>
        <label className="fld"><span>Home standard</span>
          <select name="home_standard" defaultValue={initial.homeStd}>
            <option value="ph">🇵🇭 Philippines (NSCP 2015 · DPWH)</option>
            <option value="bn">🇧🇳 Brunei (BS 8110 · BS 5950 · SMM2)</option>
            <option value="intl">🌐 International (ACI 318-19 · AISC 360-22)</option>
          </select><small className="muted">Shown first on entries with side-by-side standards</small></label>
        <label className="fld"><span>Sign-in e-mail</span><input value={initial.email} disabled /><small className="muted">Managed by the admin</small></label>
      </div>
      <button className="btn" disabled={pending} style={{ width: "auto" }}>{pending ? <><span className="spin" aria-hidden /> Saving…</> : "Save profile"}</button>
      {state.error && <div className="msg err" style={{ marginTop: ".6rem" }}>{state.error}</div>}
      {state.ok && <div className="msg ok" style={{ marginTop: ".6rem" }}>Profile saved. Your name and photo now show in the header.</div>}
    </form>
  );
}
