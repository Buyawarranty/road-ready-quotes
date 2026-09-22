import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight,
  ArrowDown,
  Check,
  X,
  ChevronDown,
  FileText,
  Phone,
  Mail,
  MessageCircle,
  Wrench,
  Cog,
  Settings2,
  Fan,
  Cpu,
  Navigation,
  Snowflake,
  Disc3,
  Fuel,
  Thermometer,
  MonitorSmartphone,
  Waves,
  CircleDot,
  ShieldCheck,
  Sparkles,
  Lightbulb,
  Star,
} from 'lucide-react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/OptimizedImage';
import TrustpilotSliderWidget from '@/components/TrustpilotSliderWidget';
import pandaClaimHero from '@/assets/panda-claim-hero.webp';

const PLATINUM_PDF = '/Platinum-Warranty-Plan-v2.4.pdf';
const TANDC_PDF = '/Terms-and-Conditions-v2.3.pdf';
const WHATSAPP_URL = 'https://wa.me/message/SPQPJ6O3UBF5B1';

/* ---------- Vehicle-type accordions ---------- */

const VEHICLE_ACCORDIONS: { title: string; bar: string; text: string; body: React.ReactNode }[] = [
  {
    title: 'Petrol & Diesel Vehicles',
    bar: 'bg-slate-800',
    text: 'text-white',
    body: 'Complete mechanical and electrical cover for petrol and diesel cars — engine, gearbox, turbo, fuel system, cooling, steering, electrics and more. Parts and labour included, paid directly to your garage.',
  },
  {
    title: 'Hybrid & PHEV Vehicles',
    bar: 'bg-slate-600',
    text: 'text-white',
    body: 'Everything included for petrol and diesel vehicles, plus hybrid battery management systems, power electronics, inverters and electric drive components.',
  },
  {
    title: 'Electric Vehicles (EVs)',
    bar: 'bg-orange-500',
    text: 'text-white',
    body: 'Cover for the EV drive unit, high-voltage battery management system, onboard charger, charging connection and thermal management — plus all standard electrical systems.',
  },
  {
    title: 'Motorcycles (Petrol, Hybrid, EV)',
    bar: 'bg-green-600',
    text: 'text-white',
    body: 'Engine, gearbox, electrical and fuel system cover for petrol, hybrid and electric motorcycles — built for the way bikes are ridden.',
  },
  {
    title: "What's not covered",
    bar: 'bg-red-100',
    text: 'text-red-800',
    body: 'Routine servicing and consumables (tyres, brake pads, etc.), accidental or cosmetic damage, pre-existing faults, negligence or lack of servicing, modifications that affect covered parts, hire or reward use, and flood, fire, theft or weather damage.',
  },
  {
    title: 'Modifications and Your Cover',
    bar: 'bg-amber-100',
    text: 'text-amber-800',
    body: 'Standard modifications that do not affect covered components are fine. If a modification affects a part we cover, that part may not be claimable — check with us before you buy and we will confirm exactly what is included.',
  },
  {
    title: 'Exclusions: High-Performance Cars',
    bar: 'bg-blue-100',
    text: 'text-blue-800',
    body: 'High-performance and track-use cars sit outside standard cover. Contact us and we will confirm whether your vehicle can be covered under a specialist policy.',
  },
];

/* ---------- Coverage cards ---------- */

