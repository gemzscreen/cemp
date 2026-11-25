// Darkwiz Scroll inside CEMP (v2.1.0): the single-file app, served behind the CEMP login (middleware).
import { SCROLL_HTML } from "@/lib/scroll/html";

export const dynamic = "force-static";
export function GET() {
  return new Response(SCROLL_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-cache" } });
}
