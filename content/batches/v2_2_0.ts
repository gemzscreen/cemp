// v2.2.0: project costing, client quotation (print/PDF) and Excel workbook.
import type { Batch } from "../types";
const batch: Batch = {
  version: "v2.2.0",
  batch_name: "Costing and quotations",
  notes: [
    "Projects get a Costing panel under the bill of materials: labour per item as % of materials or crew × daily rate × days, equipment per item, then OCM, profit and VAT, with live totals",
    "Quotation page: your header and logo, client and project, one lump-sum price per item, VAT, total in words, payment terms, terms and conditions, validity and signature blocks. Print or Save as PDF",
    "Excel (.xlsx) download with three linked sheets: Quotation, Cost build-up and BOM. Formulas stay live, so you can change prices, labour or markups in Excel",
    "Profile → Quotation details: company, signatory, licences (PRC), address, contact, TIN and logo, used on every quotation",
    "Unpriced material lines are flagged in the costing and on the quotation page so nothing goes out at ₱0 by accident",
  ],
  clauses: [],
  entries: [],
};
export default batch;
