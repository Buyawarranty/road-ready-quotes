import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CallRailCallStatus = 'ringing' | 'in_progress' | 'completed' | 'missed' | 'voicemail';

export interface CallRailCall {
  id: string;
  callrail_call_id: string;
  status: CallRailCallStatus;
  direction: string;
  caller_number: string | null;
  caller_name: string | null;
  caller_city: string | null;
  caller_state: string | null;
  tracked_number: string | null;
  tracking_number_id: string | null;
  assigned_admin_user_id: string | null;
  matched_lead_id: string | null;
  matched_customer_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  answered_at: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
  raw: unknown;
}

interface AdminUser {
  id: string;
  user_id: string | null;
  role: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export const useCallRailPresence = () => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [activeCalls, setActiveCalls] = useState<CallRailCall[]>([]);
  const [missedCalls, setMissedCalls] = useState<CallRailCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdminRole = (role: string | null) =>
    role === 'super_admin' || role === 'admin' || role === 'sales_manager' || role === 'performance_manager';

  const fetchAdminUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, user_id, role, email, first_name, last_name')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.error('Error fetching admin user for calls:', error);
      return;
    }
    if (data) setAdminUser(data);
  }, []);

  const fetchCalls = useCallback(async () => {
    if (!adminUser) return;
    const showAll = isAdminRole(adminUser.role);
    const filter = showAll
      ? ''
      : `assigned_admin_user_id=eq.${adminUser.id}`;

    // Active calls: ringing or in_progress, started within last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const activeQuery = supabase
      .from('callrail_calls')
      .select('*')
      .in('status', ['ringing', 'in_progress'])
      .gte('started_at', fiveMinutesAgo)
      .order('started_at', { ascending: false });
    if (filter) activeQuery.or(filter);

    // Missed calls: status = missed, not acknowledged, started within last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const missedQuery = supabase
      .from('callrail_calls')
      .select('*')
      .eq('status', 'missed')
      .is('acknowledged_at', null)
      .gte('started_at', oneDayAgo)
      .order('started_at', { ascending: false });
    if (filter) missedQuery.or(filter);

    const [activeResult, missedResult] = await Promise.all([activeQuery, missedQuery]);

    if (activeResult.error) {
      console.error('Error fetching active calls:', activeResult.error);
    } else {
      setActiveCalls((activeResult.data || []) as CallRailCall[]);
    }

    if (missedResult.error) {
      console.error('Error fetching missed calls:', missedResult.error);
    } else {
      setMissedCalls((missedResult.data || []) as CallRailCall[]);
    }

    setIsLoading(false);
  }, [adminUser]);

  const acknowledgeMissedCall = useCallback(
    async (callId: string) => {
      if (!adminUser) return;
      const { error } = await supabase
        .from('callrail_calls')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: adminUser.id,
        })
        .eq('id', callId);

      if (error) {
        console.error('Error acknowledging missed call:', error);
        return;
      }
      setMissedCalls((prev) => prev.filter((c) => c.id !== callId));
    },
    [adminUser]
  );

  const dismissActiveCall = useCallback((callId: string) => {
    setActiveCalls((prev) => prev.filter((c) => c.id !== callId));
  }, []);

  useEffect(() => {
    fetchAdminUser();
  }, [fetchAdminUser]);

  useEffect(() => {
    if (!adminUser) return;
    fetchCalls();

    const channel = supabase
      .channel('callrail-calls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'callrail_calls',
        },
        () => {
          fetchCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.channel('callrail-calls').unsubscribe();
    };
  }, [adminUser, fetchCalls]);

  return {
    activeCalls,
    missedCalls,
    isLoading,
    acknowledgeMissedCall,
    dismissActiveCall,
    refresh: fetchCalls,
  };
};
