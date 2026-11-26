// v2.2.0: project workbook (exceljs). Three linked sheets with live formulas, so the file can be edited in Excel:
//   BOM           material lines per item: qty × unit price
//   Cost build-up materials (SUMIF from BOM) + labour (% or crew × rate × days) + equipment → direct → quoted lump sum
//   Quotation     client-facing lump sums from Cost build-up, VAT, total
// Every formula also carries its computed result (so viewers that don't recalculate still show figures);
// fullCalcOnLoad makes Excel recalculate on open.
import ExcelJS from "exceljs";
import { groupByItem } from "@/lib/bom";
import { computeCost, pesoWords, type Costing } from "@/lib/costing";
import type { Issuer } from "@/lib/issuer";
import type { Material, Inputs } from "@/lib/calc";
import type { Trade } from "@/lib/rates";

type Item = { id: string; label: string; calcKey: string; materials: Material[]; inputs?: Inputs };
export type WorkbookInput = {
  project: { id: string; name: string; client: string | null; location: string | null };
  items: Item[]; prices: Record<string, number>; costing: Costing; issuer: Issuer; signer: string; labour?: Record<Trade, number>;
  quote: { no: string; dateLong: string; validUntilLong: string | null };
  calcTitle: (key: string) => string;
};

const NAVY = "FF1E2A3A", GOLD = "FFF2D27A", LIGHT = "FFF3EFE4", PESO = '"₱"#,##0.00', PCT = '0.0"%"';
const thin = { style: "thin" as const, color: { argb: "FFD0D7E0" } };
const box = { top: thin, left: thin, bottom: thin, right: thin };

