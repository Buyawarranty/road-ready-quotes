import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerJourney, DEALER_PLAN_LABELS } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, FileText, Check, Loader2, ChevronLeft, ShieldCheck, Clock } from 'lucide-react';

type Method = 'pay_now' | 'invoice';

const Step4Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { dealer } = useDealerAuth();
  const { vehicle, customer, plan, discount_pct } = useDealerJourney();

  const [method, setMethod] = useState<Method>('pay_now');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!vehicle) navigate('/dealer-portal/quote/vehicle', { replace: true });
    else if (!customer) navigate('/dealer-portal/quote/customer', { replace: true });
    else if (!plan) navigate('/dealer-portal/quote/pricing', { replace: true });
  }, [vehicle, customer, plan, navigate]);

  if (!vehicle || !customer || !plan || !dealer) return null;

  const total = plan.dealer_price;
  const planName = DEALER_PLAN_LABELS[plan.plan_type];

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
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

      if (error) throw new Error(error.message || 'Checkout failed');

      if (method === 'pay_now') {
        const url = (data as any)?.checkout_url;
        if (!url) throw new Error('No checkout URL returned');
        window.location.href = url;
        return;
      }

      // Invoice path — go straight to confirmation
      const id = (data as any)?.customer_id || '';
      navigate(`/dealer-portal/quote/confirmation?method=invoice${id ? `&id=${id}` : ''}`);
    } catch (err: any) {
      console.error('Dealer checkout error', err);
      toast({
        title: 'Checkout failed',
        description: err?.message || 'Please try again or contact support.',
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  const OptionCard = ({
    value, icon: Icon, title, sub, badge, children,
  }: {
    value: Method;
    icon: React.ElementType;
    title: string;
    sub: string;
    badge?: string;
    children?: React.ReactNode;
  }) => {
    const active = method === value;
    return (
      <button
        type="button"
        onClick={() => setMethod(value)}
        className={`w-full text-left rounded-xl border-2 p-5 transition-all ${
          active ? 'border-orange-500 bg-orange-50/40' : 'border-gray-200 bg-white hover:border-orange-300'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            active ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'
          }`}>
            {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-gray-900 text-base">{title}</h3>
              {badge && (
                <span className="text-[10px] uppercase tracking-wider font-bold bg-yellow-300 text-gray-900 px-2 py-0.5 rounded">
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

  return (
    <DealerJourneyLayout
      step={4}
      title="Checkout"
      subtitle="Choose how you'd like to pay for this warranty."
      backTo="/dealer-portal/quote/pricing"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Payment options */}
        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Payment method</h2>

          <OptionCard
            value="pay_now"
            icon={CreditCard}
            title="Pay in full"
            sub="Secure card payment via Stripe. Warranty activates immediately."
            badge="Recommended"
          >
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-orange-500" /> Instant activation & policy documents</li>
              <li className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-orange-500" /> Cards, Apple Pay & Google Pay accepted</li>
            </ul>
          </OptionCard>

          <OptionCard
            value="invoice"
            icon={FileText}
            title="Invoice me (Pay later)"
            sub="Add to your dealer account. We'll invoice on your usual terms."
          >
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-orange-500" /> Settled with your monthly statement</li>
              <li className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-orange-500" /> Warranty issued straight away — no card needed</li>
            </ul>
          </OptionCard>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => navigate('/dealer-portal/quote/pricing')}
              className="rounded-full bg-gray-900 text-white hover:bg-gray-800 hover:text-white border-gray-900 px-5"
              disabled={submitting}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-full bg-orange-500 hover:bg-orange-600 text-white px-6 min-w-[180px]"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</>
              ) : method === 'pay_now' ? (
                <>Pay £{total.toFixed(2)} now</>
              ) : (
                <>Confirm & invoice me</>
              )}
            </Button>
          </div>
        </div>

        {/* Order summary */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-yellow-300 px-5 py-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-900">Order summary</p>
              <p className="font-bold text-gray-900">{planName} · {plan.duration_months} months</p>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Vehicle</p>
                <p className="font-semibold text-gray-900">{vehicle.reg}</p>
                <p className="text-gray-600 text-xs">
                  {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Customer</p>
                <p className="font-semibold text-gray-900 truncate">{customer.name}</p>
                <p className="text-gray-600 text-xs truncate">{customer.email}</p>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>Retail price</span>
                  <span>£{plan.retail_price.toFixed(2)}</span>
                </div>
                {discount_pct > 0 && (
                  <div className="flex justify-between text-orange-600 font-semibold">
                    <span>Dealer discount</span>
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
          </div>
        </aside>
      </div>
    </DealerJourneyLayout>
  );
};

export default Step4Checkout;
