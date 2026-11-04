// Super Admin spreadsheet exports and the import template.
// The data comes from bdm_export_full, which refuses anyone but Super Admin
// and logs every export.
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { IMPORT_FIELDS, safeCell, stageLabel, BDM_STAGES } from '@/lib/bdm/bdmShared';

type Rows = Record<string, unknown>[];

const sanitise = (rows: Rows) => rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, safeCell(v ?? '')])));

const download = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const stamp = () => new Date().toISOString().slice(0, 10);

export type ExportKind = 'dealerships-xlsx' | 'dealerships-csv' | 'full-xlsx' | 'full-csv';

export async function runBdmExport(kind: ExportKind) {
  const full = kind.startsWith('full');
  const format = kind.endsWith('xlsx') ? 'xlsx' : full ? 'csv-zip' : 'csv';
  const { data, error } = await (supabase.rpc as any)('bdm_export_full', { p_format: format, p_scope: full ? 'full' : 'dealerships' });
  if (error) throw new Error(error.message);
  const sheets: [string, Rows][] = [['Dealerships', (data.dealerships as Rows).map(d => ({ ...d, stage: stageLabel(d.stage as string) }))]];
  if (full) {
    sheets.push(['Contacts', data.contacts], ['Activity History', data.activities], ['Follow-up Tasks', data.tasks], ['Pipeline History', data.stage_history]);
  }
  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    for (const [name, rows] of sheets) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitise(rows)), name);
    XLSX.writeFile(wb, `panda-protect-bdm-${full ? 'full-crm' : 'dealerships'}-${stamp()}.xlsx`);
    return;
  }
  const toCsv = (rows: Rows) => XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(sanitise(rows)));
  if (!full) { download(new Blob([toCsv(sheets[0][1])], { type: 'text/csv' }), `panda-protect-bdm-dealerships-${stamp()}.csv`); return; }
  const zip = new JSZip();
  for (const [name, rows] of sheets) zip.file(`${name.toLowerCase().replace(/\s+/g, '-')}.csv`, toCsv(rows));
  download(await zip.generateAsync({ type: 'blob' }), `panda-protect-bdm-full-crm-${stamp()}.zip`);
}

export function downloadBdmTemplate() {
  const headings = IMPORT_FIELDS.filter(f => f.id !== 'contact_email').map(f => f.label)
    .concat(['Email'])
    .map(h => (h === 'Dealership email' ? 'Dealership Email' : h));
  const example = (o: Record<string, string>) => Object.fromEntries(headings.map(h => [h, o[h] ?? '']));
  const rows = [
    example({ 'Dealership name': 'EXAMPLE – Northfield Motors', Postcode: 'B31 2AB', 'Town / city': 'Birmingham', 'Phone number': '0121 000 0000', 'Vehicle stock count': '45', 'Contact name': 'Sam Example', 'Job title': 'Sales Manager', 'Contact mobile': '07700 900000', Email: 'sam@example.com', Website: 'example.com', 'Pipeline stage': 'New lead', 'Next follow-up date': '15/11/2026', 'Follow-up action': 'Intro call', 'Lead priority': 'High', 'Lead source': 'Autotrader list', 'Do not contact': 'No' }),
    example({ 'Dealership name': 'EXAMPLE – Riverside Car Sales', Postcode: 'LS1 4AP', 'Town / city': 'Leeds', 'Phone number': '0113 000 0000', 'Vehicle stock count': '20', 'Contact name': 'Alex Example', 'Pipeline stage': 'Interested', 'Latest notes': 'Asked for trade pricing', 'Lead priority': 'Medium', 'Do not contact': 'No' }),
  ];
  const instructions = [
    { Item: 'Required columns', Detail: 'Dealership name, Postcode, Town / city, Phone number' },
    { Item: 'Optional columns', Detail: 'Every other column. Leave a cell blank to keep what is already saved.' },
    { Item: 'Dates', Detail: 'Use DD/MM/YYYY, for example 15/11/2026. Add a time as DD/MM/YYYY HH:MM.' },
    { Item: 'Pipeline stages', Detail: BDM_STAGES.map(s => s.label).join(', ') },
    { Item: 'Lead priority', Detail: 'Low, Medium or High' },
    { Item: 'Do not contact', Detail: 'Yes or No' },
    { Item: 'Assigned BDM', Detail: "The staff member's name or email exactly as in Panda Protect" },
    { Item: 'Phone numbers', Detail: 'Format the column as Text so leading zeros are kept' },
    { Item: 'Example rows', Detail: 'The rows starting EXAMPLE – are samples. Delete them before importing.' },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, { header: headings }), 'Dealerships');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instructions), 'Instructions');
  XLSX.writeFile(wb, 'panda-protect-bdm-import-template.xlsx');
}

export async function readSpreadsheet(file: File): Promise<{ headings: string[]; rows: Record<string, unknown>[] }> {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true, raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false, dateNF: 'dd/mm/yyyy' });
  const headings = (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })[0] || []).map(String).filter(Boolean);
  return { headings, rows };
}
