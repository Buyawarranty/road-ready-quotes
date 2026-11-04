import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import {
  DuplicateCandidate, IMPORT_FIELDS, autoMapColumns, findDuplicate, parseBool, parseStage, parseUkDate,
} from '@/lib/bdm/bdmShared';
import { readSpreadsheet } from './bdmSpreadsheets';
import type { BdmStaff } from './BdmLogActivityForm';

interface Prepared {
  row: number; fields: Record<string, unknown>; error?: string;
  dup?: { match: DuplicateCandidate; reason: string }; action: 'create' | 'update' | 'skip';
}

const BdmImportDialog: React.FC<{ open: boolean; onClose: () => void; staff: BdmStaff[]; onDone: () => void }> = ({ open, onClose, staff, onDone }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headings, setHeadings] = useState<string[]>([]);
  const [raw, setRaw] = useState<Record<string, unknown>[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [prepared, setPrepared] = useState<Prepared[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep('upload'); setFile(null); setPrepared([]); setResult(null);
    (supabase as any).from('bdm_import_jobs').select('*').order('created_at', { ascending: false }).limit(5).then(({ data }: any) => setHistory(data || []));
  }, [open]);

  const onFile = async (f: File) => {
    try {
      const { headings, rows } = await readSpreadsheet(f);
      if (!rows.length) { toast({ title: 'That file has no rows', variant: 'destructive' }); return; }
      setFile(f); setHeadings(headings); setRaw(rows); setMap(autoMapColumns(headings)); setStep('map');
    } catch (e: any) { toast({ title: 'Could not read the file', description: e.message, variant: 'destructive' }); }
  };

  const prepare = async () => {
    setBusy(true);
    const existing: DuplicateCandidate[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await (supabase as any).from('bdm_dealerships').select('id,name,postcode,phone_digits,website_domain,dealer_id').range(from, from + 999);
      if (error) { toast({ title: 'Could not check duplicates', description: error.message, variant: 'destructive' }); setBusy(false); return; }
      existing.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    const staffBy = (v: string) => {
      const s = v.trim().toLowerCase();
      return staff.find(x => x.name.toLowerCase() === s || x.name.toLowerCase().includes(s))?.user_id;
    };
    const seen: DuplicateCandidate[] = [];
    const out: Prepared[] = raw.map((r, i) => {
      const get = (id: string) => (map[id] ? String(r[map[id]] ?? '').trim() : '');
      const f: Record<string, unknown> = {};
      for (const fld of IMPORT_FIELDS) { const v = get(fld.id); if (v) f[fld.id] = v; }
      let error: string | undefined;
      for (const fld of IMPORT_FIELDS.filter(x => x.required)) if (!f[fld.id]) error = `Missing ${fld.label.toLowerCase()}`;
      for (const k of ['vehicle_stock', 'est_monthly_sales']) {
        if (f[k] !== undefined) {
          const n = Number(String(f[k]).replace(/,/g, ''));
          if (!Number.isInteger(n) || n < 0) error = `${k === 'vehicle_stock' ? 'Vehicle stock' : 'Monthly sales'} must be a whole number of 0 or more`;
          else f[k] = String(n);
        }
      }
      for (const k of ['last_attempt_at', 'last_spoken_at', 'next_follow_up_at']) {
        if (f[k] !== undefined) { const iso = parseUkDate(r[map[k]]); if (!iso) error = `Couldn't read the date "${f[k]}"`; else f[k] = iso; }
      }
      if (f.stage !== undefined) f.stage = parseStage(String(f.stage)) ?? 'new_lead';
      if (f.priority !== undefined) { const p = String(f.priority).toLowerCase(); f.priority = ['low', 'medium', 'high'].includes(p) ? p : 'medium'; }
      if (f.do_not_contact !== undefined) f.do_not_contact = parseBool(f.do_not_contact) ?? false;
      if (f.assigned_bdm !== undefined) f.assigned_bdm = staffBy(String(f.assigned_bdm)) ?? '';
      if (f.postcode) f.postcode = String(f.postcode).toUpperCase();
      const dup = error ? null : findDuplicate(f as any, [...existing, ...seen]);
      if (!error && !dup) seen.push({ id: `row-${i}`, name: String(f.name), postcode: String(f.postcode), phone: String(f.phone), website: f.website as string, dealer_id: (f.dealer_id as string) || null });
      return { row: i + 2, fields: f, error, dup: dup ?? undefined, action: error || dup ? 'skip' : 'create' };
    });
    setPrepared(out); setStep('preview'); setBusy(false);
  };

  const counts = useMemo(() => ({
    create: prepared.filter(p => p.action === 'create').length,
    update: prepared.filter(p => p.action === 'update').length,
    skip: prepared.filter(p => p.action === 'skip' && !p.error).length,
    invalid: prepared.filter(p => p.error).length,
    dups: prepared.filter(p => p.dup).length,
  }), [prepared]);

  const setAction = (i: number, action: Prepared['action']) => setPrepared(ps => ps.map((p, j) => (j === i ? { ...p, action } : p)));

  const confirm = async () => {
    setBusy(true);
    const payload = prepared.filter(p => !p.error).map(p => ({
      row: p.row, action: p.action, fields: p.fields,
      target_id: p.action === 'update' && p.dup && !p.dup.match.id.startsWith('row-') ? p.dup.match.id : undefined,
    }));
    const total = { created: 0, updated: 0, skipped: 0, failed: counts.invalid, errors: prepared.filter(p => p.error).map(p => ({ row: p.row, error: p.error })) as any[] };
    for (let i = 0; i < payload.length; i += 500) {
      const { data, error } = await (supabase.rpc as any)('bdm_import_rows', { p_file_name: file?.name ?? 'import', p_rows: payload.slice(i, i + 500) });
      if (error) { toast({ title: 'Import stopped', description: error.message, variant: 'destructive' }); break; }
      total.created += data.created; total.updated += data.updated; total.skipped += data.skipped; total.failed += data.failed;
      total.errors.push(...(data.errors || []));
    }
    setResult(total); setStep('done'); setBusy(false); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import dealerships</DialogTitle>
          <DialogDescription>Excel (.xlsx) or CSV. Blank cells never clear saved details, and existing notes, follow-ups and assigned BDMs are kept.</DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center hover:bg-muted/50">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="font-medium">Choose a spreadsheet</span>
              <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
            </label>
            {history.length > 0 && (
              <div className="text-sm">
                <p className="mb-1 font-semibold">Recent imports</p>
                <ul className="space-y-1 text-muted-foreground">
                  {history.map(h => <li key={h.id}>{new Date(h.created_at).toLocaleString('en-GB')} · {h.file_name} · {h.created_count} added, {h.updated_count} updated, {h.skipped_count} skipped, {h.failed_count} failed</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{raw.length} rows in {file?.name}. Check each field points at the right column.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {IMPORT_FIELDS.map(f => (
                <div key={f.id} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 text-sm">{f.label}{f.required && ' *'}</span>
                  <Select value={map[f.id] ?? '__none'} onValueChange={v => setMap(m => { const n = { ...m }; if (v === '__none') delete n[f.id]; else n[f.id] = v; return n; })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Not in file</SelectItem>
                      {headings.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={prepare} disabled={busy || IMPORT_FIELDS.some(f => f.required && !map[f.id])}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Check rows
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-3">
            <p className="text-sm">
              <strong>{counts.create}</strong> new · <strong>{counts.dups}</strong> possible duplicates · <strong>{counts.invalid}</strong> with problems
            </p>
            <div className="max-h-[45vh] overflow-y-auto rounded border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-left"><tr><th className="p-2">Row</th><th className="p-2">Dealership</th><th className="p-2">Check</th><th className="p-2">Action</th></tr></thead>
                <tbody>
                  {prepared.map((p, i) => (
                    <tr key={p.row} className="border-t align-top">
                      <td className="p-2">{p.row}</td>
                      <td className="p-2"><span className="font-semibold">{String(p.fields.name ?? '—')}</span><br /><span className="text-xs text-muted-foreground">{String(p.fields.town ?? '')} {String(p.fields.postcode ?? '')}</span></td>
                      <td className="p-2 text-xs">
                        {p.error ? <span className="text-destructive">{p.error}</span>
                          : p.dup ? <>Matches <strong>{p.dup.match.name}</strong> ({p.dup.reason})</> : 'New'}
                      </td>
                      <td className="p-2">
                        {p.error ? <span className="text-xs text-muted-foreground">Won't import</span> : (
                          <Select value={p.action} onValueChange={v => setAction(i, v as Prepared['action'])}>
                            <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">Skip</SelectItem>
                              {p.dup && !p.dup.match.id.startsWith('row-') && <SelectItem value="update">Update existing</SelectItem>}
                              <SelectItem value="create">{p.dup ? 'Create as new' : 'Create'}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('map')}>Back</Button>
              <Button onClick={confirm} disabled={busy || counts.create + counts.update === 0}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import {counts.create} new, update {counts.update}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-3 text-sm">
            <p className="text-base font-semibold">{result.created} added · {result.updated} updated · {result.skipped} skipped · {result.failed} failed</p>
            {result.errors.length > 0 && (
              <ul className="max-h-48 overflow-y-auto rounded border p-2 text-xs">
                {result.errors.map((e: any, i: number) => <li key={i}>Row {e.row}: {e.error}</li>)}
              </ul>
            )}
            <div className="flex justify-end"><Button onClick={onClose}>Done</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BdmImportDialog;
