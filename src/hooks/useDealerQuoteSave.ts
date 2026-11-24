import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { EDITABLE_DEALER_QUOTE_STATUSES } from '@/lib/dealerJourneyState';
import { dealerRequest } from '@/lib/dealerRequest';
import { boundedDealerAuth } from '@/lib/dealerAuthLoad';

/**
 * Save the current journey state as a draft in dealer_quotes.
 * Creates a new row on first save, updates the same row on subsequent saves.
 */
export const useDealerQuoteSave = (currentStep: 1 | 2 | 3 | 4 | 5) => {
  const { dealer } = useDealerAuth();
  const { quoteId, setQuoteId, vehicle, customer, plan, discount_pct } = useDealerJourney();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const resolveDealerId = async (): Promise<string | null> => {
    if (dealer?.id) return dealer.id;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return null;
    const { data } = await supabase
      .from('dealers')
      .select('id')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    return (data as any)?.id ?? null;
  };

  const save = async (opts?: {
    silent?: boolean;
    markStatus?: string;
    overridePlan?: any;
    overrideVehicle?: any;
    overrideCustomer?: any;
  }) => {
    const planToSave = opts?.overridePlan ?? plan;
    const vehicleToSave = opts?.overrideVehicle ?? vehicle;
    const customerToSave = opts?.overrideCustomer ?? customer;
    if (!vehicleToSave?.reg) {
      if (!opts?.silent) toast.error('Enter a vehicle registration before saving');
      return null;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const dealerId = await boundedDealerAuth(resolveDealerId());
      if (!dealerId) throw new Error('Your dealer account could not be loaded. Please try again.');
      const payload: any = {
        dealer_id: dealerId,
        current_step: currentStep,
        status: opts?.markStatus || 'draft',
        vehicle_reg: vehicleToSave.reg,
        vehicle_make: vehicleToSave.make || null,
        vehicle_model: vehicleToSave.model || null,
        vehicle_year: vehicleToSave.year || null,
        vehicle_fuel_type: vehicleToSave.fuel_type || null,
        vehicle_transmission: vehicleToSave.transmission || null,
        mileage: vehicleToSave.mileage || null,
        customer_name: customerToSave?.name || null,
        customer_email: customerToSave?.email || null,
        customer_phone: customerToSave?.phone || null,
        customer_address: customerToSave
          ? {
              address_line1: customerToSave.address_line1,
              address_line2: customerToSave.address_line2 || null,
              town: customerToSave.town,
              postcode: customerToSave.postcode,
            }
          : null,
        plan_type: planToSave?.plan_type || null,
        warranty_duration: planToSave ? String(planToSave.term_months ?? planToSave.duration_months) : null,
        retail_price: planToSave?.retail_price ?? null,
        dealer_price: planToSave?.dealer_price ?? null,
        price: planToSave?.dealer_price ?? null,
        discount_pct: discount_pct || 0,
        plan_options: planToSave?.selected_options ?? null,
      };

      let id = quoteId;
      if (id) {
        const { data, error } = await dealerRequest(signal => supabase
          .from('dealer_quotes')
          .update(payload)
          .eq('id', id)
          .eq('dealer_id', dealerId)
          .in('status', EDITABLE_DEALER_QUOTE_STATUSES)
          .is('paid_at', null)
          .select('id')
          .abortSignal(signal)
          .maybeSingle(), 'Saving is taking longer than expected. Check your Quotes before trying again.');
        if (error) throw error;
        // A missing or settled quote must stay untouched; start a separate draft.
        if (!data) {
          const { data: created, error: insErr } = await dealerRequest(signal => supabase
            .from('dealer_quotes')
            .insert(payload)
            .select('id')
            .abortSignal(signal)
            .single(), 'Saving is taking longer than expected. Check your Quotes before trying again.');
          if (insErr) throw insErr;
          id = created.id;
          setQuoteId(id);
        }
      } else {
        const { data, error } = await dealerRequest(signal => supabase
          .from('dealer_quotes')
          .insert(payload)
          .select('id')
          .abortSignal(signal)
          .single(), 'Saving is taking longer than expected. Check your Quotes before trying again.');
        if (error) throw error;
        id = data.id;
        setQuoteId(id);
      }

      if (!opts?.silent) toast.success('Quote saved — resume any time from Quotes.');
      return id;
    } catch (err: any) {
      const message = err.message || 'Your quote could not be saved. Please try again.';
      setSaveError(message);
      if (!opts?.silent) toast.error(message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  return { save, saving, saveError };
};
