const LABELS: [RegExp, string][] = [
  [/^\/dealer-portal\/quote\/pricing/, 'Quote – pricing'],
  [/^\/dealer-portal\/quote\/customer/, 'Quote – customer details'],
  [/^\/dealer-portal\/quote\/(review|payment|checkout)/, 'Quote – checkout'],
  [/^\/dealer-portal\/quote/, 'New quote'],
  [/^\/dealer-portal\/quotes/, 'Quotes'],
  [/^\/dealer-portal\/warranties/, 'Warranties'],
  [/^\/dealer-portal\/cancellations/, 'Cancellations'],
  [/^\/dealer-portal\/customers/, 'Customers'],
  [/^\/dealer-portal\/claims/, 'Claims'],
  [/^\/dealer-portal\/invoic/, 'Invoices'],
  [/^\/dealer-portal\/documents/, 'Documents'],
  [/^\/dealer-portal\/(resources|faq)/, 'FAQs'],
  [/^\/dealer-portal\/settings/, 'Settings'],
  [/^\/dealer-portal\/(dashboard)?\/?$/, 'Dashboard'],
];
export const dealerPageLabel = (path: string): string => {
  const p = path.split('?')[0];
  const hit = LABELS.find(([re]) => re.test(p));
  if (hit) return hit[1];
  const last = p.split('/').filter(Boolean).pop() || 'Dashboard';
  return last.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
};
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
/** e.g. "10:03am 8Aug26" in UK time */
export const formatActivityTime = (iso: string): string => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: '2-digit', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    .formatToParts(new Date(iso));
  const g = (t: string) => parts.find((x) => x.type === t)?.value || '';
  return `${g('hour')}:${g('minute')}${g('dayPeriod').toLowerCase().replace(/\s|\./g, '')} ${Number(g('day'))}${MONTHS[Number(g('month')) - 1]}${g('year')}`;
};
