import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { readDealerImpersonation } from '@/hooks/useDealerImpersonation';
import { boundedDealerAuth } from '@/lib/dealerAuthLoad';

interface DealerProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string;
  first_name?: string | null;
  last_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  country_code?: string | null;
  status?: string | null;
}


export const useDealerAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [dealer, setDealer] = useState<DealerProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const navigate = useNavigate();

  const loadRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map((r: any) => r.role as string);
  };

  // Admin "view as dealer": load the impersonated dealer by id. RLS only lets
  // admins read other dealers' rows, so non-admins silently fall back to their
  // own dealer profile.
  const loadDealer = async (userId: string) => {
    const impersonation = readDealerImpersonation();
    if (impersonation) {
      const { data } = await supabase
        .from('dealers')
        .select('*')
        .eq('id', impersonation.dealerId)
        .neq('user_id', userId)
        .maybeSingle();
      if (data) return data as DealerProfile;
    }
    const { data, error } = await supabase
      .from('dealers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data as DealerProfile | null;
  };

  useEffect(() => {
    let mounted = true;
    let generation = 0;
    setLoading(true);
    setLoadError(null);

    const applySession = async (nextSession: Session | null) => {
      const current = ++generation;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (!nextSession?.user) {
        setDealer(null);
        setRoles([]);
        setLoading(false);
        return;
      }
      try {
        const [profile, userRoles] = await boundedDealerAuth(Promise.all([
          loadDealer(nextSession.user.id), loadRoles(nextSession.user.id),
        ]));
        if (!mounted || current !== generation) return;
        setDealer(profile);
        setRoles(userRoles);
        setLoadError(null);
      } catch {
        if (mounted && current === generation) setLoadError('We could not load your dealer account. Please try again.');
      } finally {
        if (mounted && current === generation) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) return;
        // Leave the Supabase auth lock before making any profile requests.
        setTimeout(() => { if (mounted) void applySession(nextSession); }, 0);
      }
    );

    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await boundedDealerAuth(supabase.auth.getSession());
        if (!mounted || generation > 0) return;
        if (error) throw error;
        await applySession(session);
      } catch {
        if (mounted && generation === 0) {
          setLoadError('We could not load your dealer account. Please try again.');
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      generation++;
      subscription.unsubscribe();
    };
  }, [retryKey]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/dealer-portal/login');
  };

  const isTrader = roles.includes('trader');

  const retry = () => setRetryKey(value => value + 1);
  return { user, session, dealer, roles, isTrader, loading, loadError, retry, signOut };
};
