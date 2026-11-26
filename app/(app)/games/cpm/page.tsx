import { Suspense } from "react";
import CpmRush from "@/components/CpmRush";

export const metadata = { title: "Critical Path Rush" };

// One page for every level (?l=), so a single cached copy plays all levels offline.
export default function CpmPage() {
  return <Suspense fallback={<p className="sub">Loading Critical Path Rush…</p>}><CpmRush /></Suspense>;
}
