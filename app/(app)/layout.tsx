import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULES, APP_VERSION } from "@/lib/modules";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("full_name, role").eq("id", user.id).single();

  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand"><span className="logo">CE</span>CEMP <span className="ver">{APP_VERSION}</span></Link>
        <nav className="nav">
          {MODULES.map((m) => <Link key={m.slug} href={`/${m.slug}`}>{m.name}</Link>)}
          <Link href="/saved">Saved</Link>
          <Link href="/releases">Releases</Link>
          <Link href="/help">Help</Link>
          {(profile?.role === "admin" || profile?.role === "editor") && <Link href="/admin/review">Review</Link>}
          {profile?.role === "admin" && <Link href="/admin">Admin</Link>}
        </nav>
        <form action="/search" className="nav-search"><input name="q" placeholder="Search…" aria-label="Search CEMP" /></form>
        <div className="user">
          <span>{profile?.full_name ?? user.email}</span>
          <span className="role">{profile?.role ?? "viewer"}</span>
          <form action="/auth/signout" method="post"><button className="btn small">Sign out</button></form>
        </div>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}
