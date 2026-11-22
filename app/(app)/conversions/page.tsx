import Converter from "@/components/Converter";
import RefTable, { type RefTableRow } from "@/components/RefTable";
import { getDb } from "@/lib/auth";
import type { Unit, UnitCategory } from "@/lib/convert";

export const metadata = { title: "Conversions" };

export default async function ConversionsPage() {
  const supabase = await getDb();
  const [{ data: cats }, { data: units }, { data: tables }] = await Promise.all([
    supabase.from("unit_categories").select("*").order("sort"),
    supabase.from("units").select("*").order("sort"),
    supabase.from("ref_tables").select("id,slug,name,columns,data,source").order("name"),
  ]);
  const t = (tables ?? []) as RefTableRow[];

  return (
    <>
      <h1>Conversions</h1>
      <p className="sub">Unit converter and quick reference tables. Factors are exact definitions, so typing them in by hand isn&apos;t needed.</p>

      <Converter categories={(cats ?? []) as UnitCategory[]} units={(units ?? []) as Unit[]} />

      <section className="section">
        <h2>Reference tables</h2>
        <div className="chips" style={{ marginBottom: "1rem" }}>
          {t.map((x) => <a key={x.slug} href={`#${x.slug}`} className="chip">{x.name}</a>)}
        </div>
        {t.map((x) => <RefTable key={x.id} t={x} />)}
      </section>
    </>
  );
}
