import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useDealerQuoteSave } from '@/hooks/useDealerQuoteSave';
import { Headset, Pencil, MessageCircle, Mail, ArrowRight, Info, Loader2, Check, Search, Home, ChevronRight } from 'lucide-react';

type Mode = 'panda' | 'self';
type Channel = 'whatsapp' | 'email';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
// UK mobile: 07xxx xxxxxx or +44 7xxx xxxxxx
export const isUkPhone = (v: string) => /^(?:07\d{9}|447\d{9})$/.test(v.replace(/[\s()+-]/g, ''));

const PANDA_WHATSAPP = '443302295045';
const PANDA_EMAIL = 'support@pandaprotect.co.uk';

const Step2Customer: React.FC = () => {
  const navigate = useNavigate();
  const { vehicle, customer, plan, setCustomer } = useDealerJourney();
  const { dealer } = useDealerAuth();
  const { save, saving } = useDealerQuoteSave(2);

  const hasDetails = Boolean(customer?.name && !customer.address_line2?.startsWith('[Pending:'));
  const [mode, setMode] = useState<Mode>(hasDetails ? 'self' : 'panda');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [note, setNote] = useState('');
  const [manualAddress, setManualAddress] = useState(hasDetails);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: hasDetails ? customer!.name : '',
    email: hasDetails ? customer!.email : '',
    phone: hasDetails ? customer!.phone : '',
    address_line1: hasDetails ? customer!.address_line1 : '',
    address_line2: hasDetails ? customer!.address_line2 || '' : '',
    town: hasDetails ? customer!.town : '',
    postcode: hasDetails ? customer!.postcode : '',
  });

  useEffect(() => {
    if (!vehicle) navigate('/dealer-portal/quote/pricing', { replace: true });
  }, [vehicle, navigate]);

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const termMonths = plan?.term_months ?? plan?.duration_months;
  const warrantyLabel = termMonths ? `Comprehensive Warranty, ${termMonths / 12} ${termMonths === 12 ? 'year' : 'years'}` : 'Comprehensive Warranty';
  const vehicleLabel = [vehicle?.reg, [vehicle?.make, vehicle?.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ');

  const handoff = async () => {
    setError(null);
    // Open the WhatsApp tab straight away so the browser doesn't block it after saving.
    const tab = channel === 'whatsapp' ? window.open('', '_blank') : null;
    const dealerName = dealer?.company_name || dealer?.name || 'Dealer';
    const pending = {
      name: 'Pending customer details', email: dealer?.email || '', phone: '',
      address_line1: 'To be confirmed', address_line2: `[Pending: Panda Protect to complete via ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'}]${note ? ` ${note}` : ''}`,
      town: 'To be confirmed', postcode: 'TBC',
    };
    setCustomer(pending);
    const id = await save({ silent: true, markStatus: 'awaiting_panda', overrideCustomer: pending });
    if (!id) { tab?.close(); setError('Your quote could not be saved. Please try again.'); return; }
    const ref = id.slice(0, 8).toUpperCase();
    const message = [
      `Hi Panda Protect, please complete this warranty for us.`,
      `Quote ref: ${ref}`,
      `Dealer: ${dealerName}`,
      `Vehicle: ${vehicleLabel}`,
      `Warranty: ${warrantyLabel}`,
      note ? `Note: ${note}` : '',
      `Customer details to follow in this message.`,
    ].filter(Boolean).join('\n');
    if (channel === 'whatsapp') {
      const url = `https://wa.me/${PANDA_WHATSAPP}?text=${encodeURIComponent(message)}`;
      if (tab) tab.location.href = url; else window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = `mailto:${PANDA_EMAIL}?subject=${encodeURIComponent(`Warranty request ${ref} · ${vehicle?.reg || ''}`)}&body=${encodeURIComponent(message)}`;
    }
    navigate(`/dealer-portal/quotes?search=${encodeURIComponent(vehicle?.reg || '')}`);
  };

  const submitSelf = () => {
    setError(null);
    setTouched({ email: true, phone: true, name: true });
    if (!EMAIL_RE.test(form.email.trim())) { setError('Enter a valid email address'); return; }
    if (!isUkPhone(form.phone)) { setError('Enter a valid UK mobile number'); return; }
    if (form.name.trim().length < 2) { setError('Enter the customer\'s full name'); return; }
    if (!form.address_line1.trim() || !form.town.trim() || !form.postcode.trim()) {
      setManualAddress(true); setError('Search for the address, or enter it manually'); return;
    }
    setCustomer(form);
    navigate('/dealer-portal/quote/checkout');
  };

  const RadioDot: React.FC<{ active: boolean }> = ({ active }) => (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-crm-orange bg-crm-orange' : 'border-muted-foreground/40 bg-card'}`}>{active && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}</span>
  );

  const OptionCard: React.FC<{ value: Mode; icon: React.ElementType; title: string; sub: string }> = ({ value, icon: Icon, title, sub }) => {
    const active = mode === value;
    return (
      <button type="button" role="radio" aria-checked={active} onClick={() => setMode(value)}
        className={`flex flex-1 items-start gap-4 rounded-xl border-2 p-4 text-left text-crm-navy transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-orange ${active ? 'border-crm-orange bg-crm-orange-soft' : 'border-crm-line bg-card hover:border-crm-navy/30'}`}>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-crm-orange/15 text-crm-orange' : 'bg-muted text-crm-navy'}`}><Icon className="h-6 w-6" /></span>
        <span className="min-w-0 flex-1"><span className="block text-lg font-bold leading-6">{title}</span><span className="mt-1 block text-sm text-muted-foreground">{sub}</span></span>
        <RadioDot active={active} />
      </button>
    );
  };

  const filled = (k: keyof typeof form) => {
    const v = form[k].trim();
    if (!v) return false;
    if (k === 'email') return EMAIL_RE.test(v);
    if (k === 'phone') return isUkPhone(v);
    return v.length > 1;
  };

  const fieldError = (k: keyof typeof form): string | null => {
    const v = form[k].trim();
    if (!v || !touched[k]) return null;
    if (k === 'email' && !EMAIL_RE.test(v)) return 'Enter a valid email, like name@example.com';
    if (k === 'phone' && !isUkPhone(v)) return 'Enter a valid UK mobile, like 07123 456789';
    return null;
  };

  const field = (k: keyof typeof form, label: string, type = 'text', autoComplete?: string) => {
    const err = fieldError(k);
    return (
    <div>
      <label htmlFor={`c-${k}`} className="mb-1 block text-sm font-medium text-crm-navy">{label}</label>
      <div className="relative">
        <Input id={`c-${k}`} type={type} inputMode={k === 'phone' ? 'tel' : k === 'email' ? 'email' : undefined} autoComplete={autoComplete} value={form[k]}
          aria-invalid={!!err} aria-describedby={err ? `c-${k}-err` : undefined}
          onChange={(e) => update(k, e.target.value)} onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
          className={`h-12 pr-10 text-base ${err ? 'border-destructive' : filled(k) ? 'border-crm-green' : ''}`} />
        {filled(k) && <Check className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-crm-green" />}
      </div>
      {err && <p id={`c-${k}-err`} className="mt-1 text-sm font-medium text-destructive">{err}</p>}
    </div>
    );
  };

  return (
    <DealerJourneyLayout step={2} title="Customer details" subtitle="How would you like to complete this warranty?" backTo="/dealer-portal/quote/pricing">
      <div className="space-y-5 text-crm-navy">
        <section className="rounded-2xl border border-crm-line bg-card p-5 sm:p-6" aria-label="How to complete this warranty">
          <p className="text-xs font-bold uppercase tracking-widest text-crm-orange">Customer details</p>
          <h2 className="mt-1 text-2xl font-extrabold text-crm-navy sm:text-3xl">Who completes the details?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Send them to us, or enter them yourself now.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row" role="radiogroup" aria-label="How to complete this warranty">
            <OptionCard value="panda" icon={Headset} title="Panda Protect does it for you" sub="Send us the customer details and we'll process the warranty for you." />
            <OptionCard value="self" icon={Pencil} title="I'll enter the details" sub="Complete the customer information now." />
          </div>
        </section>

        {mode === 'panda' ? (
          <section className="space-y-4 rounded-xl border border-crm-line bg-card p-4 sm:p-5">
            <h2 className="text-lg font-bold">Send us the details</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Send by">
              {([{ key: 'whatsapp', icon: MessageCircle, label: 'WhatsApp' }, { key: 'email', icon: Mail, label: 'Email' }] as const).map(({ key, icon: Icon, label }) => {
                const active = channel === key;
                return (
                  <button key={key} type="button" role="radio" aria-checked={active} onClick={() => setChannel(key)}
                    className={`flex items-center gap-4 rounded-xl border-2 p-3 text-left transition ${active ? 'border-crm-orange bg-crm-orange-soft' : 'border-crm-line bg-card hover:border-crm-navy/30'}`}>
                    <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${key === 'whatsapp' ? 'bg-crm-green-soft text-crm-green' : 'bg-muted text-crm-navy'}`}><Icon className="h-6 w-6" /></span>
                    <span className="flex-1 text-lg font-bold">{label}</span>
                    <RadioDot active={active} />
                  </button>
                );
              })}
            </div>
            <div>
              <label htmlFor="handoff-note" className="mb-1 block text-sm font-medium">Quick note (optional)</label>
              <Textarea id="handoff-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Customer details coming this afternoon." />
            </div>
            <p className="flex items-start gap-2 text-sm text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" />Your quote reference, vehicle and selected warranty are included automatically. The quote is saved as <strong className="text-crm-navy">Awaiting Panda Protect</strong> until we've activated it.</p>
          </section>
        ) : (
          <section className="space-y-4 rounded-xl border border-crm-line bg-card p-4 sm:p-5">
            {field('email', 'Email *', 'email', 'email')}
            {field('phone', 'Mobile *', 'tel', 'tel')}
            {field('name', 'Full name *', 'text', 'name')}

            <div className="pt-2">
              <h3 className="flex items-center gap-2 text-lg font-bold text-crm-navy"><Home className="h-5 w-5 text-crm-green" /> Customer address</h3>
              <p className="mt-1 text-sm text-muted-foreground">Type at least 3 letters of the postcode or street, then pick the address.</p>
              <div className="mt-3 h-px bg-crm-line" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-crm-navy">Postcode, street or town *</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <AddressAutocomplete placeholder="Start typing the address" initialValue={form.postcode} className="h-12 pl-10 text-base" provider="postcoder" displaySelectedPostcode
                  onInputChange={(value) => update('postcode', value)}
                  onAddressSelect={(addr) => { setForm((p) => ({ ...p, address_line1: addr.line_1, address_line2: addr.line_2, town: addr.town, postcode: addr.postcode.toUpperCase() })); setManualAddress(true); }} />
              </div>
              {!manualAddress && (
                <button type="button" onClick={() => setManualAddress(true)} className="mt-3 flex items-center gap-1 text-sm font-bold text-crm-navy underline">
                  Can't find the address? Enter it manually <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {manualAddress && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {field('address_line1', 'Address line 1 *', 'text', 'address-line1')}
                {field('town', 'Town *', 'text', 'address-level2')}
              </div>
            )}
          </section>
        )}

        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

        <Button type="button" disabled={saving} onClick={mode === 'panda' ? handoff : submitSelf}
          className={`h-14 w-full gap-2 px-6 text-base font-bold !transition-none !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90 sm:ml-auto sm:mr-0 sm:flex sm:w-auto sm:min-w-[320px] ${saving ? '' : 'animate-breathing'}`}>
          {saving ? <><Loader2 className="h-5 w-5 animate-spin" />Saving…</> : mode === 'panda' ? <>Request Panda Protect assistance<ArrowRight className="h-5 w-5" /></> : <>Continue to checkout<ArrowRight className="h-5 w-5" /></>}
        </Button>
      </div>
    </DealerJourneyLayout>
  );
};

export default Step2Customer;
