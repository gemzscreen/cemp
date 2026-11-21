"use client";
import { useMemo, useState } from "react";
import { convert, fmt, type Unit, type UnitCategory } from "@/lib/convert";

export default function Converter({ categories, units }: { categories: UnitCategory[]; units: Unit[] }) {
  const [catId, setCatId] = useState(categories[0]?.id);
  const catUnits = useMemo(() => units.filter((u) => u.category_id === catId).sort((a, b) => a.sort - b.sort), [units, catId]);
  const [fromId, setFromId] = useState<number | undefined>(catUnits[0]?.id);
  const [toId, setToId] = useState<number | undefined>(catUnits[1]?.id);
  const [raw, setRaw] = useState("1");

  const pickCat = (id: number) => {
    setCatId(id);
    const list = units.filter((u) => u.category_id === id).sort((a, b) => a.sort - b.sort);
    setFromId(list[0]?.id); setToId(list[1]?.id ?? list[0]?.id);
  };
  const from = catUnits.find((u) => u.id === fromId);
  const to = catUnits.find((u) => u.id === toId);
  const value = parseFloat(raw.replace(/,/g, ""));
  const ok = Number.isFinite(value) && from && to;

  return (
    <div className="panel conv">
      <div className="chips" style={{ marginBottom: "1rem" }}>
        {categories.map((c) => (
          <button key={c.id} type="button" className={`chip ${c.id === catId ? "on" : ""}`} onClick={() => pickCat(c.id)}>{c.name}</button>
        ))}
      </div>

      <div className="conv-row">
        <input aria-label="Value" inputMode="decimal" value={raw} onChange={(e) => setRaw(e.target.value)} />
        <select aria-label="From unit" value={fromId} onChange={(e) => setFromId(Number(e.target.value))}>
          {catUnits.map((u) => <option key={u.id} value={u.id}>{u.symbol} · {u.name}</option>)}
        </select>
        <button type="button" className="swap" title="Swap units" onClick={() => { setFromId(toId); setToId(fromId); }}>⇄</button>
        <select aria-label="To unit" value={toId} onChange={(e) => setToId(Number(e.target.value))}>
          {catUnits.map((u) => <option key={u.id} value={u.id}>{u.symbol} · {u.name}</option>)}
        </select>
      </div>

      <div className="conv-result">
        {ok ? <><span className="big">{fmt(convert(value, from!, to!))}</span> <span className="unit">{to!.symbol}</span></> : <span className="muted">Enter a number</span>}
      </div>

      {ok && (
        <table className="tbl compact">
          <thead><tr><th>Unit</th><th style={{ textAlign: "right" }}>{fmt(value)} {from!.symbol} =</th></tr></thead>
          <tbody>
            {catUnits.map((u) => (
              <tr key={u.id} className={u.id === toId ? "hl" : ""}>
                <td><strong>{u.symbol}</strong> <span className="muted">{u.name}</span></td>
                <td className="num">{fmt(convert(value, from!, u))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
