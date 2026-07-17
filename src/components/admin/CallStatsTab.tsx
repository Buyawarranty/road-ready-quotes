import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Phone, PhoneMissed, PhoneCall, Clock, Download, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface CallRow {
  id: string;
  agent_user_id: string | null;
  agent_email: string | null;
  agent_extension: string | null;
  direction: string;
  status: string;
  duration_seconds: number | null;
  talk_seconds: number | null;
  started_at: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  sip_extension: string | null;
  role: string | null;
  is_active: boolean;
}

interface AgentRow {
  id: string;
  name: string;
  email: string;
  extension: string | null;
  dials: number;
  inShiftDials: number;
  missed: number;
  talkSeconds: number;
}

const SHIFT_START_HOUR = 8;
const SHIFT_END_HOUR = 19;

function isMissed(status: string) {
  const s = (status || '').toLowerCase();
  return s === 'missed' || s === 'no-answer' || s === 'noanswer';
}

function fmtDuration(sec: number) {
  if (!sec || sec < 0) return '0s';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function toCsv(rows: AgentRow[]) {
  const header = ['Agent', 'Email', 'Extension', 'Total dials', 'In-shift dials', 'Missed', 'Talk time (s)'];
  const lines = rows.map((r) => [
    r.name,
    r.email,
    r.extension || '',
    r.dials,
    r.inShiftDials,
    r.missed,
    r.talkSeconds,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [header.join(','), ...lines].join('\n');
}

const CallStatsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [agents, setAgents] = useState<AdminUser[]>([]);
  const [from, setFrom] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [to, setTo] = useState<Date>(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const projectId = (import.meta.env.VITE_SUPABASE_PROJECT_ID || '') as string;
  const webhookUrl = projectId
    ? `https://${projectId}.supabase.co/functions/v1/zoiper-cdr-webhook`
    : '';

  const load = async () => {
    setLoading(true);
    const [callsRes, agentsRes] = await Promise.all([
      supabase
        .from('zoiper_call_events')
        .select('id, agent_user_id, agent_email, agent_extension, direction, status, duration_seconds, talk_seconds, started_at')
        .gte('started_at', from.toISOString())
        .lte('started_at', to.toISOString())
        .order('started_at', { ascending: false })
        .limit(10000),
      supabase
        .from('admin_users')
        .select('id, email, first_name, last_name, sip_extension, role, is_active')
        .eq('is_active', true),
    ]);
    if (!callsRes.error) setCalls((callsRes.data || []) as CallRow[]);
    if (!agentsRes.error) setAgents((agentsRes.data || []) as AdminUser[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
     
  }, [from, to]);

  const rows = useMemo<AgentRow[]>(() => {
    const salesRoles = new Set(['sales', 'sales_lead']);
    const filtered = agents.filter((a) => {
      if (roleFilter === 'sales') return salesRoles.has((a.role || '').toLowerCase());
      if (roleFilter === 'all') return true;
      return (a.role || '').toLowerCase() === roleFilter;
    });

    return filtered
      .map<AgentRow>((a) => {
        const mine = calls.filter((c) => {
          if (c.agent_user_id) return c.agent_user_id === a.id;
          if (a.sip_extension && c.agent_extension) return c.agent_extension === a.sip_extension;
          if (a.email && c.agent_email) return c.agent_email.toLowerCase() === a.email.toLowerCase();
          return false;
        });
        const dials = mine.filter((c) => c.direction === 'outbound').length;
        const inShiftDials = mine.filter((c) => {
          if (c.direction !== 'outbound' || !c.started_at) return false;
          const h = new Date(c.started_at).getHours();
          return h >= SHIFT_START_HOUR && h < SHIFT_END_HOUR;
        }).length;
        const missed = mine.filter((c) => c.direction === 'inbound' && isMissed(c.status)).length;
        const talkSeconds = mine.reduce((sum, c) => sum + (c.talk_seconds || 0), 0);
        const fullName = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email;
        return {
          id: a.id,
          name: fullName,
          email: a.email,
          extension: a.sip_extension,
          dials,
          inShiftDials,
          missed,
          talkSeconds,
        };
      })
      .filter((r) => r.dials + r.missed + r.talkSeconds > 0 || roleFilter !== 'all')
      .sort((a, b) => b.dials - a.dials || b.talkSeconds - a.talkSeconds);
  }, [agents, calls, roleFilter]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        dials: acc.dials + r.dials,
        inShift: acc.inShift + r.inShiftDials,
        missed: acc.missed + r.missed,
        talk: acc.talk + r.talkSeconds,
      }),
      { dials: 0, inShift: 0, missed: 0, talk: 0 },
    );
  }, [rows]);

  const downloadCsv = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-stats-${format(from, 'yyyy-MM-dd')}-to-${format(to, 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PhoneCall className="h-6 w-6 text-primary" />
            Call Stats
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Dial counts, missed calls and talk time from Zoiper. Shift hours: 08:00–19:00 UK time (highlighted).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(from, 'd MMM')} – {format(to, 'd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from, to }}
                onSelect={(range) => {
                  if (range?.from) {
                    const f = new Date(range.from);
                    f.setHours(0, 0, 0, 0);
                    setFrom(f);
                  }
                  if (range?.to) {
                    const t = new Date(range.to);
                    t.setHours(23, 59, 59, 999);
                    setTo(t);
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              <SelectItem value="sales">Sales team</SelectItem>
              <SelectItem value="sales_lead">Sales leads</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={downloadCsv} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PhoneCall className="h-4 w-4" /> Total dials
            </div>
            <div className="text-2xl font-bold mt-1">{totals.dials}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/60 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <PhoneCall className="h-4 w-4" /> In-shift dials (8–7 UK)
            </div>
            <div className="text-2xl font-bold mt-1 text-amber-900">{totals.inShift}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50/60 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-red-800">
              <PhoneMissed className="h-4 w-4" /> Missed
            </div>
            <div className="text-2xl font-bold mt-1 text-red-900">{totals.missed}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/60 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-emerald-800">
              <Clock className="h-4 w-4" /> Total talk time
            </div>
            <div className="text-2xl font-bold mt-1 text-emerald-900">{fmtDuration(totals.talk)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Per-agent breakdown
            <Badge variant="secondary">{rows.length} agents</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading calls…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">
              No agents match the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Agent</th>
                    <th className="text-left py-2 px-2 font-medium">Extension</th>
                    <th className="text-right py-2 px-2 font-medium">Total dials</th>
                    <th className="text-right py-2 px-2 font-medium">In-shift</th>
                    <th className="text-right py-2 px-2 font-medium">Missed</th>
                    <th className="text-right py-2 px-2 font-medium">Talk time</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{r.extension || '—'}</td>
                      <td className="py-2 px-2 text-right font-medium">{r.dials}</td>
                      <td className="py-2 px-2 text-right">{r.inShiftDials}</td>
                      <td className="py-2 px-2 text-right">
                        {r.missed > 0 ? (
                          <span className="text-red-600 font-medium">{r.missed}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right">{fmtDuration(r.talkSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-900">
            <Phone className="h-4 w-4" /> Setup — Zoiper webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-2">
          <div>Point your Zoiper Biz / SIP PBX CDR webhook at:</div>
          <div className="bg-white/70 border border-blue-200 rounded p-2 font-mono text-xs break-all">
            POST {webhookUrl || '(project ref missing)'}
            <br />
            Header: <b>x-zoiper-secret</b>: &lt;the ZOIPER_WEBHOOK_SECRET you saved&gt;
          </div>
          <div className="text-xs">
            Each staff member's Zoiper extension needs to be set on their admin profile
            (<code>sip_extension</code>) so calls resolve to the right agent. Emails work as a fallback.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallStatsTab;
