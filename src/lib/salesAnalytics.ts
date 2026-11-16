import { dealerSaleAmount, isCountedDealerSale, isOutstandingDealerInvoice } from './dealerSales';

export interface AnalyticsSale {
  id: string;
  email?: string | null;
  registration_plate?: string | null;
  signup_date?: string | null;
  created_at?: string | null;
  final_amount?: number | string | null;
  payment_status?: string | null;
  status?: string | null;
  plan_type?: string | null;
  dealer_id?: string | null;
}

export interface AnalyticsSignup {
  id: string;
  status?: string | null;
  created_at?: string | null;
  dealer_id?: string | null;
}

export interface AnalyticsDateRange {
  from?: Date;
  to?: Date;
}

const DAY = 86_400_000;
const utcDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

export function isAnalyticsDateInRange(value: string | null | undefined, range?: AnalyticsDateRange): boolean {
  if (!range?.from) return true;
  if (!value) return false;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return false;
  const start = utcDay(range.from);
  const end = utcDay(range.to || range.from) + DAY;
  return time >= start && time < end;
}

export function isIssuedAnalyticsSale(sale: AnalyticsSale): boolean {
  return isCountedDealerSale(sale) && ['paid', 'invoice_pending', 'overdue'].includes((sale.payment_status || '').toLowerCase());
}

export function analyticsCustomerKey(sale: AnalyticsSale): string {
  const email = (sale.email || '').trim().toLowerCase();
  if (email) return `email:${email}`;
  const reg = (sale.registration_plate || '').replace(/\s/g, '').toUpperCase();
  return reg ? `reg:${reg}` : `record:${sale.id}`;
}

export function buildSalesAnalytics(
  sales: AnalyticsSale[],
  signups: AnalyticsSignup[],
  range?: AnalyticsDateRange,
) {
  const counted = sales.filter(isCountedDealerSale);
  const issued = counted.filter((sale) => isIssuedAnalyticsSale(sale) && isAnalyticsDateInRange(sale.signup_date || sale.created_at, range));
  const paid = issued.filter((sale) => (sale.payment_status || '').toLowerCase() === 'paid' && dealerSaleAmount(sale) > 0);
  const free = issued.filter((sale) => (sale.payment_status || '').toLowerCase() === 'paid' && dealerSaleAmount(sale) === 0);
  const outstanding = issued.filter(isOutstandingDealerInvoice);
  const filteredSignups = signups.filter((signup) => isAnalyticsDateInRange(signup.created_at, range));
  const approvedSignups = filteredSignups.filter((signup) => (signup.status || '').toLowerCase() === 'approved' || !!signup.dealer_id);

  return {
    issued,
    filteredSignups,
    customers: new Set(issued.map(analyticsCustomerKey)).size,
    signups: filteredSignups.length,
    approvedSignups: approvedSignups.length,
    signupConversion: filteredSignups.length ? Math.round((approvedSignups.length / filteredSignups.length) * 1000) / 10 : 0,
    sales: issued.length,
    paidSales: paid.length,
    freeSales: free.length,
    paidRevenue: paid.reduce((sum, sale) => sum + dealerSaleAmount(sale), 0),
    averagePaidSale: paid.length ? paid.reduce((sum, sale) => sum + dealerSaleAmount(sale), 0) / paid.length : 0,
    outstandingInvoices: outstanding.length,
    outstandingBalance: outstanding.reduce((sum, sale) => sum + dealerSaleAmount(sale), 0),
    pendingCheckouts: counted.filter((sale) => (sale.payment_status || '').toLowerCase() === 'pending' && isAnalyticsDateInRange(sale.signup_date || sale.created_at, range)).length,
  };
}

export function monthlySalesSeries(sales: AnalyticsSale[], signups: AnalyticsSignup[], now = new Date()) {
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - index), 1));
    return {
      key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`,
      month: date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
      sales: 0,
      signups: 0,
      revenue: 0,
    };
  });
  const byKey = new Map(months.map((month) => [month.key, month]));
  sales.filter(isIssuedAnalyticsSale).forEach((sale) => {
    const value = sale.signup_date || sale.created_at;
    if (!value) return;
    const date = new Date(value);
    const month = byKey.get(`${date.getUTCFullYear()}-${date.getUTCMonth()}`);
    if (!month) return;
    month.sales += 1;
    if ((sale.payment_status || '').toLowerCase() === 'paid') month.revenue += dealerSaleAmount(sale);
  });
  signups.forEach((signup) => {
    if (!signup.created_at) return;
    const date = new Date(signup.created_at);
    const month = byKey.get(`${date.getUTCFullYear()}-${date.getUTCMonth()}`);
    if (month) month.signups += 1;
  });
  return months;
}