const COVERAGE_CARDS = [
  { icon: Cog, title: 'Engine', body: 'All internal engine components including pistons, crankshaft, camshaft, oil pump, and cylinder head.' },
  { icon: Settings2, title: 'Gearbox', body: 'Manual or automatic. All internal gearbox components, torque convertor and selector forks.' },
  { icon: Fan, title: 'Turbo & Supercharger', body: 'Turbocharger assembly, wastegate, intercooler and supercharger components covered.' },
  { icon: Cpu, title: 'Electrical Systems & ECUs', body: 'Engine control units, body control modules, and major electrical management systems.' },
  { icon: Navigation, title: 'Steering', body: 'Power steering pump, rack and pinion, steering column and electric power steering motor.' },
  { icon: Snowflake, title: 'Cooling System', body: 'Water pump, radiator, thermostat, cooling fan and coolant hoses included.' },
  { icon: Disc3, title: 'Clutch System', body: 'Clutch plate, pressure plate, release bearing, and flywheel. Full clutch assembly covered.' },
  { icon: Fuel, title: 'Fuel System', body: 'Fuel pump, injectors, fuel pressure regulator and fuel rail covered in full.' },
  { icon: Fan, title: 'Air Conditioning', body: 'Compressor, condenser, evaporator, expansion valve, and receiver drier all included.' },
  { icon: CircleDot, title: 'Braking System', body: 'ABS module, brake servo, master cylinder, and brake callipers fully protected.' },
  { icon: Thermometer, title: 'Heating & Ventilation', body: 'Heater matrix, blower motor, temperature control module and associated parts.' },
  { icon: MonitorSmartphone, title: 'Infotainment & Cameras', body: 'Touchscreen, navigation unit, parking sensors, and reversing camera systems.' },
  { icon: Waves, title: 'Suspension', body: 'Shock absorbers, struts, control arms, ball joints, and suspension bushes covered.' },
  { icon: Cog, title: 'Drive System', body: 'Driveshafts, CV joints, differential, prop shaft and transfer box components.' },
  { icon: ShieldCheck, title: 'Safety Systems', body: 'Airbag control module, seatbelt pre-tensioners, traction and stability control units.' },
  { icon: Sparkles, title: 'Everything Else', body: "If it's essential to the smooth and safe running of your vehicle, it's normally covered." },
];

/* ---------- At a glance ---------- */

const COVERED_ITEMS = [
  'Mechanical failure from normal use',
  'Electrical & ECU faults',
  'Parts AND labour costs',
  'Diagnostic fees',
  'VAT on covered repairs',
  'Approved garage of your choice',
  'Hybrid & EV battery management',
  'Turbo and supercharger failure',
];

const NOT_COVERED_ITEMS = [
  'Routine servicing and consumable items (tyres, brake pads, etc.)',
  'Accidental or cosmetic damage',
  'Pre-existing faults at purchase',
  'Negligence or lack of servicing',
  'Modifications that affect covered parts',
  'High-performance / track cars',
  'Vehicles used for hire or reward',
  'Flood, fire, theft or weather damage',
];

/* ---------- Protection levels ---------- */

const PROTECTION_LEVELS = [
  { price: '£1,000', label: 'Light cover' },
  { price: '£2,000', label: 'Popular choice' },
  { price: '£3,000', label: 'Best protection', badge: 'Recommended', selected: true },
  { price: '£5,000', label: 'Maximum cover' },
];

/* ---------- Repair costs ---------- */

const REPAIR_EXAMPLES = [
  { icon: '🔧', title: 'Engine Repair', body: 'Head gasket, piston rings, crankshaft bearings & more', cost: '£1,000–£4,000' },
  { icon: '⚙️', title: 'Gearbox Repair', body: 'Synchromesh, selectors, automatic valve body', cost: '£500–£3,000' },
  { icon: '💨', title: 'Turbo Failure', body: 'Full turbocharger replacement including labour', cost: '£700–£2,500' },
  { icon: '🖥️', title: 'ECU / Control Module', body: 'Engine, body, or transmission ECU replacement', cost: '£400–£1,800' },
];

/* ---------- FAQs ---------- */

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is £1,000, £2,000, £3,000 or £5,000 the right claim limit for me?',
    a: 'Most repairs cost £700 to £1,500, so every limit protects you day to day. Engine and gearbox repairs can run to £3,000 or more, so £3,000 is the best all-round protection — and £5,000 gives maximum peace of mind.',
  },
  {
    q: 'What if a repair costs more than my limit?',
    a: 'We pay up to your claim limit and you cover the difference. If you want more protection, you can upgrade your claim limit before a repair happens.',
  },
  {
    q: 'What is an approved claim?',
    a: 'An approved claim is a failure of a covered mechanical or electrical part, diagnosed by your garage and authorised by our claims team. Once approved, we pay the repairer directly.',
  },
  {
    q: 'Are diagnostics and labour included?',
    a: 'Yes. Diagnostic fees, parts and labour are all included on approved claims — you are never asked to pay the garage and claim it back.',
  },
  {
    q: 'Can I use my own garage?',
    a: 'Yes. Use any approved garage of your choice across the UK. We pay them directly so you are never out of pocket.',
  },
  {
    q: 'When does my cover start?',
    a: 'Your cover starts as soon as your policy is issued — your exact start date is shown on your warranty documents.',
  },
];

