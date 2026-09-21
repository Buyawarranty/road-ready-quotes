import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { Plus, Search, Trash2, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';

const STEP_PATHS: Record<number, string> = {
  1: '/dealer-portal/quote/vehicle',
  2: '/dealer-portal/quote/customer',
  3: '/dealer-portal/quote/pricing',
  4: '/dealer-portal/quote/checkout',
  5: '/dealer-portal/quote/confirmation',
};

const STEP_LABELS: Record<number, string> = {
  1: 'Vehicle details',
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
  const [search, setSearch] = useState('');

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

  const filtered = quotes.filter((q: any) =>
    q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    q.vehicle_reg?.toLowerCase().includes(search.toLowerCase()) ||
    q.vehicle_make?.toLowerCase().includes(search.toLowerCase()) ||
    q.vehicle_model?.toLowerCase().includes(search.toLowerCase())
  );

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
    navigate('/dealer-portal/quote/vehicle');
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

  const formatDateTime = (d: string) => {
    const date = new Date(d);
    return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <DealerLayout>
      {/* Header section — dark band */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 lg:-mt-8 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wider text-orange-500">QUOTES</h1>
            <span className="text-orange-500 text-2xl">◆</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-stretch w-full max-w-md">
              <div className="relative flex-1">
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 bg-white border-0 rounded-r-none text-gray-900 placeholder:text-gray-500 focus-visible:ring-orange-500"
                />
              </div>
              <Button
                size="icon"
                className="h-11 w-11 rounded-l-none bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={handleNewQuote}
              className="h-auto self-start px-0 text-sm font-bold tracking-wide text-crm-orange hover:bg-transparent hover:text-crm-orange md:self-auto"
            >
              <Plus className="h-5 w-5" /> New Quote
            </Button>
          </div>

          <div className="mt-4 text-sm">
            <span className="text-gray-600 font-semibold">Summary Stats: </span>
            <span className="text-orange-500 font-bold">Total Quotes ({quotes.length})</span>
          </div>
        </div>
      </div>

      {/* Quote list */}
      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-600">
              {search ? 'No quotes match your search.' : 'No saved quotes yet. Start a new quote to get going.'}
            </p>
          </div>
        ) : (
          filtered.map((q: any) => (
            <div
              key={q.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-orange-500/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row">
                {/* Vehicle registration plate */}
                <div className="w-full md:w-64 bg-muted flex items-center justify-center shrink-0 border-b md:border-b-0 md:border-r border-crm-line p-5">
                  <div className="w-full max-w-[16rem] space-y-3">
                    <div className="vehicle-reg-plate relative" aria-label={`Registration ${formatRegistration(q.vehicle_reg)}`}>
                      <div className="vehicle-reg-plate__country">
                        <span>GB</span>
                        <span>UK</span>
                      </div>
                      <div className="vehicle-reg-plate__text">{formatRegistration(q.vehicle_reg)}</div>
                      {q.vehicle_reg && (
                        <span className="vehicle-reg-plate__check" aria-hidden="true">
                          <Check className="h-5 w-5 stroke-[3]" />
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
                <div className="flex-1 p-5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-wide uppercase truncate">
                      {q.vehicle_reg || '—'}{' '}
                      {[q.vehicle_make, q.vehicle_model].filter(Boolean).join(' ')}
                    </h3>
                    <span className="text-gray-500 text-sm font-mono">#{formatRef(q.id)}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-700">Step:</span>{' '}
                    <span className="text-orange-600 font-medium">
                      {q.status === 'converted' || q.status === 'completed'
                        ? 'Completed'
                        : STEP_LABELS[Number(q.current_step || 1)] || 'Vehicle details'}
                    </span>
                    <span className="text-gray-500"> · Created on </span>
                    <span className="text-gray-700">{formatDateTime(q.created_at)}</span>
                  </p>
                  {q.customer_name && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-semibold text-gray-700">Customer:</span>{' '}
                      <span className="text-gray-700">{q.customer_name}</span>
                    </p>
                  )}
                </div>

                {/* Right: price + actions */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 px-5 py-4 md:py-5 md:min-w-[200px] border-t md:border-t-0 md:border-l border-gray-200 bg-white/60">
                  <div className="text-2xl md:text-3xl font-extrabold text-gray-900">
                    {q.price ? `£${Number(q.price).toFixed(2)}` : '—'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleDelete(q.id)}
                      className="h-9 w-9 border-gray-300 bg-transparent text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-800"
                      aria-label="Delete quote"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResume(q)}
                      className="h-9 bg-orange-500 hover:bg-orange-600 text-white font-bold tracking-wide"
                    >
                      Resume quote <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DealerLayout>
  );
};

export default DealerQuotesList;
