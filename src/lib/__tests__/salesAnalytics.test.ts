import { describe, expect, it } from 'vitest';
import { buildSalesAnalytics, isAnalyticsDateInRange, monthlySalesSeries } from '../salesAnalytics';
import { canAccessSalesAnalytics, canEditSalesAnalyticsPermission } from '../salesAnalyticsAccess';

const sales = [
  { id: 'sale-1', email: 'HASSAN.DEEN1@HOTMAIL.COM', registration_plate: 'B11CAD', signup_date: '2026-11-15T00:00:00Z', final_amount: 1.19, payment_status: 'paid', status: 'Active', dealer_id: 'dealer-1', plan_type: 'gold' },
  { id: 'sale-2', email: 'other@example.com', registration_plate: 'OT22HER', signup_date: '2026-11-14T00:00:00Z', final_amount: 300, payment_status: 'invoice_pending', status: 'Active', dealer_id: 'dealer-1', plan_type: 'gold' },
  { id: 'sale-3', email: 'hassan.deen1@hotmail.com', registration_plate: 'B11CAD', signup_date: '2026-10-01T00:00:00Z', final_amount: 0, payment_status: 'paid', status: 'Active', dealer_id: 'dealer-1', plan_type: 'gold' },
  { id: 'sale-4', email: 'unfinished@example.com', signup_date: '2026-11-13T00:00:00Z', final_amount: 100, payment_status: 'pending', status: 'Pending', dealer_id: 'dealer-2' },
  { id: 'sale-5', email: 'cancelled@example.com', signup_date: '2026-11-12T00:00:00Z', final_amount: 500, payment_status: 'paid', status: 'cancelled', dealer_id: 'dealer-2' },
];
const signups = [
  { id: 'signup-1', status: 'approved', dealer_id: 'dealer-1', created_at: '2026-11-10T10:00:00Z' },
  { id: 'signup-2', status: 'new', created_at: '2026-11-11T10:00:00Z' },
];

describe('Panda sales analytics', () => {
  it('counts real customers, signups, sales and the £1.19 paid revenue separately from invoices', () => {
    const result = buildSalesAnalytics(sales, signups);
    expect(result.customers).toBe(3);
    expect(result.signups).toBe(2);
    expect(result.approvedSignups).toBe(1);
    expect(result.signupConversion).toBe(50);
    expect(result.sales).toBe(3);
    expect(result.paidSales).toBe(1);
    expect(result.freeSales).toBe(1);
    expect(result.paidRevenue).toBe(1.19);
    expect(result.averagePaidSale).toBe(1.19);
    expect(result.outstandingInvoices).toBe(1);
    expect(result.outstandingBalance).toBe(300);
    expect(result.pendingCheckouts).toBe(1);
  });

  it('applies inclusive UTC calendar-day filters to sales and signups', () => {
    const range = { from: new Date(2026, 10, 15), to: new Date(2026, 10, 15) };
    expect(isAnalyticsDateInRange('2026-11-15T23:59:59Z', range)).toBe(true);
    expect(isAnalyticsDateInRange('2026-11-16T00:00:00Z', range)).toBe(false);
    const result = buildSalesAnalytics(sales, signups, range);
    expect(result.sales).toBe(1);
    expect(result.signups).toBe(0);
  });

  it('builds twelve months of real sales, signup and paid-revenue activity', () => {
    const series = monthlySalesSeries(sales, signups, new Date('2026-11-16T12:00:00Z'));
    expect(series).toHaveLength(12);
    expect(series.at(-1)).toMatchObject({ month: 'Nov', sales: 2, signups: 2, revenue: 1.19 });
    expect(series.at(-2)).toMatchObject({ month: 'Oct', sales: 1, signups: 0, revenue: 0 });
  });
});

describe('sales analytics access', () => {
  it('allows Admin and Super Admin', () => {
    expect(canAccessSalesAnalytics('admin')).toBe(true);
    expect(canAccessSalesAnalytics('super_admin')).toBe(true);
  });

  it('lets Super Admin revoke an Administrator analytics permission', () => {
    expect(canAccessSalesAnalytics('admin', { tab_analytics: false })).toBe(false);
  });

  it('lets Accounts staff open analytics', () => {
    expect(canAccessSalesAnalytics('accounts')).toBe(true);
    expect(canAccessSalesAnalytics('accounts_manager')).toBe(true);
  });

  it.each(['manager', 'bdm', 'viewer', 'dev_tester'])('does not let a permission grant expose analytics to %s', (role) => {
    expect(canAccessSalesAnalytics(role, { tab_analytics: true })).toBe(false);
    expect(canEditSalesAnalyticsPermission(role)).toBe(false);
  });
});
