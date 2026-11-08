import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { DealerDateFilter } from '@/components/dealer/DealerDateFilter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { Plus, Search, Trash2, ArrowRight, Check, ShieldCheck, ClipboardCheck, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

const PAGE_SIZE = 10;

const STEP_PATHS: Record<number, string> = {
  1: '/dealer-portal/quote/pricing',
  2: '/dealer-portal/quote/customer',
  3: '/dealer-portal/quote/pricing',
  4: '/dealer-portal/quote/checkout',
  5: '/dealer-portal/quote/confirmation',
};

const STEP_LABELS: Record<number, string> = {
  1: 'Warranty quote',
  2: 'Customer details',
  3: 'Plan & pricing',
  4: 'Checkout',
  5: 'Completed',
};

const DealerQuotesList = () => {
  const { dealer } = useDealerAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hydrate, reset } = useDealerJourney();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [pageJump, setPageJump] = useState('');

  const { data: quotes = [] } = useQuery({
    queryKey: ['dealer-quotes-list', dealer?.id],
    queryFn: async () => {
      if (!dealer?.id) return [];
      const { data } = await supabase
        .from('dealer_quotes')
        .select('*')
        .eq('dealer_id', dealer.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!dealer?.id,
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = quotes.filter((q: any) => {
      const matchesSearch =
        !term ||
        q.customer_name?.toLowerCase().includes(term) ||
        q.customer_email?.toLowerCase().includes(term) ||
        q.customer_phone?.toLowerCase().includes(term.replace(/\s+/g, '')) ||
        q.vehicle_reg?.toLowerCase().includes(term.replace(/\s+/g, '')) ||
        q.vehicle_make?.toLowerCase().includes(term) ||
        q.vehicle_model?.toLowerCase().includes(term);
      const day = String(q.created_at || '').slice(0, 10);
      const matchesDate =
        !dateRange?.from ||
        (day >= format(dateRange.from, 'yyyy-MM-dd') &&
          day <= format(dateRange.to || dateRange.from, 'yyyy-MM-dd'));
      return matchesSearch && matchesDate;
    });
    return [...list].sort((a: any, b: any) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'desc' ? -diff : diff;
    });
  }, [quotes, search, dateRange, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const updateFilters = (fn: () => void) => {
    fn();
    setPage(1);
    setPageJump('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quote?')) return;
    const { error } = await supabase.from('dealer_quotes').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete quote');
      return;
    }
    toast.success('Quote deleted');
    queryClient.invalidateQueries({ queryKey: ['dealer-quotes-list', dealer?.id] });
  };

  const handleResume = (q: any) => {
    const addr = q.customer_address || {};
    hydrate({
      quoteId: q.id,
      vehicle: {
        reg: q.vehicle_reg || '',
        make: q.vehicle_make || undefined,
        model: q.vehicle_model || undefined,
        year: q.vehicle_year || undefined,
        mileage: q.mileage || undefined,
        fuel_type: q.vehicle_fuel_type || undefined,
        transmission: q.vehicle_transmission || undefined,
      },
      customer: q.customer_name
        ? {
            name: q.customer_name || '',
            email: q.customer_email || '',
            phone: q.customer_phone || '',
            address_line1: addr.address_line1 || '',
            address_line2: addr.address_line2 || '',
            town: addr.town || '',
            postcode: addr.postcode || '',
          }
        : null,
      plan:
        q.plan_type && q.warranty_duration
          ? {
              plan_type: q.plan_type as 'basic' | 'gold' | 'platinum',
              duration_months: Number(q.warranty_duration) as 3 | 12 | 24 | 36,
              retail_price: Number(q.retail_price || q.price || 0),
              dealer_price: Number(q.dealer_price || q.price || 0),
              term_months: Number(q.warranty_duration) as any,
              selected_options: (q as any).plan_options || undefined,
            }
          : null,
      discount_pct: Number(q.discount_pct || 0),
    });
    const step = Math.min(Math.max(Number(q.current_step || 1), 1), 5);
    navigate(STEP_PATHS[step] || STEP_PATHS[1]);
  };

  const handleNewQuote = () => {
    reset();
    navigate('/dealer-portal/quote/pricing');
  };

  const formatRef = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const formatRegistration = (reg?: string | null) => {
    const cleaned = (reg || '').replace(/\s+/g, '').toUpperCase();
    if (!cleaned) return 'REG TBC';
    return cleaned.length > 3 ? `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}` : cleaned;
  };

  const vehicleDescription = (q: any) => {
    const makeModel = [q.vehicle_make, q.vehicle_model].filter(Boolean).join(' ').toUpperCase();
    return [makeModel, q.vehicle_year, q.vehicle_fuel_type].filter(Boolean).join(' · ') || 'Vehicle details pending';
  };

  const mileageLabel = (mileage?: string | number | null) => {
    const number = Number(String(mileage || '').replace(/[^0-9]/g, ''));
    return Number.isFinite(number) && number > 0 ? `${number.toLocaleString('en-GB')} miles` : null;
  };

  const warrantyType = (q: any) => {
    const options = q.plan_options && typeof q.plan_options === 'object' ? q.plan_options : {};
    const savedType = String(options.warranty_type || options.warrantyType || '').toLowerCase();
    const planType = String(q.plan_type || '').toLowerCase();

    if (savedType === 'dealer-paid' || planType === 'basic') {
      return {
        label: 'Manage My Claim',
        detail: 'Manage My Claim only · You pay the repair bill',
        Icon: ClipboardCheck,
        tone: 'border-crm-blue/30 bg-crm-blue-soft text-crm-navy',
      };
    }

    if (savedType === 'fully-covered' || ['gold', 'platinum', 'premium'].includes(planType)) {
      return {
        label: 'Fully Covered Warranty',
        detail: 'Comprehensive cover · We handle claims and pay for repairs',
        Icon: ShieldCheck,
        tone: 'border-crm-green/30 bg-crm-green-soft text-crm-navy',
      };
    }

    return {
      label: 'Warranty not selected',
      detail: 'Resume this quote to choose the warranty type',
      Icon: ShieldCheck,
      tone: 'border-crm-line bg-muted text-crm-navy',
    };
  };

  const warrantyDetails = (q: any): string[] => {
    const options = q.plan_options && typeof q.plan_options === 'object' ? q.plan_options : {};
    const parts: string[] = [];
    const months = Number(q.warranty_duration || options.term || options.term_months || 0);
    if (months > 0) {
      parts.push(months === 12 ? '1 year warranty' : months === 24 ? '2 year warranty' : months === 36 ? '3 year warranty' : `${months} month warranty`);
    }
    const excess = Number(options.excess ?? options.excess_amount ?? NaN);
    if (Number.isFinite(excess)) parts.push(`£${excess} excess`);
    const claimLimit = Number(options.claimLimit ?? options.claim_limit ?? NaN);
    if (Number.isFinite(claimLimit) && claimLimit > 0) parts.push(`£${claimLimit.toLocaleString('en-GB')} claim limit`);
    const labour = Number(options.labourRate ?? options.labour_rate ?? NaN);
    if (Number.isFinite(labour) && labour > 0) parts.push(`£${labour}/hr labour rate`);
    const partsContrib = options.partsContribution ?? options.parts_contribution;
    if (partsContrib !== undefined && partsContrib !== null && partsContrib !== '') parts.push(`${partsContrib}% parts contribution`);
    return parts;
  };

  const formatDateTime = (d: string) => {
    const date = new Date(d);
    return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <DealerLayout>
      <div className="mx-auto max-w-7xl space-y-4 pb-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-crm-navy">Quotes</h1>
        <Button type="button" onClick={handleNewQuote} className="h-11 gap-2 px-4 font-bold"><Plus className="h-4 w-4" />New quote</Button>
      </header>
      <section aria-label="Quote filters" className="space-y-3 border-y border-crm-line py-4">
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-crm-orange" />
            <Input aria-label="Search quotes" placeholder="ENTER REG or customer name" value={search} onChange={event => updateFilters(() => setSearch(event.target.value))} className="h-12 border-2 border-crm-orange bg-crm-orange-soft pl-11 pr-12 text-base font-semibold text-crm-navy placeholder:text-muted-foreground focus-visible:ring-crm-orange" />
            {search && <Button type="button" variant="ghost" size="icon" aria-label="Clear search" onClick={() => updateFilters(() => setSearch(''))} className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 text-muted-foreground"><X className="h-4 w-4" /></Button>}
          </div>
          <DealerDateFilter value={dateRange} onChange={range => updateFilters(() => setDateRange(range))} className="min-w-0 [&>button]:w-full [&_button]:min-w-0 [&_button]:w-full" />
          <Button type="button" variant="outline" onClick={() => updateFilters(() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc'))} className="h-11 gap-2 border-crm-line bg-card font-semibold text-crm-navy">
            {sortDir === 'desc' ? <>Newest first<ArrowDown className="h-4 w-4 text-muted-foreground" /></> : <>Oldest first<ArrowUp className="h-4 w-4 text-muted-foreground" /></>}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground" aria-live="polite">
          <span><strong className="text-crm-navy">{quotes.length}</strong> saved quotes</span>
          <span>{search || dateRange?.from ? `${filtered.length} matching` : `${filtered.length} quotes`}</span>
        </div>
      </section>

      {/* Quote list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-card border border-crm-line rounded-lg px-4 py-8 text-center">
            <p className="text-muted-foreground">
              {search || dateRange?.from ? 'No quotes match your search or filters.' : 'No saved quotes yet. Start a new quote to get going.'}
            </p>
          </div>
        ) : (
          paginated.map((q: any) => {
            const warranty = warrantyType(q);
            const WarrantyIcon = warranty.Icon;
            return (
            <div
              key={q.id}
              className="bg-card border border-crm-line rounded-lg overflow-hidden hover:border-crm-orange/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row">
                {/* Vehicle registration plate */}
                <div className="w-full md:w-72 bg-muted flex items-center justify-center shrink-0 border-b md:border-b-0 md:border-r border-crm-line p-3 sm:p-4">
                  <div className="w-full max-w-[17rem] space-y-2.5">
                    <div className="vehicle-reg-plate vehicle-reg-plate--list relative" aria-label={`Registration ${formatRegistration(q.vehicle_reg)}`}>
                      <div className="vehicle-reg-plate__country">
                        <span>GB</span>
                        <span>UK</span>
                      </div>
                      <div className="vehicle-reg-plate__text">{formatRegistration(q.vehicle_reg)}</div>
                      {q.vehicle_reg && (
                        <span className="vehicle-reg-plate__check" aria-hidden="true">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-extrabold uppercase text-foreground">{vehicleDescription(q)}</p>
                      {mileageLabel(q.mileage) && <p className="mt-1 text-xs font-semibold text-muted-foreground">{mileageLabel(q.mileage)}</p>}
                    </div>
                  </div>
                </div>

                {/* Middle: details */}
                <div className="flex-1 p-3 sm:p-4 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-sm font-bold text-foreground break-words">
                      Quote #{formatRef(q.id)}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Step:</span>{' '}
                    <span className="text-crm-orange font-medium">
                      {q.status === 'awaiting_panda'
                        ? 'Awaiting Panda Protect'
                        : q.status === 'converted' || q.status === 'completed'
                        ? 'Completed'
                        : STEP_LABELS[Number(q.current_step || 1)] || 'Warranty quote'}
                    </span>
                    <span className="text-muted-foreground"> · Created on </span>
                    <span className="text-foreground">{formatDateTime(q.created_at)}</span>
                  </p>
                  {q.customer_name && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-semibold text-foreground">Customer:</span>{' '}
                      <span className="text-foreground">{q.customer_name}</span>
                    </p>
                  )}
                  <div className={`mt-3 inline-flex max-w-full items-start gap-2 rounded-md border px-3 py-2 ${warranty.tone}`}>
                    <WarrantyIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold">{warranty.label}</p>
                      {(() => {
                        const details = warrantyDetails(q);
                        return details.length > 0 ? (
                          <p className="mt-0.5 text-xs font-medium leading-snug">{details.join(' · ')}</p>
                        ) : (
                          <p className="mt-0.5 text-xs font-medium leading-snug">{warranty.detail}</p>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Right: price + actions */}
                <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end justify-between md:justify-center gap-3 px-3 py-3 sm:px-4 md:py-4 md:min-w-[200px] border-t md:border-t-0 md:border-l border-crm-line bg-card">
                  <div className="text-xl md:text-2xl font-extrabold text-foreground">
                    {q.price ? `£${Number(q.price).toFixed(2)}` : '—'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleDelete(q.id)}
                      className="h-11 w-11 shrink-0 border-crm-line bg-card text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                      aria-label="Delete quote"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResume(q)}
                      className="h-11 flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                    >
                      Resume quote <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-crm-line rounded-lg px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}</span> of{' '}
            <span className="font-semibold text-foreground">{filtered.length}</span> quotes
          </p>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="h-9 border-crm-line"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="px-1 text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`h-9 min-w-9 px-2 rounded-md text-sm font-semibold transition-colors ${
                        p === currentPage
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="h-9 border-crm-line"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const target = Number(pageJump);
              if (Number.isFinite(target) && target >= 1 && target <= totalPages) {
                setPage(target);
                setPageJump('');
              } else {
                toast.error(`Enter a page between 1 and ${totalPages}`);
              }
            }}
          >
            <label htmlFor="quote-page-jump" className="text-sm text-muted-foreground whitespace-nowrap">Go to page</label>
            <Input
              id="quote-page-jump"
              type="number"
              min={1}
              max={totalPages}
              value={pageJump}
              onChange={(e) => setPageJump(e.target.value)}
              placeholder={String(currentPage)}
              className="h-9 w-20 bg-card border-crm-line text-foreground"
            />
            <Button type="submit" size="sm" className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              Go
            </Button>
          </form>
        </div>
      )}
      </div>
    </DealerLayout>
  );
};

export default DealerQuotesList;
