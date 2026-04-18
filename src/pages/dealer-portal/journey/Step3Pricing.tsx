import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DealerPricingTable from '@/components/dealer/journey/DealerPricingTable';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';

/**
 * Dealer Step 3 — uses the duplicated retail pricing UI (DealerPricingTable),
 * wrapped in the dealer dark-theme layout with the journey progress bar.
 */
const Step3Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { vehicle, customer, setPlan, discount_pct } = useDealerJourney();

  useEffect(() => {
    if (!vehicle) navigate('/dealer-portal/quote/vehicle', { replace: true });
    else if (!customer) navigate('/dealer-portal/quote/customer', { replace: true });
  }, [vehicle, customer, navigate]);

  if (!vehicle || !customer) return null;

  // Adapt dealer journey vehicle → PricingTable's expected shape
  const vehicleData = {
    regNumber: vehicle.reg,
    mileage: vehicle.mileage || '',
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    fuelType: vehicle.fuel_type,
    transmission: vehicle.transmission,
    email: customer.email,
    phone: customer.phone,
    firstName: customer.name?.split(' ')[0],
    lastName: customer.name?.split(' ').slice(1).join(' '),
    address: [customer.address_line1, customer.town, customer.postcode].filter(Boolean).join(', '),
  };

  const handlePlanSelected = (
    planId: string,
    paymentType: string,
    planName?: string,
    pricingData?: {
      totalPrice: number;
      monthlyPrice: number;
      voluntaryExcess: number;
      selectedAddOns: { [addon: string]: boolean };
      protectionAddOns?: { [key: string]: boolean };
      claimLimit?: number;
      labourRate?: number;
      boostAddon?: boolean;
    }
  ) => {
    if (!pricingData) return;

    const months = paymentType === '12months' ? 12 : paymentType === '24months' ? 24 : paymentType === '36months' ? 36 : 12;

    const retail = pricingData.totalPrice;
    const dealer = +(retail * (1 - (discount_pct || 0) / 100)).toFixed(2);

    const normalized = (planId || '').toLowerCase();
    const planType: 'basic' | 'gold' | 'platinum' =
      normalized.includes('platinum') || normalized.includes('premium') || normalized.includes('elite')
        ? 'platinum'
        : normalized.includes('gold') || normalized.includes('essential')
        ? 'gold'
        : 'basic';

    setPlan({
      plan_type: planType,
      duration_months: months as 3 | 12 | 24 | 36,
      retail_price: retail,
      dealer_price: dealer,
    });

    navigate('/dealer-portal/quote/checkout');
  };

  return (
    <DealerJourneyLayout
      step={3}
      title=""
      backTo="/dealer-portal/quote/customer"
    >
      <div className="-mt-6 sm:-mt-10 -mx-4 dealer-pricing-dark">
        <DealerPricingTable
          vehicleData={vehicleData}
          onBack={() => navigate('/dealer-portal/quote/customer')}
          onPlanSelected={handlePlanSelected}
        />
      </div>
    </DealerJourneyLayout>
  );
};

export default Step3Pricing;
