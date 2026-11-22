// Panda Protect Klaviyo events. Panda Protect sells to dealerships, so the
// Klaviyo profile is always the dealer account; end-customer contact details
// are never sent. Test dealers and test sales are never synced.
import { splitName, trackKlaviyoEvent } from './klaviyo.ts';

interface DealerRow {
  id: string;
  email?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  company_name?: string | null;
  is_test?: boolean | null;
}

const DEALER_COLUMNS = 'id, email, name, first_name, last_name, phone, company_name, is_test';

function dealerProfile(dealer: DealerRow) {
  const fromName = splitName(dealer.name);
  return {
    email: dealer.email || '',
    phone: dealer.phone,
    firstName: dealer.first_name || fromName.firstName,
    lastName: dealer.last_name || fromName.lastName,
    profileProperties: {
      account_type: 'Panda Protect dealer',
      company_name: dealer.company_name || null,
      panda_dealer_id: dealer.id,
    },
  };
}

/**
 * "Placed Order" for every confirmed dealer sale (card, invoice, free intro or
 * partner). The unique ID is per warranty, so an invoiced sale that is later
 * marked paid is still one order in Klaviyo. Never throws.
 */
export async function trackDealerSaleKlaviyo(admin: any, customerId: string, kind: 'invoice' | 'paid'): Promise<void> {
  try {
    const { data: sale } = await admin
      .from('customers')
      .select('id, dealer_id, registration_plate, vehicle_make, vehicle_model, vehicle_year, plan_type, payment_type, final_amount, is_test')
      .eq('id', customerId)
      .eq('brand', 'pandaprotect')
      .maybeSingle();
    if (!sale || sale.is_test === true || !sale.dealer_id) return;
    const { data: dealer } = await admin.from('dealers').select(DEALER_COLUMNS).eq('id', sale.dealer_id).maybeSingle();
    if (!dealer || dealer.is_test === true || !dealer.email) return;

    const amount = Number(sale.final_amount ?? 0);
    trackKlaviyoEvent({
      metricName: 'Placed Order',
      ...dealerProfile(dealer),
      value: Number.isFinite(amount) ? amount : 0,
      valueCurrency: 'GBP',
      uniqueId: `pandaprotect:sale:${sale.id}`,
      properties: {
        brand: 'Panda Protect',
        sale_method: kind,
        warranty_id: sale.id,
        plan_type: sale.plan_type || null,
        cover_months: sale.payment_type || null,
        vehicle_reg: sale.registration_plate || null,
        vehicle: [sale.vehicle_make, sale.vehicle_model, sale.vehicle_year].filter(Boolean).join(' ') || null,
      },
    });
  } catch (error) {
    console.warn('[Klaviyo] Dealer sale sync failed (non-blocking)', error instanceof Error ? error.message : String(error));
  }
}

/** "Started Checkout" when a dealer opens card checkout for a warranty. Never throws. */
export function trackDealerCheckoutKlaviyo(
  dealer: DealerRow,
  checkout: { sessionId: string; customerId: string; amount: number; planType?: string | null; coverMonths?: number | null; vehicleReg?: string | null },
): void {
  try {
    if (!dealer || dealer.is_test === true || !dealer.email) return;
    trackKlaviyoEvent({
      metricName: 'Started Checkout',
      ...dealerProfile(dealer),
      value: checkout.amount,
      valueCurrency: 'GBP',
      uniqueId: `pandaprotect:checkout:${checkout.sessionId}`,
      properties: {
        brand: 'Panda Protect',
        warranty_id: checkout.customerId,
        plan_type: checkout.planType || null,
        cover_months: checkout.coverMonths || null,
        vehicle_reg: checkout.vehicleReg || null,
      },
    });
  } catch (error) {
    console.warn('[Klaviyo] Dealer checkout sync failed (non-blocking)', error instanceof Error ? error.message : String(error));
  }
}
