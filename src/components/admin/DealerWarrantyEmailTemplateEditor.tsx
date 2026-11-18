import { useCallback, useEffect, useState } from 'react';
import { Edit3, Eye, Loader2, Mail, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { canEditDealerWarrantyEmailTemplate } from '@/lib/dealerWarrantyEmail';
import { functionErrorMessage } from '@/lib/functionError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type Template = {
  subject: string;
  heading: string;
  introduction: string;
  closing_text: string;
};

type Preview = {
  from: string;
  reply_to: string;
  to: string[];
  subject: string;
  html: string;
};

const emptyTemplate: Template = { subject: '', heading: '', introduction: '', closing_text: '' };

export default function DealerWarrantyEmailTemplateEditor({ userRole }: { userRole?: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<Template>(emptyTemplate);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('dealer-send-customer-warranty', {
        body: { action: 'get_template' },
      });
      if (invokeError) throw new Error(await functionErrorMessage(invokeError));
      if (data?.error) throw new Error(data.error);
      setTemplate(data.template || emptyTemplate);
      setPreview(data.preview || null);
      if (data.preview_error) setError(data.preview_error);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The email template could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  if (!canEditDealerWarrantyEmailTemplate(userRole)) return null;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('dealer-send-customer-warranty', {
        body: { action: 'save_template', template },
      });
      if (invokeError) throw new Error(await functionErrorMessage(invokeError));
      if (data?.error) throw new Error(data.error);
      setTemplate(data.template || template);
      setPreview(data.preview || null);
      if (data.preview_error) setError(data.preview_error);
      toast.success('Dealer warranty email updated');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The email template could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl"><Mail className="h-5 w-5" />Dealer warranty email</CardTitle>
          <CardDescription className="mt-2">
            Edit the wording dealers preview and send from their Warranties page. Only Admins and Super Admins can change it.
          </CardDescription>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0"><Edit3 className="mr-2 h-4 w-4" />Edit template</Button>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Sender and reply address: <span className="font-medium text-foreground">support@pandaprotect.co.uk</span>. Vehicle details and claim guidance stay fixed.
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[min(56rem,calc(100vw-2rem))] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit dealer warranty email</DialogTitle>
            <DialogDescription>
              Use plain wording. Available fields: {'{{customer_name}}'}, {'{{dealer_name}}'}, {'{{registration}}'}, {'{{reference}}'} and {'{{plan}}'}.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="dealer-email-subject">Subject</Label>
                  <Input id="dealer-email-subject" maxLength={180} value={template.subject} onChange={event => setTemplate(current => ({ ...current, subject: event.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="dealer-email-heading">Heading</Label>
                  <Input id="dealer-email-heading" maxLength={120} value={template.heading} onChange={event => setTemplate(current => ({ ...current, heading: event.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="dealer-email-introduction">Introduction</Label>
                  <Textarea id="dealer-email-introduction" rows={3} maxLength={1000} value={template.introduction} onChange={event => setTemplate(current => ({ ...current, introduction: event.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="dealer-email-closing">Closing message</Label>
                  <Textarea id="dealer-email-closing" rows={2} maxLength={500} value={template.closing_text} onChange={event => setTemplate(current => ({ ...current, closing_text: event.target.value }))} />
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <h3 className="flex items-center gap-2 text-base font-semibold"><Eye className="h-4 w-4" />Saved email preview</h3>
                <p className="mt-1 text-xs text-muted-foreground">This uses your latest dealer warranty so you can check the real layout.</p>
                {preview ? (
                  <div className="mt-4 space-y-2">
                    <div className="space-y-1 break-words text-xs text-muted-foreground">
                      <p><strong className="text-foreground">From:</strong> {preview.from}</p>
                      <p><strong className="text-foreground">To:</strong> {preview.to.join(', ')}</p>
                      <p><strong className="text-foreground">Subject:</strong> {preview.subject}</p>
                    </div>
                    <iframe title="Dealer warranty email template preview" sandbox="" srcDoc={preview.html} className="h-[420px] w-full rounded-lg border bg-background" />
                  </div>
                ) : !error && <p className="mt-4 text-sm text-muted-foreground">Save the wording to refresh the preview.</p>}
              </div>
              {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p>}
            </div>
          )}

          <DialogFooter className="sticky bottom-0 -mx-5 -mb-5 border-t bg-background p-4 sm:-mx-6 sm:-mb-6 sm:px-6">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Close</Button>
            <Button onClick={save} disabled={saving || loading || !template.subject.trim() || !template.heading.trim() || !template.introduction.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save and update preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
