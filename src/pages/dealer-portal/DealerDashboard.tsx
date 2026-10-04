import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, subMonths } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FilePlus, FileText, Shield, ArrowRight, Users, Wrench, ChevronRight, TrendingUp, TrendingDown, AlertCircle, BookOpen, BarChart3, Headphones, RefreshCw, CheckCircle2 } from 'lucide-react';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { DealerDateFilter } from '@/components/dealer/DealerDateFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useDealerDashboard } from '@/hooks/useDealerDashboard';
import { monthChange, monthlyActivity } from '@/lib/dealerDashboardMetrics';

const routes = { Quotes: '/dealer-portal/quotes', Warranties: '/dealer-portal/warranties', Claims: '/dealer-portal/claims', Customers: '/dealer-portal/customers' };
const series = [
  { key: 'Quotes', label: 'Total quotes', icon: FileText, tone: 'bg-crm-blue-soft text-crm-blue', colour: 'hsl(var(--crm-blue))' },
  { key: 'Warranties', label: 'Active warranties', icon: Shield, tone: 'bg-crm-green-soft text-crm-green', colour: 'hsl(var(--crm-green))' },
  { key: 'Claims', label: 'Open claims', icon: AlertCircle, tone: 'bg-crm-orange-soft text-crm-orange', colour: 'hsl(var(--crm-orange))' },
  { key: 'Customers', label: 'Customers', icon: Users, tone: 'bg-crm-purple-soft text-crm-purple', colour: 'hsl(var(--crm-purple))' },
] as const;
const statusTone = (status: string) => ['paid', 'sent', 'quoted', 'completed'].includes(status.toLowerCase()) ? 'bg-crm-green-soft text-crm-green' : status.toLowerCase() === 'draft' ? 'bg-crm-blue-soft text-crm-blue' : 'bg-crm-amber-soft text-crm-amber';
const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

