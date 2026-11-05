import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerJourney, DEALER_PLAN_LABELS } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import DealerFieldError from '@/components/dealer/DealerFieldError';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  FileText,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CalendarDays,
  Info,
  AlertTriangle,
  Lock,
  Pencil,
  Car,
  User,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

type Method = 'pay_now' | 'invoice';

const PAYMENT_TERM_DAYS = 30;

interface PayLaterEligibility {
  eligible: boolean;
  reason: 'new' | 'overdue' | 'blocked' | null;
  paid_count: number;
  required: number;
  term_days: number;
}

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const Step4Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { dealer } = useDealerAuth();
  const { vehicle, customer, plan, discount_pct, quoteId } = useDealerJourney();

  const [method, setMethod] = useState<Method>('pay_now');
  const [submitting, setSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creditBlocked, setCreditBlocked] = useState(false);
  const [eligibility, setEligibility] = useState<PayLaterEligibility | null>(null);
  const [termDays, setTermDays] = useState(PAYMENT_TERM_DAYS);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicle || !plan) navigate('/dealer-portal/quote/pricing', { replace: true });
    else if (!customer) navigate('/dealer-portal/quote/customer', { replace: true });
  }, [vehicle, customer, plan, navigate]);

  // Invoice eligibility comes from the admin-controlled pay later rules
  useEffect(() => {
    if (!dealer?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase.rpc as any)('get_dealer_paylater_eligibility', {
        p_dealer_id: dealer.id,
      });
      if (cancelled || error || !data) return;
      const e = data as PayLaterEligibility;
      setEligibility(e);
      if (e.term_days) setTermDays(e.term_days);
      const blocked = !e.eligible;
      setCreditBlocked(blocked);
      if (blocked) setMethod('pay_now');
    })();
    return () => {
      cancelled = true;
    };
  }, [dealer?.id]);

  const dueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + termDays);
    return d;
  }, [termDays]);

  if (!vehicle || !customer || !plan || !dealer) return null;

  const total = plan.dealer_price;
  const options = (plan.selected_options || {}) as Record<string, unknown>;
  const fullPriceBasis = options.price_basis === 'full-warranty';
  const netPrice = fullPriceBasis ? Number(options.ex_vat_total) : total / 1.2;
  const vatAmount = fullPriceBasis ? Number(options.vat_total) : total - netPrice;
  const planName = (options.label as string) || DEALER_PLAN_LABELS[plan.plan_type];
  const termLabel = (options.term as string) || `${plan.duration_months} months`;
  const excess = options.excess as number | undefined;
  const claimLimit = options.claim as number | undefined;
  const labour = options.labour as number | undefined;

  const customerComplete = Boolean(customer.name && customer.email && customer.phone && customer.postcode);

  const readFnError = async (error: unknown, data: unknown, fallback: string) => {
    const d = data as { error?: string } | null;
    if (d?.error) return String(d.error);
    try {
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } })?.context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) return String(body.error);
      }
    } catch {
      /* ignore */
    }
    return error instanceof Error ? error.message : fallback;
  };

  const createRecord = async () => {
    const { data, error } = await supabase.functions.invoke('dealer-create-checkout', {
      body: {
        quote_id: quoteId,
        dealer_id: dealer.id,
        payment_method: method,
        vehicle: {
          reg: vehicle.reg,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          mileage: vehicle.mileage,
        },
        customer,
        plan: {
          plan_type: plan.plan_type,
          duration_months: plan.duration_months,
          retail_price: plan.retail_price,
          dealer_price: plan.dealer_price,
          claim_limit: claimLimit,
          excess,
          labour_rate: labour,
          product_id: options.product_id,
          pricing_version: options.pricing_version,
          boost: options.boost === true,
        },
        discount_pct,
        embedded: method === 'pay_now' && !!stripePromise,
      },
    });
    if (error) throw new Error(await readFnError(error, data, 'Checkout failed'));
    return data as { checkout_url?: string; client_secret?: string; customer_id?: string };
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!customerComplete) {
      navigate('/dealer-portal/quote/customer');
      return;
    }
    if (method === 'invoice' && creditBlocked) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      const data = await createRecord();

      if (method === 'pay_now') {
        if (data?.client_secret && stripePromise) {
          setClientSecret(data.client_secret);
          setSubmitting(false);
          return;
        }
        const url = data?.checkout_url;
        if (!url) throw new Error('No checkout URL returned');
        window.location.href = url;
        return;
      }

      const id = data?.customer_id || '';
      navigate(
        `/dealer-portal/quote/confirmation?method=invoice${id ? `&id=${id}` : ''}&due=${dueDate.toISOString().slice(0, 10)}`,
      );
    } catch (err: unknown) {
      console.error('Dealer checkout error', err);
      const message = err instanceof Error ? err.message : 'Please try again or contact support.';
      setSubmitError(message);
      toast({
        title: 'Checkout failed',
        description: message,
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  const boostOn = options.boost === true;
  const shownClaim = boostOn ? Math.max(claimLimit ?? 0, 5000) : claimLimit;
  const productName = planName === 'Comprehensive Warranty' ? 'Platinum Plan' : planName;
  const coverLine = [
    termLabel,
    shownClaim !== undefined ? `£${shownClaim.toLocaleString()} claim limit` : null,
    excess !== undefined ? `£${excess} excess` : null,
    labour !== undefined ? `£${labour}/hr labour rate` : null,
  ].filter(Boolean).join(' · ');

  const accountAvailable = !creditBlocked && !!eligibility;
  const accountSelected = method === 'invoice' && accountAvailable;
  const ctaLabel = accountSelected ? 'Issue warranty using dealer account' : `Pay £${total.toFixed(2)} & issue warranty`;
  const ctaDisabled = submitting || (method === 'invoice' && creditBlocked);

  const Radio = ({ on }: { on: boolean }) => (
    <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-crm-orange' : 'border-border'}`}>
      {on && <span className="h-2.5 w-2.5 rounded-full bg-crm-orange" />}
    </span>
  );

  const optionClass = (on: boolean) =>
    `w-full rounded-xl border p-4 text-left transition-colors ${on ? 'border-crm-orange bg-crm-orange-soft' : 'border-border bg-card hover:border-crm-orange/50'}`;

  const blockedTitle = 'Dealer account billing unavailable';
  const blockedText =
    eligibility?.reason === 'new'
      ? `Account billing unlocks once your account is established. Pay by card for ${Math.max(1, (eligibility.required ?? 0) - (eligibility.paid_count ?? 0))} more warranty${(eligibility.required - eligibility.paid_count) === 1 ? '' : 's'} to unlock it (${eligibility.paid_count} of ${eligibility.required} so far).`
      : eligibility?.reason === 'blocked'
        ? 'Account billing is not switched on for your dealership. Call 0330 229 5045 to talk about account terms.'
        : eligibility?.reason === 'overdue'
          ? 'Your dealer account has an overdue balance. Clear outstanding invoices to use account billing.'
          : 'Checking whether account billing is available for your dealership.';

  return (
    <DealerJourneyLayout
      step={4}
      title="Review & issue warranty"
      subtitle="Confirm the customer, vehicle and warranty details before issuing."
      backTo="/dealer-portal/quote/customer"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[52fr_48fr]">
        {/* Warranty details */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-crm-navy">Warranty details</h2>
            <button type="button" onClick={() => navigate('/dealer-portal/quote/customer')} className="inline-flex items-center gap-1 text-sm font-semibold text-crm-blue">
              <Pencil className="h-4 w-4" /> Edit
            </button>
          </div>
          <div className="rounded-xl border border-border p-4 sm:p-5">
            <div className="grid gap-5 sm:grid-cols-2 sm:divide-x sm:divide-border">
              <div className="flex gap-3">
                <Car className="mt-0.5 h-5 w-5 shrink-0 text-crm-navy" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vehicle</p>
                  <span className="mt-1.5 inline-block rounded-md border border-crm-navy bg-crm-gold-pure px-2.5 py-0.5 text-lg font-extrabold tracking-wide text-crm-navy">{vehicle.reg}</span>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {[[vehicle.make, vehicle.model].filter(Boolean).join(' '), vehicle.year, vehicle.fuel_type].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 sm:pl-5">
                <User className="mt-0.5 h-5 w-5 shrink-0 text-crm-navy" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</p>
                  {customerComplete ? (
                    <>
                      <p className="mt-1 break-words text-lg font-bold text-crm-navy">{customer.name}</p>
                      <p className="break-all text-sm text-muted-foreground">{customer.email}</p>
                      {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
                    </>
                  ) : (
                    <button type="button" onClick={() => navigate('/dealer-portal/quote/customer')} className="mt-1 text-sm font-semibold text-crm-blue underline">Add customer details</button>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-3 border-t border-border pt-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-crm-navy" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comprehensive Warranty</p>
                <p className="text-lg font-bold text-crm-navy">{productName}</p>
                <p className="text-sm text-muted-foreground">{coverLine}</p>
                {boostOn && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-crm-green-soft px-2.5 py-1 text-xs font-bold text-crm-green-deep">
                    <Check className="h-3.5 w-3.5" /> Claim boost added · £{(shownClaim ?? 5000).toLocaleString()} per claim
                  </span>
                )}
              </div>
              <button type="button" onClick={() => navigate('/dealer-portal/quote/pricing')} className="inline-flex h-fit items-center gap-1 text-sm font-semibold text-crm-blue">
                <Pencil className="h-4 w-4" /> Edit
              </button>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-crm-green/30 bg-crm-green-soft p-4 sm:p-5">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-crm-green-deep">What happens next?</p>
            <ul className="mt-3 space-y-3">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-crm-green text-primary-foreground"><Check className="h-4 w-4" /></span>
                <span className="text-sm font-medium text-crm-navy">Your dealership sees the warranty confirmed in the dealer portal.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-crm-green text-primary-foreground"><Check className="h-4 w-4" /></span>
                <span className="text-sm font-medium text-crm-navy">The customer receives their warranty documents and a login for their own dashboard.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Payment */}
        <section className="self-start rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="mb-4 text-xl font-bold text-crm-navy">Payment to Panda Protect</h2>
          <div className="space-y-3">
            <button type="button" onClick={() => setMethod('pay_now')} aria-pressed={method === 'pay_now'} className={optionClass(method === 'pay_now')}>
              <div className="flex gap-3">
                <Radio on={method === 'pay_now'} />
                <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-crm-navy" />
                <div>
                  <p className="font-bold text-crm-navy">Pay now by card</p>
                  <p className="text-sm text-muted-foreground">Pay securely by card (powered by Stripe).</p>
                  <p className="text-sm text-muted-foreground">Warranty issued after successful payment.</p>
                </div>
              </div>
            </button>

            {accountAvailable ? (
              <button type="button" onClick={() => setMethod('invoice')} aria-pressed={accountSelected} className={optionClass(accountSelected)}>
                <div className="flex gap-3">
                  <Radio on={accountSelected} />
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-crm-navy" />
                  <div>
                    <p className="font-bold text-crm-navy">Dealer account billing</p>
                    <p className="text-sm text-muted-foreground">Pay through your Panda Protect dealer account on your agreed terms.</p>
                    <p className="text-sm text-muted-foreground">{termDays}-day terms · due {formatDate(dueDate)}</p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex gap-3 rounded-xl border border-border bg-muted p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-bold text-crm-navy">{eligibility ? blockedTitle : 'Dealer account billing'}</p>
                  <p className="text-sm text-muted-foreground">{blockedText}</p>
                  {eligibility?.reason === 'overdue' && (
                    <button type="button" onClick={() => navigate('/dealer-portal/warranties')} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-crm-blue underline">
                      View outstanding invoices <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-start justify-between gap-4 border-t border-border pt-5">
            <p className="text-lg font-bold text-crm-navy">Total payable to Panda Protect</p>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-crm-navy">£{total.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Includes VAT</p>
            </div>
          </div>

          {submitError && <div className="mt-4"><DealerFieldError>{submitError}</DealerFieldError></div>}

          <Button onClick={handleSubmit} disabled={ctaDisabled} className="mt-5 h-14 w-full rounded-xl bg-crm-orange text-base font-bold text-primary-foreground hover:bg-crm-orange/90">
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{accountSelected ? 'Issuing warranty…' : 'Processing payment…'}</>
            ) : !customerComplete ? (
              <>Complete customer details</>
            ) : (
              <>{!accountSelected && <Lock className="mr-2 h-4 w-4" />}{ctaLabel} <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            {accountSelected ? <>Added to your dealer account — no card payment today</> : <><Lock className="h-3.5 w-3.5" /> Secure payment powered by Stripe</>}
          </p>
        </section>
      </div>

      <button type="button" onClick={() => navigate('/dealer-portal/quote/customer')} disabled={submitting} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-crm-blue">
        <ArrowLeft className="h-4 w-4" /> Back to customer details
      </button>
      <Dialog open={!!clientSecret} onOpenChange={(o) => { if (!o) setClientSecret(null); }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogTitle>Pay securely by card</DialogTitle>
          <DialogDescription>Enter your card details below. You stay on this page.</DialogDescription>
          {clientSecret && stripePromise && (
            <EmbeddedCheckoutProvider key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </DialogContent>
      </Dialog>
    </DealerJourneyLayout>
  );
};

export default Step4Checkout;
