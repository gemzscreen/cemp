import { Suspense } from "react";
import TrussBuilder from "@/components/TrussBuilder";

export const metadata = { title: "Truss Builder" };

// One page for every level (?l=), so a single cached copy plays all levels offline.
export default function TrussPage() {
  return <Suspense fallback={<p className="sub">Loading Truss Builder…</p>}><TrussBuilder /></Suspense>;
}
