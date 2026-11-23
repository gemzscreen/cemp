import { getMe, displayName, roleName } from "@/lib/auth";
import PasswordForm from "@/components/PasswordForm";
import ProfileForm from "@/components/ProfileForm";

export const metadata = { title: "Profile" };

export default async function Account() {
  const { user, role, fullName, avatar, jobTitle, homeStd } = await getMe();
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
    </>
  );
}
