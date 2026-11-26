import { getMe, displayName, roleName } from "@/lib/auth";
import PasswordForm from "@/components/PasswordForm";
import ProfileForm from "@/components/ProfileForm";
import IssuerForm from "@/components/IssuerForm";
import { normalizeIssuer } from "@/lib/issuer";

export const metadata = { title: "Profile" };

export default async function Account() {
  const { supabase, user, role, fullName, avatar, jobTitle, homeStd } = await getMe();
  const { data: prof } = user ? await supabase.from("profiles").select("issuer").eq("id", user.id).single() : { data: null };
  const issuer = normalizeIssuer(prof?.issuer);
  if (!issuer.name) issuer.name = fullName ?? "";
  return (
    <>
      <h1>Profile</h1>
      <p className="sub">{displayName(fullName, user?.email)} · {roleName(role)}</p>
      <div className="account-grid">
        <section>
          <h2 style={{ fontSize: "1.05rem" }}>Your details</h2>
          <ProfileForm initial={{ fullName: fullName ?? displayName(null, user?.email), jobTitle: jobTitle ?? "", avatar, email: user?.email ?? "", homeStd }} />
        </section>
        <section>
          <h2 style={{ fontSize: "1.05rem" }}>Change password</h2>
          <PasswordForm />
          <p className="fine" style={{ marginTop: "1rem" }}>Locked out? The admin can send a recovery e-mail from Supabase → Authentication → Users → (user) → Send password recovery.</p>
        </section>
      </div>
      <section className="panel" id="quotation" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Quotation details</h2>
        <p className="fine" style={{ marginTop: 0 }}>Printed at the top and in the signature block of every quotation (Projects → Quotation). Leave the company blank to quote under your own name.</p>
        <IssuerForm initial={issuer} />
      </section>
    </>
  );
}
