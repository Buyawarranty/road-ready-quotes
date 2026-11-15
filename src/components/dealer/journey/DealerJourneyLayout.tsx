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
  <svg viewBox="0 0 64 36" className="w-8 h-5 drop-shadow-sm animate-car-bounce" aria-hidden="true">
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
  const progress = (current / (STEPS.length - 1)) * 100;

  return (
    <nav aria-label={`Step ${current + 1} of ${STEPS.length}: ${STEPS[current]}`}>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Step {current + 1} of {STEPS.length}</span>
        <span className="text-muted-foreground sm:hidden">{STEPS[current]}</span>
      </div>
      <div className="relative mx-5 h-11">
        <div className="absolute inset-x-0 top-9 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <span
              key={label}
              className={`absolute top-9 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-card transition-colors duration-500 ${done ? 'border-success bg-success text-primary-foreground' : active ? 'border-primary' : 'border-border'}`}
              style={{ left: `${(i / (STEPS.length - 1)) * 100}%` }}
              aria-hidden="true"
            >
              {done && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
            </span>
          );
        })}
        <div
          className="absolute top-0 z-10 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-primary/20 bg-card shadow-md transition-[left] duration-700 ease-out motion-reduce:transition-none"
          style={{ left: `${progress}%` }}
          aria-hidden="true"
        >
          <CarIcon />
        </div>
      </div>
      <ol className="relative mx-5 mt-1 hidden h-5 sm:block">
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          const alignment = i === 0 ? '' : i === STEPS.length - 1 ? '-translate-x-full' : '-translate-x-1/2';
          return (
            <li
              key={label}
              aria-current={active ? 'step' : undefined}
              className={`absolute whitespace-nowrap text-xs font-semibold ${alignment} ${done ? 'text-success' : active ? 'text-foreground' : 'text-muted-foreground'}`}
              style={{ left: `${(i / (STEPS.length - 1)) * 100}%` }}
            >
              {label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export const DealerJourneyLayout: React.FC<Props> = ({ step, title, subtitle, children, showBack = true, backTo }) => {
  const { dealer, loading, loadError, retry } = useDealerAuth();
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

  if (loadError) return <div className="flex min-h-screen items-center justify-center bg-background p-6"><div className="max-w-sm space-y-4 text-center"><p className="text-foreground">{loadError}</p><Button onClick={retry}>Try again</Button><Button variant="outline" onClick={() => window.location.reload()}>Reload page</Button></div></div>;
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!dealer) {
    return <Navigate to={`/dealer-portal/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return (
    <DealerLayout>
      <div className="-mx-3 sm:-mx-5 lg:-mx-6 bg-background text-foreground min-h-[calc(100vh-5rem)]">
        <div className="border-b border-gray-200 bg-gray-100/50 backdrop-blur">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {showBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (backTo) { navigate(backTo); return; }
                    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
                    if (idx > 0) navigate(-1);
                    else navigate('/dealer-portal/dashboard');
                  }}
                  className="h-11 gap-2 px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              )}
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
                className="min-h-11 border-orange-500/40 bg-transparent text-orange-600 hover:bg-orange-100 hover:text-orange-300"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save & exit
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="max-w-4xl mx-auto px-4 pt-1 pb-3">
            <JourneyProgress current={STEP_POSITION[step]} />
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-3 py-5 sm:px-4 sm:py-10">
          {(title || subtitle) && (
            <div className="mb-5 text-center sm:mb-6 sm:text-left">
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
