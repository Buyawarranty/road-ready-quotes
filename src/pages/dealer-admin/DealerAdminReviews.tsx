import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Star, Check, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Review {
  id: string;
  reviewer_name: string;
  reviewer_email: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  source: string | null;
  status: string;
  admin_response: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
};

const DealerAdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    reviewer_name: '',
    reviewer_email: '',
    rating: 5,
    title: '',
    body: '',
    source: 'manual',
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dealer_admin_reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setReviews((data || []) as Review[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.reviewer_name.trim() || !form.body.trim()) {
      toast.error('Reviewer name and body are required');
      return;
    }
    const { error } = await supabase.from('dealer_admin_reviews').insert({
      reviewer_name: form.reviewer_name.trim(),
      reviewer_email: form.reviewer_email.trim() || null,
      rating: Number(form.rating),
      title: form.title.trim() || null,
      body: form.body.trim(),
      source: form.source,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Review added');
    setOpen(false);
    setForm({ reviewer_name: '', reviewer_email: '', rating: 5, title: '', body: '', source: 'manual' });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('dealer_admin_reviews').update({ status }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Updated'); load(); }
  };

  const respond = async (id: string, response: string) => {
    const { error } = await supabase.from('dealer_admin_reviews').update({ admin_response: response }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Response saved'); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    const { error } = await supabase.from('dealer_admin_reviews').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); load(); }
  };

  const filtered = reviews.filter((r) => statusFilter === 'all' || r.status === statusFilter);

  const counts = {
    all: reviews.length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    approved: reviews.filter((r) => r.status === 'approved').length,
    rejected: reviews.filter((r) => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reviews</h1>
          <p className="text-muted-foreground text-sm mt-1">Moderate dealer-channel customer reviews.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add review</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add review</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Reviewer name</Label><Input value={form.reviewer_name} onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.reviewer_email} onChange={(e) => setForm({ ...form, reviewer_email: e.target.value })} /></div>
              <div><Label>Rating (1-5)</Label><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} /></div>
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Body</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
              <div>
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="trustpilot">Trustpilot</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <Card key={s} className={`border-2 cursor-pointer ${statusFilter === s ? 'border-primary' : ''}`} onClick={() => setStatusFilter(s)}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s}</p>
              <p className="text-2xl font-bold text-foreground">{counts[s]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-2"><CardContent className="py-12 text-center text-muted-foreground">No reviews found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="border-2">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{r.reviewer_name}</span>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                        ))}
                      </div>
                      <Badge className={STATUS_COLORS[r.status] || ''}>{r.status}</Badge>
                      {r.source && <Badge variant="outline">{r.source}</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                    {r.title && <p className="font-medium text-foreground mt-2">{r.title}</p>}
                    {r.body && <p className="text-sm text-muted-foreground mt-1">{r.body}</p>}
                    {r.reviewer_email && <p className="text-xs text-muted-foreground mt-1">{r.reviewer_email}</p>}

                    <div className="mt-3">
                      <Label className="text-xs">Admin response</Label>
                      <Textarea
                        defaultValue={r.admin_response || ''}
                        rows={2}
                        onBlur={(e) => { if (e.target.value !== (r.admin_response || '')) respond(r.id, e.target.value); }}
                        placeholder="Type a response and click outside to save…"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {r.status !== 'approved' && <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'approved')}><Check className="h-3.5 w-3.5 mr-1" /> Approve</Button>}
                    {r.status !== 'rejected' && <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'rejected')}><X className="h-3.5 w-3.5 mr-1" /> Reject</Button>}
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

export default DealerAdminReviews;
