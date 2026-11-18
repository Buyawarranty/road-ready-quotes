import React, { useEffect, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

interface Props {
  open: boolean; onOpenChange: (o: boolean) => void;
  to: string; dealershipId: string; dealershipName: string; contactName: string | null; onSent: () => void;
}

/** Preview + edit an email, then send it from the signed-in staff member's address. */
const BdmEmailDialog: React.FC<Props> = ({ open, onOpenChange, to, dealershipId, dealershipName, contactName, onSent }) => {
  const { toast } = useToast();
  const [me, setMe] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.email ?? ''));
    const first = contactName?.split(' ')[0];
    setSubject(`Panda Protect warranties for ${dealershipName}`);
    setBody(`Hi ${first || 'there'},\n\nThanks for your time. Panda Protect lets you offer your customers a comprehensive warranty with strong margins for your dealership, and we handle the admin.\n\nYou can register for a free trade account here: https://pandaprotect.co.uk/dealer-portal/login\n\nHappy to answer any questions.\n\nKind regards,`);
  }, [open, contactName, dealershipName]);

  const send = async () => {
    if (!subject.trim() || !body.trim() || busy) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('bdm-send-email', { body: { to, subject, body, dealershipId } });
    setBusy(false);
    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg; } catch { /* keep */ } }
      toast({ title: 'Email not sent', description: msg, variant: 'destructive' }); return;
    }
    toast({ title: 'Email sent', description: `Sent to ${to} from ${data?.from ?? me}` });
    onOpenChange(false); onSent();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Email {dealershipName}</DialogTitle>
          <DialogDescription>Check and edit the email below, then send. It goes from your own address and replies come back to you.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[60px_1fr] items-center gap-2 text-sm">
            <span className="text-muted-foreground">From</span><span className="truncate font-medium">{me || '…'}</span>
            <span className="text-muted-foreground">To</span><span className="truncate font-medium">{to}</span>
          </div>
          <div><Label htmlFor="bdm-mail-subject">Subject</Label><Input id="bdm-mail-subject" value={subject} maxLength={200} onChange={e => setSubject(e.target.value)} /></div>
          <div><Label htmlFor="bdm-mail-body">Message</Label><Textarea id="bdm-mail-body" rows={10} value={body} maxLength={10000} onChange={e => setBody(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">Your name, email and the Panda Protect logo are added automatically.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={busy || !subject.trim() || !body.trim()}><Send className="mr-1 h-4 w-4" />{busy ? 'Sending…' : 'Send email'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default BdmEmailDialog;
