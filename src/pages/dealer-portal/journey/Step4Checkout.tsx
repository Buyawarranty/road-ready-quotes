import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerJourney, DEALER_PLAN_LABELS } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
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
} from 'lucide-react';

type Method = 'pay_now' | 'invoice';

const PAYMENT_TERM_DAYS = 30;

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const Step4Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { dealer } = useDealerAuth();
  const { vehicle, customer, plan, discount_pct } = useDealerJourney();

  const [method, setMethod] = useState<Method>('pay_now');
  const [submitting, setSubmitting] = useState(false);
  const [creditBlocked, setCreditBlocked] = useState(false);

  useEffect(() => {
    if (!vehicle || !plan) navigate('/dealer-portal/quote/pricing', { replace: true });
    else if (!customer) navigate('/dealer-portal/quote/customer', { replace: true });
  }, [vehicle, customer, plan, navigate]);

  // Invoice eligibility — blocked when the dealer has an overdue unpaid invoice
  useEffect(() => {
    if (!dealer?.id) return;
    let cancelled = false;
    (async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - PAYMENT_TERM_DAYS);
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('dealer_id', dealer.id)
        .neq('payment_status', 'paid')
        .lt('signup_date', cutoff.toISOString())
        .limit(1);
      if (cancelled || error) return;
      const blocked = (data || []).length > 0;
      setCreditBlocked(blocked);
      if (blocked) setMethod('pay_now');
    })();
    return () => {
      cancelled = true;
    };
  }, [dealer?.id]);

  const dueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + PAYMENT_TERM_DAYS);
    return d;
  }, []);

  if (!vehicle || !customer || !plan || !dealer) return null;

  const total = plan.dealer_price;
  const options = (plan.selected_options || {}) as Record<string, unknown>;
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
        },
        discount_pct,
      },
    });
    if (error) throw new Error(await readFnError(error, data, 'Checkout failed'));
    return data as { checkout_url?: string; customer_id?: string };
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!customerComplete) {
      navigate('/dealer-portal/quote/customer');
      return;
    }
    if (method === 'invoice' && creditBlocked) return;

    setSubmitting(true);
    try {
      const data = await createRecord();

      if (method === 'pay_now') {
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
      toast({
        title: 'Checkout failed',
        description: err instanceof Error ? err.message : 'Please try again or contact support.',
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  const OptionCard = ({
    value,
    icon: Icon,
    title,
    sub,
    badge,
    disabled,
    children,
  }: {
    value: Method;
    icon: React.ElementType;
    title: string;
    sub: string;
    badge?: string;
    disabled?: boolean;
    children?: React.ReactNode;
  }) => {
    const active = method === value && !disabled;
    return (
      <button
        type="button"
        onClick={() => !disabled && setMethod(value)}
        aria-pressed={active}
        disabled={disabled}
        className={`w-full text-left rounded-xl border-2 p-4 sm:p-5 transition-all ${
          disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-70'
            : active
            ? 'border-orange-500 bg-orange-50/50'
            : 'border-gray-200 bg-white hover:border-orange-300'
        }`}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              active ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'
            }`}
          >
            {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Icon className={`w-5 h-5 ${disabled ? 'text-gray-400' : 'text-orange-500'}`} />
              <h3 className="font-bold text-gray-900 text-base">{title}</h3>
              {badge && (
                <span className="text-[10px] uppercase tracking-wider font-bold bg-gray-900 text-white px-2 py-0.5 rounded">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{sub}</p>
            {children && <div className="mt-3">{children}</div>}
          </div>
        </div>
      </button>
    );
  };

  const Benefit = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-2">
      <ShieldCheck className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </li>
  );

  const ctaLabel =
    method === 'pay_now'
      ? `Pay £${total.toFixed(2)} & issue warranty`
      : `Issue warranty & add £${total.toFixed(2)} to account`;

  const ctaDisabled = submitting || (method === 'invoice' && creditBlocked);

  return (
    <DealerJourneyLayout
      step={4}
      title="Checkout"
      subtitle="Choose how you'd like to pay for this warranty."
      backTo="/dealer-portal/quote/pricing"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Payment options */}
        <div className="space-y-4 order-1">
          <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Payment method</h2>

          <OptionCard
            value="pay_now"
            icon={CreditCard}
            title="Pay in full"
            sub="Pay securely by card. The warranty is issued as soon as payment is confirmed."
            badge="Pay now"
          >
            <ul className="space-y-1.5 text-xs text-gray-600">
              <Benefit>Instant warranty activation</Benefit>
              <Benefit>Policy documents issued immediately</Benefit>
              <Benefit>Card, Apple Pay and Google Pay accepted</Benefit>
              <Benefit>Secure payment via Stripe</Benefit>
            </ul>
          </OptionCard>

          <OptionCard
            value="invoice"
            icon={FileText}
            title="Invoice me (Pay later)"
            sub="Add this warranty to your dealer account and pay on your agreed terms."
            disabled={creditBlocked}
          >
            {creditBlocked ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-900">
                    <p className="font-bold">Pay later unavailable</p>
                    <p className="mt-0.5">Your dealer account has an outstanding overdue balance.</p>
                    <p className="mt-0.5">Please settle the outstanding invoice before using Pay later again.</p>
                    <span
                      role="link"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/dealer-portal/warranties');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate('/dealer-portal/warranties');
                      }}
                      className="mt-2 inline-flex items-center gap-1 font-bold text-amber-800 underline cursor-pointer"
                    >
                      View outstanding invoices <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                  <div>
                    <p className="text-gray-500">Payment terms</p>
                    <p className="font-bold text-gray-900 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-orange-500" /> {PAYMENT_TERM_DAYS} days
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payment due</p>
                    <p className="font-bold text-gray-900">{formatDate(dueDate)}</p>
                  </div>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  <Benefit>Warranty issued straight away</Benefit>
                  <Benefit>Added to your dealer account</Benefit>
                  <Benefit>No card payment required today</Benefit>
                  <Benefit>Invoice available in your account</Benefit>
                </ul>
              </div>
            )}
          </OptionCard>

          {method === 'invoice' && !creditBlocked && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-900">
                <span className="font-bold">Important</span> — Warranties linked to an unpaid invoice may be paused and
                claims will be unavailable until payment is received.
              </p>
            </div>
          )}

          {/* Good to know */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-600">
              <p className="font-bold text-gray-900">Good to know</p>
              {method === 'pay_now' ? (
                <p className="mt-0.5">
                  Your warranty will be issued as soon as payment is confirmed and will appear in your dealer account.
                </p>
              ) : (
                <>
                  <p className="mt-0.5">
                    Your warranty will be issued when the order is confirmed and added to your dealer account.
                  </p>
                  <p>Payment will be required according to your agreed terms.</p>
                </>
              )}
            </div>
          </div>

          {!customerComplete && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-amber-900">Customer details required</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/dealer-portal/quote/customer')}
                className="border-amber-300 text-amber-900 hover:bg-amber-100"
              >
                Complete details <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-500 pt-2 border-t border-gray-200">
            By issuing this warranty, you confirm that the vehicle, customer and cover details shown are correct.
          </p>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/dealer-portal/quote/customer')}
              className="rounded-full bg-gray-900 text-white hover:bg-gray-800 hover:text-white border-gray-900 px-5"
              disabled={submitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={ctaDisabled}
              className="rounded-full bg-orange-500 hover:bg-orange-600 text-white px-6 w-full sm:w-auto sm:min-w-[260px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {method === 'pay_now' ? 'Processing payment…' : 'Issuing warranty…'}
                </>
              ) : !customerComplete ? (
                <>Complete customer details</>
              ) : (
                <>
                  {ctaLabel} <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Order summary */}
        <aside className="order-2 lg:sticky lg:top-6 self-start">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-yellow-300 px-5 py-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-900">Order summary</p>
              <p className="font-bold text-gray-900">
                {planName} · {termLabel}
              </p>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Vehicle</p>
                  <button
                    type="button"
                    onClick={() => navigate('/dealer-portal/quote/vehicle')}
                    className="text-xs text-orange-600 font-semibold inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </div>
                <span className="inline-block bg-yellow-300 border border-gray-900 rounded px-2 py-0.5 font-extrabold tracking-wide text-gray-900">
                  {vehicle.reg}
                </span>
                <p className="text-gray-600 text-xs mt-1 break-words">
                  {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—'}
                </p>
                <p className="text-gray-500 text-xs">
                  {[vehicle.year, vehicle.fuel_type].filter(Boolean).join(' · ')}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Customer</p>
                  <button
                    type="button"
                    onClick={() => navigate('/dealer-portal/quote/customer')}
                    className="text-xs text-orange-600 font-semibold inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </div>
                {customerComplete ? (
                  <>
                    <p className="font-semibold text-gray-900 break-words">{customer.name}</p>
                    <p className="text-gray-600 text-xs break-all">{customer.email}</p>
                    {customer.phone && <p className="text-gray-600 text-xs">{customer.phone}</p>}
                  </>
                ) : (
                  <p className="text-xs font-semibold text-amber-700">Customer details required</p>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                  Warranty details
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Warranty</span>
                    <span className="font-semibold text-gray-900">{planName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration</span>
                    <span className="font-semibold text-gray-900">{termLabel}</span>
                  </div>
                  {excess !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Excess</span>
                      <span className="font-semibold text-gray-900">£{excess}</span>
                    </div>
                  )}
                  {claimLimit !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Claim limit</span>
                      <span className="font-semibold text-gray-900">£{claimLimit.toLocaleString()}</span>
                    </div>
                  )}
                  {labour !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Labour rate</span>
                      <span className="font-semibold text-gray-900">£{labour}/hr</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-1.5">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Price</p>
                <div className="flex justify-between text-gray-600">
                  <span>Warranty price</span>
                  <span>£{total.toFixed(2)}</span>
                </div>
                {discount_pct > 0 && (
                  <div className="flex justify-between text-orange-600 font-semibold">
                    <span>Dealer discount applied</span>
                    <span>−{discount_pct}%</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-extrabold text-gray-900 pt-2 border-t border-gray-200 mt-2">
                  <span>Total</span>
                  <span>£{total.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-gray-500 text-right">inc. VAT</p>
              </div>
            </div>

            {/* Dynamic footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-5 py-4 flex items-start gap-2">
              {method === 'pay_now' ? (
                <>
                  <Lock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-gray-600">
                    <p className="font-bold text-gray-900">Secure payment</p>
                    <p className="mt-0.5">Payments securely processed via Stripe.</p>
                    <p>Your payment information is encrypted and secure.</p>
                  </div>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-gray-600">
                    <p className="font-bold text-gray-900">Dealer account payment</p>
                    <p className="mt-0.5">
                      This warranty will be added to your dealer account and invoiced on your agreed payment terms.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </DealerJourneyLayout>
  );
};

export default Step4Checkout;
