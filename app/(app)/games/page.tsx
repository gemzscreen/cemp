import Link from "next/link";
import { getMe } from "@/lib/auth";
import { LEVELS } from "@/lib/truss/levels";
import { GAMES } from "@/lib/games";
import GameIcon from "@/components/GameIcon";
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
          <p className="sub" style={{ margin: 0 }}>Practice engineering judgement with real code checks under the hood. Scores sync when you are online.</p>
        </div>
      </div>

      <div className="game-grid">
        {GAMES.map((g) => {
          const body = (
            <>
              <span className="g-ico"><GameIcon name={g.icon} size={38} /></span>
              <span className="g-name">{g.name}</span>
              <span className="g-blurb">{g.blurb}</span>
              <span className="g-foot">
                {g.live ? <><span>★ {g.slug === "truss" ? `${total} / ${LEVELS.length * 3}` : "–"}</span><span className="g-play">Play →</span></> : <span className="g-soon">Coming soon</span>}
              </span>
            </>
          );
          return g.live && g.href
            ? <Link key={g.slug} href={g.href} className="game-card">{body}</Link>
            : <div key={g.slug} className="game-card soon" aria-disabled>{body}</div>;
        })}
      </div>

      <section className="panel tb-hub" id="truss" style={{ marginTop: "1.2rem" }}>
        <div className="tb-hub-head">
          <div>
            <h2 style={{ margin: 0 }}>Truss Builder levels</h2>
            <p className="sub" style={{ margin: ".2rem 0 0" }}>Every member is checked to AISC 360-10 / NSCP 2015 (tension, compression buckling, slenderness) under 1.4D and 1.2D + 1.6L, with live-load deflection ≤ L/360. Pass under budget for stars.</p>
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
    </div>
  );
}
