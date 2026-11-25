// Renders text with inline $…$ / \(…\) and display $$…$$ / \[…\] math (KaTeX). Server component: KaTeX never ships to the browser.
// Bad TeX falls back to the raw source in red instead of throwing.
//
// v2.1.0: a left-to-right scanner replaces the old regex. The regex read the "$$" in "…13,500$$\text{Direct…}$" (two inline
// formulas written back to back, as pasted from AI chats) as the start of a display formula and swallowed the sentences after
// it, so plain text came out as italic "formula" letters. Rules now (close to Pandoc's):
//  • inline $…$: the opening $ is followed by a non-space, the closing $ is preceded by a non-space and NOT followed by a digit;
//    it never crosses a line break. A closing $ may be followed straight away by another opening $ ("…$$…").
//  • display $$…$$: only when "$$" starts a line or follows whitespace / "(" (so "a$$b" is two inline formulas).
//  • "\$" is a literal dollar; "$5 and $10" stays text (closing $ after a space is rejected).
import katex from "katex";

type Part = { html: string; math: boolean };

const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c);

/** Split text into plain and TeX segments. Exported for tests. */
export function splitMath(text: string): { s: string; tex: boolean; display: boolean }[] {
  const out: { s: string; tex: boolean; display: boolean }[] = [];
  let buf = "", i = 0;
  const n = text.length;
  const flush = () => { if (buf) { out.push({ s: buf, tex: false, display: false }); buf = ""; } };
  while (i < n) {
    const c = text[i], d = text[i + 1];
    if (c === "\\" && d === "$") { buf += "$"; i += 2; continue; }
    if (c === "\\" && (d === "(" || d === "[")) {
      const close = d === "(" ? "\\)" : "\\]";
      const j = text.indexOf(close, i + 2);
      if (j > i + 2) { flush(); out.push({ s: text.slice(i + 2, j), tex: true, display: d === "[" }); i = j + 2; continue; }
    }
    if (c === "$") {
      const prev = text[i - 1];
      // display $$…$$ (only at a "word start")
      if (d === "$" && (isSpace(prev) || prev === "(" || prev === ">")) {
        const j = text.indexOf("$$", i + 2);
        if (j > i + 2) { flush(); out.push({ s: text.slice(i + 2, j), tex: true, display: true }); i = j + 2; continue; }
      }
      // inline $…$
      if (!isSpace(d) && d !== "$") {
        let j = i + 1, ok = -1;
        while (j < n) {
          const e = text[j];
          if (e === "\n" || e === "\r") break;
          if (e === "\\") { j += 2; continue; }
          if (e === "$") { if (!isSpace(text[j - 1]) && !/[0-9]/.test(text[j + 1] ?? "")) ok = j; break; }
          j++;
        }
        if (ok > 0) { flush(); out.push({ s: text.slice(i + 1, ok), tex: true, display: false }); i = ok + 1; continue; }
      }
    }
    buf += c; i++;
  }
  flush();
  return out;
}

export function renderMath(text: string): Part[] {
  return splitMath(text).map((p) => p.tex
    ? { html: katex.renderToString(p.s, { displayMode: p.display, throwOnError: false, errorColor: "#b4352c", strict: "ignore", output: "html" }), math: true }
    : { html: p.s, math: false });
}

export default function MathText({ text }: { text: string }) {
  return <>{renderMath(text).map((p, k) => p.math ? <span key={k} className="mtx" dangerouslySetInnerHTML={{ __html: p.html }} /> : <span key={k}>{p.html}</span>)}</>;
}
