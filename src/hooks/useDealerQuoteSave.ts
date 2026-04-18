import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { useDealerAuth } from '@/hooks/useDealerAuth';

/**
 * Save the current journey state as a draft in dealer_quotes.
 * Creates a new row on first save, updates the same row on subsequent saves.
 */
export const useDealerQuoteSave = (currentStep: 1 | 2 | 3 | 4 | 5) => {
  const { dealer } = useDealerAuth();
  const { quoteId, setQuoteId, vehicle, customer, plan, discount_pct } = useDealerJourney();
  const [saving, setSaving] = useState(false);

  const save = async (opts?: { silent?: boolean; markStatus?: string }) => {
    if (!dealer?.id) {
      if (!opts?.silent) toast.error('Not signed in');
      return null;
    }
    if (!vehicle?.reg) {
      if (!opts?.silent) toast.error('Enter a vehicle registration before saving');
      return null;
    }

    setSaving(true);
    try {
      const payload: any = {
        dealer_id: dealer.id,
        current_step: currentStep,
        status: opts?.markStatus || 'draft',
        vehicle_reg: vehicle.reg,
        vehicle_make: vehicle.make || null,
        vehicle_model: vehicle.model || null,
        vehicle_year: vehicle.year || null,
        vehicle_fuel_type: vehicle.fuel_type || null,
        vehicle_transmission: vehicle.transmission || null,
        mileage: vehicle.mileage || null,
        customer_name: customer?.name || null,
        customer_email: customer?.email || null,
        customer_phone: customer?.phone || null,
        customer_address: customer
          ? {
              address_line1: customer.address_line1,
              address_line2: customer.address_line2 || null,
              town: customer.town,
              postcode: customer.postcode,
            }
          : null,
        plan_type: plan?.plan_type || null,
        warranty_duration: plan ? String(plan.duration_months) : null,
        retail_price: plan?.retail_price ?? null,
        dealer_price: plan?.dealer_price ?? null,
        price: plan?.dealer_price ?? null,
        discount_pct: discount_pct || 0,
      };

      let id = quoteId;
      if (id) {
        const { error } = await supabase.from('dealer_quotes').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('dealer_quotes')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        id = data.id;
        setQuoteId(id);
      }

      if (!opts?.silent) toast.success('Quote saved — resume any time from Quotes.');
      return id;
    } catch (err: any) {
      console.error('Failed to save dealer quote', err);
      if (!opts?.silent) toast.error(err.message || 'Failed to save quote');
      return null;
    } finally {
      setSaving(false);
    }
  };

  return { save, saving };
};
