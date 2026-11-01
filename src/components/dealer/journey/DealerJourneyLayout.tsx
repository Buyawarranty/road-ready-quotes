import React, { ReactNode, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { Loader2, ArrowLeft, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { useDealerQuoteSave } from '@/hooks/useDealerQuoteSave';

interface Props {
  step: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBack?: boolean;
  backTo?: string;
}

const STEPS = ['Choose Warranty', 'Customer Details', 'Review & Pay', 'Done'];
// Journey step number -> visible position (pricing comes before customer details)
const STEP_POSITION: Record<number, number> = { 1: 0, 3: 0, 2: 1, 4: 2, 5: 3 };

const CarIcon = () => (
  <svg viewBox="0 0 64 36" className="w-12 h-7 drop-shadow-sm" aria-hidden="true">
    <rect x="4" y="10" width="54" height="18" rx="6" className="fill-primary" />
    <rect x="14" y="4" width="32" height="12" rx="4" className="fill-primary" />
    <rect x="18" y="7" width="10" height="7" rx="1.5" className="fill-primary-foreground/80" />
    <rect x="31" y="7" width="10" height="7" rx="1.5" className="fill-primary-foreground/80" />
    <circle cx="58" cy="15" r="2" className="fill-primary-foreground" />
    <circle cx="16" cy="28" r="5" className="fill-foreground" />
    <circle cx="46" cy="28" r="5" className="fill-foreground" />
    <circle cx="16" cy="28" r="2" className="fill-muted" />
    <circle cx="46" cy="28" r="2" className="fill-muted" />
  </svg>
);

const JourneyProgress: React.FC<{ current: number }> = ({ current }) => {
  const last = STEPS.length - 1;
  const pct = (current / last) * 100;
  return (
    <div className="relative pt-8" aria-label={`Step ${current + 1} of ${STEPS.length}: ${STEPS[current]}`}>
      <div className="relative mx-[12.5%] h-2.5 rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-full bg-success transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
        <div className="absolute -top-8 -translate-x-1/2 transition-all duration-700 ease-out" style={{ left: `${pct}%` }}>
          <CarIcon />
        </div>
      </div>
      <ol className="grid grid-cols-4 mt-3">
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex flex-col items-center text-center gap-1.5">
              <span
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-bold ${
                  done
                    ? 'bg-success text-success-foreground'
                    : active
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/25'
                      : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                {done ? <Check className="w-5 h-5" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`text-[11px] sm:text-sm font-semibold leading-tight ${
                  done ? 'text-success' : active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export const DealerJourneyLayout: React.FC<Props> = ({ step, title, subtitle, children, showBack = true, backTo }) => {
  const { dealer, loading } = useDealerAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { setDiscountPct, discount_pct, vehicle, reset } = useDealerJourney();
  const { save, saving } = useDealerQuoteSave(step);

  const handleSaveAndExit = async () => {
    const id = await save();
    if (id) {
      reset();
      navigate('/dealer-portal/quotes');
    }
  };

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
  }, [dealer?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!dealer) {
    return <Navigate to={`/dealer-portal/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <DealerLayout>
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-6 lg:-my-8 bg-gray-50 text-gray-900 min-h-[calc(100vh-5rem)]">
        <div className="border-b border-gray-200 bg-gray-100/50 backdrop-blur">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
              <span className="text-sm font-semibold text-orange-500">DEALER QUOTE</span>
            </div>
            <div className="flex items-center gap-2">
              {discount_pct > 0 && (
                <span className="text-xs px-3 py-1 rounded-full bg-orange-100 text-orange-600 font-semibold">
                  Discount: {discount_pct}%
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={saving || !vehicle?.reg}
                onClick={handleSaveAndExit}
                className="border-orange-500/40 bg-transparent text-orange-600 hover:bg-orange-100 hover:text-orange-300"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save & exit
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="max-w-4xl mx-auto px-4 pt-2 pb-5">
            <JourneyProgress current={STEP_POSITION[step]} />
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>}
              {subtitle && <p className="text-gray-600 mt-1 text-sm sm:text-base">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </DealerLayout>
  );
};
