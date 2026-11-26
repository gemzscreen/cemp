import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe, displayName, firstName, roleName } from "@/lib/auth";
import { Suspense } from "react";
import { MODULES, APP_VERSION } from "@/lib/modules";
import NavMenu from "@/components/NavMenu";
import HeaderNav from "@/components/HeaderNav";
import Avatar from "@/components/Avatar";
import Clock from "@/components/Clock";
import NavIcon from "@/components/NavIcon";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role, fullName, avatar, jobTitle } = await getMe();
  if (!user) redirect("/login");
  const name = displayName(fullName, user.email);
  const isAdmin = role === "admin", canReview = isAdmin || role === "editor";

  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand" title="CEMP · Construction Estimating and Management Platform"><img src="/icons/logo.svg" alt="" className="logo" width={34} height={34} /><span className="brand-name">CEMP</span></Link>
        <HeaderNav>
          <Suspense fallback={<span className="navmenu-fallback">Library ▾</span>}>
            <NavMenu label="Library">
              {MODULES.filter((m) => m.kind !== "education").map((m) => (
                <Link key={m.slug} href={`/${m.slug}`}><span className="ico">{m.icon}</span><span><strong>{m.name}</strong><small>{m.blurb}</small></span></Link>
              ))}
              <span className="menu-sep" />
              <Link href="/estimate/projects"><span className="ico"><NavIcon name="projects" size={16} /></span><span><strong>Projects</strong><small>Saved estimates and their bills of materials</small></span></Link>
              <Link href="/games"><span className="ico"><NavIcon name="games" size={16} /></span><span><strong>Games</strong><small>Truss Builder, Critical Path Rush</small></span></Link>
              <a href="/scroll"><span className="ico"><NavIcon name="scroll" size={16} /></span><span><strong>darkwizscroll</strong><small>Learn by scrolling: site knowledge cards</small></span></a>
            </NavMenu>
          </Suspense>
          <Link href="/estimate" className="nav-cta">∑ Estimate</Link>
          <Link href="/education"><NavIcon name="learn" /> Learn</Link>
          <Link href="/games"><NavIcon name="games" /> Games</Link>
          {canReview && (
            <Suspense fallback={<span className="navmenu-fallback">Admin ▾</span>}>
              <NavMenu label="Admin">
                <Link href="/admin/review"><span className="ico">☑</span><span><strong>Review queue</strong><small>Check, edit and publish entries</small></span></Link>
                {isAdmin && <Link href="/admin/audit"><span className="ico">✓</span><span><strong>Content audit</strong><small>Release gate: blockers and warnings</small></span></Link>}
                {isAdmin && <Link href="/admin"><span className="ico">⟳</span><span><strong>Sync &amp; API keys</strong><small>Load content batches, manage app keys</small></span></Link>}
                <Link href="/entry/new"><span className="ico">＋</span><span><strong>New entry</strong><small>Draft a practice, code or education entry</small></span></Link>
                <Link href="/releases"><span className="ico">⌘</span><span><strong>Releases</strong><small>What changed in each version</small></span></Link>
                <Link href="/api-docs"><span className="ico">⇄</span><span><strong>API docs</strong><small>For darkwizscroll and DARKWIZ CT</small></span></Link>
              </NavMenu>
            </Suspense>
          )}
          <form action="/search" className="nav-search"><input name="q" placeholder="Search…" aria-label="Search CEMP" /></form>
        </HeaderNav>
        <Suspense fallback={<span className="navmenu-fallback">Account ▾</span>}>
          <NavMenu className="me" align="right" label={<span className="acct"><Avatar name={name} src={avatar} /><span className="hi">Welcome, <b>{firstName(name)}</b></span><i className="rolechip">{roleName(role)}</i></span>}>
            <div className="menu-head">
              <Avatar name={name} src={avatar} size={42} />
              <div><b>{name}</b><small>{jobTitle ?? user.email}</small><small>{user.email} · {roleName(role)}</small></div>
            </div>
            <Link href="/account"><span className="ico">☺</span><span><strong>Profile &amp; password</strong><small>Name, title, photo, password</small></span></Link>
            <Link href="/saved"><span className="ico">★</span><span><strong>Saved &amp; notes</strong></span></Link>
            <Link href="/estimate/projects"><span className="ico">∑</span><span><strong>My projects</strong></span></Link>
            <Link href="/help"><span className="ico">?</span><span><strong>Help</strong></span></Link>
            <form action="/auth/signout" method="post"><button className="menu-btn"><span className="ico">⏻</span><span><strong>Sign out</strong></span></button></form>
          </NavMenu>
        </Suspense>
      </header>
      <main className="wrap">{children}</main>
      <footer className="foot">
        <div className="fl"><Clock /></div>
        <div className="fc"><b>CEMP</b> · Construction Estimating and Management Platform · Powered by <a href="https://darkwizlab.com" target="_blank" rel="noopener">Darkwiz Lab</a> 2026</div>
        <div className="fr"><Link href="/releases" className="ver-pill">{APP_VERSION}</Link></div>
      </footer>
    </>
  );
}