export default function DealerDashboard() {
  const { dealer } = useDealerAuth();
  const navigate = useNavigate();
  const [reg, setReg] = useState('');
  const [range, setRange] = useState<DateRange | undefined>(() => ({ from: startOfMonth(subMonths(new Date(), 5)), to: new Date() }));
  const { data, isPending, isError, refetch } = useDealerDashboard(dealer?.id);
  const quotes = data?.quotes || [];
  const customers = data?.customers || [];
  const warranties = data?.warranties || [];
  const claims = data?.claims || [];
  const active = warranties.filter(row => row.status.toLowerCase() === 'active');
  const openClaims = claims.filter(row => !['closed', 'declined', 'paid'].includes(row.status.toLowerCase()));
  const counts = { Quotes: quotes.length, Warranties: active.length, Claims: openClaims.length, Customers: customers.length };
  const events = data?.events || [];
  const chart = useMemo(() => {
    const earliest = data?.events.at(-1)?.date;
    return monthlyActivity(data?.events || [], range?.from || (earliest ? new Date(earliest) : startOfMonth(subMonths(new Date(), 5))), range?.to || new Date());
  }, [data, range]);
  const attention = [
    { title: 'Quotes awaiting action', detail: 'Saved drafts and pending quotes', count: quotes.filter(row => ['draft', 'pending'].includes(row.status.toLowerCase())).length, icon: FileText, tone: 'bg-crm-orange-soft text-crm-orange', to: routes.Quotes },
    { title: 'Claims need information', detail: 'Customer information required', count: claims.filter(row => row.status === 'information_required').length, icon: AlertCircle, tone: 'bg-crm-amber-soft text-crm-amber', to: routes.Claims },
    { title: 'Invoices outstanding', detail: 'Review balances and payment dates', count: warranties.filter(row => row.payment_status !== 'paid').length, icon: Shield, tone: 'bg-crm-red-soft text-crm-red', to: routes.Warranties },
  ];
  const actions = [
    { title: 'Start full quote', detail: 'Vehicle, customer & checkout', icon: FilePlus, to: '/dealer-portal/quote/vehicle', primary: true },
    { title: 'Quick quote', detail: 'Choose cover and get a price', icon: FileText, to: '/dealer-portal/quote/vehicle' },
    { title: 'View warranties', detail: 'Dealer-issued policies', icon: Shield, to: routes.Warranties },
    { title: 'Claims', detail: 'Submit & track claims', icon: Wrench, to: routes.Claims },
  ];
  const viewAll = (to: string) => <Button variant="link" className="h-auto gap-1 p-0 text-xs text-crm-orange" onClick={() => navigate(to)}>View all <ArrowRight className="h-3 w-3" /></Button>;
  const panel = 'crm-panel-shadow min-w-0 rounded-lg border border-crm-line bg-card';
  const placeholder = (text: string) => <p className="flex min-h-32 items-center justify-center px-4 text-center text-xs text-muted-foreground">{isPending ? 'Loading dealership activity…' : isError ? 'Activity is temporarily unavailable.' : text}</p>;

  return <DealerLayout>
    <div className="mx-auto max-w-[1500px] space-y-4">
      <section className="grid items-center gap-4 rounded-lg border border-crm-line bg-crm-orange-soft p-4 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold text-crm-orange">DEALER PORTAL</p>
          <h1 className="text-xl font-bold leading-tight lg:text-2xl">Welcome back{dealer?.name ? `, ${dealer.name.split(' ')[0]}` : ''}</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Get a quote, manage warranties, check claims and more — all in one place.</p>
        </div>
        <form className="min-w-0" onSubmit={event => { event.preventDefault(); const cleaned = reg.replace(/\s/g, '').toUpperCase(); if (cleaned) navigate(`/dealer-portal/quote/vehicle?reg=${encodeURIComponent(cleaned)}`); }}>
          <h2 className="mb-2 text-xs font-bold">Get a quote <span className="font-normal text-muted-foreground">— enter a vehicle registration to start</span></h2>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="vehicle-reg-plate vehicle-reg-plate--quote min-w-0">
              <span className="vehicle-reg-plate__country" aria-hidden="true">GB<span>UK</span></span>
              <Input value={reg} onChange={event => setReg(event.target.value.toUpperCase())} placeholder="ENTER REG" aria-label="Vehicle registration" maxLength={10} className="vehicle-reg-plate__input" />
            </div>
            <Button type="submit" className="h-14 gap-2 px-5 font-bold">Get quote <ArrowRight className="h-4 w-4" /></Button>
          </div>
          <Button variant="link" type="button" className="mt-2 h-auto gap-2 p-0 text-xs text-crm-orange" onClick={() => navigate('/dealer-portal/quote/vehicle')}>Or start a full quote <ArrowRight className="h-3 w-3" /></Button>
        </form>
      </section>

      {isError && <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-crm-line bg-card p-3 text-sm"><span>Dealership figures could not be loaded.</span><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></div>}
      <section aria-label="Dealership overview" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {series.map(item => {
          const change = monthChange(events.filter(event => event.series === item.key).map(event => event.date));
          const Trend = change !== null && change < 0 ? TrendingDown : TrendingUp;
          return <Button key={item.key} variant="outline" onClick={() => navigate(routes[item.key])} className={`${panel} h-auto justify-start gap-3 whitespace-normal p-3 text-left hover:border-crm-orange hover:bg-card sm:p-4`}>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${item.tone}`}><item.icon className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-normal text-muted-foreground">{item.label}</span><span className="block text-2xl font-bold leading-tight">{isPending || isError ? '—' : counts[item.key]}</span><span className="mt-1 block text-[10px] font-normal text-muted-foreground">{change !== null && <span className={change < 0 ? 'text-crm-red' : 'text-crm-green'}><Trend className="mr-1 inline h-3 w-3" />{change > 0 ? '+' : ''}{change}% </span>}{change === null ? 'This dealership' : 'vs last month'}</span></span>
            <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
          </Button>;
        })}
      </section>

      <section><h2 className="mb-2 text-sm font-bold">Quick actions</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map(action => <Button key={action.title} variant={action.primary ? 'default' : 'outline'} className={`h-[76px] justify-start gap-3 whitespace-normal p-3 text-left ${action.primary ? 'text-primary-foreground' : 'border-crm-line bg-card'}`} onClick={() => navigate(action.to)}>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${action.primary ? 'bg-primary-foreground/10' : 'bg-crm-orange-soft text-crm-orange'}`}><action.icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold">{action.title}</span><span className={`mt-1 block text-[11px] font-normal leading-snug ${action.primary ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{action.detail}</span></span><ChevronRight className="h-4 w-4 shrink-0" />
        </Button>)}
      </div></section>

      <section className="grid items-stretch gap-3 xl:grid-cols-[.95fr_1.35fr_1fr]">
        <div className={panel}><div className="flex items-center justify-between p-3"><h2 className="text-sm font-bold">Needs attention</h2>{viewAll(routes.Warranties)}</div>
          <div className="space-y-2 px-3 pb-3">{attention.map(item => <Button key={item.title} variant="outline" className="h-[62px] w-full justify-start gap-2 whitespace-normal border-crm-line px-2 text-left" onClick={() => navigate(item.to)}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${item.tone}`}><item.icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-bold">{item.title}</span><span className="block text-[10px] font-normal text-muted-foreground">{item.detail}</span></span><span className={`flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1 text-xs ${item.tone}`}>{isPending || isError ? '—' : item.count}</span><ChevronRight className="h-3 w-3 shrink-0" /></Button>)}
          {!isPending && !isError && attention.every(item => !item.count) && <p className="flex items-center gap-2 pt-1 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-crm-green" />You’re all up to date.</p>}</div>
        </div>
        <div className={panel}><div className="flex items-center justify-between p-3"><h2 className="text-sm font-bold">Recent quotes</h2>{viewAll(routes.Quotes)}</div>
          {quotes.length ? <div className="divide-y divide-crm-line px-3 pb-1">{quotes.slice(0, 5).map(quote => <Button key={quote.id} variant="ghost" className="h-auto w-full justify-start gap-2 whitespace-normal rounded-none px-0 py-2.5 text-left" onClick={() => navigate(`${routes.Quotes}?search=${encodeURIComponent(quote.vehicle_reg)}`)}>
            <span className="min-w-0 flex-1"><span className="block text-xs font-bold">{quote.vehicle_reg}</span><span className="block truncate text-[10px] font-normal text-muted-foreground">{[quote.vehicle_make, quote.vehicle_model].filter(Boolean).join(' ') || 'Vehicle details pending'}{quote.customer_name ? ` · ${quote.customer_name}` : ''}</span></span>
            <span className="text-right"><span className="block text-[11px] font-bold">{quote.dealer_price !== null || quote.price !== null ? money(quote.dealer_price ?? quote.price ?? 0) : 'Draft'}</span><span className="block text-[9px] font-normal text-muted-foreground">{format(new Date(quote.created_at), 'dd MMM yy')}</span></span><span className={`rounded px-1.5 py-1 text-[9px] font-semibold capitalize ${statusTone(quote.status)}`}>{quote.status}</span><ChevronRight className="h-3 w-3 shrink-0" />
          </Button>)}</div> : placeholder('Your recent quotes will appear here.')}
        </div>
        <div className={panel}><div className="flex items-center justify-between p-3"><h2 className="text-sm font-bold">Recent activity</h2></div>
          {events.length ? <div className="divide-y divide-crm-line px-3 pb-1">{events.slice(0, 5).map(event => { const item = series.find(item => item.key === event.series) || series[0]; return <Button variant="ghost" key={event.id} className="h-auto w-full justify-start gap-2 rounded-none px-0 py-2.5 text-left" onClick={() => navigate(event.to)}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.tone}`}><item.icon className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-bold">{event.title}</span><span className="block truncate text-[10px] font-normal text-muted-foreground">{event.detail}</span></span><span className="shrink-0 text-[9px] font-normal text-muted-foreground">{format(new Date(event.date), 'dd MMM')}</span></Button>; })}</div> : placeholder('New dealership activity will appear here.')}
        </div>
      </section>

      <section className={`${panel} p-4`}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-sm font-bold"><BarChart3 className="h-4 w-4" />{range?.from && range?.to ? 'Dealership activity' : 'Activity over time'}</h2><p className="mt-1 text-xs text-muted-foreground">Quotes, warranties, claims and customers</p></div><DealerDateFilter value={range} onChange={setRange} /></div>
        <div className="mb-3 flex flex-wrap gap-4">{series.map(item => <span key={item.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className={`h-2 w-2 rounded-full ${item.key === 'Quotes' ? 'bg-crm-blue' : item.key === 'Warranties' ? 'bg-crm-green' : item.key === 'Claims' ? 'bg-crm-orange' : 'bg-crm-purple'}`} />{item.key}</span>)}</div>
        <div className="h-[190px] w-full" aria-label="Monthly dealership activity chart">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={chart} barSize={12} margin={{ left: -24, right: 4, top: 5, bottom: 0 }}><CartesianGrid vertical={false} stroke="hsl(var(--crm-line))" /><XAxis dataKey="month" tickFormatter={value => format(new Date(`${value}-01T12:00:00Z`), chart.length > 12 ? 'MMM yy' : 'MMM')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--crm-line))', borderRadius: 6, fontSize: 12 }} labelFormatter={value => format(new Date(`${value}-01T12:00:00Z`), 'MMMM yyyy')} />{series.map(item => <Bar key={item.key} dataKey={item.key} fill={item.colour} radius={[3, 3, 0, 0]} isAnimationActive={false} />)}</BarChart></ResponsiveContainer>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg bg-crm-navy-soft p-4 text-primary-foreground"><Headphones className="h-7 w-7 shrink-0" /><div className="min-w-0 flex-1"><h2 className="text-sm font-bold !text-primary-foreground">Need support?</h2><p className="mt-0.5 text-xs !text-primary-foreground">Our UK team is here to help.</p></div><Button variant="outline" size="sm" className="shrink-0 border-crm-orange bg-transparent text-primary-foreground hover:bg-crm-orange hover:text-primary-foreground" asChild><a href="mailto:support@pandaprotect.co.uk">Contact support <ArrowRight className="ml-1 h-3 w-3" /></a></Button></div>
        <div className={`${panel} flex items-center gap-3 p-4`}><BookOpen className="h-7 w-7 shrink-0" /><div className="min-w-0 flex-1"><h2 className="text-sm font-bold">Helpful resources</h2><p className="mt-0.5 text-xs text-muted-foreground">Guides, FAQs and sales material.</p></div><Button variant="link" className="h-auto shrink-0 gap-1 p-0 text-xs text-crm-orange" onClick={() => navigate('/faq/traders/')}>View resources <ArrowRight className="h-3 w-3" /></Button></div>
      </section>
    </div>
  </DealerLayout>;
}
