import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, Gift, UserPlus, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Referral {
  id: string;
  referrer_email: string;
  referrer_name: string | null;
  friend_email: string;
  discount_code: string | null;
  status: string;
  converted_at: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  sent: 'bg-blue-100 text-blue-800',
  converted: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-zinc-100 text-zinc-800',
};

const DealerAdminReferrals: React.FC = () => {
  const [items, setItems] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('referrals')
      .select('id, referrer_email, referrer_name, friend_email, discount_code, status, converted_at, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    else setItems((data || []) as Referral[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Referral>) => {
    const { error } = await supabase.from('referrals').update(patch).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Updated'); load(); }
  };

  const markConverted = (id: string) => update(id, { status: 'converted', converted_at: new Date().toISOString() } as any);

  const remove = async (id: string) => {
    if (!confirm('Delete this referral?')) return;
    const { error } = await supabase.from('referrals').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); load(); }
  };

  const filtered = items.filter((i) => {
    const okStatus = statusFilter === 'all' || i.status === statusFilter;
    const q = search.trim().toLowerCase();
    const okSearch = !q ||
      i.referrer_email.toLowerCase().includes(q) ||
      i.friend_email.toLowerCase().includes(q) ||
      (i.referrer_name || '').toLowerCase().includes(q) ||
      (i.discount_code || '').toLowerCase().includes(q);
    return okStatus && okSearch;
  });

  const counts = {
    all: items.length,
    pending: items.filter((i) => i.status === 'pending').length,
    sent: items.filter((i) => i.status === 'sent').length,
    converted: items.filter((i) => i.status === 'converted').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Referrals</h1>
        <p className="text-muted-foreground text-sm mt-1">Customer-to-friend referral activity and conversions.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['all', 'pending', 'sent', 'converted'] as const).map((s) => (
          <Card key={s} className={`border-2 cursor-pointer ${statusFilter === s ? 'border-primary' : ''}`} onClick={() => setStatusFilter(s)}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s}</p>
              <p className="text-2xl font-bold">{counts[s]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Input placeholder="Search by referrer, friend, code…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-2"><CardContent className="py-12 text-center text-muted-foreground">No referrals found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="border-2">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{r.referrer_name || r.referrer_email}</span>
                      <Badge className={STATUS_COLORS[r.status] || ''}>{r.status}</Badge>
                      {r.discount_code && <Badge variant="outline" className="font-mono"><Gift className="h-3 w-3 mr-1" />{r.discount_code}</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString('en-GB')}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Referrer: {r.referrer_email}</span>
                      <span className="flex items-center gap-1"><UserPlus className="h-3 w-3" /> Friend: {r.friend_email}</span>
                      {r.converted_at && <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Converted {new Date(r.converted_at).toLocaleDateString('en-GB')}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <Select value={r.status} onValueChange={(v) => update(r.id, { status: v } as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    {r.status !== 'converted' && (
                      <Button size="sm" variant="outline" onClick={() => markConverted(r.id)}>Mark converted</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealerAdminReferrals;
