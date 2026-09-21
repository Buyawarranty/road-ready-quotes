import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import supportPanda from '@/assets/contact-support-panda.png.asset.json';
import {
  FilePlus,
  FileText,
  Shield,
  ArrowRight,
  Users,
  Wrench,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Settings2,
  BookOpen,
  BarChart3,
  Send,
} from 'lucide-react';

const recentQuotes = [
  { customer: 'Prajwal Chauhan', reg: 'S17DRW', vehicle: 'Land Rover Discovery', price: '£141.60', status: 'Pending', date: '22/08/2026' },
  { customer: 'Sarah Khan', reg: 'SJ17DRW', vehicle: 'Renault Clio', price: '£14.40', status: 'Pending', date: '22/08/2026' },
  { customer: 'Michael Roberts', reg: 'GV70ABC', vehicle: 'BMW 3 Series', price: '£199.00', status: 'Draft', date: '21/08/2026' },
  { customer: 'James Wilson', reg: 'NL21KZE', vehicle: 'Audi Q5', price: '£185.00', status: 'Sent', date: '20/08/2026' },
  { customer: 'Emma Taylor', reg: 'BD22XYZ', vehicle: 'Volkswagen Golf', price: '£122.00', status: 'Expired', date: '18/08/2026' },
];

const statusStyles: Record<string, string> = {
  Pending: 'bg-crm-amber-soft text-crm-amber',
  Draft: 'bg-crm-blue-soft text-crm-blue',
  Sent: 'bg-crm-green-soft text-crm-green',
  Expired: 'bg-crm-red-soft text-crm-red',
};

const sparkHeights = ['h-[28%]', 'h-[40%]', 'h-[52%]', 'h-[65%]', 'h-[78%]', 'h-[94%]'];
const sparkOpacity = ['opacity-40', 'opacity-50', 'opacity-60', 'opacity-70', 'opacity-80', 'opacity-100'];

