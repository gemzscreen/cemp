import TopicNav from "@/components/TopicNav";
import Converter from "@/components/Converter";
import RefTable, { type RefTableRow } from "@/components/RefTable";
import { getDb } from "@/lib/auth";
import type { Unit, UnitCategory } from "@/lib/convert";
import { groupByCategory, TABLE_CATEGORY } from "@/lib/taxonomy";

export const metadata = { title: "Conversions" };

export default async function ConversionsPage() {
  const supabase = await getDb();
  const [{ data: cats }, { data: units }, { data: tables }] = await Promise.all([
    supabase.from("unit_categories").select("*").order("sort"),
    supabase.from("units").select("*").order("sort"),
    supabase.from("ref_tables").select("id,slug,name,columns,data,source").order("name"),
  ]);
  const t = (tables ?? []) as RefTableRow[];
  const groups = groupByCategory(t, (x) => TABLE_CATEGORY[x.slug] ?? "learn-regulations");

  return (
    <div className="lib">
      <TopicNav label="Converter & tables">
        <a href="#converter" className="lib-all">Unit converter <span>{(units ?? []).length}</span></a>
        {groups.map((g) => (
          <div key={g.cat.slug} className="lib-group">
            <a href={`#g-${g.cat.slug}`} className="lib-parent"><span className="ico">{g.cat.icon}</span>{g.cat.name} <span>{g.leaves.reduce((s, l) => s + l.items.length, 0)}</span></a>
            {g.leaves.flatMap((l) => l.items).map((x) => <a key={x.slug} href={`#${x.slug}`} className="lib-leaf">{x.name} <span /></a>)}
          </div>
        ))}
      </TopicNav>
      <section className="lib-main">
        <div className="lib-head"><div>
          <h1>Conversions</h1>
          <p className="sub" style={{ margin: 0 }}>Unit converter and quick reference tables. Factors are exact definitions.</p>
        </div></div>
        <div id="converter"><Converter categories={(cats ?? []) as UnitCategory[]} units={(units ?? []) as Unit[]} /></div>
        {groups.map((g) => (
          <div key={g.cat.slug} className="lib-section" id={`g-${g.cat.slug}`}>
            <h2 className="lib-h2"><span className="ico">{g.cat.icon}</span> {g.cat.name}</h2>
            {g.leaves.flatMap((l) => l.items).map((x) => <RefTable key={x.id} t={x} />)}
          </div>
        ))}
      </section>
    </div>
  );
}