const FAQ_BAR_CLASSES = [
  'bg-orange-500',
  'bg-orange-500',
  'bg-orange-500',
  'bg-orange-500',
  'bg-orange-500',
  'bg-orange-500',
];

const SectionKicker: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500 mb-3">{children}</p>
);

const WhatsCovered: React.FC = () => {
  const [openVehicle, setOpenVehicle] = useState<number | null>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const canonical = 'https://pandaprotect.co.uk/what-is-covered/';

  return (
    <>
      <Helmet>
        <title>What's Covered | Panda Protect Complete Coverage Guide</title>
        <meta
          name="description"
          content="Know exactly what's covered and what we pay. Full mechanical and electrical warranty cover for petrol, diesel, hybrid, EV and motorcycle — parts and labour included, paid directly to your garage."
        />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content="What's Covered | Panda Protect Complete Coverage Guide" />
        <meta
          property="og:description"
          content="Full mechanical and electrical warranty cover — parts and labour included, paid directly to your garage."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        })}</script>
      </Helmet>

      <DealerPublicHeader />

      <main className="bg-background min-h-screen">
        {/* ================= HERO ================= */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 py-14 sm:py-20 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-5">
                <ShieldBadge />
                Complete Coverage Guide
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground mb-5 leading-tight">
                Know exactly what&apos;s covered{' '}
                <span className="text-orange-500">and what we pay.</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
                Protect against costly mechanical and electrical failures. We pay your garage
                directly so you are never out of pocket. Parts and labour included.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="bg-[#eb4b00] hover:bg-[#d63f00] text-white font-semibold text-base">
                  <Link to="/#hero-reg">
                    Get my free quote
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-base font-semibold">
                  <a href="#coverage">
                    See what&apos;s covered
                    <ArrowDown className="ml-2 h-5 w-5" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <OptimizedImage
                src={pandaClaimHero}
                alt="Car with the bonnet open during a warranty repair, with an approved claim card showing parts and labour covered"
                priority
                width={1200}
                height={800}
                sizes="(max-width: 640px) 20rem, (max-width: 1024px) 28rem, 36rem"
                className="w-full max-w-md sm:max-w-lg lg:max-w-xl h-auto rounded-2xl"
              />
            </div>
          </div>
        </section>

        {/* ================= FULL COVERAGE INTRO ================= */}
        <section className="py-14 sm:py-16 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-3">
              Full coverage with no small print
            </h2>
            <p className="text-muted-foreground text-lg mb-6">
              Select your vehicle type to view everything that&apos;s covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <a
                href={PLATINUM_PDF}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors"
              >
                <FileText className="h-4 w-4" />
                Platinum Warranty Cover (PDF)
              </a>
              <a
                href={TANDC_PDF}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white border border-green-600 text-green-700 hover:bg-green-50 px-5 py-2.5 text-sm font-semibold transition-colors"
              >
                <FileText className="h-4 w-4" />
                Terms &amp; Conditions (PDF)
              </a>
            </div>

            {/* Vehicle type accordions */}
            <div className="space-y-3 text-left">
              {VEHICLE_ACCORDIONS.map((item, idx) => {
                const open = openVehicle === idx;
                return (
                  <div
                    key={item.title}
                    className={`rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${item.bar}`}
                  >
                    <button
                      onClick={() => setOpenVehicle(open ? null : idx)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                      aria-expanded={open}
                    >
                      <span className={`font-semibold pr-2 ${item.text}`}>{item.title}</span>
                      <ChevronDown
                        className={`h-5 w-5 flex-shrink-0 ${item.text} transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-out ${
                        open ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="px-5 pb-5 pt-4 text-slate-700 leading-relaxed bg-white border-t border-slate-100">
                        {item.body}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= COVERAGE GRID ================= */}
        <section id="coverage" className="py-16 sm:py-20 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionKicker>Coverage</SectionKicker>
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-3">
              What your warranty actually covers
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mb-10">
              All major mechanical and electrical parts needed to keep your car running, covered
              when they fail.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {COVERAGE_CARDS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-card border rounded-xl p-5 hover:shadow-lg transition-shadow">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
              <Button asChild size="lg" className="bg-[#eb4b00] hover:bg-[#d63f00] text-white font-semibold">
                <a href={PLATINUM_PDF} target="_blank" rel="noopener">
                  <FileText className="mr-2 h-5 w-5" />
                  Download full Platinum coverage (PDF)
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="font-semibold">
                <a href={TANDC_PDF} target="_blank" rel="noopener">
                  <FileText className="mr-2 h-5 w-5" />
                  View full Terms &amp; Conditions (PDF)
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* ================= AT A GLANCE ================= */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionKicker>At a glance</SectionKicker>
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-3">
              What we cover and what we don&apos;t
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mb-10">
              A clear, side-by-side list so you know exactly what your policy includes before you
              buy.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 sm:p-8">
                <h3 className="inline-flex items-center gap-2 bg-green-600 text-white font-semibold rounded-full px-4 py-1.5 mb-6 text-sm">
                  <Check className="h-4 w-4" />
                  Covered
                </h3>
                <ul className="space-y-3">
                  {COVERED_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 h-5 w-5 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-foreground/90 text-sm sm:text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 sm:p-8">
                <h3 className="inline-flex items-center gap-2 bg-red-500 text-white font-semibold rounded-full px-4 py-1.5 mb-6 text-sm">
                  <X className="h-4 w-4" />
                  Not Covered
                </h3>
                <ul className="space-y-3">
                  {NOT_COVERED_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-foreground/90 text-sm sm:text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ================= PROTECTION LEVELS ================= */}
        <section className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionKicker>Protection Levels</SectionKicker>
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-3">
              Choose how much we cover per repair
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mb-10">
              Most repairs cost £700 to £1,500. Higher limits protect you against expensive faults
              like engine and gearbox repairs.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PROTECTION_LEVELS.map((level) => (
                <div
                  key={level.price}
                  className={`relative rounded-2xl p-6 text-center border transition-shadow ${
                    level.selected
                      ? 'border-orange-500 bg-orange-50 shadow-lg ring-1 ring-orange-500'
                      : 'bg-card hover:shadow-md'
                  }`}
                >
                  {level.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      {level.badge}
                    </span>
                  )}
                  <p className={`text-3xl font-bold mb-1 ${level.selected ? 'text-orange-600' : 'text-foreground'}`}>
                    {level.price}
                  </p>
                  <p className="text-muted-foreground text-sm font-medium">{level.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-foreground/90 text-sm sm:text-base">
                <strong>Quick example:</strong> A £1,300 repair with a £3,000 limit: fully covered.
              </p>
            </div>
          </div>
        </section>

        {/* ================= REPAIR COSTS ================= */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionKicker>Repair costs</SectionKicker>
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-3">
              What repairs actually cost and what we pay
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mb-10">
              Real examples of common faults so you know what to expect before you buy.
            </p>

            <div className="space-y-4">
              {REPAIR_EXAMPLES.map((example) => (
                <div
                  key={example.title}
                  className="bg-card border rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6"
                >
                  <span className="text-3xl flex-shrink-0" aria-hidden="true">
                    {example.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground">{example.title}</h3>
                    <p className="text-muted-foreground text-sm">{example.body}</p>
                  </div>
                  <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
                    <p className="font-bold text-orange-600">{example.cost}</p>
                    <p className="text-muted-foreground text-xs">avg UK garage</p>
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm font-semibold sm:mt-1">
                      <Check className="h-4 w-4" />
                      Covered
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= TRUST STRIP ================= */}
        <section className="py-10 border-y bg-background">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
            <div className="flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-green-500 text-green-500" />
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Trustpilot</p>
                <p className="text-xs text-muted-foreground">4.8/5 rated on Trustpilot</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <p className="text-sm font-medium text-foreground">Approved garages across the UK</p>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <p className="text-sm font-medium text-foreground">Claims paid directly to garage</p>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <p className="text-sm font-medium text-foreground">UK support when you need it</p>
            </div>
          </div>
        </section>

        {/* ================= CUSTOMERS SAY ================= */}
        <section className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-8 text-center">
              What our customers say
            </h2>
            <TrustpilotSliderWidget />
          </div>
        </section>

        {/* ================= FAQ ================= */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionKicker>FAQ</SectionKicker>
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-3">
              Your questions answered
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mb-10">
              Everything you need to know about your cover and how it works.
            </p>

            <div className="space-y-3">
              {FAQS.map((faq, idx) => {
                const open = openFaq === idx;
                return (
                  <div
                    key={faq.q}
                    className={`rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${FAQ_BAR_CLASSES[idx]}`}
                  >
                    <button
                      onClick={() => setOpenFaq(open ? null : idx)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                      aria-expanded={open}
                    >
                      <span className="font-semibold text-white pr-2">{faq.q}</span>
                      <ChevronDown
                        className={`h-5 w-5 flex-shrink-0 text-white transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-out ${
                        open ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="px-5 pb-5 pt-4 text-slate-700 leading-relaxed bg-white border-t border-slate-100">
                        {faq.a}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= DOWNLOADS ================= */}
        <section className="py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Your cover, made crystal clear
            </h2>
            <p className="text-muted-foreground text-lg mb-10">
              Download your warranty and terms documents.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <a
                href={PLATINUM_PDF}
                target="_blank"
                rel="noopener"
                className="bg-card border rounded-2xl p-6 flex items-center gap-4 hover:shadow-lg transition-shadow text-left"
              >
                <span className="h-12 w-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Platinum Warranty</p>
                  <p className="text-muted-foreground text-sm">PDF</p>
                </div>
              </a>
              <a
                href={TANDC_PDF}
                target="_blank"
                rel="noopener"
                className="bg-card border rounded-2xl p-6 flex items-center gap-4 hover:shadow-lg transition-shadow text-left"
              >
                <span className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Terms &amp; Conditions</p>
                  <p className="text-muted-foreground text-sm">PDF</p>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* ================= FINAL CTA ================= */}
        <section className="bg-[#1e2a4a] py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4">
              Ready to Protect Your Vehicle?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Get an instant quote and find the perfect warranty for your vehicle today from 60p a
              day.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-[#eb4b00] hover:bg-[#d63f00] text-white font-semibold text-base">
                <Link to="/#hero-reg">
                  Get your free quote
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <a
                href="tel:03302295040"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/40 bg-transparent px-8 py-3 text-base font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <Phone className="h-5 w-5" />
                0330 229 5040
              </a>
            </div>

            <div className="mt-12 pt-8 border-t border-white/15 grid sm:grid-cols-3 gap-6 text-white/80 text-sm">
              <div className="flex flex-col items-center gap-2">
                <p className="font-semibold text-white">Need advice? Have any questions?</p>
                <a href="tel:03302295040" className="inline-flex items-center gap-2 hover:text-white">
                  <Phone className="h-4 w-4" /> Call us: 0330 229 5040
                </a>
              </div>
              <div className="flex flex-col items-center gap-2">
                <a href="mailto:support@pandaprotect.co.uk" className="inline-flex items-center gap-2 hover:text-white">
                  <Mail className="h-4 w-4" /> support@pandaprotect.co.uk
                </a>
              </div>
              <div className="flex flex-col items-center gap-2">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp Us
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <footer className="border-t bg-muted/30 py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
            Panda Protect — complete mechanical &amp; electrical vehicle warranty cover.
          </div>
        </footer>
      </main>
    </>
  );
};

const ShieldBadge: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C16.51 3.81 19 5 21 5a1 1 0 0 1 1 1z" />
  </svg>
);

export default WhatsCovered;
