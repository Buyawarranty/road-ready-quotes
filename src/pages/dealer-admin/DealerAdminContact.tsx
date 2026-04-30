import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, Phone, Building2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Submission {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  company_name: string | null;
  subject: string | null;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  spam: 'bg-rose-100 text-rose-800',
};

const DealerAdminContact: React.FC = () => {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dealer_admin_contact_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data || []) as Submission[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateField = async (id: string, patch: Partial<Submission>) => {
    const { error } = await supabase.from('dealer_admin_contact_submissions').update(patch).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Updated'); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this submission?')) return;
    const { error } = await supabase.from('dealer_admin_contact_submissions').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); load(); }
  };

  const filtered = items.filter((i) => {
    const okStatus = statusFilter === 'all' || i.status === statusFilter;
    const q = search.trim().toLowerCase();
    const okSearch = !q ||
      i.contact_name.toLowerCase().includes(q) ||
      i.contact_email.toLowerCase().includes(q) ||
      (i.company_name || '').toLowerCase().includes(q) ||
      (i.subject || '').toLowerCase().includes(q);
    return okStatus && okSearch;
  });

  const counts = {
    all: items.length,
    new: items.filter((i) => i.status === 'new').length,
    in_progress: items.filter((i) => i.status === 'in_progress').length,
    resolved: items.filter((i) => i.status === 'resolved').length,
    spam: items.filter((i) => i.status === 'spam').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contact Submissions</h1>
        <p className="text-muted-foreground text-sm mt-1">Inbound enquiries from the dealer channel.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['all', 'new', 'in_progress', 'resolved', 'spam'] as const).map((s) => (
          <Card key={s} className={`border-2 cursor-pointer ${statusFilter === s ? 'border-primary' : ''}`} onClick={() => setStatusFilter(s)}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.replace('_', ' ')}</p>
              <p className="text-2xl font-bold text-foreground">{counts[s]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Input placeholder="Search by name, email, company, subject…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-2"><CardContent className="py-12 text-center text-muted-foreground">No submissions found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <Card key={s.id} className="border-2">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{s.contact_name}</span>
                      <Badge className={STATUS_COLORS[s.status] || ''}>{s.status.replace('_', ' ')}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(s.created_at).toLocaleString('en-GB')}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {s.contact_email}</span>
                      {s.contact_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {s.contact_phone}</span>}
                      {s.company_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {s.company_name}</span>}
                    </div>
                    {s.subject && <p className="font-medium text-foreground mt-2">{s.subject}</p>}
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{s.message}</p>

                    <div className="mt-3">
                      <Label className="text-xs">Admin notes</Label>
                      <Textarea
                        defaultValue={s.admin_notes || ''}
                        rows={2}
                        onBlur={(e) => { if (e.target.value !== (s.admin_notes || '')) updateField(s.id, { admin_notes: e.target.value }); }}
                        placeholder="Internal notes…"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[160px]">
                    <Select value={s.status} onValueChange={(v) => updateField(s.id, { status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="spam">Spam</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
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

export default DealerAdminContact;
