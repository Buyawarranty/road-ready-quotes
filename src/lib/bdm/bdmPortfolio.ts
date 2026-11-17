// Spreadsheet → portfolio row mapping for the BDM portfolio import.
export const PORTFOLIO_STATUSES = [
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'live', label: 'Live – selling' },
  { id: 'follow_up', label: 'Needs follow-up' },
  { id: 'paused', label: 'Paused' },
  { id: 'lost', label: 'Lost' },
] as const;

export type PortfolioInput = {
  dealership_name: string; contact_name: string | null; phone: string | null; email: string | null;
  town: string | null; postcode: string | null; onboarded_at: string | null; status: string;
  next_follow_up_at: string | null; follow_up_action: string | null; notes: string | null;
};

const COLS: Record<keyof PortfolioInput, string[]> = {
  dealership_name: ['dealership', 'dealership name', 'dealer', 'company', 'business', 'name'],
  contact_name: ['contact', 'contact name', 'owner', 'main contact'],
  phone: ['phone', 'phone number', 'telephone', 'mobile', 'number'],
  email: ['email', 'email address', 'e-mail'],
  town: ['town', 'city', 'town / city', 'location'],
  postcode: ['postcode', 'post code'],
  onboarded_at: ['date onboarded', 'onboarded', 'onboarded date', 'date', 'start date'],
  status: ['status', 'stage'],
  next_follow_up_at: ['next follow-up', 'next follow up', 'follow-up date', 'follow up date', 'follow up'],
  follow_up_action: ['follow-up action', 'follow up action', 'next action', 'action'],
  notes: ['notes', 'comments', 'note'],
};

const clean = (v: unknown) => { const s = String(v ?? '').trim(); return s ? s : null; };

/** Accepts DD/MM/YYYY, YYYY-MM-DD or a spreadsheet date serial; returns YYYY-MM-DD or null. */
export function parseUkDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[1])));
    return isNaN(d.getTime()) || d.getUTCDate() !== Number(m[1]) ? null : d.toISOString().slice(0, 10);
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function statusFrom(v: unknown): string {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return 'onboarding';
  const hit = PORTFOLIO_STATUSES.find(x => x.id === s || x.label.toLowerCase() === s || s.startsWith(x.id.replace('_', ' ')));
  if (hit) return hit.id;
  if (/live|active|selling|onboarded/.test(s)) return 'live';
  if (/lost|closed|cancel/.test(s)) return 'lost';
  if (/pause|hold/.test(s)) return 'paused';
  if (/follow/.test(s)) return 'follow_up';
  return 'onboarding';
}

/** Map one spreadsheet row (any heading names) to a portfolio row; null when there is no dealership name. */
export function mapPortfolioRow(row: Record<string, unknown>): PortfolioInput | null {
  const keys = Object.keys(row);
  const get = (f: keyof PortfolioInput) => {
    const k = keys.find(k => COLS[f].includes(k.trim().toLowerCase()));
    return k ? row[k] : undefined;
  };
  const name = clean(get('dealership_name'));
  if (!name) return null;
  return {
    dealership_name: name,
    contact_name: clean(get('contact_name')), phone: clean(get('phone')), email: clean(get('email'))?.toLowerCase() ?? null,
    town: clean(get('town')), postcode: clean(get('postcode'))?.toUpperCase() ?? null,
    onboarded_at: parseUkDate(get('onboarded_at')), status: statusFrom(get('status')),
    next_follow_up_at: parseUkDate(get('next_follow_up_at')), follow_up_action: clean(get('follow_up_action')), notes: clean(get('notes')),
  };
}
