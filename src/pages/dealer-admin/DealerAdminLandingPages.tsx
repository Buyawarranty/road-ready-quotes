import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Plus, Loader2, Trash2, Pencil, ExternalLink } from 'lucide-react';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

const DealerAdminLandingPages: React.FC = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [aiTopic, setAiTopic] = useState('');
  const [aiLocation, setAiLocation] = useState('');
  const [aiKeywords, setAiKeywords] = useState('');
  const [generating, setGenerating] = useState(false);

  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['dealer-admin-landing-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dealer_admin_landing_pages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const generate = async () => {
    if (!aiTopic.trim()) {
      toast({ title: 'Add a topic / offer', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('dealer-admin-generate-content', {
        body: {
          type: 'landing',
          topic: aiTopic,
          target_location: aiLocation,
          keywords: aiKeywords.split(',').map((k) => k.trim()).filter(Boolean),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEditing({ ...data.result, status: 'draft', target_location: aiLocation, cta_url: '/' });
      setOpen(true);
      toast({ title: 'Draft generated' });
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!editing?.title || !editing?.slug) {
      toast({ title: 'Title and slug required', variant: 'destructive' });
      return;
    }
    const payload = {
      title: editing.title,
      slug: editing.slug,
      hero_heading: editing.hero_heading,
      hero_subheading: editing.hero_subheading,
      body_content: editing.body_content || '',
      cta_label: editing.cta_label,
      cta_url: editing.cta_url,
      meta_title: editing.meta_title,
      meta_description: editing.meta_description,
      keywords: editing.keywords,
      target_location: editing.target_location,
      status: editing.status || 'draft',
      published_at: editing.status === 'published' ? new Date().toISOString() : null,
    };
    const op = editing.id
      ? supabase.from('dealer_admin_landing_pages').update(payload).eq('id', editing.id)
      : supabase.from('dealer_admin_landing_pages').insert(payload);
    const { error } = await op;
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing.id ? 'Page updated' : 'Page created' });
    setOpen(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ['dealer-admin-landing-pages'] });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this landing page?')) return;
    const { error } = await supabase.from('dealer_admin_landing_pages').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['dealer-admin-landing-pages'] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Landing pages</h1>
        <p className="text-sm text-muted-foreground">Create SEO-optimised dealer landing pages.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Generate with AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Topic / offer</Label>
              <Input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="Used Audi warranty" />
            </div>
            <div>
              <Label>Target location</Label>
              <Input value={aiLocation} onChange={(e) => setAiLocation(e.target.value)} placeholder="Manchester" />
            </div>
            <div>
              <Label>Keywords</Label>
              <Input value={aiKeywords} onChange={(e) => setAiKeywords(e.target.value)} placeholder="audi warranty manchester" />
            </div>
          </div>
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate draft
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">All pages ({pages.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={() => { setEditing({ status: 'draft', keywords: [] }); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New manually
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No landing pages yet.</p>
          ) : (
            <div className="space-y-2">
              {pages.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 border rounded-md hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{p.title}</p>
                      <Badge variant={p.status === 'published' ? 'default' : 'secondary'} className="text-xs">{p.status}</Badge>
                      {p.target_location && <Badge variant="outline" className="text-xs">{p.target_location}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">/{p.slug}</p>
                  </div>
                  <div className="flex gap-1">
                    {p.status === 'published' && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`/${p.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit landing page' : 'New landing page'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.slug || slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={editing.slug || ''} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Hero heading</Label>
                  <Input value={editing.hero_heading || ''} onChange={(e) => setEditing({ ...editing, hero_heading: e.target.value })} />
                </div>
                <div>
                  <Label>Hero subheading</Label>
                  <Input value={editing.hero_subheading || ''} onChange={(e) => setEditing({ ...editing, hero_subheading: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Body (markdown)</Label>
                <Textarea rows={12} className="font-mono text-xs" value={editing.body_content || ''} onChange={(e) => setEditing({ ...editing, body_content: e.target.value })} />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>CTA label</Label>
                  <Input value={editing.cta_label || ''} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} />
                </div>
                <div>
                  <Label>CTA URL</Label>
                  <Input value={editing.cta_url || ''} onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })} />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Meta title</Label>
                  <Input value={editing.meta_title || ''} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} />
                </div>
                <div>
                  <Label>Meta description</Label>
                  <Input value={editing.meta_description || ''} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={editing.status || 'draft'} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target location</Label>
                  <Input value={editing.target_location || ''} onChange={(e) => setEditing({ ...editing, target_location: e.target.value })} />
                </div>
                <div>
                  <Label>Keywords</Label>
                  <Input
                    value={(editing.keywords || []).join(', ')}
                    onChange={(e) => setEditing({ ...editing, keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean) })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealerAdminLandingPages;
