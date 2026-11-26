// Beam Optimizer levels (v2.7.0). Loads are typical for small PH buildings, for the game (not a design for a real job).
// Superimposed dead load excludes the beam's own weight (the engine adds 24 kN/m³). `best` = exhaustive optimum from
// `npm run beam-optimum`: re-run it and paste BEST whenever loads, options, prices or checks change.
import type { BeamLevel } from "./index";

const LV: Omit<BeamLevel, "best">[] = [
  { id: 1, name: "Carport lintel", support: "simple", L: 3.5, wD: 6, wL: 2, fc: 21,
    blurb: "A 3.5 m beam over the carport opening carrying a CHB wall and a light roof. Start oversized: trim it down.",
    start: { b: 300, h: 500, n: 4, db: 20, ds: 10, s: 150 } },
  { id: 2, name: "Bedroom floor beam", support: "simple", L: 4.5, wD: 12, wL: 7.5, fc: 21,
    blurb: "Second-floor beam under a 3 m strip of slab, finishes and a partition. The starting design fails: find out why.",
    start: { b: 200, h: 300, n: 3, db: 16, ds: 10, s: 200 } },
  { id: 3, name: "Garage girder", support: "simple", L: 6, wD: 16, wL: 8, PD: 30, PL: 15, fc: 21,
    blurb: "A 6 m girder over the garage with a post from the floor above landing at midspan. Shear and bending both matter.",
    start: { b: 300, h: 500, n: 4, db: 20, ds: 10, s: 200 } },
  { id: 4, name: "Balcony cantilever", support: "cantilever", L: 2, wD: 8, wL: 6, PD: 5, PL: 1.5, fc: 21,
    blurb: "A 2 m cantilever carrying the balcony slab and a parapet at the tip. Tension is on top; anchor the bars into the back span.",
    start: { b: 250, h: 350, n: 3, db: 16, ds: 10, s: 150 } },
  { id: 5, name: "Living room long span", support: "simple", L: 7, wD: 10, wL: 6, fc: 28, hMax: 400,
    blurb: "A 7 m span for an open living room, and the ceiling allows only 400 mm of beam. That is below the minimum depth, so deflection must be computed.",
    start: { b: 300, h: 400, n: 4, db: 20, ds: 10, s: 200 } },
  { id: 6, name: "Elevated tank beam", support: "simple", L: 5, wD: 42, wL: 3, fc: 28,
    blurb: "One of two beams under a 6 m³ water tank on a steel-and-concrete stand (water taken as dead load here). Heavy shear near the supports.",
    start: { b: 300, h: 500, n: 4, db: 20, ds: 10, s: 200 } },
];

export const BEST: Record<number, BeamLevel["best"]> = {"1":{"cost":4886,"design":{"b":200,"h":250,"n":3,"db":12,"ds":10,"s":75}},"2":{"cost":8801,"design":{"b":200,"h":450,"n":2,"db":20,"ds":10,"s":175}},"3":{"cost":17861,"design":{"b":250,"h":600,"n":3,"db":25,"ds":10,"s":250}},"4":{"cost":4042,"design":{"b":200,"h":350,"n":2,"db":20,"ds":10,"s":125}},"5":{"cost":28874,"design":{"b":450,"h":400,"n":5,"db":28,"ds":10,"s":150}},"6":{"cost":12971,"design":{"b":200,"h":550,"n":2,"db":28,"ds":10,"s":225}}};

export const BEAM_LEVELS: BeamLevel[] = LV.map((l) => ({ ...l, best: BEST[l.id] }));
export const beamLevelById = (id: number) => BEAM_LEVELS.find((l) => l.id === id) ?? BEAM_LEVELS[0];
