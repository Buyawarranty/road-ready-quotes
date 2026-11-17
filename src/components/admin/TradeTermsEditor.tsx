import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { fetchCurrentTradeTerms, type TradeTerms } from '@/lib/dealerTradeTerms';

const newVersionId = () => {
  const d = new Date();
  return `${d.toISOString().slice(0, 10)}-${d.getUTCHours()}${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

export const TradeTermsEditor: React.FC = () => {
  const [terms, setTerms] = useState<TradeTerms | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCurrentTradeTerms(supabase).then(setTerms); }, []);
  if (!terms) return <Card><CardContent className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>;

  const setSummary = (i: number, key: 'title' | 'description', v: string) =>
    setTerms({ ...terms, summary: terms.summary.map((s, j) => (j === i ? { ...s, [key]: v } : s)) });
  const setSection = (i: number, patch: Partial<{ title: string; text: string }>) =>
    setTerms({
      ...terms,
      sections: terms.sections.map((s, j) => j !== i ? s : {
        title: patch.title ?? s.title,
        paragraphs: patch.text !== undefined ? patch.text.split(/\n\s*\n/) : s.paragraphs,
      }),
    });

  const publish = async () => {
    const summary = terms.summary.filter((s) => s.title.trim() && s.description.trim());
    const sections = terms.sections
      .map((s) => ({ title: s.title.trim(), paragraphs: s.paragraphs.map((p) => p.trim()).filter(Boolean) }))
      .filter((s) => s.title && s.paragraphs.length);
    if (!summary.length || !sections.length) { toast.error('Add at least one summary point and one section.'); return; }
    if (!window.confirm('Publish these terms? Every dealer will be asked to accept them again before their next warranty.')) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const version = newVersionId();
    const { error } = await (supabase as any).from('dealer_trade_terms_versions').insert({
      version, summary, sections, change_note: note.trim() || null, created_by: u.user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setTerms({ version, summary, sections });
    setNote('');
    toast.success(`Trade terms version ${version} published`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dealer trade terms (shown at purchase)</CardTitle>
        <CardDescription>Current version {terms.version}. Publishing creates a new version; dealers must accept it before their next warranty. Earlier acceptances are kept.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-semibold">Pop-up summary points</Label>
          {terms.summary.map((s, i) => (
            <div key={i} className="flex gap-2 rounded-lg border p-3">
              <div className="flex-1 space-y-2">
                <Input value={s.title} onChange={(e) => setSummary(i, 'title', e.target.value)} placeholder="Heading" />
                <Textarea value={s.description} onChange={(e) => setSummary(i, 'description', e.target.value)} rows={2} placeholder="Short description" />
              </div>
              <Button variant="ghost" size="icon" aria-label="Remove point" onClick={() => setTerms({ ...terms, summary: terms.summary.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setTerms({ ...terms, summary: [...terms.summary, { title: '', description: '' }] })}><Plus className="mr-1 h-4 w-4" />Add point</Button>
        </div>
        <div className="space-y-3">
          <Label className="text-base font-semibold">Full terms sections</Label>
          <p className="text-sm text-muted-foreground">Leave a blank line between paragraphs.</p>
          {terms.sections.map((s, i) => (
            <div key={i} className="flex gap-2 rounded-lg border p-3">
              <div className="flex-1 space-y-2">
                <Input value={s.title} onChange={(e) => setSection(i, { title: e.target.value })} placeholder="Section heading" />
                <Textarea value={s.paragraphs.join('\n\n')} onChange={(e) => setSection(i, { text: e.target.value })} rows={5} />
              </div>
              <Button variant="ghost" size="icon" aria-label="Remove section" onClick={() => setTerms({ ...terms, sections: terms.sections.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setTerms({ ...terms, sections: [...terms.sections, { title: '', paragraphs: [''] }] })}><Plus className="mr-1 h-4 w-4" />Add section</Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="terms-note">What changed (optional)</Label>
          <Input id="terms-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button onClick={publish} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Publish new version</Button>
      </CardContent>
    </Card>
  );
};

export default TradeTermsEditor;
