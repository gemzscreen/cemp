import Link from "next/link";
import { getMe } from "@/lib/auth";
import { LEVELS } from "@/lib/truss/levels";
import OfflineButton from "@/components/OfflineButton";

export const metadata = { title: "Games" };
const peso = (x: number) => "₱" + Math.round(x).toLocaleString("en-PH");

export default async function GamesPage() {
  const { supabase } = await getMe();
  const { data } = await supabase.from("game_bests").select("level,stars,best_cost,runs").eq("game", "truss");
  const best = new Map((data ?? []).map((b) => [b.level as number, b]));
  const total = (data ?? []).reduce((s, b) => s + (b.stars as number), 0);
  return (
    <div>
      <div className="lib-head">
        <div>
          <h1>Games</h1>
          <p className="sub" style={{ margin: 0 }}>Practice engineering judgement with real code checks under the hood.</p>
        </div>
      </div>
      <section className="panel tb-hub">
        <div className="tb-hub-head">
          <div>
            <h2 style={{ margin: 0 }}>Truss Builder</h2>
            <p className="sub" style={{ margin: ".2rem 0 0" }}>Span the gap with steel angles, tubes and pipes. Every member is checked to AISC 360-10 / NSCP 2015 (tension, compression buckling, slenderness) under 1.4D and 1.2D + 1.6L, with live-load deflection ≤ L/360. Pass under budget for stars. Works offline.</p>
          </div>
          <div className="tb-total">★ {total} / {LEVELS.length * 3}</div>
        </div>
        <div className="tb-levels">
          {LEVELS.map((l) => {
            const b = best.get(l.id);
            return (
              <Link key={l.id} href={`/games/truss?l=${l.id}`} className="tb-level-card">
                <span className="tb-lnum">{l.id}</span>
                <span className="tb-lbody"><strong>{l.name}</strong><small>{l.span} m span · budget {peso(l.budget)}</small></span>
                <span className="tb-lstars">{[1, 2, 3].map((i) => <span key={i} className={b && i <= (b.stars as number) ? "on" : ""}>★</span>)}<small>{b?.best_cost != null ? peso(Number(b.best_cost)) : b ? `${b.runs} run(s)` : "not played"}</small></span>
              </Link>
            );
          })}
        </div>
        <div style={{ marginTop: ".8rem" }}><OfflineButton urls={["/games", "/games/truss"]} label="Save Truss Builder for offline" /></div>
      </section>
      <p className="fine" style={{ marginTop: ".8rem" }}>Coming later: Splice Zone, Pipe Puzzle, Guess the Quantity, Critical Path Rush, Spot the Hazard, Beam Optimizer.</p>
    </div>
  );
}
