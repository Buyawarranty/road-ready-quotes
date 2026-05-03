import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TraderPricingTable, { TraderSelection } from '@/components/dealer/journey/TraderPricingTable';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';

const Step3Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { vehicle, customer, setPlan, discount_pct } = useDealerJourney();

  useEffect(() => {
    if (!vehicle) navigate('/dealer-portal/quote/vehicle', { replace: true });
    else if (!customer) navigate('/dealer-portal/quote/customer', { replace: true });
  }, [vehicle, customer, navigate]);

  if (!vehicle || !customer) return null;

  const handleContinue = (sel: TraderSelection) => {
    const retail = sel.gross;
    const dealer = +(retail * (1 - (discount_pct || 0) / 100)).toFixed(2);
    // Map non-retail terms onto the existing context union (3/12/24/36).
    // 6m falls back to 12 for legacy fields, but selected_options is the source of truth.
    const ctxMonths: 3 | 12 | 24 | 36 =
      sel.term === 3 ? 3 : sel.term === 24 ? 24 : sel.term === 36 ? 36 : 12;
    setPlan({
      plan_type: 'gold',
      duration_months: ctxMonths,
      retail_price: retail,
      dealer_price: dealer,
      term_months: sel.term,
      selected_options: {
        excess: sel.excess,
        labour: sel.labour,
        parts: sel.parts,
        claim: sel.claim,
        ex_vat: sel.exVat,
        gross: sel.gross,
        vat: sel.vat,
        monthly_equiv: sel.monthlyEquivalent,
      },
    } as any);
    navigate('/dealer-portal/quote/checkout');
  };

  return (
    <DealerJourneyLayout step={3} title="Choose your trader plan" subtitle="Single Gold tier — adjust options to match the deal." backTo="/dealer-portal/quote/customer">
      <TraderPricingTable onContinue={handleContinue} onBack={() => navigate('/dealer-portal/quote/customer')} />
    </DealerJourneyLayout>
  );
};

export default Step3Pricing;
