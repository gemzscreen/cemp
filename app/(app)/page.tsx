import Link from "next/link";
import ReadMore from "@/components/ReadMore";
import { getMe, displayName } from "@/lib/auth";
import Greeting from "@/components/Greeting";
import { MODULES } from "@/lib/modules";
import { CATEGORIES } from "@/lib/taxonomy";
import { ESTIMATOR_META } from "@/lib/calc/estimate";
import EstimateIcon from "@/components/EstimateIcon";
import NavIcon from "@/components/NavIcon";
import { GAMES } from "@/lib/games";
import { LEVELS } from "@/lib/truss/levels";
import { CPM_LEVELS } from "@/lib/cpm/levels";



export default async function Dashboard() {
  const { supabase, user, fullName } = await getMe();
  const [{ data: entries }, { data: release }, { count: unitCount }, { count: tableCount }] = await Promise.all([
    supabase.from("entries").select("module").neq("status", "deprecated"),
    supabase.from("releases").select("version,batch_name,notes_md,released_at")
      .not("released_at", "is", null).order("id", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("units").select("id", { count: "exact", head: true }),
    supabase.from("ref_tables").select("id", { count: "exact", head: true }),
  ]);
  const [{ count: clauseCount }, { count: projectCount }, { data: bests }] = await Promise.all([
    supabase.from("code_clauses").select("id", { count: "exact", head: true }),
    supabase.from("estimate_projects").select("id", { count: "exact", head: true }),
    supabase.from("game_bests").select("stars"),
  ]);
  const stars = (bests ?? []).reduce((s, b) => s + Number(b.stars ?? 0), 0);

  const counts: Record<string, number> = {};
  (entries ?? []).forEach((e) => { counts[e.module] = (counts[e.module] ?? 0) + 1; });

  return (
    <>
      <Greeting name={displayName(fullName, user?.email)} />

      {release?.notes_md && (
        <div className="whatsnew">
          <span className="tag">What&apos;s new · {release.version}</span>
          <div>
            <strong>{release.batch_name}</strong>
            <ReadMore text={release.notes_md.replace(/\\n/g, "\n")} lines={3} className="wn-text" />
            <Link href="/releases" className="fine">All releases →</Link>
          </div>
        </div>
      )}

      <Link href="/estimate" className="est-hero">
        <span className="calc-ico"><EstimateIcon kind="tank" size={44} /></span>
        <span><strong>Estimate a job</strong><small>{ESTIMATOR_META.length} quantity calculators: concrete work, CHB, plaster, tiles, paint, ceilings, waterproofing, gutters, tanks and lumber. Build a project BOM with prices.</small></span>
        <span className="go">Open →</span>
      </Link>

      <div className="grid">
        {MODULES.map((m) => (
          <Link key={m.slug} href={`/${m.slug}`} className="tile">
            <span className="icon">{m.icon}</span>
            <span className="name">{m.name}</span>
            <span className="blurb">{m.blurb}</span>
            <span className="meta">
              <span>{m.kind === "conversion"
                ? `${unitCount ?? 0} units · ${tableCount ?? 0} tables`
                : m.kind === "code" ? `${clauseCount ?? 0} clauses indexed`
                : `${counts[m.kind] ?? 0} entries`}</span>

            </span>
          </Link>
        ))}
        <Link href="/games" className="tile dark">
          <span className="icon"><NavIcon name="games" size={22} /></span>
          <span className="name">Games</span>
          <span className="blurb">Truss Builder and Critical Path Rush: real code checks, CPM and crashing, ₱ budgets and stars. Plays offline.</span>
          <span className="meta"><span>{GAMES.filter((g) => g.live).length} live · ★ {stars} / {(LEVELS.length + CPM_LEVELS.length) * 3}</span></span>
        </Link>
        <Link href="/estimate/projects" className="tile dark">
          <span className="icon"><NavIcon name="projects" size={22} /></span>
          <span className="name">Projects</span>
          <span className="blurb">Your saved estimates: bill of materials per item, prices, CSV and print.</span>
          <span className="meta"><span>{projectCount ?? 0} project{projectCount === 1 ? "" : "s"}</span></span>
        </Link>
        <a href="/scroll" className="tile scroll">
          <span className="icon"><svg viewBox="0 0 32 32" width="26" height="26" aria-hidden><rect width="32" height="32" rx="7" fill="#ffcf1f" /><path d="M8 7H24V11H18V21H24V25H8V21H14V11H8Z" fill="#0a1524" /></svg></span>
          <span className="name">darkwiz<b>scroll</b></span>
          <span className="blurb">Doomscroll that teaches: site knowledge one card at a time, quizzes, streaks and sparks.</span>
          <span className="meta"><span>Feed · library · creator</span></span>
        </a>
      </div>

      <section className="section">
        <h2>Browse by topic</h2>
        <div className="topic-grid">
          {CATEGORIES.map((c, ci) => (
            <div key={c.slug} className="panel topic">
              <h3><span className="ico">{c.icon}</span> {ci + 1}. {c.name}</h3>
              <div className="chips">{c.children.map((l) => <Link key={l.slug} className="chip" href={`/practices?cat=${l.slug}`}>{l.name}</Link>)}</div>
              <div className="fine"><Link href={`/tools?cat=${c.slug}`}>Tools</Link> · <Link href={`/practices?cat=${c.slug}`}>Practices</Link> · <Link href={`/codes?cat=${c.slug}`}>Codes</Link></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
