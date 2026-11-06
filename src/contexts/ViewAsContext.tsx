import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ViewAsAgent {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  permissions: Record<string, boolean> | null;
}

interface ViewAsContextType {
  /** The agent being impersonated, or null if viewing as self */
  viewAsAgent: ViewAsAgent | null;
  /** Set the agent to impersonate */
  setViewAsAgent: (agent: ViewAsAgent | null) => void;
  /** Whether impersonation mode is active */
  isImpersonating: boolean;
  /** The effective role (impersonated or real) */
  effectiveRole: string | null;
  /** The effective permissions (impersonated or real) */
  effectivePermissions: Record<string, boolean> | null;
  /** The effective admin user ID for data filtering */
  effectiveAdminUserId: string | null;
  /** List of available agents to impersonate */
  availableAgents: ViewAsAgent[];
  /** Whether we're loading agents */
  loadingAgents: boolean;
}

const ViewAsContext = createContext<ViewAsContextType>({
  viewAsAgent: null,
  setViewAsAgent: () => {},
  isImpersonating: false,
  effectiveRole: null,
  effectivePermissions: null,
  effectiveAdminUserId: null,
  availableAgents: [],
  loadingAgents: false,
});

export const useViewAs = () => useContext(ViewAsContext);

interface ViewAsProviderProps {
  children: React.ReactNode;
  realRole: string | null;
  realPermissions: Record<string, boolean> | null;
  realAdminUserId: string | null;
}

export const ViewAsProvider: React.FC<ViewAsProviderProps> = ({
  children,
  realRole,
  realPermissions,
  realAdminUserId,
}) => {
  const [viewAsAgent, setViewAsAgentState] = useState<ViewAsAgent | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Every view-as start/stop is written to the audit log server-side.
  const setViewAsAgent = useCallback(async (agent: ViewAsAgent | null) => {
    const db = supabase as any;
    if (sessionIdRef.current) {
      const id = sessionIdRef.current;
      sessionIdRef.current = null;
      const { error } = await db.rpc('end_view_as_session', { _session_id: id });
      if (error) console.error('View-as audit end failed:', error);
    }
    if (agent) {
      const { data, error } = await db.rpc('start_view_as_session', { _target_admin_user_id: agent.id });
      if (error) {
        console.error('View-as audit start failed:', error);
        return; // never impersonate without an audit record
      }
      sessionIdRef.current = data as string;
    }
    setViewAsAgentState(agent);
  }, []);

  // Close an open session when the tab closes or the dashboard unmounts.
  useEffect(() => {
    const close = () => {
      if (!sessionIdRef.current) return;
      (supabase as any).rpc('end_view_as_session', { _session_id: sessionIdRef.current });
      sessionIdRef.current = null;
    };
    window.addEventListener('pagehide', close);
    return () => { window.removeEventListener('pagehide', close); close(); };
  }, []);
  const [availableAgents, setAvailableAgents] = useState<ViewAsAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const isSuperAdmin = realRole === 'super_admin';
  const isImpersonating = isSuperAdmin && viewAsAgent !== null;

  // Fetch available agents for impersonation
  useEffect(() => {
    if (!isSuperAdmin) return;

    const fetchAgents = async () => {
      setLoadingAgents(true);
      try {
        const { data } = await supabase
          .from('admin_users')
          .select('id, user_id, first_name, last_name, email, role, permissions')
          .eq('is_active', true)
          .order('first_name');

        if (data) {
          setAvailableAgents(
            data
              .filter(u => u.id !== realAdminUserId) // Exclude self
              .map(u => ({
                id: u.id,
                userId: u.user_id,
                firstName: u.first_name || '',
                lastName: u.last_name || '',
                email: u.email,
                role: u.role,
                permissions: u.permissions as Record<string, boolean> | null,
              }))
          );
        }
      } catch (e) {
        console.error('Failed to fetch agents for ViewAs:', e);
      } finally {
        setLoadingAgents(false);
      }
    };

    fetchAgents();
  }, [isSuperAdmin, realAdminUserId]);

  const effectiveRole = isImpersonating ? viewAsAgent!.role : realRole;
  const effectivePermissions = isImpersonating ? viewAsAgent!.permissions : realPermissions;
  const effectiveAdminUserId = isImpersonating ? viewAsAgent!.id : realAdminUserId;

  return (
    <ViewAsContext.Provider
      value={{
        viewAsAgent,
        setViewAsAgent: isSuperAdmin ? setViewAsAgent : () => {},
        isImpersonating,
        effectiveRole,
        effectivePermissions,
        effectiveAdminUserId,
        availableAgents,
        loadingAgents,
      }}
    >
      {children}
    </ViewAsContext.Provider>
  );
};
