import BogofBanner from '@/components/dealer/offer/BogofBanner';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerJourney, DEALER_PLAN_LABELS } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import DealerFieldError from '@/components/dealer/DealerFieldError';
import { canProceedToDealerPayment, isAssistedCustomer } from '@/lib/dealerAssistedCheckout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { TradeTermsDialog } from '@/components/dealer/journey/TradeTermsDialog';
import { fetchCurrentTradeTerms } from '@/lib/dealerTradeTerms';
import { DEALER_INTRO_MAX_MONTHS, DEALER_INTRO_PAID_TARGET } from '../../../../supabase/functions/_shared/dealerIntroOffer';

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
  Gift,
  ExternalLink,
} from 'lucide-react';

const INTRO_PAID_TARGET = DEALER_INTRO_PAID_TARGET;

type Method = 'pay_now' | 'invoice';

const PAYMENT_TERM_DAYS = 30;

interface PayLaterEligibility {
  eligible: boolean;
  reason: 'new' | 'cancellations' | 'overdue' | 'blocked' | 'pending' | 'approval_required' | null;
  paid_count: number;
  required: number;
  term_days: number;
  overdue_count: number;
  mode: 'auto' | 'allow' | 'block';
  request_status: 'pending' | 'approved' | 'rejected' | null;
  can_request: boolean;
  intro_free_remaining: number;
  intro_free_used: number;
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
  const [promoCode, setPromoCode] = useState('');
  const [promo, setPromo] = useState<{ code: string; discount_amount: number; total: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [requestingCredit, setRequestingCredit] = useState(false);

  useEffect(() => {
    if (!vehicle || !plan) navigate('/dealer-portal/quote/pricing', { replace: true });
    else if (!customer) navigate('/dealer-portal/quote/customer', { replace: true });
  }, [vehicle, customer, plan, navigate]);

  // Invoice eligibility and introductory offer use come from server-enforced dealer rules.
  const refreshEligibility = useCallback(async () => {
    if (!dealer?.id) return;
    const { data, error } = await (supabase.rpc as any)('get_dealer_paylater_eligibility', {
      p_dealer_id: dealer.id,
    });
    if (error || !data) return;
    const e = data as PayLaterEligibility;
    setEligibility(e);
    if (e.term_days) setTermDays(e.term_days);
    const blocked = !e.eligible;
    setCreditBlocked(blocked);
    if (blocked) setMethod('pay_now');
  }, [dealer?.id]);

  useEffect(() => { void refreshEligibility(); }, [refreshEligibility]);

  useEffect(() => {
    if (!dealer?.id) return;
    let cancelled = false;
    (async () => {
      const current = await fetchCurrentTradeTerms(supabase);
      const { data } = await (supabase as any).from('dealer_trade_terms_acceptances')
        .select('dealer_id').eq('dealer_id', dealer.id).eq('terms_version', current.version).maybeSingle();
      if (cancelled) return;
      const accepted = !!data;
      setTermsAccepted(accepted);
      if (!accepted) setTermsOpen(true);
    })();
    return () => { cancelled = true; };
  }, [dealer?.id]);

  const dueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + termDays);
    return d;
  }, [termDays]);

  if (!vehicle || !customer || !plan || !dealer) return null;

  const introFreeApplied = (eligibility?.intro_free_remaining ?? 0) > 0 && plan.duration_months <= DEALER_INTRO_MAX_MONTHS;
  const total = introFreeApplied ? 0 : promo?.total ?? plan.dealer_price;
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
  const assisted = isAssistedCustomer(customer);
  const paymentReady = canProceedToDealerPayment(customer);

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

  const createRecord = async (preview = false) => {
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
        promo_code: preview ? promoCode : promo?.code,
        preview_only: preview,
        embedded: method === 'pay_now' && !!stripePromise && !(typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches),
      },
    });
    if (error) throw new Error(await readFnError(error, data, 'Checkout failed'));
    return data as { checkout_url?: string; client_secret?: string; customer_id?: string; method?: string; code: string; discount_amount: number; total: number };
  };

  const applyPromo = async () => {
    setCheckingPromo(true);
    setPromoError(null);
    try { const data = await createRecord(true); setPromo({ code: data.code, discount_amount: data.discount_amount, total: data.total }); }
    catch (error) { setPromo(null); setPromoError(error instanceof Error ? error.message : 'Please check your promo code.'); }
    finally { setCheckingPromo(false); }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (termsAccepted !== true) {
      setTermsOpen(true);
      return;
    }
    if (!paymentReady) {
      navigate('/dealer-portal/quote/customer');
      return;
    }
    if (method === 'invoice' && creditBlocked) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      const data = await createRecord();

      if (data?.method === 'intro_free') {
        navigate(`/dealer-portal/quote/confirmation?method=free${data.customer_id ? `&id=${data.customer_id}` : ''}`);
        return;
      }

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
      if (message.includes('Trade Terms')) setTermsOpen(true);
      setSubmitError(message);
      toast({
        title: 'Checkout failed',
        description: message,
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  const requestCredit = async () => {
    if (requestingCredit) return;
    setRequestingCredit(true);
    setSubmitError(null);
    const { data, error } = await supabase.functions.invoke('dealer-credit-authorisation', {
      body: { action: 'request_credit', dealer_id: dealer.id },
    });
    setRequestingCredit(false);
    if (error || data?.error) {
      const message = data?.error || 'We could not send your request. Please try again.';
      setSubmitError(message);
      toast({ title: 'Credit request not sent', description: message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Request sent', description: 'An Admin or Super Admin can now authorise 30-day invoicing from Dealer billing.' });
    await refreshEligibility();
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

  const paidCount = eligibility?.paid_count ?? 0;
  const invoiceRequired = eligibility?.required ?? 3;
  const introLeft: number = 0; // Old 3+3 progress card retired by buy-one-get-one-free.
  const accountAvailable = !creditBlocked && !!eligibility;
  const accountSelected = method === 'invoice' && accountAvailable;
  const ctaLabel = termsAccepted !== true
    ? 'Review trade terms to continue'
    : introFreeApplied
      ? 'Activate your free warranty now'
      : accountSelected
        ? 'Activate now and pay later'
        : `Pay £${total.toFixed(2)} & issue warranty`;
  const ctaDisabled = submitting || checkingPromo || (method === 'invoice' && creditBlocked);

  const Radio = ({ on }: { on: boolean }) => (
    <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-crm-orange' : 'border-border'}`}>
      {on && <span className="h-2.5 w-2.5 rounded-full bg-crm-orange" />}
    </span>
  );

  const optionClass = (on: boolean) =>
    `w-full rounded-2xl border p-4 text-left transition-colors ${on ? 'border-crm-orange bg-crm-orange-soft' : 'border-border bg-card hover:border-crm-orange/50'}`;

  const blockedText =
    eligibility?.reason === 'new'
      ? `Account billing unlocks once your account is established. Pay by card for ${Math.max(1, (eligibility.required ?? 0) - (eligibility.paid_count ?? 0))} more warranty${(eligibility.required - eligibility.paid_count) === 1 ? '' : 's'} to unlock it (${eligibility.paid_count} of ${eligibility.required} so far).`
      : eligibility?.reason === 'blocked'
        ? 'Account billing is not switched on for your dealership. Call 0330 229 6547 to talk about account terms.'
        : eligibility?.reason === 'overdue'
          ? 'Your dealer account has an overdue balance. Clear outstanding invoices to use account billing.'
          : eligibility?.reason === 'pending'
            ? 'Your 30-day invoicing request is waiting for Admin or Super Admin authorisation.'
            : eligibility?.reason === 'approval_required'
              ? 'You meet the paid-warranty criteria. Request authorisation to activate 30-day invoicing.'
              : 'Checking whether account billing is available for your dealership.';

  return (
    <DealerJourneyLayout
      step={4}
      title="Trade checkout"
      subtitle="Confirm the customer, vehicle and warranty details before issuing."
      backTo="/dealer-portal/quote/customer"
    >
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
        <h2 className="text-2xl font-extrabold text-crm-navy sm:text-3xl">Trade checkout</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-crm-green-soft px-3 py-1.5 text-sm font-bold text-crm-green-deep"><ShieldCheck className="h-4 w-4" /> Trade account</span>
      </div>
      <div className="mx-auto mb-5 w-full max-w-3xl"><BogofBanner dealerId={dealer?.id} /></div>
      <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6">
        {/* Warranty details */}
        <section className="min-w-0">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="grid gap-5">
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
              <div className="flex gap-3 border-t border-border pt-5">
                <User className="mt-0.5 h-5 w-5 shrink-0 text-crm-navy" />
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</p><button type="button" onClick={() => navigate('/dealer-portal/quote/customer')} className="inline-flex items-center gap-1 text-sm font-semibold text-crm-blue"><Pencil className="h-3.5 w-3.5" /> Edit</button></div>
                  {assisted ? <p className="mt-1 text-sm font-semibold text-crm-navy">Panda Protect will complete the customer details.</p> : customerComplete ? (
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
          <div className="mt-5 rounded-2xl border border-crm-green/30 bg-crm-green-soft p-4 sm:p-5">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-crm-green-deep"><Gift className="h-5 w-5" /> Your trade benefits</p>
            <ul className="mt-3 space-y-3">
              {((eligibility?.intro_free_remaining ?? 0) > 0 || (eligibility?.paid_count ?? 0) < INTRO_PAID_TARGET) && (
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-crm-green text-primary-foreground"><Check className="h-4 w-4" /></span>
                <span><span className="block text-sm font-bold text-crm-navy">Buy one warranty, get the next one free</span><span className="text-sm text-muted-foreground">Every paid warranty earns one free warranty (up to 3 years' cover), applied automatically while the offer is running.</span></span>
              </li>
              )}
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-crm-green text-primary-foreground"><Check className="h-4 w-4" /></span>
                <span><span className="block text-sm font-bold text-crm-navy">{termDays}-day invoicing</span><span className="text-sm text-muted-foreground">Available once you've paid for {invoiceRequired} warranties with no cancellations or refunds. Approved by our team.</span></span>
              </li>
            </ul>
            <a href="/dealer-portal/trade-terms" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-crm-blue">View trade terms & conditions <ExternalLink className="h-3.5 w-3.5" /></a>
          </div>
        </section>

        {/* Payment */}
        <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          {introFreeApplied && (
            <div className="mb-6 rounded-2xl border border-crm-green/30 bg-crm-green-soft p-4 sm:p-5">
              <p className="flex items-center gap-2 text-lg font-bold text-crm-navy"><Gift className="h-5 w-5 text-crm-green-deep" /> Your free warranty is ready</p>
              <p className="mt-2 text-sm text-muted-foreground">Buy one, get the next one free applies to this warranty at £0. Cover goes live straight away. You have {eligibility?.intro_free_remaining} free {eligibility?.intro_free_remaining === 1 ? 'warranty' : 'warranties'} remaining including this one.</p>
            </div>
          )}
          {!introFreeApplied && introLeft > 0 && (
            <div className="mb-6 rounded-2xl border border-crm-green/30 bg-crm-green-soft p-4 sm:p-5">
              <p className="flex items-center gap-2 text-lg font-bold text-crm-navy"><Gift className="h-5 w-5 text-crm-green-deep" /> Your introductory trade offer</p>
              <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                <span className="text-crm-navy">{Math.min(paidCount, INTRO_PAID_TARGET)} of {INTRO_PAID_TARGET} paid warranties completed</span>
                <span className="font-bold text-crm-green-deep">{introLeft} to go</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {Array.from({ length: INTRO_PAID_TARGET }).map((_, i) => <span key={i} className={`h-2 rounded-full ${i < paidCount ? 'bg-crm-green' : 'bg-border'}`} />)}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Purchase {introLeft} more warrant{introLeft === 1 ? 'y' : 'ies'} to unlock {INTRO_PAID_TARGET} free warranties, each up to 3 years' cover.</p>
            </div>
          )}
          <h2 className="mb-4 text-xl font-bold text-crm-navy">Choose how to pay</h2>
          <div className="space-y-3">
            <button type="button" onClick={() => setMethod('pay_now')} aria-pressed={method === 'pay_now'} className={optionClass(method === 'pay_now')}>
              <div className="flex gap-3">
                <Radio on={method === 'pay_now'} />
                <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-crm-navy" />
                <div>
                  <p className="font-bold text-crm-navy">Pay now by card</p>
                  <p className="text-sm text-muted-foreground">Pay securely by card (powered by Stripe).</p>
                  <p className="text-sm text-muted-foreground">Your warranty is issued after payment.</p>
                </div>
              </div>
            </button>

            {accountAvailable ? (
              <button type="button" onClick={() => setMethod('invoice')} aria-pressed={accountSelected} className={optionClass(accountSelected)}>
                <div className="flex gap-3">
                  <Radio on={accountSelected} />
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-crm-navy" />
                  <div>
                    <p className="font-bold text-crm-navy">{termDays}-day invoice</p>
                    <p className="text-sm text-muted-foreground">Pay through your Panda Protect dealer account on your agreed terms.</p>
                    <p className="text-sm text-muted-foreground">{termDays}-day terms · due {formatDate(dueDate)}</p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex gap-3 rounded-xl border border-border bg-muted p-4">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-crm-navy" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-crm-navy">{termDays}-day invoice</p>
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-xs font-semibold text-crm-navy"><Lock className="h-3 w-3" /> Locked</span>
                  </div>
                  {eligibility?.reason === 'new' ? (
                    <>
                      <p className="text-sm text-muted-foreground">Available after {invoiceRequired} paid warranties with no cancellations or refunds. You currently have {paidCount} of {invoiceRequired}.</p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-crm-blue" style={{ width: `${Math.min(100, (paidCount / Math.max(1, invoiceRequired)) * 100)}%` }} /></div>
                    </>
                  ) : <p className="text-sm text-muted-foreground">{blockedText}</p>}
                  {eligibility?.can_request && (
                    <Button type="button" variant="outline" disabled={requestingCredit} onClick={requestCredit} className="mt-3 w-full">
                      {requestingCredit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Request 30-day invoicing
                    </Button>
                  )}
                  {eligibility?.reason === 'overdue' && (
                    <button type="button" onClick={() => navigate('/dealer-portal/invoicing')} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-crm-blue underline">
                      View outstanding invoices <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-border pt-5">
            {introFreeApplied && <p className="mb-3 rounded-xl bg-crm-green-soft p-3 text-sm font-semibold text-crm-green-deep">Buy one get one free applied automatically · £{plan.dealer_price.toFixed(2)} off</p>}
            <label htmlFor="dealer-promo" className="mb-2 block text-sm font-bold text-crm-navy">Promo code</label>
            <div className="flex gap-2">
              <Input id="dealer-promo" value={promoCode} disabled={submitting || checkingPromo || introFreeApplied} onChange={event => { setPromoCode(event.target.value.toUpperCase()); setPromo(null); setPromoError(null); }} placeholder={introFreeApplied ? 'Free offer already applied' : 'Enter promo code'} className="min-w-0 flex-1" />
              <Button variant="outline" disabled={!promoCode.trim() || checkingPromo || submitting || introFreeApplied} onClick={applyPromo}>{checkingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}</Button>
            </div>
            {promoError && <div className="mt-2"><DealerFieldError>{promoError}</DealerFieldError></div>}
            {promo && <div className="mt-3 flex items-center justify-between gap-2 text-sm text-crm-green-deep"><span className="flex items-center gap-1"><Check className="h-4 w-4" />{promo.code} · £{promo.discount_amount.toFixed(2)} off</span><Button variant="ghost" size="sm" onClick={() => { setPromo(null); setPromoCode(''); }}>Remove</Button></div>}
          </div>
          {promo && <div className="mt-4 flex justify-between text-sm text-muted-foreground"><span>Before discount</span><span>£{plan.dealer_price.toFixed(2)}</span></div>}
          <div className="mt-5 flex items-start justify-between gap-4 border-t border-border pt-5">
            <p className="text-lg font-bold text-crm-navy">Total payable to Panda Protect</p>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-crm-navy">£{total.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Includes VAT</p>
            </div>
          </div>

          {submitError && <div className="mt-4"><DealerFieldError>{submitError}</DealerFieldError></div>}

          <Button onClick={handleSubmit} disabled={ctaDisabled} className="mt-5 h-14 w-full rounded-xl bg-crm-orange text-base font-bold text-primary-foreground hover:bg-crm-orange/90">
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{introFreeApplied ? 'Requesting free warranty…' : accountSelected ? 'Issuing warranty…' : 'Processing payment…'}</>
            ) : !paymentReady ? (
              <>Complete customer details</>
            ) : (
              <>{!accountSelected && <Lock className="mr-2 h-4 w-4" />}{ctaLabel} <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            {introFreeApplied ? <>Buy one get one free · no payment due</> : accountSelected ? <>Added to your dealer account — no card payment today</> : <><Lock className="h-3.5 w-3.5" /> Secure payment powered by Stripe</>}
          </p>
        </section>
      </div>

      <button type="button" onClick={() => navigate('/dealer-portal/quote/customer')} disabled={submitting} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-crm-blue">
        <ArrowLeft className="h-4 w-4" /> Back to customer details
      </button>
      <TradeTermsDialog dealerId={dealer.id} open={termsOpen} onOpenChange={setTermsOpen} onAccepted={() => {
        setTermsAccepted(true);
        toast({ title: 'Trade terms accepted', description: 'Your acceptance has been recorded for this dealership.' });
      }} />
      <Dialog open={!!clientSecret} onOpenChange={(o) => { if (!o) setClientSecret(null); }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogTitle>Pay securely by card</DialogTitle>
          <DialogDescription>Enter your card details below. You stay on this page.</DialogDescription>
          {clientSecret && stripePromise && (
            <EmbeddedCheckoutProvider key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
              <div className="min-h-[480px] w-full min-w-0"><EmbeddedCheckout /></div>
            </EmbeddedCheckoutProvider>
          )}
        </DialogContent>
      </Dialog>
    </DealerJourneyLayout>
  );
};

export default Step4Checkout;
