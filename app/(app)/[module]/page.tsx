import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moduleBySlug } from "@/lib/modules";

type Spec = { id: number; parent_id: number | null; name: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }) {
  const m = moduleBySlug((await params).module);
  return { title: m?.name ?? "Not found" };
}

export default async function ModulePage({
  params, searchParams,
}: { params: Promise<{ module: string }>; searchParams: Promise<{ spec?: string }> }) {
  const { module } = await params;
  const { spec } = await searchParams;
  const m = moduleBySlug(module);
  if (!m) notFound();

  const supabase = await createClient();
  const { data: specsData } = await supabase.from("specializations").select("id,parent_id,name,slug").order("sort");
  const specs = (specsData ?? []) as Spec[];
  const children = specs.filter((s) => s.parent_id);
  const selected = specs.find((s) => s.slug === spec);

  let q = supabase.from("entries")
    .select("id,title,slug,summary,status,updated_at,specialization_id")
    .eq("module", m.kind).order("title");
  if (selected) {
    const ids = [selected.id, ...specs.filter((s) => s.parent_id === selected.id).map((s) => s.id)];
    q = q.in("specialization_id", ids);
  }
  const { data: entries, error } = await q;
  const specName = (id: number | null) => specs.find((s) => s.id === id)?.name;

  return (
    <>
      <h1>{m.name}</h1>
      <p className="sub">{m.blurb}</p>

      <div className="chips" style={{ marginBottom: "1.25rem" }}>
        <Link href={`/${m.slug}`} className={`chip ${!selected ? "on" : ""}`}>All</Link>
        {children.map((c) => (
          <Link key={c.id} href={`/${m.slug}?spec=${c.slug}`} className={`chip ${selected?.id === c.id ? "on" : ""}`}>{c.name}</Link>
        ))}
      </div>

      {error && <div className="msg err">{error.message}</div>}

      {entries && entries.length > 0 ? (
        <div className="list">
          {entries.map((e) => (
            <Link key={e.id} href={`/entry/${e.slug}`} className="row">
              <div>
                <div className="t">{e.title}</div>
                <div className="s">{[specName(e.specialization_id), e.summary].filter(Boolean).join(" · ")}</div>
              </div>
              <span className={`badge b-${e.status}`}>{e.status}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <strong>No {m.name.toLowerCase()} entries {selected ? `in ${selected.name} ` : ""}yet.</strong>
          The first {m.name} batch is planned for {m.batch}.
        </div>
      )}
    </>
  );
}