export async function buildWorkbook(d: WorkbookInput): Promise<Buffer> {
  const r = computeCost(d.items, d.prices, d.costing, d.labour);
  const groups = groupByItem(d.items);
  const wb = new ExcelJS.Workbook();
  wb.creator = "CEMP"; wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;
  // tab order = creation order: Quotation, Cost build-up, BOM (filled in reverse because each sheet points to the next)
  const q = wb.addWorksheet("Quotation", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.6, right: 0.6, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } } });
  const cb = wb.addWorksheet("Cost build-up", { views: [{ state: "frozen", ySplit: 6 }], pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const bom = wb.addWorksheet("BOM", { views: [{ state: "frozen", ySplit: 4 }], pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });

  // ---------- BOM ----------
  bom.columns = [{ width: 7 }, { width: 8 }, { width: 38 }, { width: 10 }, { width: 8 }, { width: 14 }, { width: 16 }];
  bom.getCell("A1").value = `${d.project.name}: bill of materials by item`; bom.getCell("A1").font = { bold: true, size: 13 };
  bom.getCell("A2").value = [d.project.client && `Client: ${d.project.client}`, d.project.location && `Location: ${d.project.location}`].filter(Boolean).join(" · ");
  const bh = bom.getRow(4); bh.values = ["Item", "Line", "Material", "Qty", "Unit", "Unit price", "Amount"];
  bh.eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; });
  let row = 5;
  const firstBomRow = row;
  for (const g of groups) {
    const head = bom.getRow(row++);
    head.values = [g.no, "", `${g.label} (${d.calcTitle(g.calcKey)})`];
    head.font = { bold: true }; head.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } }));
    const start = row;
    g.lines.forEach((l, li) => {
      const x = bom.getRow(row);
      const pr = d.prices[l.key];
      x.values = [g.no, `${g.no}.${li + 1}`, l.name, l.show, l.unit, pr ?? null];
      x.getCell(7).value = { formula: `D${row}*F${row}`, result: (pr ?? 0) * l.show };
      x.getCell(6).numFmt = PESO; x.getCell(7).numFmt = PESO;
      if (pr == null) x.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1C2" } };
      row++;
    });
    const sub = bom.getRow(row++);
    sub.getCell(3).value = `Subtotal, ${g.label}`; sub.getCell(3).font = { italic: true };
    const subRes = g.lines.reduce((s, l) => s + (d.prices[l.key] ?? 0) * l.show, 0);
    sub.getCell(7).value = { formula: g.lines.length ? `SUM(G${start}:G${row - 2})` : "0", result: subRes };
    sub.getCell(7).numFmt = PESO; sub.getCell(7).font = { italic: true, bold: true };
  }
  const lastBomRow = row - 1;
  bom.getCell(`C${row + 1}`).value = "Yellow unit price = not priced yet (counts as ₱0).";
  bom.getCell(`C${row + 1}`).font = { italic: true, size: 9, color: { argb: "FF6B7785" } };

  // ---------- Cost build-up ----------
  cb.columns = [{ width: 6 }, { width: 36 }, { width: 16 }, { width: 10 }, { width: 9 }, { width: 7 }, { width: 11 }, { width: 7 }, { width: 15 }, { width: 14 }, { width: 16 }, { width: 16 }];
  cb.getCell("A1").value = `${d.project.name}: cost build-up`; cb.getCell("A1").font = { bold: true, size: 13 };
  cb.getCell("A2").value = "Labour method: pct = % of materials; crew = crew × daily rate × days; trade = 1 × crew day cost × crew-days (work qty ÷ output). Change the blue cells.";
  cb.getCell("A2").font = { size: 9, color: { argb: "FF6B7785" } };
  cb.getCell("B3").value = "OCM %"; cb.getCell("C3").value = d.costing.ocm;
  cb.getCell("B4").value = "Profit %"; cb.getCell("C4").value = d.costing.profit;
  cb.getCell("D3").value = "VAT %"; cb.getCell("E3").value = d.costing.vat;
  for (const a of ["C3", "C4", "E3"]) { cb.getCell(a).font = { color: { argb: "FF1F5FBF" }, bold: true }; cb.getCell(a).border = box; }
  const ch = cb.getRow(6);
  ch.values = ["Item", "Description", "Materials", "Method", "Labour %", "Crew", "Rate ₱/day", "Days", "Labour", "Equipment", "Direct cost", "Quoted (lump sum)"];
  ch.eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; c.alignment = { wrapText: true, vertical: "middle" }; });
  ch.height = 30;
  const first = 7;
  r.items.forEach((it, k) => {
    const n = first + k, x = cb.getRow(n), cfg = it.cfg;
    x.values = [it.no, it.label];
    x.getCell(3).value = { formula: `SUMIF(BOM!$A$${firstBomRow}:$A$${lastBomRow},A${n},BOM!$G$${firstBomRow}:$G$${lastBomRow})`, result: it.materials };
    const tr = cfg.mode === "trade" ? it.trade : null;
    x.getCell(4).value = cfg.mode; x.getCell(5).value = cfg.pct;
    x.getCell(6).value = tr ? 1 : cfg.crew; x.getCell(7).value = tr ? tr.dayCost : cfg.rate; x.getCell(8).value = tr ? tr.days : cfg.days;
    if (tr) x.getCell(2).note = `Trade crew: ${tr.qty.toFixed(2)} ${tr.unit} ÷ ${tr.output} ${tr.unit}/day = ${tr.days} crew-days; crew day cost ₱${tr.dayCost}`;
    x.getCell(9).value = { formula: `IF(OR(D${n}="crew",D${n}="trade"),F${n}*G${n}*H${n},E${n}/100*C${n})`, result: it.labour };
    x.getCell(10).value = cfg.equip;
    x.getCell(11).value = { formula: `C${n}+I${n}+J${n}`, result: it.direct };
    x.getCell(12).value = { formula: `ROUND(K${n}*(1+($C$3+$C$4)/100),2)`, result: it.lump };
    for (const c of [4, 5, 6, 7, 8, 10]) x.getCell(c).font = { color: { argb: "FF1F5FBF" } };
    for (const c of [3, 7, 9, 10, 11, 12]) x.getCell(c).numFmt = PESO;
    x.getCell(4).dataValidation = { type: "list", allowBlank: false, formulae: ['"pct,crew,trade"'] };
  });
  const last = first + r.items.length - 1, t = last + 1;
  const tot = cb.getRow(t);
  tot.getCell(2).value = "Totals";
  const S = (col: string, res: number) => ({ formula: r.items.length ? `SUM(${col}${first}:${col}${last})` : "0", result: res });
  tot.getCell(3).value = S("C", r.materials); tot.getCell(9).value = S("I", r.labour); tot.getCell(10).value = S("J", r.equip);
  tot.getCell(11).value = S("K", r.direct); tot.getCell(12).value = S("L", r.subtotal);
  tot.font = { bold: true }; tot.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } }; });
  for (const c of [3, 9, 10, 11, 12]) tot.getCell(c).numFmt = PESO;
  const sumRows: [string, { formula: string; result: number } | number, string?][] = [
    ["Direct cost", { formula: `K${t}`, result: r.direct }],
    ["OCM", { formula: `K${t}*$C$3/100`, result: r.ocm }],
    ["Profit", { formula: `K${t}*$C$4/100`, result: r.profit }],
    ["Price before VAT", { formula: `L${t}`, result: r.subtotal }],
    ["VAT", { formula: `ROUND(L${t}*$E$3/100,2)`, result: r.vat }],
    ["Total contract price", { formula: `L${t}+ROUND(L${t}*$E$3/100,2)`, result: r.total }],
  ];
  sumRows.forEach(([label, v], k) => {
    const x = cb.getRow(t + 2 + k);
    x.getCell(10).value = label; x.getCell(12).value = v as ExcelJS.CellValue; x.getCell(12).numFmt = PESO;
    if (k === sumRows.length - 1) { x.font = { bold: true }; x.getCell(12).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } }; }
  });

  // ---------- Quotation (first tab) ----------
  q.columns = [{ width: 11 }, { width: 46 }, { width: 7 }, { width: 7 }, { width: 18 }];
  let qr = 1;
  const put = (text: string, opts: Partial<ExcelJS.Font> = {}) => { const c = q.getCell(`A${qr}`); c.value = text; c.font = opts; q.mergeCells(`A${qr}:C${qr}`); qr++; };
  if (d.issuer.logo) {
    const m = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(d.issuer.logo);
    if (m && m[1] !== "webp") {
      const imgId = wb.addImage({ base64: m[2], extension: m[1] === "png" ? "png" : "jpeg" });
      q.addImage(imgId, { tl: { col: 3.2, row: 0.2 }, ext: { width: 140, height: 60 } });
    }
  }
  put(d.issuer.company || d.signer || "Your name or company", { bold: true, size: 14, color: { argb: NAVY } });
  if (d.issuer.company && d.signer) put(`${d.signer}${d.issuer.title ? `, ${d.issuer.title}` : ""}`);
  else if (d.issuer.title) put(d.issuer.title);
  if (d.issuer.address) put(d.issuer.address);
  const contact = [d.issuer.contact, d.issuer.email].filter(Boolean).join(" · "); if (contact) put(contact);
  const lic = [d.issuer.prc && `PRC ${d.issuer.prc}`, d.issuer.tin && `TIN ${d.issuer.tin}`].filter(Boolean).join(" · "); if (lic) put(lic, { size: 9 });
  qr++;
  q.getCell(`A${qr}`).value = "QUOTATION"; q.getCell(`A${qr}`).font = { bold: true, size: 16 }; qr++;
  const kv = (k: string, v: string) => { q.getCell(`A${qr}`).value = k; q.getCell(`A${qr}`).font = { color: { argb: "FF6B7785" } }; q.getCell(`B${qr}`).value = v; qr++; };
  kv("No.", d.quote.no); kv("Date", d.quote.dateLong); if (d.quote.validUntilLong) kv("Valid until", d.quote.validUntilLong);
  qr++;
  kv("To", d.project.client || "Client"); kv("Project", d.project.name); if (d.project.location) kv("Location", d.project.location);
  qr++;
  const hdr = q.getRow(qr); hdr.values = ["Item", "Description of work", "Qty", "Unit", "Amount (₱)"];
  hdr.eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }; });
  qr++;
  const qFirst = qr;
  r.items.forEach((it, k) => {
    const x = q.getRow(qr);
    x.values = [it.no, it.label, 1, "lot"];
    x.getCell(5).value = { formula: `'Cost build-up'!L${first + k}`, result: it.lump }; x.getCell(5).numFmt = PESO;
    x.eachCell({ includeEmpty: true }, (c, col) => { if (col <= 5) c.border = box; });
    qr++;
  });
  const qLast = qr - 1;
  const foot = (label: string, v: ExcelJS.CellValue, bold = false) => {
    q.mergeCells(`A${qr}:D${qr}`); q.getCell(`A${qr}`).value = label; q.getCell(`A${qr}`).alignment = { horizontal: "right" };
    q.getCell(`E${qr}`).value = v; q.getCell(`E${qr}`).numFmt = PESO;
    if (bold) { q.getCell(`A${qr}`).font = { bold: true }; q.getCell(`E${qr}`).font = { bold: true }; q.getCell(`E${qr}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } }; }
    qr++;
  };
  const subF = { formula: r.items.length ? `SUM(E${qFirst}:E${qLast})` : "0", result: r.subtotal };
  if (d.costing.vat > 0) {
    const subRow = qr; foot("Total before VAT", subF);
    foot(`VAT ${d.costing.vat}%`, { formula: `ROUND(E${subRow}*'Cost build-up'!$E$3/100,2)`, result: r.vat });
    foot("TOTAL CONTRACT PRICE", { formula: `E${subRow}+E${subRow + 1}`, result: r.total }, true);
  } else foot("TOTAL CONTRACT PRICE", subF, true);
  qr++;
  q.getCell(`A${qr}`).value = `Amount in words: ${pesoWords(r.total)}${d.costing.vat > 0 ? " (VAT inclusive)" : ""}`; q.mergeCells(`A${qr}:E${qr}`);
  q.getCell(`A${qr}`).font = { italic: true, size: 9 }; q.getCell(`A${qr}`).alignment = { wrapText: true }; qr += 2;
  const para = (title: string, body: string) => {
    if (!body) return;
    q.getCell(`A${qr}`).value = title; q.getCell(`A${qr}`).font = { bold: true }; qr++;
    q.mergeCells(`A${qr}:E${qr}`); q.getCell(`A${qr}`).value = body; q.getCell(`A${qr}`).alignment = { wrapText: true, vertical: "top" };
    q.getRow(qr).height = Math.max(15, Math.ceil(body.length / 95) * 15); qr += 2;
  };
  para("Payment terms", d.costing.quote.payment);
  para("Terms and conditions", d.costing.quote.terms);
  if (d.costing.quote.validity > 0) para("Validity", `This quotation is valid for ${d.costing.quote.validity} days from the date above.`);
  para("Notes", d.costing.quote.notes);
  qr++;
  q.getCell(`A${qr}`).value = "Prepared by"; q.getCell(`E${qr}`).value = "Conforme"; qr += 3;
  q.getCell(`A${qr}`).value = d.signer; q.getCell(`A${qr}`).font = { bold: true };
  q.getCell(`E${qr}`).value = d.project.client ?? ""; q.getCell(`E${qr}`).font = { bold: true }; qr++;
  q.getCell(`A${qr}`).value = [d.issuer.title, d.issuer.prc && `PRC ${d.issuer.prc}`].filter(Boolean).join(" · ");
  q.getCell(`E${qr}`).value = "Signature over printed name / date";
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}
