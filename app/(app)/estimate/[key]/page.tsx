import { notFound } from "next/navigation";
import Link from "next/link";
import { getMe } from "@/lib/auth";
import { CALCS } from "@/lib/calc";
import { ESTIMATOR_META } from "@/lib/calc/estimate";
import EstimatorView from "@/components/EstimatorView";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const c = CALCS[`est-${(await params).key}`];
  return { title: c ? c.title : "Estimate" };
}

export default async function EstimatorPage({ params }: { params: Promise<{ key: string }> }) {
  const key = `est-${(await params).key}`;
  const idx = ESTIMATOR_META.findIndex((m) => m.key === key);
  if (idx < 0 || !CALCS[key]) notFound();
  const m = ESTIMATOR_META[idx];
  const { supabase } = await getMe();
  const { data: projects } = await supabase.from("estimate_projects").select("id,name").order("updated_at", { ascending: false }).limit(50);
  const prev = ESTIMATOR_META[idx - 1], next = ESTIMATOR_META[idx + 1];
  return (
    <>
      <p className="sub no-print" style={{ marginBottom: ".5rem", display: "flex", justifyContent: "space-between" }}>
        <Link href="/estimate">← All calculators</Link>
        <span>{prev && <Link href={`/estimate/${prev.key.slice(4)}`}>‹ {CALCS[prev.key].title}</Link>}{prev && next && " · "}{next && <Link href={`/estimate/${next.key.slice(4)}`}>{CALCS[next.key].title} ›</Link>}</span>
      </p>
      <EstimatorView meta={{ key: m.key, group: m.group, sketch: m.sketch, blurb: m.blurb, no: idx + 1, total: ESTIMATOR_META.length }} projects={projects ?? []} />
    </>
  );
}
