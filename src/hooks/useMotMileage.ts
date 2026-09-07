import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MotTest {
  odometerValue?: number;
  odometerUnit?: string;
  completedDate?: string;
  testResult?: string;
}

export type MotMileageSource = 'cache' | 'live' | 'none';

interface UseMotMileageResult {
  motMileage: number | null;
  motDate: string | null;
  source: MotMileageSource;
  isLoading: boolean;
  error: string | null;
}

/** Pick the newest MOT test that carries a real odometer reading. */
const pickLatestOdometer = (raw: unknown): MotTest | null => {
  const tests: MotTest[] = Array.isArray(raw) ? (raw as MotTest[]) : [];
  if (tests.length === 0) return null;
  return (
    [...tests]
      .sort((a, b) => {
        const dateA = a.completedDate ? new Date(a.completedDate).getTime() : 0;
        const dateB = b.completedDate ? new Date(b.completedDate).getTime() : 0;
        return dateB - dateA;
      })
      .find((t) => t.odometerValue && Number(t.odometerValue) > 0) ?? null
  );
};

export const useMotMileage = (registrationNumber: string | undefined): UseMotMileageResult => {
  const [motMileage, setMotMileage] = useState<number | null>(null);
  const [motDate, setMotDate] = useState<string | null>(null);
  const [source, setSource] = useState<MotMileageSource>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const reset = () => {
      if (cancelled) return;
      setMotMileage(null);
      setMotDate(null);
      setSource('none');
    };

    const fetchMotMileage = async () => {
      if (!registrationNumber) {
        reset();
        return;
      }

      const normalizedReg = registrationNumber.replace(/\s+/g, '').toUpperCase();
      if (normalizedReg.length < 4) {
        reset();
        return;
      }
      const spacedReg =
        normalizedReg.length > 3
          ? `${normalizedReg.slice(0, -3)} ${normalizedReg.slice(-3)}`
          : normalizedReg;

      setIsLoading(true);
      setError(null);

      const readCache = async () => {
        const { data, error: fetchError } = await supabase
          .from('mot_history')
          .select('mot_tests')
          .in('registration', [normalizedReg, spacedReg])
          .limit(1)
          .maybeSingle();
        if (fetchError) throw fetchError;
        return pickLatestOdometer(data?.mot_tests);
      };

      try {
        let latest = await readCache();
        let resolvedSource: MotMileageSource = latest ? 'cache' : 'none';

        // Cache miss — ask the live DVSA MOT service, then re-read.
        if (!latest) {
          try {
            const { data: liveData } = await supabase.functions.invoke('fetch-mot-history', {
              body: { registration: normalizedReg },
            });
            const fromLive = pickLatestOdometer(
              (liveData as any)?.motTests ?? (liveData as any)?.mot_tests
            );
            if (fromLive) {
              latest = fromLive;
              resolvedSource = 'live';
            } else {
              latest = await readCache();
              if (latest) resolvedSource = 'live';
            }
          } catch (liveErr) {
            console.warn('Live MOT lookup failed:', liveErr);
          }
        }

        if (cancelled) return;

        if (latest?.odometerValue) {
          setMotMileage(Number(latest.odometerValue));
          setMotDate(latest.completedDate || null);
          setSource(resolvedSource);
        } else {
          reset();
        }
      } catch (err) {
        console.error('Error in useMotMileage:', err);
        if (!cancelled) {
          setError('Unexpected error fetching MOT data');
          reset();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchMotMileage();
    return () => {
      cancelled = true;
    };
  }, [registrationNumber]);

  return { motMileage, motDate, source, isLoading, error };
};
