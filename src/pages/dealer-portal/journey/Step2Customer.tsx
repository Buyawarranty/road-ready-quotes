import React, { useEffect, useState } from 'react';
import { fireDealerConfetti } from '@/lib/dealerConfetti';
import { useNavigate } from 'react-router-dom';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import DealerFieldError from '@/components/dealer/DealerFieldError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { useDealerQuoteSave } from '@/hooks/useDealerQuoteSave';
import { dealerCustomerErrors, isUkPhone } from '@/lib/dealerCustomerValidation';
import { Mail, ArrowRight, Check, Search, Home, ChevronRight, User, Phone, MapPin } from 'lucide-react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
export { isUkPhone } from '@/lib/dealerCustomerValidation';

const Step2Customer: React.FC = () => {
  useEffect(() => {
    if (sessionStorage.getItem('dealer_confetti_light') === '1') {
      sessionStorage.removeItem('dealer_confetti_light');
      setTimeout(() => fireDealerConfetti(0.1), 200);
    }
  }, []);
  const navigate = useNavigate();
  const { vehicle, customer, setCustomer } = useDealerJourney();
  const { saving } = useDealerQuoteSave(2);

  const hasDetails = Boolean(customer?.name && !customer.address_line2?.startsWith('[Pending:'));
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

  const submitSelf = () => {
    setError(null);
    setTouched({ email: true, phone: true, name: true, address_line1: true, town: true, postcode: true });
    const errors = dealerCustomerErrors(form);
    const first = (['name', 'phone', 'email', 'address_line1', 'town', 'postcode'] as const).find(key => errors[key]);
    if (first) {
      if (errors.address_line1 || errors.town || errors.postcode) setManualAddress(true);
      window.setTimeout(() => {
        const input = document.getElementById(`c-${first}`);
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input?.focus({ preventScroll: true });
      }, 0);
      return;
    }
    setCustomer(form);
    navigate('/dealer-portal/quote/checkout');
  };

  const filled = (k: keyof typeof form) => {
    const v = form[k].trim();
    if (!v) return false;
    if (k === 'email') return EMAIL_RE.test(v);
    if (k === 'phone') return isUkPhone(v);
    return v.length > 1;
  };

  const fieldError = (k: keyof typeof form): string | null => {
    return touched[k] ? dealerCustomerErrors(form)[k] ?? null : null;
  };

  const field = (k: keyof typeof form, label: string, type = 'text', autoComplete?: string, Icon?: React.ElementType, placeholder?: string) => {
    const err = fieldError(k);
    return (
    <div>
      <label htmlFor={`c-${k}`} className="mb-1 block text-sm font-medium text-crm-navy">{label}</label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />}
        <Input id={`c-${k}`} placeholder={placeholder} type={type} inputMode={k === 'phone' ? 'tel' : k === 'email' ? 'email' : undefined} autoComplete={autoComplete} value={form[k]}
          aria-invalid={!!err} aria-describedby={err ? `c-${k}-err` : undefined}
          onChange={(e) => update(k, e.target.value)} onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
          className={`h-12 pr-10 text-base ${Icon ? 'pl-11' : ''} ${err ? 'border-destructive' : filled(k) ? 'border-crm-green' : ''}`} />
        {filled(k) && <Check className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-crm-green" />}
      </div>
      {err && <DealerFieldError id={`c-${k}-err`}>{err}</DealerFieldError>}
    </div>
    );
  };

  return (
    <DealerJourneyLayout step={2} title="Customer details" subtitle="Enter the customer's details so we can arrange their cover." backTo="/dealer-portal/quote/pricing">
      <div className="min-w-0 space-y-4 text-crm-navy sm:space-y-5">
        <section className="min-w-0 space-y-4">
          <h2 className="text-lg font-bold text-crm-navy">Customer details</h2>
          {field('name', 'Full name *', 'text', 'name', User, 'e.g. John Smith')}
          {field('phone', 'Mobile *', 'tel', 'tel', Phone, 'e.g. 07960 123 456')}
          {field('email', 'Email *', 'email', 'email', Mail, 'e.g. john@example.com')}

          <div className="pt-2">
            <h3 className="flex items-center gap-2 text-lg font-bold text-crm-navy"><Home className="h-5 w-5 text-crm-green" /> Customer address</h3>
            <p className="mt-1 text-sm text-muted-foreground">Type at least 3 letters of the postcode or street, then pick the address.</p>
            <div className="mt-3 h-px bg-crm-line" />
          </div>

          <div>
            <label htmlFor="customer-address-search" className="mb-1 block text-sm font-medium text-crm-navy">Postcode, street or town *</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <AddressAutocomplete id="customer-address-search" placeholder="Start typing the address" initialValue={form.postcode} className="h-12 pl-10 text-base" provider="postcoder" displaySelectedPostcode
                onLookupError={(failed) => { if (failed) setManualAddress(true); }}
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
              {field('address_line1', 'Address line 1 *', 'text', 'address-line1', Home, 'e.g. 12 High Street')}
              {field('address_line2', 'Address line 2', 'text', 'address-line2', Home)}
              {field('town', 'Town *', 'text', 'address-level2', MapPin, 'e.g. Manchester')}
              {field('postcode', 'Postcode *', 'text', 'postal-code', MapPin, 'e.g. SW1A 1AA')}
            </div>
          )}
        </section>

        {error && <DealerFieldError>{error}</DealerFieldError>}

        <div className="grid gap-3 sm:flex sm:justify-end" aria-label="Customer details actions">
          <Button type="button" disabled={saving} onClick={submitSelf} className="order-first h-auto min-h-12 min-w-0 gap-2 whitespace-normal px-4 py-3 text-sm font-bold !bg-crm-orange !text-primary-foreground hover:!bg-crm-orange/90 sm:order-last sm:text-base">
            Continue to checkout<ArrowRight className="h-5 w-5 shrink-0" />
          </Button>
        </div>
      </div>
    </DealerJourneyLayout>
  );
};

export default Step2Customer;
