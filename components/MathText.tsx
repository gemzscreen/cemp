// Renders text with inline $…$ and display $$…$$ math (KaTeX). Server component: KaTeX never ships to the browser.
// Bad TeX falls back to the raw source in red instead of throwing.
import katex from "katex";

const RE = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<![\\$\w])\$(?!\s)[^$\n]+?(?<!\s)\$(?![\w$]))/g;

export function renderMath(text: string): { html: string; math: boolean }[] {
  const out: { html: string; math: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ html: text.slice(last, i), math: false });
    const raw = m[0];
    const display = raw.startsWith("$$") || raw.startsWith("\\[");
    const tex = raw.startsWith("$$") ? raw.slice(2, -2) : raw.startsWith("$") ? raw.slice(1, -1) : raw.slice(2, -2);
    out.push({ html: katex.renderToString(tex, { displayMode: display, throwOnError: false, errorColor: "#b4352c", strict: "ignore", output: "html" }), math: true });
    last = i + raw.length;
  }
  if (last < text.length) out.push({ html: text.slice(last), math: false });
  return out;
}

export default function MathText({ text }: { text: string }) {
  return <>{renderMath(text).map((p, k) => p.math ? <span key={k} className="mtx" dangerouslySetInnerHTML={{ __html: p.html }} /> : <span key={k}>{p.html}</span>)}</>;
}
