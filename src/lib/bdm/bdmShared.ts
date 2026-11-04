// Shared rules for the BDM Contact List: pipeline stages, call outcomes,
// spreadsheet column mapping, duplicate matching and export safety.

export const BDM_STAGES = [
  { id: 'new_lead', label: 'New lead' },
  { id: 'attempted', label: 'Attempted' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'interested', label: 'Interested' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'active_dealer', label: 'Active dealer' },
  { id: 'not_interested', label: 'Not interested' },
] as const;

export const BDM_ACTIVITY_TYPES = [
  { id: 'call', label: 'Phone call' },
  { id: 'email', label: 'Email' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'whatsapp', label: 'WhatsApp / message' },
  { id: 'note', label: 'Note' },
  { id: 'other', label: 'Other' },
] as const;

export const BDM_OUTCOMES = [
  { id: 'no_answer', label: 'No answer' },
  { id: 'voicemail', label: 'Voicemail left' },
  { id: 'spoke', label: 'Spoke to dealer' },
  { id: 'interested', label: 'Interested' },
  { id: 'callback', label: 'Callback requested' },
  { id: 'info_requested', label: 'Information requested' },
  { id: 'demo_booked', label: 'Demo booked' },
  { id: 'onboarding_agreed', label: 'Onboarding agreed' },
  { id: 'not_interested', label: 'Not interested' },
  { id: 'wrong_number', label: 'Wrong number' },
] as const;

export const BDM_PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
] as const;

// Outcomes that count as an actual conversation (updates "Last spoken").
// Must match bdm_log_activity in the database.
export const SPOKEN_OUTCOMES = new Set(['spoke', 'interested', 'callback', 'info_requested', 'demo_booked', 'onboarding_agreed', 'not_interested']);
export const isConversation = (type: string, outcome?: string | null) =>
  type === 'meeting' || (!!outcome && SPOKEN_OUTCOMES.has(outcome));

const lookup = (list: readonly { id: string; label: string }[]) => (id?: string | null) =>
  list.find((x) => x.id === id)?.label ?? (id ? id.replace(/_/g, ' ') : '—');
export const stageLabel = lookup(BDM_STAGES);
export const outcomeLabel = lookup(BDM_OUTCOMES);
export const typeLabel = lookup(BDM_ACTIVITY_TYPES);
export const priorityLabel = lookup(BDM_PRIORITIES);

export const STAGE_TONE: Record<string, string> = {
  new_lead: 'bg-muted text-foreground',
  attempted: 'bg-muted text-muted-foreground',
  contacted: 'bg-secondary text-secondary-foreground',
  interested: 'bg-primary/15 text-primary',
  follow_up: 'bg-accent text-accent-foreground',
  onboarding: 'bg-primary/10 text-primary',
  active_dealer: 'bg-emerald-100 text-emerald-800',
  not_interested: 'bg-destructive/10 text-destructive',
};

export interface BdmDealership {
  id: string; name: string; address: string | null; town: string | null; county: string | null; postcode: string | null;
  phone: string | null; email: string | null; website: string | null; website_domain: string | null; phone_digits: string | null;
  vehicle_stock: number | null; stock_updated_at: string | null; est_monthly_sales: number | null;
  current_provider: string | null; lead_source: string | null; priority: string; stage: string; do_not_contact: boolean;
  assigned_bdm: string | null; dealer_id: string | null; last_attempt_at: string | null; last_spoken_at: string | null;
  last_outcome: string | null; next_follow_up_at: string | null; next_action: string | null; latest_note: string | null;
  created_at: string;
}

export const normalisePostcode = (p?: string | null) => (p || '').replace(/\s+/g, '').toUpperCase();
export const phoneDigits = (p?: string | null) => (p || '').replace(/\D/g, '').slice(-10);
export const websiteDomain = (w?: string | null) =>
  (w || '').trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