const DealerDashboard = () => {
  const { dealer } = useDealerAuth();
  const navigate = useNavigate();
  const [reg, setReg] = useState('');

  const handleRegSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = reg.trim().toUpperCase();
    if (!cleaned) return;
    navigate(`/dealer-portal/quote/vehicle?reg=${encodeURIComponent(cleaned)}`);
  };

  const quickActions = [
    {
      label: 'Start full quote',
      desc: 'Guided vehicle, customer & checkout flow',
      icon: FilePlus,
      onClick: () => navigate('/dealer-portal/quote/vehicle'),
      tone: 'primary' as const,
    },
    {
      label: 'Quick quote',
      desc: 'Fast price without saving a customer',
      icon: FilePlus,
      onClick: () => navigate('/dealer-portal/quote/vehicle'),
    },
    {
      label: 'View quotes',
      desc: 'All saved & sent quotes',
      icon: FileText,
      onClick: () => navigate('/dealer-portal/quotes'),
    },
    {
      label: 'View warranties',
      desc: 'Active dealer-issued policies',
      icon: Shield,
      onClick: () => navigate('/dealer-portal/warranties'),
    },
    { label: 'Customers', desc: 'Manage your customer base', icon: Users, onClick: () => navigate('/dealer-portal/customers') },
    { label: 'Claims', desc: 'Submit & track claims', icon: Wrench, onClick: () => navigate('/dealer-portal/coming-soon?section=claims') },
  ];

  const kpis = [
    { label: 'Total Quotes', value: '128', change: '+24%', icon: FileText, tone: 'blue' },
    { label: 'Active Warranties', value: '97', change: '+18%', icon: Shield, tone: 'green' },
    { label: 'Open Claims', value: '6', change: '+25%', icon: AlertCircle, tone: 'orange' },
    { label: 'Customers', value: '84', change: '+32%', icon: Users, tone: 'purple' },
  ] as const;

  const toneStyles = {
    blue: 'bg-crm-blue-soft text-crm-blue',
    green: 'bg-crm-green-soft text-crm-green',
    orange: 'bg-crm-orange-soft text-crm-orange',
    purple: 'bg-crm-purple-soft text-crm-purple',
  };

  const attention = [
    { title: '3 pending quotes', description: 'Quotes awaiting action', count: '3', icon: FileText, style: 'bg-crm-orange-soft text-crm-orange', to: '/dealer-portal/quotes' },
    { title: '2 claims need information', description: 'Customer information required', count: '2', icon: AlertCircle, style: 'bg-crm-amber-soft text-crm-amber', to: '/dealer-portal/coming-soon?section=claims' },
    { title: '5 warranties expiring soon', description: 'Within the next 30 days', count: '5', icon: Shield, style: 'bg-crm-amber-soft text-crm-amber', to: '/dealer-portal/warranties' },
    { title: '1 document missing', description: 'Customer document required', count: '1', icon: FileText, style: 'bg-crm-red-soft text-crm-red', to: '/dealer-portal/coming-soon?section=documents' },
  ];

  const activities = [
    { title: 'Quote created', detail: 'Audi Q5 · B11CSD', time: '2 mins ago', icon: FileText, style: 'bg-crm-orange-soft text-crm-orange' },
    { title: 'Warranty issued', detail: 'Riverside Motors', time: '18 mins ago', icon: Shield, style: 'bg-crm-green-soft text-crm-green' },
    { title: 'New customer', detail: 'Sarah Khan', time: '1 hour ago', icon: Users, style: 'bg-crm-blue-soft text-crm-blue' },
    { title: 'Claim submitted', detail: 'Ford Kuga', time: '3 hours ago', icon: Wrench, style: 'bg-crm-orange-soft text-crm-orange' },
    { title: 'Document sent', detail: 'Policy schedule', time: '5 hours ago', icon: Send, style: 'bg-muted text-muted-foreground' },
  ];

  const performance = [
    { value: '128', label: 'Quotes', colour: 'bg-crm-blue' },
    { value: '97', label: 'Warranties', colour: 'bg-crm-green' },
    { value: '6', label: 'Claims', colour: 'bg-crm-orange' },
    { value: '84', label: 'Customers', colour: 'bg-crm-purple' },
  ];

  return (
    <DealerLayout>
      <div className="mx-auto max-w-[1500px] space-y-3">
        <Card className="crm-panel-shadow overflow-hidden border-crm-line bg-crm-orange-soft">
          <CardContent className="p-0">
            <div className="grid min-h-[150px] lg:grid-cols-[minmax(0,1fr)_390px]">
              <div className="relative p-5 sm:p-7">
                <p className="mb-1 text-[11px] font-bold tracking-[0.16em] text-crm-orange">DEALER PORTAL</p>
                <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Welcome back, {dealer?.name?.split(' ')[0] || 'Prajwal'}</h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Let's keep your dealership moving. Get a quote, manage warranties, check claims and more — all in one place.
                </p>
                <p className="mt-3 hidden text-sm font-semibold italic text-foreground/70 sm:block">Stronger dealerships together.</p>
              </div>
              <div className="flex items-center border-t border-crm-line bg-card/90 p-4 lg:border-l lg:border-t-0">
                <form onSubmit={handleRegSubmit} className="w-full rounded-md border border-crm-line bg-card p-4 crm-panel-shadow">
                  <h2 className="text-sm font-bold">Get a quote</h2>
                  <p className="mb-3 text-xs text-muted-foreground">Enter a vehicle registration to start</p>
                  <div className="flex gap-2">
                    <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border-2 border-crm-amber bg-crm-amber-soft">
                      <span className="flex w-9 items-center justify-center bg-crm-blue text-[10px] font-bold text-primary-foreground">GB</span>
                      <Input value={reg} onChange={(event) => setReg(event.target.value.toUpperCase())} placeholder="ENTER REG" aria-label="Vehicle registration" maxLength={10} className="h-10 min-w-0 border-0 bg-transparent text-center text-sm font-black tracking-widest focus-visible:ring-0" />
                    </div>
                    <Button type="submit" className="h-10 shrink-0 px-4">Get quote <ArrowRight className="ml-1 h-4 w-4" /></Button>
                  </div>
                  <Button type="button" variant="link" size="sm" className="mt-1 h-auto px-0 text-xs text-crm-orange" onClick={() => navigate('/dealer-portal/quote/vehicle')}>Or start a full quote <ArrowRight className="ml-1 h-3 w-3" /></Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label} className="crm-panel-shadow cursor-pointer border-crm-line transition-transform hover:-translate-y-0.5" onClick={() => navigate(kpi.label === 'Customers' ? '/dealer-portal/customers' : kpi.label === 'Active Warranties' ? '/dealer-portal/warranties' : kpi.label === 'Open Claims' ? '/dealer-portal/coming-soon?section=claims' : '/dealer-portal/quotes')}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-md ${toneStyles[kpi.tone]}`}><Icon className="h-6 w-6" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-bold leading-none">{kpi.value}</p>
                    <p className={`mt-1 text-xs font-bold ${kpi.tone === 'orange' ? 'text-crm-orange' : 'text-crm-green'}`}><TrendingUp className="mr-1 inline h-3.5 w-3.5" />{kpi.change} <span className="font-normal text-muted-foreground">vs last month</span></p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div>
          <div className="mb-2 flex items-end justify-between">
            <div>
              <h2 className="text-base font-bold">Quick actions</h2>
              <p className="text-xs text-muted-foreground">Everything you need to manage your dealership, in one place.</p>
            </div>
            <Button variant="outline" size="sm" className="hidden gap-1.5 sm:flex"><Settings2 className="h-3.5 w-3.5" /> Customise</Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
            {quickActions.map((a) => {
              const Icon = a.icon;
              const isPrimary = a.tone === 'primary';
              return (
                <Button
                  variant="outline"
                  key={a.label}
                  onClick={a.onClick}
                  className={`group h-[76px] justify-start gap-3 whitespace-normal rounded-md p-3 text-left transition-all hover:-translate-y-0.5 ${
                    isPrimary
                      ? 'border-crm-orange bg-crm-orange text-primary-foreground hover:bg-crm-orange/90 hover:text-primary-foreground'
                      : 'border-crm-line bg-card hover:border-crm-orange hover:bg-card'
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${isPrimary ? 'bg-primary-foreground/18' : 'bg-crm-orange-soft text-crm-orange'}`}><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold">{a.label}</span>
                    <span className={`mt-0.5 block text-[10px] leading-tight ${isPrimary ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{a.desc}</span>
                  </span>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${isPrimary ? 'text-primary-foreground' : 'text-crm-orange'}`} />
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[0.92fr_1.25fr_0.72fr]">
          <Card className="crm-panel-shadow border-crm-line">
            <CardContent className="p-3">
              <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold">Needs attention</h2><Button variant="link" size="sm" className="h-auto px-0 text-xs text-crm-orange" onClick={() => navigate('/dealer-portal/quotes')}>View all <ArrowRight className="ml-1 h-3 w-3" /></Button></div>
              <div className="space-y-1.5">
                {attention.map((item) => { const Icon = item.icon; return (
                  <Button key={item.title} variant="outline" className="h-[58px] w-full justify-start gap-2 border-crm-line px-2.5 text-left" onClick={() => navigate(item.to)}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${item.style}`}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{item.title}</span><span className="block truncate text-[10px] font-normal text-muted-foreground">{item.description}</span></span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.style}`}>{item.count}</span><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                ); })}
              </div>
            </CardContent>
          </Card>

          <Card className="crm-panel-shadow min-w-0 border-crm-line">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-3 py-3"><h2 className="text-sm font-bold">Recent quotes</h2><Button variant="link" size="sm" className="h-auto px-0 text-xs text-crm-orange" onClick={() => navigate('/dealer-portal/quotes')}>View all <ArrowRight className="ml-1 h-3 w-3" /></Button></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[10px]">
                  <thead className="border-y border-crm-line bg-muted/40 text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Customer</th><th className="px-2 py-2 font-medium">Vehicle</th><th className="px-2 py-2 font-medium">Price</th><th className="px-2 py-2 font-medium">Status</th><th className="px-2 py-2 font-medium">Date</th><th className="w-6" /></tr></thead>
                  <tbody>{recentQuotes.map((quote) => (
                    <tr key={`${quote.customer}-${quote.reg}`} className="cursor-pointer border-b border-crm-line last:border-0 hover:bg-muted/50" onClick={() => navigate(`/dealer-portal/quotes?search=${quote.reg}`)}>
                      <td className="px-3 py-2 font-semibold">{quote.customer}</td><td className="px-2 py-2"><span className="block font-medium">{quote.reg}</span><span className="block text-muted-foreground">{quote.vehicle}</span></td><td className="px-2 py-2">{quote.price}</td><td className="px-2 py-2"><span className={`rounded-full px-2 py-1 font-semibold ${statusStyles[quote.status]}`}>{quote.status}</span></td><td className="px-2 py-2 text-muted-foreground">{quote.date}</td><td><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="crm-panel-shadow border-crm-line">
            <CardContent className="p-3">
              <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold">Recent activity</h2><Button variant="link" size="sm" className="h-auto px-0 text-xs text-crm-orange" onClick={() => navigate('/dealer-portal/quotes')}>View all <ArrowRight className="ml-1 h-3 w-3" /></Button></div>
              <div>{activities.map((item, index) => { const Icon = item.icon; return (
                <div key={item.title} className={`flex items-center gap-2 py-2 ${index < activities.length - 1 ? 'border-b border-crm-line' : ''}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.style}`}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold">{item.title}</span><span className="block truncate text-[10px] text-muted-foreground">{item.detail}</span></span><span className="whitespace-nowrap text-[9px] text-muted-foreground">{item.time}</span>
                </div>
              ); })}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px_240px]">
          <Card className="crm-panel-shadow border-crm-line">
            <CardContent className="p-3">
              <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-sm font-bold"><BarChart3 className="h-4 w-4" /> Your dealership performance</h2><p className="text-[10px] text-muted-foreground">A quick look at your activity over the last 6 months.</p></div><select aria-label="Performance period" className="h-8 rounded-md border border-input bg-card px-2 text-[10px]"><option>Last 6 months</option></select></div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{performance.map((metric) => (
                <div key={metric.label} className="flex items-end justify-between rounded-md border border-crm-line p-2"><div><p className="text-lg font-bold leading-none">{metric.value}</p><p className="mt-1 text-[10px] text-muted-foreground">{metric.label}</p></div><div className="flex h-8 items-end gap-1">{sparkHeights.map((height, index) => <span key={height} className={`w-1.5 rounded-t-sm ${metric.colour} ${height} ${sparkOpacity[index]}`} />)}</div></div>
              ))}</div>
            </CardContent>
          </Card>

          <Card className="crm-panel-shadow overflow-hidden border-crm-line bg-[#284185]">
            <CardContent className="flex h-full items-center gap-3 p-3">
              <img src={supportPanda.url} alt="Panda Protect support mascot" className="h-20 w-20 shrink-0 object-contain" />
              <div><h2 className="text-sm font-bold text-white">Need support?</h2><p className="mb-2 text-[10px] text-white/90">Our UK team is here to help.</p><Button variant="outline" size="sm" asChild className="h-8 border-white text-[10px] text-white hover:bg-white/10 hover:text-white"><a href="mailto:hello@pandaprotect.co.uk">Contact dealer support →</a></Button></div>
            </CardContent>
          </Card>

          <Card className="crm-panel-shadow border-crm-line">
            <CardContent className="flex h-full items-center gap-3 p-4">
              <BookOpen className="h-8 w-8 shrink-0 text-crm-navy" />
              <div><h2 className="text-sm font-bold">Helpful resources</h2><p className="mb-2 text-[10px] text-muted-foreground">Guides, FAQs and sales material.</p><Button variant="link" size="sm" className="h-auto px-0 text-xs text-crm-orange" onClick={() => navigate('/faq/traders/')}>View resources <ArrowRight className="ml-1 h-3 w-3" /></Button></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DealerLayout>
  );
};

export default DealerDashboard;
