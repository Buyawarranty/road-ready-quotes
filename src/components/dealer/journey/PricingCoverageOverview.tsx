import { Camera, Cog, Cpu, Fan, Fuel, Gauge, GitFork, Monitor, Navigation, Radio, ShieldCheck, Snowflake, Wrench, Zap } from 'lucide-react';
import WhatsCoveredPanel from './WhatsCoveredPanel';

export default function PricingCoverageOverview() {
  const parts = [{ label: 'Engine', icon: Cog }, { label: 'Gearbox', icon: GitFork }, { label: 'Turbocharger', icon: Gauge }, { label: 'Clutch', icon: Cog }, { label: 'Electrical components', icon: Zap }, { label: 'ECU', icon: Cpu }, { label: 'Fuel system', icon: Fuel }, { label: 'Cooling system', icon: Fan }, { label: 'Steering', icon: Gauge }, { label: 'Suspension', icon: Wrench }, { label: 'Braking system', icon: Cog }, { label: 'Air conditioning', icon: Snowflake }, { label: 'Drive train', icon: GitFork }, { label: 'Factory-fitted entertainment & audio', icon: Radio }, { label: 'Touchscreens & digital displays', icon: Monitor }, { label: 'Satellite navigation', icon: Navigation }, { label: 'Parking sensors & reversing cameras', icon: Camera }, { label: 'Driver-assistance systems', icon: ShieldCheck }];
  return <>
    <section aria-label="Covered components">
      <WhatsCoveredPanel coveredParts={<><p className="mt-2 text-sm leading-5">For petrol, diesel, hybrid (including plug-in hybrid) and electric vehicles (EVs). Covered components depend on the vehicle type, eligibility and policy terms.</p><div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">{parts.map(({ label, icon: Icon }) => <span key={label} className="flex min-w-0 items-center gap-2 rounded-md border border-crm-line px-2 py-1.5 text-[11px] font-semibold leading-4"><Icon className="h-4 w-4 shrink-0" />{label}</span>)}</div></>} />
    </section>
    <section aria-label="Why dealers choose Panda Protect">
      <h2 className="mb-4 text-base font-bold">Why dealers choose Panda Protect</h2>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-5">{[
        { title: 'Fully comprehensive cover', text: 'Broad, market-leading cover across the key mechanical and electrical systems.' },
        { title: 'Exceptional customer service', text: 'We look after your customers with a friendly, knowledgeable UK team and clear, proactive communication.' },
        { title: 'Less admin for your dealership', text: 'A simple, streamlined process from quote to claim, so you can focus on selling more vehicles.' },
      ].map(({ title, text }) => <li key={title}><strong className="font-semibold">{title}</strong><span className="text-muted-foreground"> — {text}</span></li>)}</ul>
    </section>
  </>;
}