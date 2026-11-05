// BDM contact list filter groups. Options ticked inside one group are OR'd;
// separate groups are AND'd. Each group becomes one PostgREST `or` expression.
import { BDM_NOT_SPOKEN, BDM_STAGES, STAGE_TONE } from './bdmShared';
import type { FilterOption } from '@/components/admin/bdm/BdmFilterMenus';

export type BdmFilters = {
  stage: string[]; follow: string[]; spoken: string[]; priority: string[];
  calls: string[]; attempted: string[]; stock: string[]; account: string[]; activity: string[];
};
export const BDM_NO_FILTERS: BdmFilters = { stage: [], follow: [], spoken: [], priority: [], calls: [], attempted: [], stock: [], account: [], activity: [] };

export const BDM_FILTER_OPTIONS: Record<keyof BdmFilters, FilterOption[]> = {
  stage: BDM_STAGES.map(s => ({ id: s.id, label: s.label, tone: STAGE_TONE[s.id] })),
  follow: [
    { id: 'overdue', label: 'Overdue', hint: 'Past due date' },
    { id: 'today', label: 'Due today', hint: 'Any time today' },
    { id: 'tomorrow', label: 'Due tomorrow', hint: 'Next calendar day' },
    { id: 'week', label: 'Next 7 days', hint: 'In the next 7 days' },
    { id: 'none', label: 'No follow-up', hint: 'No date set' },
  ],
  spoken: [
    { id: BDM_NOT_SPOKEN, label: 'Never', hint: 'No successful contact' },
    { id: 'today', label: 'Today' },
    { id: '7', label: 'Last 7 days' },
    { id: '30', label: 'Last 30 days' },
    { id: 'over30', label: 'Over 30 days' },
  ],
  priority: [
    { id: 'high', label: 'High', tone: 'bg-crm-tint-rose text-crm-ink-rose' },
    { id: 'medium', label: 'Medium', tone: 'bg-crm-tint-cream text-crm-ink-cream' },
    { id: 'low', label: 'Low', tone: 'bg-crm-tint-green text-crm-ink-green' },
  ],
  calls: [{ id: '0', label: '0 calls' }, { id: '1-2', label: '1–2 calls' }, { id: '3-5', label: '3–5 calls' }, { id: '6+', label: '6 or more' }],
  attempted: [{ id: 'never', label: 'Never' }, { id: 'today', label: 'Today' }, { id: '7', label: 'Last 7 days' }, { id: 'over30', label: 'Over 30 days' }],
  stock: [{ id: '0', label: '0 / not known' }, { id: '1-5', label: '1–5 vehicles' }, { id: '6-20', label: '6–20 vehicles' }, { id: '20+', label: 'Over 20' }],
  account: [
    { id: 'linked', label: 'Active', hint: 'Has a dealer account', tone: 'bg-crm-tint-green text-crm-ink-green' },
    { id: 'none', label: 'Not signed up', hint: 'No dealer account yet', tone: 'bg-crm-tint-slate text-crm-ink-slate' },
    { id: 'dnc', label: 'Do not contact', tone: 'bg-crm-tint-rose text-crm-ink-rose' },
  ],
  activity: [{ id: 'today', label: 'Today' }, { id: '7', label: 'Last 7 days' }, { id: 'over30', label: 'Over 30 days / none' }],
};

const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** Returns one `or` expression per active group; `today` is local midnight. */
export function bdmFilterConditions(f: BdmFilters, today: Date): string[] {
  const iso = (n: number) => addDays(today, n).toISOString();
  const T0 = iso(0), T1 = iso(1), T2 = iso(2), T7 = iso(7), M7 = iso(-7), M30 = iso(-30);
  const map: Record<string, Record<string, string>> = {
    follow: {
      overdue: `next_follow_up_at.lt.${T0}`, today: `and(next_follow_up_at.gte.${T0},next_follow_up_at.lt.${T1})`,
      tomorrow: `and(next_follow_up_at.gte.${T1},next_follow_up_at.lt.${T2})`, week: `and(next_follow_up_at.gte.${T0},next_follow_up_at.lt.${T7})`,
      none: 'next_follow_up_at.is.null',
    },
    spoken: {
      [BDM_NOT_SPOKEN]: 'last_spoken_at.is.null', today: `last_spoken_at.gte.${T0}`, '7': `last_spoken_at.gte.${M7}`,
      '30': `last_spoken_at.gte.${M30}`, over30: `last_spoken_at.lt.${M30}`,
    },
    calls: { '0': 'call_count.eq.0', '1-2': 'and(call_count.gte.1,call_count.lte.2)', '3-5': 'and(call_count.gte.3,call_count.lte.5)', '6+': 'call_count.gte.6' },
    attempted: { never: 'last_attempt_at.is.null', today: `last_attempt_at.gte.${T0}`, '7': `last_attempt_at.gte.${M7}`, over30: `last_attempt_at.lt.${M30}` },
    stock: { '0': 'or(vehicle_stock.is.null,vehicle_stock.eq.0)', '1-5': 'and(vehicle_stock.gte.1,vehicle_stock.lte.5)', '6-20': 'and(vehicle_stock.gte.6,vehicle_stock.lte.20)', '20+': 'vehicle_stock.gt.20' },
    account: { linked: 'dealer_id.not.is.null', none: 'dealer_id.is.null', dnc: 'do_not_contact.is.true' },
    activity: {
      today: `or(last_attempt_at.gte.${T0},last_spoken_at.gte.${T0})`, '7': `or(last_attempt_at.gte.${M7},last_spoken_at.gte.${M7})`,
      over30: `and(or(last_attempt_at.is.null,last_attempt_at.lt.${M30}),or(last_spoken_at.is.null,last_spoken_at.lt.${M30}))`,
    },
  };
  const out: string[] = [];
  for (const key of Object.keys(map)) {
    const parts = (f[key as keyof BdmFilters] || []).map(id => map[key][id]).filter(Boolean);
    if (parts.length) out.push(parts.join(','));
  }
  return out;
}
