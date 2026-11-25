import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardEvent } from '@/lib/dealerDashboardMetrics';

export function useDealerDashboard(dealerId?: string) {
  return useQuery({
    queryKey: ['dealer-dashboard', dealerId],
    enabled: !!dealerId,
    staleTime: 30000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    queryFn: async () => {
      if (!dealerId) throw new Error('Dealer account required');
      const [quotes, customers, claims, cover] = await Promise.all([
        supabase.from('dealer_quotes').select('id, created_at, vehicle_reg, vehicle_make, vehicle_model, customer_name, dealer_price, price, status, paid_at').eq('dealer_id', dealerId).order('created_at', { ascending: false }),
        supabase.from('customers').select('id, name, registration_plate, vehicle_make, vehicle_model, signup_date, created_at, status, payment_status, payment_due_date, payment_type, is_deleted').eq('dealer_id', dealerId).order('signup_date', { ascending: false }),
        supabase.from('dealer_admin_claims').select('id, created_at, registration_plate, vehicle_make, vehicle_model, customer_name, status').eq('dealer_id', dealerId).order('created_at', { ascending: false }),
        supabase.from('dealer_warranties').select('quote_id, status').eq('dealer_id', dealerId).not('quote_id', 'is', null),
      ]);
      const error = quotes.error || customers.error || claims.error || cover.error;
      if (error) throw error;
      // A quote whose warranty was later cancelled or refunded must show that, not "Completed".
      const coverByQuote = new Map((cover.data || []).map(row => [row.quote_id, row.status]));
      const quoteRows = (quotes.data || []).map(row => ({ ...row, cover_status: coverByQuote.get(row.id) || null }));
      const records = (customers.data || []).filter(row => !row.is_deleted);
      const warranties = records.filter(row => !['cancelled', 'refunded'].includes(row.status.toLowerCase()));
      const events: DashboardEvent[] = [
        ...(quotes.data || []).map(row => ({ id: `quote-${row.id}`, date: row.created_at, series: 'Quotes' as const, title: 'Quote created', detail: [row.vehicle_reg, row.vehicle_make, row.vehicle_model].filter(Boolean).join(' · '), to: `/dealer-portal/quotes?search=${encodeURIComponent(row.vehicle_reg)}` })),
        ...warranties.map(row => ({ id: `warranty-${row.id}`, date: row.signup_date, series: 'Warranties' as const, title: 'Warranty added', detail: [row.registration_plate, row.vehicle_make, row.vehicle_model].filter(Boolean).join(' · '), to: '/dealer-portal/warranties' })),
        ...(claims.data || []).map(row => ({ id: `claim-${row.id}`, date: row.created_at, series: 'Claims' as const, title: 'Claim submitted', detail: [row.registration_plate, row.vehicle_make, row.vehicle_model].filter(Boolean).join(' · '), to: '/dealer-portal/dashboard' })),
        ...records.map(row => ({ id: `customer-${row.id}`, date: row.created_at, series: 'Customers' as const, title: 'Customer added', detail: row.name, to: '/dealer-portal/customers' })),
      ];
      return { quotes: quoteRows, customers: records, warranties, claims: claims.data || [], events: events.sort((a, b) => b.date.localeCompare(a.date)) };
    },
  });
}