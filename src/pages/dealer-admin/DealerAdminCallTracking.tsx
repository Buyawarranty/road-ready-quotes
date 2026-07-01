import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Phone, RefreshCw, Copy, Check, AlertTriangle } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
}

interface TrackingNumber {
  id: string;
  callrail_tracker_id: string;
  label: string | null;
  phone_e164: string | null;
  active: boolean;
  assigned_admin_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function DealerAdminCallTracking() {
  const [numbers, setNumbers] = useState<TrackingNumber[]>([]);
  const [agents, setAgents] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const projectRef = (import.meta.env.VITE_SUPABASE_PROJECT_REF || '') as string;

  const load = async () => {
    setLoading(true);
    const [{ data: numbersData, error: numbersError }, { data: agentsData, error: agentsError }] = await Promise.all([
      supabase.from('callrail_tracking_numbers').select('*').order('label', { ascending: true }),
      supabase.from('admin_users').select('id, email, first_name, last_name, role').eq('is_active', true),
    ]);

    if (numbersError) toast.error(numbersError.message);
    if (agentsError) toast.error(agentsError.message);

    setNumbers((numbersData || []) as TrackingNumber[]);
    setAgents((agentsData || []) as AdminUser[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (projectRef) {
      setWebhookUrl(`https://${projectRef}.supabase.co/functions/v1/callrail-webhook`);
    }
  }, [projectRef]);

  const sync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('callrail-sync-numbers', {
        body: {},
      });
      if (error) throw error;
      toast.success(`Synced ${data?.count || 0} tracking numbers`);
      await load();
    } catch (err) {
      console.error(err);
      toast.error(errorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const assignAgent = async (numberId: string, adminUserId: string | null) => {
    const { error } = await supabase
      .from('callrail_tracking_numbers')
      .update({ assigned_admin_user_id: adminUserId || null })
      .eq('id', numberId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Agent assigned');
    setNumbers((prev) =>
      prev.map((n) => (n.id === numberId ? { ...n, assigned_admin_user_id: adminUserId || null } : n))
    );
  };

  const copyWebhookUrl = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const agentName = (id: string | null) => {
    if (!id) return 'Unassigned';
    const a = agents.find((x) => x.id === id);
    if (!a) return 'Unknown';
    return `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-8 w-48 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Call Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Map CallRail numbers to agents so incoming and missed calls appear in the admin banners.
          </p>
        </div>
        <Button onClick={sync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          Sync from CallRail
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" /> Webhook URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          {webhookUrl ? (
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-muted p-2 rounded text-sm break-all">{webhookUrl}</code>
              <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Set VITE_SUPABASE_PROJECT_REF to show the webhook URL.
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Paste this URL into all four CallRail webhook fields (Pre-Call, Call Routing Complete, Post-Call, Call
            Modified).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tracking Numbers</CardTitle>
        </CardHeader>
        <CardContent>
          {numbers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No tracking numbers found. Click Sync from CallRail to import them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Label</th>
                    <th className="text-left py-3 px-2 font-medium">Number</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    <th className="text-left py-3 px-2 font-medium">Assigned agent</th>
                  </tr>
                </thead>
                <tbody>
                  {numbers.map((n) => (
                    <tr key={n.id} className="border-b last:border-b-0">
                      <td className="py-3 px-2 font-medium">{n.label || n.callrail_tracker_id}</td>
                      <td className="py-3 px-2 text-muted-foreground">{n.phone_e164 || '—'}</td>
                      <td className="py-3 px-2">
                        <Badge variant={n.active ? 'default' : 'secondary'}>
                          {n.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Select
                          value={n.assigned_admin_user_id || 'unassigned'}
                          onValueChange={(value) => assignAgent(n.id, value === 'unassigned' ? null : value)}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Assign agent" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {agents.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {`${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email} ({a.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong';
}
