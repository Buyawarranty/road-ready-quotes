import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardEvent } from '@/lib/dealerDashboardMetrics';

export function useDealerDashboard(dealerId?: string) {
  return useQuery({
    queryKey: ['dealer-dashboard', dealerId],
    enabled: !!dealerId,
    staleTime: 30000,
    queryFn: async () => {
      if (!dealerId) throw new Error('Dealer account required');
      const [quotes, customers, claims] = await Promise.all([
        supabase.from('dealer_quotes').select('id, created_at, vehicle_reg, vehicle_make, vehicle_model, customer_name, dealer_price, price, status').eq('dealer_id', dealerId).order('created_at', { ascending: false }),
        supabase.from('customers').select('id, name, registration_plate, vehicle_make, vehicle_model, signup_date, created_at, status, payment_status, payment_due_date, payment_type, is_deleted').eq('dealer_id', dealerId).order('signup_date', { ascending: false }),
        supabase.from('dealer_admin_claims').select('id, created_at, registration_plate, vehicle_make, vehicle_model, customer_name, status').eq('dealer_id', dealerId).order('created_at', { ascending: false }),
      ]);
      const error = quotes.error || customers.error || claims.error;
      if (error) throw error;
      const records = (customers.data || []).filter(row => !row.is_deleted);
      const warranties = records.filter(row => !['cancelled', 'refunded'].includes(row.status.toLowerCase()));
      const events: DashboardEvent[] = [
        ...(quotes.data || []).map(row => ({ id: `quote-${row.id}`, date: row.created_at, series: 'Quotes' as const, title: 'Quote created', detail: [row.vehicle_reg, row.vehicle_make, row.vehicle_model].filter(Boolean).join(' · '), to: `/dealer-portal/quotes?search=${encodeURIComponent(row.vehicle_reg)}` })),
        ...warranties.map(row => ({ id: `warranty-${row.id}`, date: row.signup_date, series: 'Warranties' as const, title: 'Warranty added', detail: [row.registration_plate, row.vehicle_make, row.vehicle_model].filter(Boolean).join(' · '), to: '/dealer-portal/warranties' })),
        ...(claims.data || []).map(row => ({ id: `claim-${row.id}`, date: row.created_at, series: 'Claims' as const, title: 'Claim submitted', detail: [row.registration_plate, row.vehicle_make, row.vehicle_model].filter(Boolean).join(' · '), to: '/dealer-portal/claims' })),
        ...records.map(row => ({ id: `customer-${row.id}`, date: row.created_at, series: 'Customers' as const, title: 'Customer added', detail: row.name, to: '/dealer-portal/customers' })),
      ];
      return { quotes: quotes.data || [], customers: records, warranties, claims: claims.data || [], events: events.sort((a, b) => b.date.localeCompare(a.date)) };
    },
  });
}