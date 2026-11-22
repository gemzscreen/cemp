import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { Suspense } from "react";
import { MODULES, APP_VERSION } from "@/lib/modules";
import NavMenu from "@/components/NavMenu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role, fullName } = await getMe();
  if (!user) redirect("/login");
  const profile = { role, full_name: fullName };
  const isAdmin = role === "admin", canReview = isAdmin || role === "editor";

  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand"><span className="logo">CE</span>CEMP <span className="ver">{APP_VERSION}</span></Link>
        <nav className="nav">
          <Suspense fallback={<span className="navmenu-fallback">Library ▾</span>}>
            <NavMenu label="Library">
              {MODULES.filter((m) => m.kind !== "education").map((m) => (
                <Link key={m.slug} href={`/${m.slug}`}><span className="ico">{m.icon}</span><span><strong>{m.name}</strong><small>{m.blurb}</small></span></Link>
              ))}
            </NavMenu>
          </Suspense>
          <Link href="/estimate" className="nav-cta">∑ Estimate</Link>
          <Link href="/education">Learn</Link>
          {canReview && (
            <Suspense fallback={<span className="navmenu-fallback">Admin ▾</span>}>
              <NavMenu label="Admin">
                <Link href="/admin/review">Review queue</Link>
                {isAdmin && <Link href="/admin/audit">Content audit &amp; release gate</Link>}
                {isAdmin && <Link href="/admin">Sync, API keys</Link>}
                <Link href="/entry/new">+ New entry</Link>
                <Link href="/releases">Releases</Link>
                <Link href="/api-docs">API docs</Link>
              </NavMenu>
            </Suspense>
          )}
        </nav>
        <form action="/search" className="nav-search"><input name="q" placeholder="Search…" aria-label="Search CEMP" /></form>
        <Suspense fallback={<span className="navmenu-fallback">Account ▾</span>}>
          <NavMenu label={<span className="acct"><span className="avatar">{(profile?.full_name ?? user.email ?? "?").slice(0, 1).toUpperCase()}</span><span className="acct-name">{profile?.full_name ?? user.email}</span></span>} align="right">
            <div className="menu-head"><strong>{profile?.full_name ?? user.email}</strong><small>{user.email} · {profile?.role ?? "viewer"}</small></div>
            <Link href="/saved">★ Saved &amp; notes</Link>
            <Link href="/estimate/projects">∑ My estimates</Link>
            <Link href="/account">⚿ Change password</Link>
            <Link href="/help">? Help</Link>
            <form action="/auth/signout" method="post"><button className="menu-btn">Sign out</button></form>
          </NavMenu>
        </Suspense>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}
