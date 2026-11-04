import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle, ArrowUpDown, CalendarClock, Download, Loader2, MoreHorizontal, Phone, PhoneCall, PhoneMissed, Plus, Rocket, Star, Upload, UserCheck,
} from 'lucide-react';
import {
  BDM_PRIORITIES, BDM_STAGES, BdmDealership, STAGE_TONE, findDuplicate, normalisePostcode, phoneDigits, stageLabel, websiteDomain,
} from '@/lib/bdm/bdmShared';
import BdmDealershipDrawer from './BdmDealershipDrawer';
import BdmCallQueue from './BdmCallQueue';
import BdmCallingRow from './BdmCallingRow';
import BdmImportDialog from './BdmImportDialog';
import type { BdmStaff } from './BdmLogActivityForm';
import { downloadBdmTemplate, runBdmExport, ExportKind } from './bdmSpreadsheets';

const PAGE = 25;
const MANAGER_ROLES = ['super_admin', 'admin', 'sales_manager'];
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const shortDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—');

type Filters = {
  stage: string; follow: string; stock: string; account: string; bdm: string; spoken: string; priority: string;
};
const NO_FILTERS: Filters = { stage: 'all', follow: 'all', stock: 'all', account: 'all', bdm: 'all', spoken: 'all', priority: 'all' };

