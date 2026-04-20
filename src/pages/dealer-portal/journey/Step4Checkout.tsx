import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDealerJourney, DEALER_PLAN_LABELS } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import StreamlinedCheckout from '@/components/checkout/StreamlinedCheckout';

/**
 * Dealer Step 4 — reuses the exact retail checkout (Stripe + Bumper) by
 * mapping dealer journey data into StreamlinedCheckout props.
 */
const Step4Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { dealer } = useDealerAuth();
  const { vehicle, customer, plan, discount_pct } = useDealerJourney();

  useEffect(() => {
    if (!vehicle) navigate('/dealer-portal/quote/vehicle', { replace: true });
    else if (!customer) navigate('/dealer-portal/quote/customer', { replace: true });
    else if (!plan) navigate('/dealer-portal/quote/pricing', { replace: true });
  }, [vehicle, customer, plan, navigate]);

  const mapped = useMemo(() => {
    if (!vehicle || !customer || !plan) return null;

    // Map dealer plan duration → retail paymentType strings
    const paymentType =
      plan.duration_months === 12
        ? '12months'
        : plan.duration_months === 24
        ? '24months'
        : plan.duration_months === 36
        ? '36months'
        : 'monthly';

    const totalPrice = plan.dealer_price;
    const monthlyPrice = Math.floor(totalPrice / Math.max(plan.duration_months, 1));

    return {
      vehicleData: {
        regNumber: vehicle.reg,
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || '',
        fuelType: vehicle.fuel_type || '',
        mileage: vehicle.mileage || '',
        transmission: vehicle.transmission || '',
        found: true,
      },
      planId: plan.plan_type,
      paymentType,
      planName: DEALER_PLAN_LABELS[plan.plan_type],
      pricingData: {
        basePrice: plan.retail_price,
        totalPrice,
        monthlyPrice,
      },
      // Pre-fill customer details on the checkout form
      prefillCustomer: customer,
      // Dealer-mode flags so retail-only side effects (abandoned cart,
      // fbclid analytics, marketing emails) are skipped server-side
      dealerContext: {
        dealer_id: dealer?.id,
        discount_pct,
      },
    };
  }, [vehicle, customer, plan, discount_pct, dealer?.id]);

  if (!mapped || !dealer) return null;

  return (
    <StreamlinedCheckout
      vehicleData={mapped.vehicleData}
      planId={mapped.planId}
      paymentType={mapped.paymentType}
      planName={mapped.planName}
      pricingData={mapped.pricingData}
      onBack={() => navigate('/dealer-portal/quote/pricing')}
      onNext={(data: any) => {
        const id = data?.customer_id || data?.id || '';
        navigate(`/dealer-portal/quote/confirmation${id ? `?id=${id}` : ''}`);
      }}
    />
  );
};

export default Step4Checkout;
