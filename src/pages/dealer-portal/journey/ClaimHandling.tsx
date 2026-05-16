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

type CustomerMode = 'now' | 'later' | 'collect';
type Channel = 'whatsapp' | 'email';

type DurationYears = 1 | 2 | 3;

const EXCESS_OPTIONS = [0, 50, 100, 250, 500] as const;
const CLAIM_LIMIT_OPTIONS = [500, 750, 1000, 2000, 3000, 5000] as const;
const LABOUR_RATE_OPTIONS = [40, 70, 100, 150, 200] as const;
const DURATIONS: { key: DurationYears; label: string; sub: string; badge?: string }[] = [
  { key: 1, label: '1 Year', sub: '12 months cover' },
  { key: 2, label: '2 Years', sub: '24 months cover', badge: 'Popular' },
  { key: 3, label: '3 Years', sub: '36 months cover', badge: 'Best value' },
];

// Quick-select defaults
const DEFAULT_PRESET = {
  excess: 50 as (typeof EXCESS_OPTIONS)[number],
  claimLimit: 1000 as (typeof CLAIM_LIMIT_OPTIONS)[number],
  labour: 70 as (typeof LABOUR_RATE_OPTIONS)[number],
  duration: 2 as DurationYears,
};

const ClaimHandlingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dealer, loading } = useDealerAuth();
  const { vehicle, setPlan, setCustomer } = useDealerJourney();
  const { toast } = useToast();

  const [useDefault, setUseDefault] = useState(true);
  const [excess, setExcess] = useState<(typeof EXCESS_OPTIONS)[number]>(DEFAULT_PRESET.excess);
  const [claimLimit, setClaimLimit] = useState<(typeof CLAIM_LIMIT_OPTIONS)[number]>(DEFAULT_PRESET.claimLimit);
  const [labour, setLabour] = useState<(typeof LABOUR_RATE_OPTIONS)[number]>(DEFAULT_PRESET.labour);
  const [duration, setDuration] = useState<DurationYears>(DEFAULT_PRESET.duration);

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
    }
  }, [useDefault]);

  useEffect(() => {
    if (!vehicle?.reg) {
      navigate('/dealer-portal/quote/pricing', { replace: true });
    }
  }, [vehicle, navigate]);

  const monthlyFee = 1.2; // flat claim-handling service fee
  const totalMonths = duration * 12;
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

    const term: 12 | 24 | 36 = duration === 1 ? 12 : duration === 2 ? 24 : 36;
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
  const Pill = <T extends string | number>({
    value,
    active,
    onClick,
    children,
  }: {
    value: T;
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-lg text-sm font-bold border-2 transition-all whitespace-nowrap ${
        active
          ? 'border-orange-500 bg-orange-50 text-gray-900 shadow-sm'
          : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
      } ${!active && useDefault ? 'opacity-60' : ''}`}
      disabled={useDefault}
    >
      {children}
    </button>
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
            {/* Quick select / custom toggle */}
            <section className="bg-white border-2 border-orange-200 rounded-2xl p-5 sm:p-6 ring-1 ring-orange-100/60 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500" /> Configure the warranty terms
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Quick-select our default, or tailor each option.</p>
                </div>
                <div className="inline-flex rounded-lg overflow-hidden border border-gray-300">
                  <button
                    type="button"
                    onClick={() => setUseDefault(true)}
                    className={`text-xs font-bold px-3 py-2 ${useDefault ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'}`}
                  >
                    Use default
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseDefault(false)}
                    className={`text-xs font-bold px-3 py-2 border-l border-gray-300 ${!useDefault ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'}`}
                  >
                    Customise
                  </button>
                </div>
              </div>

              {useDefault && (
                <div className="mb-4 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 flex items-start gap-2">
                  <Info className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-700">
                    Default preset: <strong>£50 excess</strong>, <strong>£1,000 claim limit</strong>, <strong>£70/hour labour</strong>. Switch to <em>Customise</em> to change.
                  </p>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Claim limit</p>
                  <div className="flex flex-wrap gap-2">
                    {CLAIM_LIMIT_OPTIONS.map((v) => (
                      <Pill key={v} value={v} active={claimLimit === v} onClick={() => setClaimLimit(v)}>
                        £{v.toLocaleString()}
                      </Pill>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Excess (per claim)</p>
                  <div className="flex flex-wrap gap-2">
                    {EXCESS_OPTIONS.map((v) => (
                      <Pill key={v} value={v} active={excess === v} onClick={() => setExcess(v)}>
                        £{v}
                      </Pill>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Labour rate (per hour)</p>
                  <div className="flex flex-wrap gap-2">
                    {LABOUR_RATE_OPTIONS.map((v) => (
                      <Pill key={v} value={v} active={labour === v} onClick={() => setLabour(v)}>
                        £{v}
                      </Pill>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Duration */}
            <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight mb-1">
                Warranty duration
              </h2>
              <p className="text-xs text-gray-500 mb-4">Pick the cover length for the customer.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DURATIONS.map((d) => {
                  const active = duration === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDuration(d.key)}
                      className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                        active ? 'border-orange-500 bg-orange-50/60 shadow-sm' : 'border-gray-200 bg-white hover:border-orange-300'
                      }`}
                    >
                      {d.badge && (
                        <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wide bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                          {d.badge}
                        </span>
                      )}
                      <div className="text-lg font-extrabold text-gray-900">{d.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{d.sub}</div>
                      <div className="text-xs font-bold text-orange-600 mt-2">
                        £{(monthlyFee * d.key * 12).toFixed(2)} total fee
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Customer details */}
            <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight mb-1">
                Customer details
              </h2>
              <p className="text-xs text-gray-500 mb-4">The end customer who's covered by this warranty.</p>

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
                  <dt className="text-gray-500">Duration</dt>
                  <dd className="font-bold text-gray-900">{duration} year{duration > 1 ? 's' : ''}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Claim limit</dt>
                  <dd className="font-bold text-gray-900">£{claimLimit.toLocaleString()}</dd>
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
