import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import { DealerRegHero } from '@/components/dealer/DealerRegHero';
import {
  Check, Zap, TrendingUp, LayoutDashboard, Smartphone, Shield, Users, BarChart3,
  Cog, Settings, Wind, Thermometer, Fuel, Wrench, CircleStop, RefreshCcw,
  Cpu, Battery, Radio, Snowflake, Music, Car, Lightbulb, Volume2,
  BatteryCharging, Plug, Repeat, Gauge,
  Siren, Hotel, Home, Globe, Key,
  PhoneCall, Award, Star, BadgeCheck, Handshake
} from 'lucide-react';

const BRAND_ORANGE = '#eb4b00';
const BRAND_NAVY = '#224380';

const DealerHome = () => {
  const [vol, setVol] = useState(40);
  const [attach, setAttach] = useState(60);
  const [margin, setMargin] = useState(420);
  const [covTab, setCovTab] = useState<'mech' | 'elec' | 'ev' | 'road'>('mech');

  const calc = useMemo(() => {
    const units = Math.round((vol * attach) / 100);
    const monthly = units * margin;
    const annual = monthly * 12;
    return { units, monthly, annual };
  }, [vol, attach, margin]);

  const fmt = (n: number) => `£${n.toLocaleString('en-GB')}`;

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="BuyAWarranty for Dealers | Warranties Independent Dealers Love Selling"
        description="Quote any vehicle in 60 seconds, earn meaningful margin per unit and partner with a UK warranty team that picks up the phone."
        keywords="dealer warranty, used car warranty UK, dealer portal, warranty partner"
      />
      <DealerPublicHeader />

      {/* HERO */}
      <section className="bg-[#fff8ef] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-0 grid lg:grid-cols-[1fr_460px] gap-12 items-end">
          <div className="pb-16">
            <div className="inline-flex items-center gap-2 bg-orange-100 border border-orange-200 rounded-full px-3 py-1 text-xs font-extrabold text-orange-800 tracking-wide mb-6">
              <span>🇬🇧</span> Trusted by UK Independent Dealers
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight text-gray-950 mb-5">
              The warranty partner your{' '}
              <em className="not-italic font-serif font-semibold italic" style={{ color: BRAND_ORANGE }}>
                customers will thank you for
              </em>
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed max-w-xl mb-8">
              BuyAWarranty gives independent used car dealers straightforward warranties, a real revenue share,
              and a UK team who actually picks up the phone. No nonsense — just cover that works.
            </p>

            <div className="max-w-md mb-6">
              <DealerRegHero />
            </div>

            <div className="flex gap-3 flex-wrap items-center">
              <Link
                to="/dealer-portal/signup"
                className="px-7 py-3.5 rounded-xl font-extrabold text-white text-sm shadow-lg hover:-translate-y-0.5 transition-all"
                style={{ background: BRAND_ORANGE, boxShadow: '0 6px 20px rgba(235,75,0,0.3)' }}
              >
                Become a Dealer Partner →
              </Link>
              <a
                href="#calculator"
                className="px-7 py-3.5 rounded-xl border-2 font-bold text-sm transition-all hover:bg-orange-50"
                style={{ borderColor: '#fdc7a8', color: BRAND_ORANGE }}
              >
                Calculate My Revenue
              </a>
            </div>

            <div className="mt-10 pt-8 border-t-2 border-orange-200 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { v: '3,700+', l: 'Partner Dealers' },
                { v: '£420', l: 'Avg margin per unit' },
                { v: '60s', l: 'To quote any vehicle' },
                { v: '98%', l: 'Claims satisfaction' },
              ].map((p) => (
                <div key={p.l}>
                  <strong className="block text-3xl font-black tracking-tight leading-none" style={{ color: BRAND_ORANGE }}>
                    {p.v}
                  </strong>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1 block">{p.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero right card */}
          <div className="hidden lg:flex flex-col items-center self-end">
            <div
              className="w-full rounded-t-3xl px-8 pt-10 pb-0 flex flex-col items-center"
              style={{ background: BRAND_NAVY }}
            >
              <div className="bg-white rounded-2xl px-5 py-4 mb-6 text-sm font-bold text-gray-900 text-center max-w-[300px] relative shadow-md">
                "Quote at the desk, sell at the desk. We've got your back — and your customer's car."
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-[10px] border-x-transparent border-t-[10px] border-t-white" />
              </div>
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 shadow-2xl"
                style={{ background: BRAND_ORANGE }}
              >
                <Shield className="w-14 h-14 text-white" strokeWidth={2.5} />
              </div>
              <div className="grid grid-cols-2 gap-3 w-full mb-7">
                {[
                  { v: '58', l: 'New dealers this month' },
                  { v: '300k+', l: 'Plans sold' },
                  { v: 'FCA', l: 'Compliant cover' },
                  { v: '24/7', l: 'Claims support' },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-xl px-4 py-3 text-center border"
                    style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)' }}
                  >
                    <strong className="block text-2xl font-black text-white leading-none mb-1">{s.v}</strong>
                    <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {s.l}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="bg-gray-950 px-6 lg:px-12 py-5 flex items-center justify-center gap-x-8 gap-y-3 flex-wrap">
        {[
          { icon: BadgeCheck, t: 'FCA Authorised & Regulated' },
          { icon: Award, t: 'Warranty Provider Finalist 2025' },
          { icon: Star, t: 'Rated Excellent on Trustpilot' },
          { icon: Smartphone, t: 'Dealer App — iOS & Android' },
          { icon: Handshake, t: 'No FCA Exams to Partner' },
        ].map((t, i, a) => (
          <React.Fragment key={t.t}>
            <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <t.icon className="w-4 h-4" style={{ color: BRAND_ORANGE }} />
              {t.t}
            </div>
            {i < a.length - 1 && <div className="w-px h-5 bg-white/15" />}
          </React.Fragment>
        ))}
      </div>

      {/* WHY US */}
      <section className="py-20 px-6 lg:px-12 bg-white max-w-7xl mx-auto">
        <div
          className="inline-flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase border rounded-full px-3 py-1 mb-4"
          style={{ color: BRAND_ORANGE, background: '#fff4ec', borderColor: '#fdd6b8' }}
        >
          Why BuyAWarranty
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-950 max-w-2xl mb-4 leading-tight">
          We make warranty{' '}
          <em className="font-serif italic font-semibold" style={{ color: BRAND_ORANGE }}>
            simple to sell
          </em>{' '}
          and even simpler to trust
        </h2>
        <p className="text-base text-gray-600 max-w-xl mb-12 leading-relaxed">
          We built our dealer programme around what independents actually need — fast quotes, fair payouts and a partner invested in your success.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Zap, h: 'Quote in 60 Seconds, Sell at the Desk', p: 'Generate a fully-priced warranty quote from any registration in under a minute. Show the customer the price right there.', pill: 'Faster than making a brew' },
            { icon: TrendingUp, h: 'A Real Revenue Share', p: 'Average dealers earn over £420 per unit. Money in your pocket every time you sell a car — not just when you\'re lucky.', pill: 'Avg £420 per vehicle' },
            { icon: Smartphone, h: 'A Dealer App That Works', p: 'Manage every quote, warranty and claim from your phone. Submit reimbursements, track your portfolio, pull customer docs.', pill: 'iOS & Android · Free' },
            { icon: Shield, h: 'Claims Sorted, Not Stalled', p: 'No reimbursement waiting period. We authorise quickly, communicate clearly and handle the repair without making your life difficult.', pill: 'No waiting period' },
            { icon: Users, h: 'A Named Person, Not a Call Centre', p: 'Every partner gets a dedicated account manager who knows the motor trade. Not a chatbot — a real person.', pill: 'Dedicated AM' },
            { icon: BarChart3, h: 'Data That Helps You Buy Better', p: 'We share repair trends and reliability data from across our network — spot which vehicles cost dealers money before buying.', pill: 'Live network insights' },
          ].map((r) => (
            <div
              key={r.h}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-7 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-orange-300"
            >
              <r.icon className="w-7 h-7 mb-4" style={{ color: BRAND_ORANGE }} />
              <h3 className="font-extrabold text-gray-950 mb-2">{r.h}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{r.p}</p>
              <span
                className="inline-block mt-4 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide"
                style={{ background: '#fff4ec', color: BRAND_ORANGE }}
              >
                {r.pill}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-6 lg:px-12 border-y border-gray-200" style={{ background: '#fff8ef' }}>
        <div className="max-w-7xl mx-auto">
          <div
            className="inline-flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase border rounded-full px-3 py-1 mb-4"
            style={{ color: BRAND_ORANGE, background: '#fff', borderColor: '#fdd6b8' }}
          >
            The Process
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-950 max-w-2xl mb-4 leading-tight">
            Up and running in{' '}
            <em className="font-serif italic font-semibold" style={{ color: BRAND_ORANGE }}>four easy steps</em>
          </h2>
          <p className="text-base text-gray-600 max-w-xl mb-12">
            From first conversation to your first warranty sold — most dealers are fully set up and earning within 48 hours.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 bg-gray-200 border border-gray-200 rounded-2xl overflow-hidden gap-px">
            {[
              { n: 1, h: 'Apply Online in Minutes', p: 'Fill in a short form about your dealership. No FCA exams, no long approval, no waiting weeks.', t: 'Takes 5 minutes' },
              { n: 2, h: 'Meet Your Account Manager', p: 'We\'ll match you with a dedicated AM who walks you through pricing, the app and how to position warranties.', t: 'Within 24 hours' },
              { n: 3, h: 'Start Quoting Immediately', p: 'Log in to your portal or download the app. Enter any reg, get an instant quote — show your customer there and then.', t: 'Live same day' },
              { n: 4, h: 'Sell Cars, Earn More', p: 'Every warranty sale lands in your earnings dashboard. Watch your warranty revenue grow alongside your sales.', t: 'Paid monthly' },
            ].map((s) => (
              <div key={s.n} className="bg-white p-7 hover:bg-orange-50 transition-colors">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black mb-5 shadow-md"
                  style={{ background: BRAND_ORANGE }}
                >
                  {s.n}
                </div>
                <h3 className="font-extrabold text-gray-950 mb-2">{s.h}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.p}</p>
                <div className="mt-4 text-[11px] font-extrabold tracking-wide uppercase" style={{ color: BRAND_ORANGE }}>
                  ⏱ {s.t}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVENUE CALCULATOR */}
      <section id="calculator" className="py-20 px-6 lg:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div
            className="inline-flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase border rounded-full px-3 py-1 mb-4"
            style={{ color: BRAND_ORANGE, background: '#fff4ec', borderColor: '#fdd6b8' }}
          >
            Revenue Tool
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-950 max-w-2xl mb-4 leading-tight">
            See what we could add to your{' '}
            <em className="font-serif italic font-semibold" style={{ color: BRAND_ORANGE }}>bottom line</em>
          </h2>
          <p className="text-base text-gray-600 max-w-xl mb-12">
            Slide the values to match your dealership and we'll show a realistic monthly warranty revenue picture.
          </p>

          <div className="grid lg:grid-cols-[1fr_420px] gap-10 items-start">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
              {[
                { label: 'Monthly vehicles sold', val: `${vol} cars`, min: 5, max: 200, step: 5, value: vol, set: setVol },
                { label: 'Warranty attachment rate', val: `${attach}%`, min: 10, max: 95, step: 5, value: attach, set: setAttach },
                { label: 'Average margin per warranty', val: `£${margin}`, min: 150, max: 800, step: 10, value: margin, set: setMargin },
              ].map((f) => (
                <div key={f.label} className="mb-7 last:mb-2">
                  <div className="flex justify-between items-baseline mb-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500">{f.label}</label>
                    <strong className="text-lg text-gray-950 font-black">{f.val}</strong>
                  </div>
                  <input
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={f.value}
                    onChange={(e) => f.set(Number(e.target.value))}
                    className="w-full h-1 cursor-pointer"
                    style={{ accentColor: BRAND_ORANGE }}
                  />
                </div>
              ))}
              <p className="text-xs font-semibold text-gray-500 mt-2">
                💡 Most BuyAWarranty dealers reach 55–70% attachment within 3 months of joining.
              </p>
            </div>

            <div className="rounded-2xl p-8 sticky top-24" style={{ background: BRAND_NAVY }}>
              <div className="text-[11px] font-extrabold tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Your estimated annual warranty revenue
              </div>
              <div className="text-5xl font-black text-white tracking-tighter leading-none mb-2">
                {fmt(calc.annual)}
              </div>
              <div className="text-sm font-semibold mb-7" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Based on your inputs · Net dealer margin
              </div>
              <div className="rounded-xl p-5 mb-7 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.12)' }}>
                {[
                  { l: 'Warranties sold per month', v: calc.units },
                  { l: 'Monthly earnings', v: fmt(calc.monthly) },
                  { l: 'Annual earnings', v: fmt(calc.annual) },
                ].map((r) => (
                  <div key={r.l} className="flex justify-between items-center">
                    <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{r.l}</span>
                    <strong className="text-sm font-extrabold text-white">{r.v}</strong>
                  </div>
                ))}
              </div>
              <Link
                to="/dealer-portal/signup"
                className="block w-full text-center py-3.5 rounded-xl bg-white font-extrabold text-sm hover:bg-orange-50 transition-colors"
                style={{ color: BRAND_ORANGE }}
              >
                Start earning this → Become a Partner
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* COVERAGE */}
      <section className="py-20 px-6 lg:px-12 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div
            className="inline-flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase border rounded-full px-3 py-1 mb-4"
            style={{ color: BRAND_ORANGE, background: '#fff4ec', borderColor: '#fdd6b8' }}
          >
            What's Covered
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-950 max-w-2xl mb-4 leading-tight">
            Cover your customers can actually{' '}
            <em className="font-serif italic font-semibold" style={{ color: BRAND_ORANGE }}>rely on</em>
          </h2>
          <p className="text-base text-gray-600 max-w-xl mb-8">
            Clear, comprehensive, jargon-free cover — easy for your salespeople to explain and your customers to trust.
          </p>

          <div className="flex gap-2 flex-wrap mb-8">
            {[
              { id: 'mech', label: 'Mechanical', icon: Cog },
              { id: 'elec', label: 'Electrical', icon: Zap },
              { id: 'ev', label: 'EV & Hybrid', icon: BatteryCharging },
              { id: 'road', label: 'Roadside', icon: Siren },
            ].map((t) => {
              const active = covTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setCovTab(t.id as any)}
                  className="px-5 py-2 rounded-full border-2 text-sm font-extrabold transition-all flex items-center gap-2"
                  style={
                    active
                      ? { background: BRAND_ORANGE, borderColor: BRAND_ORANGE, color: '#fff' }
                      : { background: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }
                  }
                >
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>

          {(() => {
            const data: Record<string, { icon: any; h: string; p: string }[]> = {
              mech: [
                { icon: Cog, h: 'Engine & Components', p: 'Full engine block, pistons, crankshaft, camshaft and timing components.' },
                { icon: Settings, h: 'Gearbox & Transmission', p: 'Manual, automatic and CVT. All internal components and torque converter.' },
                { icon: Wind, h: 'Turbo & Supercharger', p: 'Complete turbo assembly, intercooler, wastegate and boost control.' },
                { icon: Thermometer, h: 'Cooling System', p: 'Water pump, thermostat, radiator, cooling fans and associated hoses.' },
                { icon: Fuel, h: 'Fuel System', p: 'Injectors, high-pressure fuel pump, fuel rail and pressure regulator.' },
                { icon: Wrench, h: 'Drive Train', p: 'Prop shaft, drive shafts, differentials and CV joints.' },
                { icon: CircleStop, h: 'Braking System', p: 'ABS pump, brake servo, master cylinder. Excludes pads and discs.' },
                { icon: RefreshCcw, h: 'Steering System', p: 'Power steering pump, rack and pinion, column and seals.' },
              ],
              elec: [
                { icon: Cpu, h: 'ECU & Control Modules', p: 'Engine, ABS, airbag and transmission ECUs. All factory-fitted modules.' },
                { icon: Battery, h: 'Starter & Alternator', p: 'Complete starter motor, alternator and charging components.' },
                { icon: Radio, h: 'Sensors & Switches', p: 'Crank, cam, oxygen, MAP and throttle position sensors.' },
                { icon: Snowflake, h: 'Air Conditioning', p: 'Compressor, condenser, evaporator and expansion valve on Premium tier.' },
                { icon: Music, h: 'Infotainment', p: 'Factory sat-nav, DAB, Bluetooth modules and reversing camera.' },
                { icon: Car, h: 'Power Windows & Locks', p: 'Window regulators, motors, central locking actuators and harnesses.' },
                { icon: Lightbulb, h: 'Lighting Systems', p: 'Headlamp motors, adaptive lighting controls and rear light modules.' },
                { icon: Volume2, h: 'Horn & Wipers', p: 'Wiper motor, washer pump, horn assembly and control switches.' },
              ],
              ev: [
                { icon: Battery, h: 'High-Voltage Battery', p: 'Traction battery packs, cell assemblies and BMS for EVs and hybrids.' },
                { icon: Zap, h: 'Electric Drive Motors', p: 'Front and rear electric motor assemblies including stator and rotor.' },
                { icon: Plug, h: 'Inverter & Converter', p: 'DC/DC converters, HV inverters and on-board charging modules.' },
                { icon: Thermometer, h: 'Thermal Management', p: 'Battery cooling and heating, chiller units and dedicated coolant pumps.' },
                { icon: Repeat, h: 'Regenerative Braking', p: 'Regen braking components and energy recovery units.' },
                { icon: Plug, h: 'Charge Port & OBC', p: 'Charge inlet assembly, OBC and CCS/CHAdeMO adaptor systems.' },
                { icon: Settings, h: 'Hybrid Drivetrain', p: 'Hybrid transaxle, e-CVT components and power split device.' },
                { icon: Gauge, h: 'Energy Management', p: 'Hybrid ECU, power management modules and energy flow control.' },
              ],
              road: [
                { icon: Siren, h: '24/7 UK Breakdown', p: 'Nationwide roadside assistance, 365 days. Target 60-minute response.' },
                { icon: Car, h: 'Onward Travel', p: 'Hire car or alternative transport while the vehicle is repaired. Up to 7 days.' },
                { icon: Hotel, h: 'Hotel Accommodation', p: 'Up to £100 per night if customer can\'t travel home on the day.' },
                { icon: Home, h: 'Home Start', p: 'Covers breakdowns at or within 0.25 miles of the registered home address.' },
                { icon: Globe, h: 'European Assistance', p: 'Extended European cover across 46 countries — Premium tier.' },
                { icon: Fuel, h: 'Misfuelling Cover', p: 'Drain and flush service if your customer puts the wrong fuel in.' },
                { icon: Key, h: 'Key Replacement', p: 'Lost or damaged key replacement up to £500, programming included.' },
                { icon: BatteryCharging, h: 'Battery Boost', p: 'On-site battery boost or replacement assistance for flat batteries.' },
              ],
            };
            return (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 border border-gray-200 rounded-2xl overflow-hidden">
                {data[covTab].map((c) => (
                  <div key={c.h} className="bg-white p-5 hover:bg-orange-50 transition-colors">
                    <c.icon className="w-6 h-6 mb-3" style={{ color: BRAND_ORANGE }} />
                    <h4 className="font-extrabold text-gray-950 text-sm mb-1">{c.h}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{c.p}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </section>

      {/* DEALER TIERS */}
      <section className="py-20 px-6 lg:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div
            className="inline-flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase border rounded-full px-3 py-1 mb-4"
            style={{ color: BRAND_ORANGE, background: '#fff4ec', borderColor: '#fdd6b8' }}
          >
            Dealer Plans
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-950 max-w-2xl mb-4 leading-tight">
            Find the plan that fits your{' '}
            <em className="font-serif italic font-semibold" style={{ color: BRAND_ORANGE }}>forecourt</em>
          </h2>
          <p className="text-base text-gray-600 max-w-xl mb-12">
            Whether you sell 10 cars a month or 200, there's a tier that works for you. All plans include a dedicated account manager and dealer app access.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                badge: 'Starter', name: 'BAW Lite', featured: false,
                desc: 'Everything you need to start selling warranties from day one. Simple, fast, free to join.',
                features: ['Unlimited warranty quotes', 'All vehicle types incl. EV', 'Dealer portal access', 'Standard branded docs', 'Email support', 'FCA-compliant cover'],
              },
              {
                badge: 'Most Popular', name: 'BAW Pro', featured: true,
                desc: 'The full toolkit for dealers serious about warranty revenue. Make warranties a consistent profit centre.',
                features: ['Everything in BAW Lite', 'Higher dealer margin', 'Co-branded documents', 'Dedicated account manager', 'Priority phone support', 'iOS & Android dealer app'],
              },
              {
                badge: 'Plus', name: 'BAW Plus', featured: false,
                desc: 'For high-volume dealer groups who want bespoke pricing and white-label options.',
                features: ['Everything in BAW Pro', 'Bespoke margin structure', 'White-label warranty docs', 'Multi-site portal access', 'Quarterly business reviews', 'Custom claims SLAs'],
              },
              {
                badge: 'Enterprise', name: 'BAW Group', featured: false,
                desc: 'Tailored partnership for franchise networks and national groups with custom integrations.',
                features: ['Everything in BAW Plus', 'API & DMS integration', 'Custom underwriting', 'Network-wide reporting', 'Joint marketing budget', 'Onboarding for all sites'],
              },
            ].map((t) => (
              <div
                key={t.name}
                className={`rounded-2xl p-6 flex flex-col border-2 transition-all hover:-translate-y-0.5 hover:shadow-xl ${
                  t.featured ? '' : 'bg-white border-gray-200'
                }`}
                style={t.featured ? { background: BRAND_NAVY, borderColor: BRAND_NAVY } : undefined}
              >
                <span
                  className="inline-block self-start mb-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase"
                  style={
                    t.featured
                      ? { background: BRAND_ORANGE, color: '#fff' }
                      : { background: '#f9fafb', color: '#6b7280' }
                  }
                >
                  {t.badge}
                </span>
                <div className={`text-xl font-black mb-2 ${t.featured ? 'text-white' : 'text-gray-950'}`}>{t.name}</div>
                <p className={`text-sm font-medium leading-relaxed mb-5 flex-1 ${t.featured ? 'text-white/80' : 'text-gray-500'}`}>
                  {t.desc}
                </p>
                <ul className="flex flex-col gap-2 mb-6">
                  {t.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm font-semibold ${t.featured ? 'text-white/90' : 'text-gray-700'}`}>
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: t.featured ? '#fdc7a8' : BRAND_ORANGE }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/dealer-portal/signup"
                  className="block text-center py-3 rounded-lg font-extrabold text-sm transition-all"
                  style={
                    t.featured
                      ? { background: '#fff', color: BRAND_ORANGE }
                      : { background: 'transparent', border: '2px solid #e5e7eb', color: '#374151' }
                  }
                >
                  {t.featured ? 'Start with BAW Pro →' : 'Get Started →'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="px-6 lg:px-12 py-20 grid md:grid-cols-[1fr_auto] gap-10 items-center" style={{ background: BRAND_ORANGE }}>
        <div className="max-w-3xl mx-auto md:mx-0">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Ready to add warranty revenue to{' '}
            <em className="font-serif italic font-semibold" style={{ color: '#ffe1cc' }}>every car you sell?</em>
          </h2>
          <p className="text-base font-semibold text-white/80 mt-4 max-w-xl">
            Join hundreds of UK dealers earning meaningful margin on every unit. Sign up takes 5 minutes.
          </p>
        </div>
        <div className="flex flex-col gap-3 min-w-[240px] items-center">
          <Link
            to="/dealer-portal/signup"
            className="block w-full text-center px-8 py-3.5 rounded-xl font-extrabold text-sm transition-all bg-white hover:bg-orange-50"
            style={{ color: BRAND_ORANGE }}
          >
            Become a Partner →
          </Link>
          <a href="tel:03302295040" className="text-sm font-bold text-white/85 hover:text-white flex items-center gap-2">
            <PhoneCall className="w-4 h-4" /> 0330 229 5040
          </a>
        </div>
      </section>
    </div>
  );
};

export default DealerHome;
