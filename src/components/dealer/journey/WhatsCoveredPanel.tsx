import React from 'react';
import { Check, ChevronDown, Download, FileText } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import platinumPlanDoc from '@/assets/panda-protect-platinum-warranty-plan.pdf.asset.json';
import termsDoc from '@/assets/panda-protect-terms-and-conditions.pdf.asset.json';

/** Shared "What's covered?" drop-down for the dealer pricing page and the customer view. Prints expanded. */
const WhatsCoveredPanel: React.FC<{ audience?: 'dealer' | 'customer'; coveredParts?: React.ReactNode }> = ({ audience = 'dealer', coveredParts }) => (
    <Collapsible className="rounded-xl border border-crm-line bg-card">
    <CollapsibleTrigger className="group flex w-full items-center gap-3 p-3 text-left font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-orange"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"><FileText className="h-5 w-5" /></span><span className="flex-1 text-base">What's covered?</span><ChevronDown className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180" /></CollapsibleTrigger>
    <CollapsibleContent forceMount className="data-[state=closed]:hidden print:!block overflow-hidden px-4 pb-4 text-sm text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"><p className="font-bold text-crm-navy">Parts and labour covered</p>
      {coveredParts ?? <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">{['Engine internals', 'Gearbox (manual and automatic)', 'Turbo and supercharger', 'Electrical systems and ECUs', 'Steering', 'Cooling system', 'Clutch system', 'Fuel system', 'Air conditioning', 'Braking system (ABS, servo, callipers)', 'Heating and ventilation', 'Suspension', 'Drive system', 'Safety systems'].map(i => <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-crm-green-deep" />{i}</li>)}</ul>}
      <p className="mt-4 font-bold text-crm-navy">What the warranty is designed for</p>
      <p className="mt-1">Mechanical and electrical failures. It is not designed for pre-existing faults, routine servicing, tyres, brake pads and wear items, accident damage, trader-owned vehicles, or hire and reward use (taxis, rentals, couriers).</p>
      <p className="mt-4 font-bold text-crm-navy">Download the documents</p>
      <p className="mt-1">{audience === 'customer' ? 'The latest versions, in full, so you can check every detail of your cover.' : 'The latest versions, in full, so you can check every detail before you sell.'}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <a href={platinumPlanDoc.url} download="Panda-Protect-Platinum-Warranty-Plan.pdf" className="flex items-center gap-3 rounded-xl border border-crm-orange/30 bg-crm-orange-soft px-4 py-3 transition-colors hover:border-crm-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-orange">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crm-orange"><Check className="h-4 w-4 text-white" /></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm font-extrabold text-crm-navy">Platinum Warranty Cover (PDF)</strong><span className="block text-xs text-muted-foreground">50 pages &middot; what we cover</span></span>
          <Download className="h-4 w-4 shrink-0 text-crm-navy" />
        </a>
        <a href={termsDoc.url} download="Panda-Protect-Terms-and-Conditions.pdf" className="flex items-center gap-3 rounded-xl border border-crm-green/30 bg-crm-green-soft px-4 py-3 transition-colors hover:border-crm-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-green">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crm-green"><Check className="h-4 w-4 text-white" /></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm font-extrabold text-crm-navy">Terms &amp; Conditions (PDF)</strong><span className="block text-xs text-muted-foreground">29 pages &middot; full terms and exclusions</span></span>
          <Download className="h-4 w-4 shrink-0 text-crm-navy" />
        </a>
      </div>
      <a href="/what-is-covered/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-semibold text-crm-navy underline">Read the terms online</a></CollapsibleContent>
  </Collapsible>
);

export default WhatsCoveredPanel;
