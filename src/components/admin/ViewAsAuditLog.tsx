import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface Row {
  id: string;
  viewer_email: string | null;
  target_name: string | null;
  target_email: string | null;
  target_role: string | null;
  started_at: string;
  ended_at: string | null;
}

const fmt = (d: string) =>
  new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const duration = (a: string, b: string | null) => {
  if (!b) return 'In progress';
  const mins = Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export const ViewAsAuditLog: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('view_as_audit_log')
      .select('id, viewer_email, target_name, target_email, target_role, started_at, ended_at')
      .order('started_at', { ascending: false })
      .limit(100);
    if (error) console.error('View-as log load failed:', error);
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <Card>
      <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">View-as history</CardTitle>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">{loading ? 'Loading…' : 'No one has used view-as yet.'}</p>
        ) : (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground sticky top-0 bg-card">
                <tr>
                  <th className="py-1.5 pr-3">Super Admin</th>
                  <th className="py-1.5 pr-3">Viewed as</th>
                  <th className="py-1.5 pr-3">Started</th>
                  <th className="py-1.5 pr-3">Ended</th>
                  <th className="py-1.5">Length</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-1.5 pr-3">{r.viewer_email || '—'}</td>
                    <td className="py-1.5 pr-3">
                      {r.target_name || r.target_email}
                      {r.target_role && <span className="text-muted-foreground"> · {r.target_role.replace(/_/g, ' ')}</span>}
                    </td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{fmt(r.started_at)}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{r.ended_at ? fmt(r.ended_at) : '—'}</td>
                    <td className="py-1.5 whitespace-nowrap">{duration(r.started_at, r.ended_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
