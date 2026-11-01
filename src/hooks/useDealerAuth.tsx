import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { readDealerImpersonation } from '@/hooks/useDealerImpersonation';

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
  const navigate = useNavigate();

  const loadRoles = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
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
    const { data } = await supabase
      .from('dealers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return data as DealerProfile | null;
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const [dealerProfile, userRoles] = await Promise.all([
              loadDealer(session.user.id),
              loadRoles(session.user.id),
            ]);
            if (mounted) {
              setDealer(dealerProfile);
              setRoles(userRoles);
              setLoading(false);
            }
          }, 0);
        } else {
          setDealer(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const [{ data }, userRoles] = await Promise.all([
          supabase.from('dealers').select('*').eq('user_id', session.user.id).maybeSingle(),
          loadRoles(session.user.id),
        ]);
        if (mounted) {
          setDealer(data as DealerProfile | null);
          setRoles(userRoles);
        }
      }
      setLoading(false);
    };

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/dealer-portal/login');
  };

  const isTrader = roles.includes('trader');

  return { user, session, dealer, roles, isTrader, loading, signOut };
};
