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
import { BEAM_LEVELS } from "@/lib/beam/levels";
import { BATCHES } from "@/content";



export default async function Dashboard() {
  const { supabase, user, fullName, role } = await getMe();
  const canReview = role === "admin" || role === "editor", isAdmin = role === "admin";
  const [{ data: entries }, { data: release }, { count: unitCount }, { count: tableCount }] = await Promise.all([
    supabase.from("entries").select("module,status").neq("status", "deprecated"),
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
  // v2.8.0 notification badges: what is pending, ongoing or needs attention
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const [{ data: projs }, { data: issued }, { data: rels }, { data: scrollNew }] = await Promise.all([
    supabase.from("estimate_projects").select("id"),
    supabase.from("quote_revisions").select("project_id"),
    isAdmin ? supabase.from("releases").select("version,released_at") : Promise.resolve({ data: null }),
    supabase.from("scroll_docs").select("doc_id").eq("collection", "cards").gt("updated_at", weekAgo).neq("doc_id", user!.id),
  ]);
  const quoted = new Set((issued ?? []).map((q) => q.project_id));
  const noQuote = (projs ?? []).filter((p) => !quoted.has(p.id)).length;
  const synced = new Set((rels ?? []).filter((r) => r.released_at).map((r) => r.version));
  const unsynced = isAdmin ? BATCHES.filter((b) => !synced.has(b.version)).length : 0;
  const toReview: Record<string, number> = {};
  if (canReview) (entries ?? []).forEach((e) => { if (e.status === "review") toReview[e.module] = (toReview[e.module] ?? 0) + 1; });
  const reviewTotal = Object.values(toReview).reduce((a, b) => a + b, 0);
  const gamesOpen = (bests ?? []).filter((b) => Number(b.stars ?? 0) < 3).length;
  const scrollCount = (scrollNew ?? []).length;
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

      {(unsynced > 0 || reviewTotal > 0) && (
        <div className="attn">
          <span className="attn-dot" aria-hidden />
          <span><strong>Needs attention</strong>
            {unsynced > 0 && <> · <Link href="/admin">{unsynced} content batch{unsynced === 1 ? "" : "es"} not synced</Link></>}
            {reviewTotal > 0 && <> · <Link href="/admin/review">{reviewTotal} entr{reviewTotal === 1 ? "y" : "ies"} waiting for review</Link></>}
          </span>
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
            {(toReview[m.kind] ?? 0) > 0 && <span className="nbadge" title={`${toReview[m.kind]} waiting for review`}>{toReview[m.kind]}</span>}
            <span className="icon">{m.icon}</span>
            <span className="name">{m.name}</span>
            <span className="blurb">{m.blurb}</span>
            <span className="meta">
              <span>{m.kind === "conversion"
                ? `${unitCount ?? 0} units · ${tableCount ?? 0} tables`
                : m.kind === "code" ? `${clauseCount ?? 0} clauses indexed`
                : `${counts[m.kind] ?? 0} entries`}</span>
              {(toReview[m.kind] ?? 0) > 0 && <span className="nlab">{toReview[m.kind]} to review</span>}

            </span>
          </Link>
        ))}
        <Link href="/games" className="tile dark">
          {gamesOpen > 0 && <span className="nbadge" title={`${gamesOpen} level(s) played but not yet 3★`}>{gamesOpen}</span>}
          <span className="icon"><NavIcon name="games" size={22} /></span>
          <span className="name">Games</span>
          <span className="blurb">Truss Builder, Critical Path Rush and Beam Optimizer: real code checks, CPM and crashing, ₱ budgets and stars. Plays offline.</span>
          <span className="meta"><span>{GAMES.filter((g) => g.live).length} live · ★ {stars} / {(LEVELS.length + CPM_LEVELS.length + BEAM_LEVELS.length) * 3}</span>{gamesOpen > 0 && <span className="nlab">{gamesOpen} in progress</span>}</span>
        </Link>
        <Link href="/estimate/projects" className="tile dark">
          {noQuote > 0 && <span className="nbadge" title={`${noQuote} project(s) without an issued quotation`}>{noQuote}</span>}
          <span className="icon"><NavIcon name="projects" size={22} /></span>
          <span className="name">Projects</span>
          <span className="blurb">Your saved estimates: bill of materials per item, prices, CSV and print.</span>
          <span className="meta"><span>{projectCount ?? 0} project{projectCount === 1 ? "" : "s"}</span>{noQuote > 0 && <span className="nlab">{noQuote} not quoted yet</span>}</span>
        </Link>
        <a href="/scroll" className="tile scroll">
          {scrollCount > 0 && <span className="nbadge" title={`${scrollCount} member(s) posted cards this week`}>{scrollCount}</span>}
          <span className="icon"><svg viewBox="0 0 32 32" width="26" height="26" aria-hidden><rect width="32" height="32" rx="7" fill="#ffcf1f" /><path d="M8 7H24V11H18V21H24V25H8V21H14V11H8Z" fill="#0a1524" /></svg></span>
          <span className="name">darkwiz<b>scroll</b></span>
          <span className="blurb">Doomscroll that teaches: site knowledge one card at a time, quizzes, streaks and sparks.</span>
          <span className="meta"><span>Feed · library · creator</span>{scrollCount > 0 && <span className="nlab">new cards this week</span>}</span>
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
