import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import TraderPricingTable, { TraderSelection } from '@/components/dealer/journey/TraderPricingTable';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Step3Pricing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dealer, loading } = useDealerAuth();
  const { vehicle, setPlan, discount_pct, setDiscountPct } = useDealerJourney();
  const { toast } = useToast();

  // Hydrate dealer discount once
  useEffect(() => {
    if (!dealer?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('dealers')
        .select('discount_pct')
        .eq('id', dealer.id)
        .maybeSingle();
      if (!cancelled && data && typeof (data as any).discount_pct === 'number') {
        setDiscountPct((data as any).discount_pct);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealer?.id]);

  if (!loading && !dealer) {
    return <Navigate to={`/dealer-portal/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const handleContinue = (sel: TraderSelection) => {
    if (!vehicle?.reg) {
      toast({ title: 'Vehicle required', description: 'Enter the vehicle registration to continue.', variant: 'destructive' });
      return;
    }
    const retail = sel.gross;
    const dealer_price = +(retail * (1 - (discount_pct || 0) / 100)).toFixed(2);
    const ctxMonths: 3 | 12 | 24 | 36 =
      sel.term === 3 ? 3 : sel.term === 24 ? 24 : sel.term === 36 ? 36 : 12;
    setPlan({
      plan_type: 'gold',
      duration_months: ctxMonths,
      retail_price: retail,
      dealer_price,
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
    <DealerLayout>
      <TraderPricingTable onContinue={handleContinue} onBack={() => navigate('/dealer-portal/dashboard')} />
    </DealerLayout>
  );
};

export default Step3Pricing;
