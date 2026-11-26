// Games registry (v2.1.0): the /games hub and the dashboard card read from here. Add a game = add a row (+ its route).
export type Game = { slug: string; name: string; blurb: string; href?: string; live: boolean; icon: "truss" | "splice" | "pipe" | "qty" | "cpm" | "hazard" | "beam" };

export const GAMES: Game[] = [
  { slug: "truss", name: "Truss Builder", icon: "truss", live: true, href: "/games/truss",
    blurb: "Span the gap with steel angles, tubes and pipes. AISC 360-10 / NSCP 2015 member checks, ₱ budget, stars." },
  { slug: "cpm", name: "Critical Path Rush", icon: "cpm", live: true, href: "/games/cpm",
    blurb: "Find the critical path against the clock, then crash a programme to the deadline at the lowest cost." },
  { slug: "splice", name: "Splice Zone", icon: "splice", live: false, blurb: "Place lap splices where the code allows them in beams and columns." },
  { slug: "pipe", name: "Pipe Puzzle", icon: "pipe", live: false, blurb: "Route supply and drainage lines with the right sizes, slopes and fittings." },
  { slug: "qty", name: "Guess the Quantity", icon: "qty", live: false, blurb: "Estimate cement, CHB and rebar by eye, then see how close you got." },

  { slug: "hazard", name: "Spot the Hazard", icon: "hazard", live: false, blurb: "Find the unsafe acts and conditions on a site scene before time runs out." },
  { slug: "beam", name: "Beam Optimizer", icon: "beam", live: false, blurb: "Size the lightest beam that passes bending, shear and deflection." },
];
