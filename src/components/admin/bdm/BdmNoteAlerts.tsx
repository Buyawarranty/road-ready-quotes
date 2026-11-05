import React, { useEffect, useState } from 'react';
import { SidebarAlertPortal } from '@/components/admin/SidebarAlertSlot';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { NotebookPen, X } from 'lucide-react';

type Alert = { id: string; note: string; dealership_id: string; dealership_name: string | null; assigned_by_name: string | null; created_at: string };

/** Live alerts for BDM notes sent to the signed-in agent. Stays until dismissed. */
export const BdmNoteAlerts: React.FC = () => {
  const sb = supabase as any;
  const navigate = useNavigate();
  const [items, setItems] = useState<Alert[]>([]);

  useEffect(() => {
    let uid: string | undefined;
    let channel: any;
    const load = async () => {
      if (!uid) return;
      const { data } = await sb.from('bdm_note_assignments').select('id, note, dealership_id, dealership_name, assigned_by_name, created_at')
        .eq('assigned_to', uid).is('read_at', null).order('created_at', { ascending: false }).limit(20);
      setItems(data || []);
    };
    supabase.auth.getUser().then(({ data }) => {
      uid = data.user?.id;
      if (!uid) return;
      load();
      channel = supabase.channel(`bdm-note-alerts-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bdm_note_assignments', filter: `assigned_to=eq.${uid}` }, load)
        .subscribe();
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const dismiss = async (id: string) => {
    setItems(xs => xs.filter(x => x.id !== id));
    await sb.from('bdm_note_assignments').update({ read_at: new Date().toISOString() }).eq('id', id);
  };

  if (items.length === 0) return null;
  return (
    <SidebarAlertPortal><div className="grid gap-2">
      {items.slice(0, 4).map(a => (
        <div key={a.id} className="rounded-lg border-2 border-primary bg-card p-3 shadow-sm">
          <div className="flex items-start gap-2">
            <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground">Follow up: {a.dealership_name ?? 'Dealership'}</div>
              <div className="text-[11px] text-muted-foreground">From {a.assigned_by_name ?? 'a colleague'} · {new Date(a.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-foreground">{a.note}</p>
              <button type="button" className="mt-1 text-xs font-medium text-primary underline" onClick={() => { navigate(`/admin-dashboard/?tab=bdm-contacts&q=${encodeURIComponent(a.dealership_name ?? '')}`); dismiss(a.id); }}>Open dealership</button>
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(a.id)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
      {items.length > 4 && <div className="text-center text-xs text-muted-foreground">+{items.length - 4} more</div>}
    </div></SidebarAlertPortal>
  );
};

export default BdmNoteAlerts;
