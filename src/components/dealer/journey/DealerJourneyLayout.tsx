import React, { ReactNode, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { useDealerJourney } from '@/contexts/DealerJourneyContext';
import { Loader2, ArrowLeft, Save, Check, Lock } from 'lucide-react';
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

const STEPS = ['Choose cover', 'Customer details', 'Payment', 'Done'];
// Journey step number -> visible position (pricing comes before customer details)
const STEP_POSITION: Record<number, number> = { 1: 0, 3: 0, 2: 1, 4: 2, 5: 3 };

const JourneyProgress: React.FC<{ current: number }> = ({ current }) => {
  const progress = (current / (STEPS.length - 1)) * 100;
  return (
    <nav aria-label={`Step ${current + 1} of ${STEPS.length}: ${STEPS[current]}`} className="rounded-2xl bg-muted/40 px-4 py-3 sm:px-6">
      <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">Step {current + 1} of {STEPS.length}</span>
      <div className="relative mx-4 mt-3 h-9 sm:mx-10">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border" />
        <div
          className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-success transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <span
              key={label}
              aria-hidden="true"
              className={`absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors duration-500 ${done ? 'border-success bg-success text-primary-foreground' : active ? 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/20' : 'border-border bg-card text-muted-foreground'}`}
              style={{ left: `${(i / (STEPS.length - 1)) * 100}%` }}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
            </span>
          );
        })}
      </div>
      <ol className="relative mx-4 mt-2 h-6 sm:mx-10">
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          const isPay = label === 'Payment';
          return (
            <li
              key={label}
              aria-current={active ? 'step' : undefined}
              className={`absolute -translate-x-1/2 items-center gap-1 whitespace-nowrap text-xs font-semibold sm:text-base ${active ? 'flex text-foreground' : 'hidden sm:flex'} ${done ? 'text-success' : active ? '' : 'text-muted-foreground'}`}
              style={{ left: `${(i / (STEPS.length - 1)) * 100}%` }}
            >
              {isPay && !done && <Lock className="h-3.5 w-3.5" />}
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

  if (loadError) return <DealerLayout>{null}</DealerLayout>;
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
              {step !== 5 && <Button
                variant="default"
                size="sm"
                disabled={saving || !vehicle?.reg}
                onClick={handleSaveAndExit}
                className="min-h-11 font-semibold shadow-sm"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save & exit
              </Button>}
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
