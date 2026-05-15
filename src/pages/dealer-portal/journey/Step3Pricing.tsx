import React from 'react';
import { useNavigate } from 'react-router-dom';
import TraderPricingTable, { TraderSelection } from '@/components/dealer/journey/TraderPricingTable';
import { DealerJourneyLayout } from '@/components/dealer/journey/DealerJourneyLayout';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { useToast } from '@/hooks/use-toast';

const Step3Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { vehicle, setPlan, discount_pct } = useDealerJourney();
  const { toast } = useToast();

  const handleContinue = (sel: TraderSelection) => {
    if (!vehicle?.reg) {
      toast({ title: 'Vehicle required', description: 'Enter the vehicle registration to continue.', variant: 'destructive' });
      return;
    }
    const retail = sel.gross;
    const dealer = +(retail * (1 - (discount_pct || 0) / 100)).toFixed(2);
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
    navigate('/dealer-portal/quote/customer');
  };

  return (
    <DealerJourneyLayout
      step={1}
      title="Vehicle & cover"
      subtitle="Enter the registration to auto-fill details, then build your cover."
      backTo="/dealer-portal/dashboard"
    >
      <TraderPricingTable onContinue={handleContinue} onBack={() => navigate('/dealer-portal/dashboard')} />
    </DealerJourneyLayout>
  );
};

export default Step3Pricing;
