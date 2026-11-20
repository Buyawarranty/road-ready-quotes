import { Check, Cog, Cpu, Fan, Fuel, Gauge, GitFork, ShieldCheck, Snowflake, Users, Wrench, Zap } from 'lucide-react';
import WhatsCoveredPanel from './WhatsCoveredPanel';

export default function PricingCoverageOverview() {
  const parts = [{ label: 'Engine', icon: Cog }, { label: 'Gearbox', icon: GitFork }, { label: 'Turbocharger', icon: Gauge }, { label: 'Clutch', icon: Cog }, { label: 'Electrical components', icon: Zap }, { label: 'ECU', icon: Cpu }, { label: 'Fuel system', icon: Fuel }, { label: 'Cooling system', icon: Fan }, { label: 'Steering', icon: Gauge }, { label: 'Suspension', icon: Wrench }, { label: 'Braking system', icon: Cog }, { label: 'Air conditioning', icon: Snowflake }, { label: 'Drive train', icon: GitFork }];
  return <>
    <section aria-label="Covered components" className="pricing-coverage">
      <div className="pricing-coverage-grid">
        <p className="text-xs leading-5 text-muted-foreground">Comprehensive cover for the key mechanical and electrical systems that keep your customer on the road.</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">{parts.map(({ label, icon: Icon }) => <span key={label} className="flex min-w-0 items-center gap-2 rounded-md border border-crm-line px-2 py-1.5 text-[11px] font-semibold leading-4"><Icon className="h-4 w-4 shrink-0" />{label}</span>)}</div>
        <ul className="space-y-2 text-xs font-semibold">{['Covered parts and labour', 'Cover subject to policy terms', 'Easy claims and fast payouts'].map(text => <li key={text} className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 text-crm-green" />{text}</li>)}</ul>
      </div>
      <WhatsCoveredPanel />
    </section>
    <section aria-label="Why dealers choose Panda Protect">
      <h2 className="mb-2 text-base font-bold">Why dealers choose Panda Protect</h2>
      <div className="grid gap-3 md:grid-cols-3">{[
        { icon: ShieldCheck, title: 'Fully comprehensive cover', text: 'Broad, market-leading cover across the key mechanical and electrical systems.' },
        { icon: Users, title: 'Exceptional customer service', text: 'We look after your customers with a friendly, knowledgeable UK team and clear, proactive communication.' },
        { icon: Zap, title: 'Less admin for your dealership', text: 'A simple, streamlined process from quote to claim, so you can focus on selling more vehicles.' },
      ].map(({ icon: Icon, title, text }) => <article key={title} className="flex items-start gap-3 rounded-lg border border-crm-line bg-card p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crm-orange-soft text-crm-orange"><Icon className="h-5 w-5" /></span><div><h3 className="text-xs font-extrabold uppercase">{title}</h3><p className="mt-1 text-xs leading-4 text-muted-foreground">{text}</p></div></article>)}</div>
    </section>
  </>;
}