const BdmContactList: React.FC<{ userRole: string | null }> = ({ userRole }) => {
  const { toast } = useToast();
  const isSuper = userRole === 'super_admin';
  const isManager = !!userRole && MANAGER_ROLES.includes(userRole);
  const [userId, setUserId] = useState<string | null>(null);
  const [staff, setStaff] = useState<BdmStaff[]>([]);
  const [rows, setRows] = useState<BdmDealership[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<{ col: string; asc: boolean }>({ col: 'created_at', asc: false });
  const [kpis, setKpis] = useState<any>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openTab, setOpenTab] = useState('overview');
  const [addOpen, setAddOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [contactsBy, setContactsBy] = useState<Record<string, { full_name: string; phone: string | null; mobile: string | null; email?: string | null }>>({});
  const [towns, setTowns] = useState<{ town: string; dealerships: number }[]>([]);
  const [town, setTown] = useState<string>('all');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    (supabase.rpc as any)('bdm_staff_list').then(({ data }: any) => setStaff(data || []));
    (supabase.rpc as any)('bdm_town_list').then(({ data }: any) => {
      const list = data || [];
      setTowns(list);
      if (!isManager && list.length) setTown(list[0].town);
    });
  }, [isManager]);
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(0); }, [debounced, filters, kpiFilter, sort, town]);

  const loadKpis = useCallback(async () => {
    const { data } = await (supabase.rpc as any)('bdm_kpis');
    setKpis(data);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const db = supabase as any;
    let q = db.from('bdm_dealerships').select('*', { count: 'exact' });
    const today = startOfToday();
    if (debounced) {
      const s = debounced.replace(/[%,()]/g, ' ');
      const { data: cs } = await db.from('bdm_contacts').select('dealership_id').ilike('full_name', `%${s}%`).limit(200);
      const ids = [...new Set((cs || []).map((c: any) => c.dealership_id))];
      const digits = s.replace(/\D/g, '');
      const ors = [`name.ilike.%${s}%`, `town.ilike.%${s}%`, `postcode.ilike.%${s}%`, `phone.ilike.%${s}%`, `email.ilike.%${s}%`];
      if (digits.length >= 4) ors.push(`phone_digits.ilike.%${digits}%`);
      if (ids.length) ors.push(`id.in.(${ids.join(',')})`);
      q = q.or(ors.join(','));
    }
    if (town !== 'all') q = q.eq('town', town);
    if (filters.stage !== 'all') q = q.eq('stage', filters.stage);
    if (filters.priority !== 'all') q = q.eq('priority', filters.priority);
    if (filters.bdm === 'mine' && userId) q = q.eq('assigned_bdm', userId);
    else if (filters.bdm === 'none') q = q.is('assigned_bdm', null);
    else if (filters.bdm !== 'all') q = q.eq('assigned_bdm', filters.bdm);
    if (filters.account === 'linked') q = q.not('dealer_id', 'is', null);
    if (filters.account === 'none') q = q.is('dealer_id', null);
    if (filters.account === 'dnc') q = q.eq('do_not_contact', true);
    if (filters.stock !== 'all') {
      const [lo, hi] = filters.stock.split('-').map(Number);
      q = q.gte('vehicle_stock', lo); if (hi) q = q.lte('vehicle_stock', hi);
    }
    if (filters.follow === 'overdue') q = q.lt('next_follow_up_at', today.toISOString());
    if (filters.follow === 'today') q = q.gte('next_follow_up_at', today.toISOString()).lt('next_follow_up_at', addDays(today, 1).toISOString());
    if (filters.follow === 'week') q = q.gte('next_follow_up_at', today.toISOString()).lt('next_follow_up_at', addDays(today, 7).toISOString());
    if (filters.follow === 'none') q = q.is('next_follow_up_at', null);
    if (filters.spoken === '7') q = q.gte('last_spoken_at', addDays(today, -7).toISOString());
    if (filters.spoken === '30') q = q.gte('last_spoken_at', addDays(today, -30).toISOString());
    if (filters.spoken === 'over30') q = q.lt('last_spoken_at', addDays(today, -30).toISOString());
    if (filters.spoken === 'never') q = q.is('last_spoken_at', null);
    if (kpiFilter === 'due_today') q = q.eq('do_not_contact', false).gte('next_follow_up_at', today.toISOString()).lt('next_follow_up_at', addDays(today, 1).toISOString());
    if (kpiFilter === 'overdue') q = q.eq('do_not_contact', false).lt('next_follow_up_at', today.toISOString());
    if (kpiFilter === 'interested') q = q.eq('stage', 'interested');
    if (kpiFilter === 'onboarding') q = q.eq('stage', 'onboarding');
    if (kpiFilter === 'activated') q = q.eq('stage', 'active_dealer').not('dealer_id', 'is', null);
    q = q.order(sort.col, { ascending: sort.asc, nullsFirst: false }).order('name').range(page * PAGE, page * PAGE + PAGE - 1);
    const { data, count: c, error } = await q;
    if (error) toast({ title: 'Could not load dealerships', description: error.message, variant: 'destructive' });
    const list: BdmDealership[] = data || [];
    setRows(list); setCount(c ?? 0); setLoading(false);
    if (list.length) {
      const { data: cs } = await db.from('bdm_contacts').select('dealership_id, full_name, phone, mobile, email, is_primary')
        .in('dealership_id', list.map(r => r.id)).order('is_primary', { ascending: false });
      const m: Record<string, any> = {};
      for (const c2 of cs || []) if (!m[c2.dealership_id]) m[c2.dealership_id] = c2;
      setContactsBy(m);
    }
  }, [debounced, filters, kpiFilter, sort, page, userId, toast, town]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadKpis(); }, [loadKpis]);
  const refresh = () => { load(); loadKpis(); };

  const open = (id: string, tab = 'overview') => { setOpenTab(tab); setOpenId(id); };
  const toggleSort = (col: string) => setSort(s => (s.col === col ? { col, asc: !s.asc } : { col, asc: true }));
  const staffName = (id?: string | null) => staff.find(s => s.user_id === id)?.name;

  const doExport = async (k: ExportKind) => {
    setExporting(true);
    try { await runBdmExport(k); toast({ title: 'Export downloaded' }); }
    catch (e: any) { toast({ title: 'Export failed', description: e.message, variant: 'destructive' }); }
    setExporting(false);
  };

  const kpiCards = [
    { id: 'due_today', label: 'Calls due today', icon: CalendarClock, value: kpis?.due_today },
    { id: 'overdue', label: 'Overdue follow-ups', icon: AlertTriangle, value: kpis?.overdue, alert: true },
    { id: 'interested', label: 'Interested dealers', icon: Star, value: kpis?.interested },
    { id: 'onboarding', label: 'Onboarding', icon: Rocket, value: kpis?.onboarding },
    { id: 'activated', label: 'Activated this month', icon: UserCheck, value: kpis?.activated },
  ];
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS) || !!kpiFilter || !!search;
  const pages = Math.max(1, Math.ceil(count / PAGE));
  const today = startOfToday();

  const filterSelect = (k: keyof Filters, label: string, options: [string, string][]) => (
    <Select value={filters[k]} onValueChange={v => setFilters(f => ({ ...f, [k]: v }))}>
      <SelectTrigger className="h-9 w-full sm:w-auto sm:min-w-[140px]" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: all</SelectItem>
        {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const SortHead: React.FC<{ col: string; children: React.ReactNode }> = ({ col, children }) => (
    <th className="p-2 text-left font-medium">
      <button type="button" onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 hover:text-foreground">
        {children}<ArrowUpDown className={`h-3 w-3 ${sort.col === col ? 'text-foreground' : 'opacity-40'}`} />
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">BDM contact list</h1>
          <p className="text-sm text-muted-foreground">Manage dealership contacts, log calls, track your pipeline and hit your targets.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setQueueOpen(true)} variant="outline"><PhoneCall className="mr-2 h-4 w-4" />Start call list</Button>
          <Button onClick={() => setAddOpen(true)} className="bg-crm-orange text-primary-foreground hover:bg-crm-orange/90"><Plus className="mr-2 h-4 w-4" />Add dealership</Button>
          {isSuper && (
            <>
              <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Import</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={exporting}>{exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => doExport('dealerships-xlsx')}>Dealerships — Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => doExport('dealerships-csv')}>Dealerships — CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => doExport('full-xlsx')}>Full CRM — Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => doExport('full-csv')}>Full CRM — CSV (ZIP)</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={downloadBdmTemplate}>Download Excel template</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {kpiCards.map(k => (
          <button key={k.id} type="button" onClick={() => setKpiFilter(f => (f === k.id ? null : k.id))} aria-pressed={kpiFilter === k.id}
            className={`rounded-lg border bg-card p-3 text-left transition-colors hover:border-crm-orange ${kpiFilter === k.id ? 'border-crm-orange ring-1 ring-crm-orange' : ''}`}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><k.icon className="h-4 w-4" />{k.label}</div>
            <p className={`mt-1 text-2xl font-bold ${k.alert && k.value ? 'text-destructive' : ''}`}>{k.value ?? '–'}</p>
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="bdm-town" className="text-sm font-semibold">Town</Label>
          <Select value={town} onValueChange={setTown}>
            <SelectTrigger id="bdm-town" className="h-10 w-full sm:w-[260px] font-semibold"><SelectValue placeholder="Choose a town" /></SelectTrigger>
            <SelectContent>
              {isManager && <SelectItem value="all">All towns</SelectItem>}
              {towns.map(t => <SelectItem key={t.town} value={t.town}>{t.town} ({t.dealerships})</SelectItem>)}
            </SelectContent>
          </Select>
          {!isManager && towns.length === 0 && <span className="text-sm text-muted-foreground">No towns have been opened to you yet. Ask an admin for access.</span>}
        </div>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dealership, contact, phone, town or postcode..." className="h-10" />
        <div className="flex flex-wrap gap-2">
          <Select value={`${sort.col}:${sort.asc ? 'asc' : 'desc'}`} onValueChange={v => { const [col, d] = v.split(':'); setSort({ col, asc: d === 'asc' }); }}>
            <SelectTrigger className="h-9 w-full sm:w-auto sm:min-w-[160px]" aria-label="Sort by"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at:desc">Newest first</SelectItem>
              <SelectItem value="created_at:asc">Oldest first</SelectItem>
              <SelectItem value="next_follow_up_at:asc">Next follow-up</SelectItem>
              <SelectItem value="activity_count:desc">Most active</SelectItem>
              <SelectItem value="activity_count:asc">Least active</SelectItem>
              <SelectItem value="order_count:desc">Most orders</SelectItem>
              <SelectItem value="order_count:asc">Least orders</SelectItem>
              <SelectItem value="vehicle_stock:desc">Most vehicles</SelectItem>
              <SelectItem value="vehicle_stock:asc">Least vehicles</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={filters.spoken === 'never' ? 'default' : 'outline'}
            size="sm"
            className="h-9"
            aria-pressed={filters.spoken === 'never'}
            onClick={() => setFilters(f => ({ ...f, spoken: f.spoken === 'never' ? 'all' : 'never' }))}
          >
            <PhoneMissed className="mr-1 h-4 w-4" /> Not spoken to
          </Button>
          {filterSelect('stage', 'Stage', BDM_STAGES.map(s => [s.id, s.label]))}
          {filterSelect('follow', 'Follow-up', [['overdue', 'Overdue'], ['today', 'Today'], ['week', 'Next 7 days'], ['none', 'None set']])}
          {filterSelect('stock', 'Stock', [['0-20', '0–20 vehicles'], ['21-50', '21–50'], ['51-100', '51–100'], ['101-0', 'Over 100']])}
          {filterSelect('account', 'Account', [['linked', 'Has dealer account'], ['none', 'No account yet'], ['dnc', 'Do not contact']])}
          {filterSelect('bdm', 'BDM', [['mine', 'Mine'], ['none', 'Unassigned'], ...staff.map(s => [s.user_id, s.name] as [string, string])])}
          {filterSelect('spoken', 'Last spoken', [['never', 'Not spoken to'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['over30', 'Over 30 days ago']])}
          {filterSelect('priority', 'Priority', BDM_PRIORITIES.map(p => [p.id, p.label]))}
          {filtersActive && <Button variant="ghost" size="sm" className="h-9" onClick={() => { setFilters(NO_FILTERS); setKpiFilter(null); setSearch(''); }}>Clear filters</Button>}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[1400px] text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <SortHead col="stage">Status</SortHead>
              <SortHead col="call_count">Calls</SortHead>
              <th className="p-2 text-left font-medium">Actions</th>
              <SortHead col="name">Dealership / contact</SortHead>
              <th className="p-2 text-left font-medium">Phone</th>
              <th className="p-2 text-left font-medium">WhatsApp</th>
              <th className="p-2 text-left font-medium">Email</th>
              <SortHead col="last_spoken_at">Last spoken</SortHead>
              <SortHead col="next_follow_up_at">Follow-up</SortHead>
              <th className="p-2 text-left font-medium">Latest note</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">No dealerships match.</td></tr>
            ) : rows.map(r => (
              <BdmCallingRow
                key={r.id}
                r={r as any}
                c={contactsBy[r.id]}
                overdue={!!r.next_follow_up_at && new Date(r.next_follow_up_at) < today}
                assignedName={staffName(r.assigned_bdm)}
                showAssigned={isManager}
                onOpen={open}
                onChanged={refresh}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{count} dealership{count === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span>Page {page + 1} of {pages}</span>
          <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>

      <BdmDealershipDrawer dealershipId={openId} initialTab={openTab} staff={staff} isManager={isManager} onClose={() => setOpenId(null)} onChanged={refresh} />
      <BdmCallQueue open={queueOpen} onClose={() => setQueueOpen(false)} userId={userId} staff={staff} isManager={isManager} onChanged={refresh} />
      {isSuper && <BdmImportDialog open={importOpen} onClose={() => setImportOpen(false)} staff={staff} onDone={refresh} />}
      <AddDealershipDialog open={addOpen} onClose={() => setAddOpen(false)} staff={staff} isManager={isManager} userId={userId}
        onCreated={id => { setAddOpen(false); refresh(); open(id); }} />
    </div>
  );
};

const EMPTY = { name: '', postcode: '', town: '', phone: '', address: '', website: '', email: '', contact_name: '', job_title: '', mobile: '', vehicle_stock: '', est_monthly_sales: '', current_provider: '', lead_source: '', priority: 'medium', assigned_bdm: '', notes: '' };

const AddDealershipDialog: React.FC<{ open: boolean; onClose: () => void; staff: BdmStaff[]; isManager: boolean; userId: string | null; onCreated: (id: string) => void }> = ({ open, onClose, staff, isManager, userId, onCreated }) => {
  const { toast } = useToast();
  const [f, setF] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [dup, setDup] = useState<{ id: string; name: string; reason: string } | null>(null);
  useEffect(() => { if (open) { setF({ ...EMPTY, assigned_bdm: isManager ? '' : userId ?? '' }); setDup(null); } }, [open, isManager, userId]);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF(x => ({ ...x, [k]: e.target.value }));

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!f.name.trim()) e.push('Dealership name'); if (!f.postcode.trim()) e.push('Postcode');
    if (!f.town.trim()) e.push('Town / city'); if (phoneDigits(f.phone).length < 10) e.push('A full telephone number');
    return e;
  }, [f]);

  const save = async (force = false) => {
    if (errors.length) { toast({ title: 'Please add: ' + errors.join(', '), variant: 'destructive' }); return; }
    for (const k of ['vehicle_stock', 'est_monthly_sales'] as const) {
      if (f[k] && (!/^\d+$/.test(f[k]))) { toast({ title: 'Vehicle stock and monthly sales must be whole numbers', variant: 'destructive' }); return; }
    }
    setBusy(true);
    const db = supabase as any;
    if (!force) {
      const ors = [`postcode.ilike.${f.postcode.trim()}`, `postcode.ilike.${normalisePostcode(f.postcode)}`, `phone_digits.eq.${phoneDigits(f.phone)}`];
      const dom = websiteDomain(f.website); if (dom) ors.push(`website_domain.eq.${dom}`);
      const { data } = await db.from('bdm_dealerships').select('id,name,postcode,phone_digits,website_domain,dealer_id').or(ors.join(',')).limit(50);
      const hit = findDuplicate({ name: f.name, postcode: f.postcode, phone: f.phone, website: f.website }, data || []);
      if (hit) { setDup({ id: hit.match.id, name: hit.match.name, reason: hit.reason }); setBusy(false); return; }
    }
    const { data, error } = await db.from('bdm_dealerships').insert({
      name: f.name.trim(), postcode: f.postcode.trim().toUpperCase(), town: f.town.trim(), phone: f.phone.trim(),
      address: f.address || null, website: f.website || null, email: f.email || null,
      vehicle_stock: f.vehicle_stock ? Number(f.vehicle_stock) : null, stock_updated_at: f.vehicle_stock ? new Date().toISOString() : null,
      est_monthly_sales: f.est_monthly_sales ? Number(f.est_monthly_sales) : null,
      current_provider: f.current_provider || null, lead_source: f.lead_source || 'Added by BDM', priority: f.priority,
      assigned_bdm: f.assigned_bdm || (isManager ? null : userId), latest_note: f.notes.trim() || null, created_by: userId,
    }).select('id').single();
    if (error) { setBusy(false); toast({ title: 'Could not add dealership', description: error.message, variant: 'destructive' }); return; }
    if (f.contact_name.trim()) {
      await db.from('bdm_contacts').insert({ dealership_id: data.id, full_name: f.contact_name.trim(), job_title: f.job_title || null, mobile: f.mobile || null, is_primary: true });
    }
    if (f.notes.trim()) await (supabase.rpc as any)('bdm_log_activity', { p_dealership: data.id, p_type: 'note', p_outcome: null, p_contact: null, p_notes: f.notes, p_next_action: null, p_follow_up: null });
    setBusy(false); toast({ title: 'Dealership added' }); onCreated(data.id);
  };

  const inp = (k: keyof typeof EMPTY, label: string, type = 'text') => (
    <div><Label className="text-xs">{label}</Label><Input className="h-9" type={type} value={f[k]} onChange={set(k)} inputMode={type === 'number' ? 'numeric' : undefined} /></div>
  );

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Add dealership</DialogTitle><DialogDescription>Fields marked * are required.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">{inp('name', 'Dealership name *')}</div>
          {inp('postcode', 'Postcode *')}{inp('town', 'Town / city *')}
          {inp('phone', 'Telephone *', 'tel')}{inp('address', 'Address')}
          {inp('website', 'Website')}{inp('email', 'Email', 'email')}
          {inp('contact_name', 'Contact name')}{inp('job_title', 'Job title')}
          {inp('mobile', 'Mobile number', 'tel')}{inp('vehicle_stock', 'Vehicle stock count', 'number')}
          {inp('est_monthly_sales', 'Estimated monthly sales', 'number')}{inp('current_provider', 'Current warranty provider')}
          {inp('lead_source', 'Lead source')}
          <div>
            <Label className="text-xs">Lead priority</Label>
            <Select value={f.priority} onValueChange={v => setF(x => ({ ...x, priority: v }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{BDM_PRIORITIES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {isManager && (
            <div>
              <Label className="text-xs">Assigned BDM</Label>
              <Select value={f.assigned_bdm || 'none'} onValueChange={v => setF(x => ({ ...x, assigned_bdm: v === 'none' ? '' : v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Unassigned</SelectItem>{staff.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={f.notes} onChange={set('notes')} /></div>
        </div>
        {dup && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            This looks like <strong>{dup.name}</strong>, which is already on the list ({dup.reason.toLowerCase()}).
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {dup ? (
            <>
              <Button variant="outline" onClick={() => onCreated(dup.id)}>Open existing</Button>
              <Button onClick={() => save(true)} disabled={busy}>Add anyway</Button>
            </>
          ) : (
            <Button onClick={() => save()} disabled={busy} className="bg-crm-orange text-primary-foreground hover:bg-crm-orange/90">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add dealership</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BdmContactList;
