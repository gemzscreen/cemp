import { Suspense } from "react";
import BeamOptimizer from "@/components/BeamOptimizer";

export const metadata = { title: "Beam Optimizer" };

// One page for every level (?l=), so a single cached copy plays all levels offline.
export default function BeamPage() {
  return <Suspense fallback={<p className="sub">Loading Beam Optimizer…</p>}><BeamOptimizer /></Suspense>;
}
