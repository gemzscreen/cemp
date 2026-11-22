import Link from "next/link";
import { getMe } from "@/lib/auth";
import PasswordForm from "@/components/PasswordForm";

export const metadata = { title: "Account" };

export default async function Account() {
  const { user, role, fullName } = await getMe();
  return (
    <>
      <h1>Account</h1>
      <p className="sub">{fullName ?? user?.email} · {user?.email} · role: {role}</p>
      <h2 style={{ fontSize: "1.05rem" }}>Change password</h2>
      <PasswordForm />
      <p className="fine" style={{ marginTop: "1rem" }}>Locked out? The admin can send a recovery email from Supabase → Authentication → Users → (user) → Send password recovery. <Link href="/help">Help</Link></p>
    </>
  );
}
