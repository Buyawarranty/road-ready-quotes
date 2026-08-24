import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import {
  Headphones,
  ShieldCheck,
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Info,
  Clock,
  MessageCircle,
  HeartHandshake,
} from 'lucide-react';
import {
  CLAIM_OPTIONS,
  EXCESS_OPTIONS,
  LABOUR_OPTIONS,
  PARTS_OPTIONS,
  TERM_OPTIONS,
  TraderClaim,
  TraderExcess,
  TraderLabour,
  TraderParts,
  TraderTerm,
  formatClaim,
} from '@/lib/traderPricingDefaults';

type CustomerMode = 'now' | 'later' | 'collect';
type Channel = 'whatsapp' | 'email';

const ADD_ONS = [
  'Air-Conditioning',
  'Turbocharger',
  'Diagnostic Cover',
  'Breakdown Recovery',
  'Vehicle Hire',
  'European Cover',
  'EV Battery Cover',
  'Hybrid Battery Cover',
  'Emissions',
  'Suspension',
  'Handbrake',
  'Radio / Sat-Nav',
];

const termLabel = (t: TraderTerm) =>
  t === 3
    ? '3 months'
    : t === 6
    ? '6+1 months'
    : t === 12
    ? '12+12 months'
    : t === 24
    ? '24+12 months'
    : '36+12 months';

// Quick-select defaults
const DEFAULT_PRESET = {
  excess: 50 as TraderExcess,
  claimLimit: 1000 as TraderClaim,
  labour: 70 as TraderLabour,
  parts: 'age_mileage' as TraderParts,
  term: 12 as TraderTerm,
};


const ClaimHandlingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dealer, loading } = useDealerAuth();
  const { vehicle, setPlan, setCustomer } = useDealerJourney();
  const { toast } = useToast();

  const [useDefault, setUseDefault] = useState(true);
  const [excess, setExcess] = useState<TraderExcess>(DEFAULT_PRESET.excess);
  const [claimLimit, setClaimLimit] = useState<TraderClaim>(DEFAULT_PRESET.claimLimit);
  const [labour, setLabour] = useState<TraderLabour>(DEFAULT_PRESET.labour);
  const [parts, setParts] = useState<TraderParts>(DEFAULT_PRESET.parts);
  const [term, setTerm] = useState<TraderTerm>(DEFAULT_PRESET.term);
  const [addOns, setAddOns] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address_line1: '',
    town: '',
    postcode: '',
  });
  const [customerMode, setCustomerMode] = useState<CustomerMode>('now');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (useDefault) {
      setExcess(DEFAULT_PRESET.excess);
      setClaimLimit(DEFAULT_PRESET.claimLimit);
      setLabour(DEFAULT_PRESET.labour);
      setParts(DEFAULT_PRESET.parts);
    }
  }, [useDefault]);

  useEffect(() => {
    if (!vehicle?.reg) {
      navigate('/dealer-portal/quote/pricing', { replace: true });
    }
  }, [vehicle, navigate]);

  const monthlyFee = 1.2; // flat claim-handling service fee
  const totalMonths = term;
  const totalCost = useMemo(() => +(monthlyFee * totalMonths).toFixed(2), [totalMonths]);

  if (!loading && !dealer) {
    return <Navigate to={`/dealer-portal/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleContinue = () => {
    setError(null);

    const dealerName = dealer?.company_name || dealer?.name || 'Dealer';
    const placeholderEmail = dealer?.email || 'pending@dealer.local';

    if (customerMode === 'now') {
      if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.postcode.trim()) {
        setError('Please complete the customer name, email, phone and postcode.');
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(form.email)) {
        setError('Enter a valid email address.');
        return;
      }
      setCustomer({
        name: form.name,
        email: form.email,
        phone: form.phone,
        address_line1: form.address_line1 || 'To be confirmed',
        address_line2: `[Claim Handling Only — dealer pays claim payouts]`,
        town: form.town || 'To be confirmed',
        postcode: form.postcode.toUpperCase(),
      });
    } else if (customerMode === 'later') {
      const channelLabel = channel === 'whatsapp' ? 'WhatsApp' : 'Email';
      setCustomer({
        name: 'Pending customer details',
        email: placeholderEmail,
        phone: '',
        address_line1: 'To be confirmed',
        address_line2: `[Pending: ${dealerName} to send details via ${channelLabel}]${note ? ` — ${note}` : ''} [Claim Handling Only]`,
        town: 'To be confirmed',
        postcode: 'TBC',
      });
    } else {
      if (!form.name.trim() || !form.phone.trim()) {
        setError('We need at least the customer name and phone so we can contact them.');
        return;
      }
      setCustomer({
        name: form.name,
        email: form.email || placeholderEmail,
        phone: form.phone,
        address_line1: 'To be collected by Buyawarranty',
        address_line2: `[Buyawarranty to collect details from customer]${note ? ` — ${note}` : ''} [Claim Handling Only]`,
        town: 'To be confirmed',
        postcode: 'TBC',
      });
    }

    const selectedAddOns = Object.keys(addOns).filter((k) => addOns[k]);
    setPlan({
      plan_type: 'gold',
      duration_months: term,
      retail_price: totalCost,
      dealer_price: totalCost,
      term_months: term,
      selected_options: {
        product: 'claim_handling',
        excess,
        labour,
        parts,
        add_ons: selectedAddOns,
        claim_limit: claimLimit,
        monthly_fee: monthlyFee,
        total_months: totalMonths,
        gross: totalCost,
        ex_vat: +(totalCost / 1.2).toFixed(2),
        vat: +(totalCost - totalCost / 1.2).toFixed(2),
        monthly_equiv: monthlyFee,
        custom_terms: !useDefault,
      },
    } as any);

    toast({ title: 'Claim handling configured', description: 'Continue to checkout to finalise.' });
    navigate('/dealer-portal/quote/checkout');
  };

  // Atoms ------------------------------------------------------------------
  const SegBtn = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-sm font-semibold border transition-colors first:rounded-l-md last:rounded-r-md -ml-px first:ml-0 ${
        active
          ? 'bg-yellow-300 text-gray-900 border-yellow-400 z-10 relative'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );

  const SegGroup = <T extends string | number>({
    label,
    options,
    value,
    onChange,
    format,
  }: {
    label: string;
    options: readonly T[];
    value: T;
    onChange: (v: T) => void;
    format?: (v: T) => string;
  }) => (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">{label}</p>
      <div className="flex">
        {options.map((o) => (
          <SegBtn key={String(o)} active={value === o} onClick={() => onChange(o)}>
            {format ? format(o) : String(o)}
          </SegBtn>
        ))}
      </div>
    </div>
  );

  const inputClass =
    'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-orange-500';

  return (
    <DealerLayout>
      <div className="max-w-5xl mx-auto pb-24">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            onClick={() => navigate('/dealer-portal/quote/pricing')}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to pricing
          </button>
          <div className="text-xs uppercase tracking-wider text-orange-600 font-bold flex items-center gap-1.5">
            <Headphones className="w-4 h-4" />
            Claim Handling Service
          </div>
        </div>

        {/* Hero info card */}
        <section className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white p-5 sm:p-7 mb-5 shadow-md">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex w-12 h-12 rounded-xl bg-white/20 items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                You set the terms — we handle the claims
              </h1>
              <p className="text-sm text-white/90 mt-1 max-w-2xl leading-relaxed">
                Choose your own claim limit, excess and labour rate (or use our recommended defaults).
                <strong className="font-bold"> Your dealership pays the claim payouts</strong> — we manage the
                customer experience, paperwork and approvals end-to-end.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-semibold text-white/95">
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Full claims management</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> You keep the margin</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Just £1.20/month per warranty</span>
              </div>
            </div>
          </div>
        </section>

        {/* Vehicle banner */}
        {vehicle?.make && (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="inline-flex items-stretch rounded-sm overflow-hidden border border-gray-900 shrink-0">
                <div className="bg-blue-700 text-yellow-300 text-[9px] font-bold flex items-center px-1.5">GB</div>
                <div className="bg-yellow-300 text-gray-900 font-black tracking-widest text-sm px-2 py-0.5">
                  {vehicle?.reg}
                </div>
              </div>
              <div className="truncate">
                <span className="font-bold text-gray-900 uppercase">{vehicle?.make} {vehicle?.model}</span>
                <span className="text-gray-500"> · {vehicle?.year || '—'} · {vehicle?.fuel_type || '—'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* MAIN COLUMN */}
          <div className="space-y-5">
            {/* Customize — identical options to the Fully Covered pricing page */}
            <section className="bg-white border-2 border-orange-200 rounded-2xl p-5 sm:p-6 ring-1 ring-orange-100/60 shadow-sm">
              <div className="mb-4">
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500" /> Customize your warranty
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tailor each option — you pay a flat £{monthlyFee.toFixed(2)}/month claim-handling fee.
                </p>
              </div>

              <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50/50 p-3">
                <p className="text-[11px] uppercase tracking-wider text-orange-700 font-bold mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Quick select · Default warranty presets
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '1 Year', term: 12 as TraderTerm },
                    { label: '2 Year', term: 24 as TraderTerm },
                    { label: '3 Year', term: 36 as TraderTerm },
                  ].map((p) => {
                    const active = term === p.term && useDefault;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setUseDefault(true);
                          setTerm(p.term);
                          setExcess(DEFAULT_PRESET.excess);
                          setLabour(DEFAULT_PRESET.labour);
                          setParts(DEFAULT_PRESET.parts);
                          setClaimLimit(DEFAULT_PRESET.claimLimit);
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                          active
                            ? 'bg-orange-500 border-orange-500 text-white shadow'
                            : 'bg-white border-orange-200 text-gray-900 hover:border-orange-400'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-500 mt-2">
                  One-click defaults — pick a term and we'll set sensible excess, labour &amp; claim limit.
                </p>
              </div>

              <div className="space-y-5">
                <SegGroup
                  label="Excess"
                  options={EXCESS_OPTIONS}
                  value={excess}
                  onChange={(v) => { setUseDefault(false); setExcess(v as TraderExcess); }}
                  format={(v) => `£${v}`}
                />
                <SegGroup
                  label="Labour rates (per hour)"
                  options={LABOUR_OPTIONS}
                  value={labour}
                  onChange={(v) => { setUseDefault(false); setLabour(v as TraderLabour); }}
                  format={(v) => `£${v}`}
                />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Parts</p>
                  <div className="flex">
                    {PARTS_OPTIONS.map((o) => (
                      <SegBtn
                        key={o.key}
                        active={parts === o.key}
                        onClick={() => { setUseDefault(false); setParts(o.key); }}
                      >
                        {o.label}
                      </SegBtn>
                    ))}
                  </div>
                </div>
                <SegGroup
                  label="Claim limit"
                  options={CLAIM_OPTIONS}
                  value={claimLimit}
                  onChange={(v) => { setUseDefault(false); setClaimLimit(v as TraderClaim); }}
                  format={(v) => formatClaim(Number(v))}
                />

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Term</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {TERM_OPTIONS.map((t) => {
                      const active = term === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTerm(t)}
                          className={`px-3 py-2 rounded-lg text-center border-2 transition-all text-xs font-semibold ${
                            active ? 'bg-yellow-300 border-yellow-400' : 'bg-white border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          {termLabel(t)}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs font-bold text-orange-600 mt-3">
                    £{(monthlyFee * term).toFixed(2)} total service fee over {term} months
                  </p>
                </div>
              </div>
            </section>


            {/* Optional Add-ons */}
            <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight mb-1">Optional add-ons</h2>
              <p className="text-xs text-gray-500 mb-4">Boost the cover with extra protection.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                {ADD_ONS.map((name) => {
                  const checked = !!addOns[name];
                  return (
                    <label key={name} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 select-none">
                      <span
                        onClick={() => setAddOns((prev) => ({ ...prev, [name]: !checked }))}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          checked ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-400'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                      <span>{name}</span>
                    </label>
                  );
                })}
              </div>
            </section>


            {/* Customer details */}
            <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight mb-1">
                Customer details
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Add details now, send them later, or let us collect them from your customer for you.
              </p>

              {/* Mode tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
                {([
                  { key: 'now', icon: User, title: 'Add now', sub: "Fill in the customer's details." },
                  { key: 'later', icon: Clock, title: 'Send later', sub: 'Share via WhatsApp / email later.' },
                  { key: 'collect', icon: HeartHandshake, title: 'We collect for you', sub: 'We contact the customer directly.' },
                ] as const).map(({ key, icon: Icon, title, sub }) => {
                  const active = customerMode === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCustomerMode(key)}
                      className={`text-left rounded-xl border-2 p-3 transition-all ${
                        active ? 'border-orange-500 bg-orange-50/60 shadow-sm' : 'border-gray-200 bg-white hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900">{title}</p>
                          <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{sub}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {customerMode === 'now' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400" /> Full name *
                    </label>
                    <Input value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" /> Email *
                    </label>
                    <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass} placeholder="jane@example.com" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone *
                    </label>
                    <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass} placeholder="07…" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" /> Postcode *
                    </label>
                    <Input value={form.postcode} onChange={(e) => update('postcode', e.target.value.toUpperCase())} className={`uppercase ${inputClass}`} placeholder="SW1A 1AA" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Address line 1</label>
                    <Input value={form.address_line1} onChange={(e) => update('address_line1', e.target.value)} className={inputClass} placeholder="123 High Street" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Town</label>
                    <Input value={form.town} onChange={(e) => update('town', e.target.value)} className={inputClass} placeholder="London" />
                  </div>
                </div>
              )}

              {customerMode === 'later' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700">
                      We'll mark this warranty as <strong>Pending customer details</strong>. You can send the details over later via WhatsApp or email and your team will add them on.
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">How will you send them?</p>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { key: 'whatsapp', icon: MessageCircle, label: 'WhatsApp' },
                        { key: 'email', icon: Mail, label: 'Email' },
                      ] as const).map(({ key, icon: Icon, label }) => {
                        const active = channel === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setChannel(key)}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                              active ? 'border-orange-500 bg-yellow-300 text-gray-900' : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" /> {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Quick note (optional)</label>
                    <Textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Will send name + address on WhatsApp this afternoon."
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {customerMode === 'collect' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <HeartHandshake className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700">
                      Hand it over to us — our team will contact your customer to collect their full details and confirm the cover. Just give us a name and phone (or email) so we know who to call.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" /> Customer name *
                      </label>
                      <Input value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} placeholder="Jane Smith" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone *
                      </label>
                      <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass} placeholder="07…" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-gray-400" /> Email (optional)
                      </label>
                      <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass} placeholder="jane@example.com" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">Best time to call / note (optional)</label>
                    <Textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Call after 5pm, customer collects car on Saturday."
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600 font-medium mt-3">{error}</p>}
            </section>
          </div>

          {/* SIDEBAR — Summary */}
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-orange-600 mb-2">Summary</div>
              <h3 className="text-base font-extrabold text-gray-900 mb-3">Claim Handling Cover</h3>

              <dl className="text-xs space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Term</dt>
                  <dd className="font-bold text-gray-900">{termLabel(term)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Claim limit</dt>
                  <dd className="font-bold text-gray-900">{formatClaim(claimLimit)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Parts</dt>
                  <dd className="font-bold text-gray-900">{PARTS_OPTIONS.find((p) => p.key === parts)?.label}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Excess</dt>
                  <dd className="font-bold text-gray-900">£{excess}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Labour rate</dt>
                  <dd className="font-bold text-gray-900">£{labour}/hr</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Service fee</dt>
                  <dd className="font-bold text-gray-900">£{monthlyFee.toFixed(2)} / mo</dd>
                </div>
              </dl>

              <div className="border-t border-gray-200 my-4" />

              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Total fee</span>
                <span className="text-2xl font-extrabold text-gray-900">£{totalCost.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Over {totalMonths} months · Dealer pays claim payouts.
              </p>

              <Button
                onClick={handleContinue}
                className="w-full mt-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white h-11 font-bold"
              >
                Continue to checkout <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

              <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  We manage the claim from start to finish. Approved repair costs are paid by your dealership.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DealerLayout>
  );
};

export default ClaimHandlingPage;
