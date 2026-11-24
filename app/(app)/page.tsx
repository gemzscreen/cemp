import Link from "next/link";
import ReadMore from "@/components/ReadMore";
import { getMe, displayName } from "@/lib/auth";
import Greeting from "@/components/Greeting";
import { MODULES } from "@/lib/modules";
import { CATEGORIES } from "@/lib/taxonomy";
import { ESTIMATOR_META } from "@/lib/calc/estimate";
import EstimateIcon from "@/components/EstimateIcon";



export default async function Dashboard() {
  const { supabase, user, fullName } = await getMe();
  const [{ data: entries }, { data: release }, { count: unitCount }, { count: tableCount }] = await Promise.all([
    supabase.from("entries").select("module").neq("status", "deprecated"),
    supabase.from("releases").select("version,batch_name,notes_md,released_at")
      .not("released_at", "is", null).order("id", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("units").select("id", { count: "exact", head: true }),
    supabase.from("ref_tables").select("id", { count: "exact", head: true }),
  ]);
  const { count: clauseCount } = await supabase.from("code_clauses").select("id", { count: "exact", head: true });

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

      <Link href="/games" className="est-hero game-hero">
        <span className="calc-ico"><svg width="44" height="44" viewBox="0 0 64 64" aria-hidden><g fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"><path d="M9 40 L19 22 H45 L55 40 Z" /><path d="M19 22 L27 40 L32 22 L37 40 L45 22" /></g><path d="M6 50 H58" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></span>
        <span><strong>Games: Truss Builder</strong><small>Span the gap with steel angles, tubes and pipes. Real NSCP / AISC member checks, ₱ budget, stars. Works offline.</small></span>
        <span className="go">Play →</span>
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