const normName = (n?: string | null) => (n || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export interface DuplicateCandidate {
  id: string; name: string; postcode: string | null; phone_digits?: string | null; phone?: string | null;
  website_domain?: string | null; website?: string | null; dealer_id: string | null;
}

/** Why an incoming record looks like an existing dealership, or null. */
export function findDuplicate(
  incoming: { name?: string; postcode?: string; phone?: string; website?: string; dealer_id?: string },
  existing: DuplicateCandidate[],
): { match: DuplicateCandidate; reason: string } | null {
  const pc = normalisePostcode(incoming.postcode);
  const nm = normName(incoming.name);
  const ph = phoneDigits(incoming.phone);
  const dom = websiteDomain(incoming.website);
  for (const e of existing) {
    if (incoming.dealer_id && e.dealer_id && incoming.dealer_id === e.dealer_id) return { match: e, reason: 'Same dealer ID' };
  }
  for (const e of existing) {
    if (nm && pc && normName(e.name) === nm && normalisePostcode(e.postcode) === pc) return { match: e, reason: 'Same name and postcode' };
  }
  for (const e of existing) {
    const ed = e.website_domain ?? websiteDomain(e.website);
    if (dom && ed && dom === ed) return { match: e, reason: 'Same website' };
  }
  for (const e of existing) {
    const ep = e.phone_digits ?? phoneDigits(e.phone);
    if (ph.length >= 9 && ep && ep === ph) return { match: e, reason: 'Same phone number' };
  }
  return null;
}

// Import fields and the spreadsheet headings each one recognises.
export const IMPORT_FIELDS: { id: string; label: string; required?: boolean; aliases: string[] }[] = [
  { id: 'name', label: 'Dealership name', required: true, aliases: ['dealership name', 'dealership', 'company', 'company name', 'dealer name', 'business name', 'name'] },
  { id: 'postcode', label: 'Postcode', required: true, aliases: ['postcode', 'post code', 'zip'] },
  { id: 'town', label: 'Town / city', required: true, aliases: ['town / city', 'town/city', 'town', 'city', 'location'] },
  { id: 'phone', label: 'Phone number', required: true, aliases: ['phone number', 'phone', 'telephone', 'tel', 'landline'] },
  { id: 'vehicle_stock', label: 'Vehicle stock count', aliases: ['vehicle stock count', 'vehicle stock', 'stock', 'vehicles', 'stock count'] },
  { id: 'contact_name', label: 'Contact name', aliases: ['contact name', 'contact', 'main contact'] },
  { id: 'job_title', label: 'Job title', aliases: ['job title', 'title', 'position', 'role'] },
  { id: 'contact_mobile', label: 'Contact mobile', aliases: ['contact mobile', 'mobile', 'mobile number'] },
  { id: 'contact_email', label: 'Contact email', aliases: ['email', 'contact email'] },
  { id: 'email', label: 'Dealership email', aliases: ['dealership email', 'company email', 'business email'] },
  { id: 'website', label: 'Website', aliases: ['website', 'web', 'url', 'site'] },
  { id: 'address', label: 'Address', aliases: ['address line 1', 'address', 'street'] },
  { id: 'county', label: 'County', aliases: ['county', 'region'] },
  { id: 'est_monthly_sales', label: 'Estimated monthly sales', aliases: ['estimated monthly vehicle sales', 'monthly sales', 'estimated monthly sales'] },
  { id: 'current_provider', label: 'Current warranty provider', aliases: ['current warranty provider', 'warranty provider', 'provider'] },
  { id: 'stage', label: 'Pipeline stage', aliases: ['pipeline stage', 'stage', 'status'] },
  { id: 'last_attempt_at', label: 'Last contact attempt', aliases: ['last contact attempt', 'last attempt'] },
  { id: 'last_spoken_at', label: 'Last spoken date', aliases: ['last spoken date', 'last spoken'] },
  { id: 'last_outcome', label: 'Last call outcome', aliases: ['last call outcome', 'outcome'] },
  { id: 'latest_note', label: 'Latest notes', aliases: ['latest notes', 'notes', 'note', 'comments'] },
  { id: 'next_follow_up_at', label: 'Next follow-up date', aliases: ['next follow-up date', 'next follow up date', 'follow up date', 'follow-up date'] },
  { id: 'next_action', label: 'Follow-up action', aliases: ['follow-up action', 'follow up action', 'next action'] },
  { id: 'priority', label: 'Lead priority', aliases: ['lead priority', 'priority'] },
  { id: 'lead_source', label: 'Lead source', aliases: ['lead source', 'source'] },
  { id: 'assigned_bdm', label: 'Assigned BDM', aliases: ['assigned bdm', 'bdm', 'owner', 'assigned to'] },
  { id: 'dealer_id', label: 'Existing dealer ID', aliases: ['existing dealer id', 'dealer id'] },
  { id: 'do_not_contact', label: 'Do not contact', aliases: ['do not contact', 'dnc'] },
];

const clean = (h: string) => h.toLowerCase().replace(/[_\s]+/g, ' ').trim();

/** Guess which spreadsheet heading feeds each CRM field. */
export function autoMapColumns(headings: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const used = new Set<string>();
  for (const f of IMPORT_FIELDS) {
    for (const alias of f.aliases) {
      const h = headings.find((x) => !used.has(x) && clean(x) === alias);
      if (h) { map[f.id] = h; used.add(h); break; }
    }
  }
  return map;
}

/** Match free-text stage values ("Follow up", "Active") to a stage id. */
export function parseStage(v?: string | null): string | undefined {
  const s = (v || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return undefined;
  const hit = BDM_STAGES.find((x) => x.id.replace(/_/g, '') === s || x.label.toLowerCase().replace(/[^a-z]/g, '') === s);
  if (hit) return hit.id;
  if (s.startsWith('active')) return 'active_dealer';
  if (s.startsWith('new')) return 'new_lead';
  return undefined;
}

export function parseBool(v: unknown): boolean | undefined {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return undefined;
  return ['y', 'yes', 'true', '1', 'x'].includes(s);
}

/** UK dates (dd/mm/yyyy) or ISO to an ISO string; empty for blank or invalid. */
export function parseUkDate(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
  const s = String(v ?? '').trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[1]), Number(m[4] || 9), Number(m[5] || 0)));
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

/** Stop spreadsheet apps treating a value as a formula. */
export function safeCell(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}
