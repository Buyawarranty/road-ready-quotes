import React, { useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const empty = { company_name: '', contact_name: '', email: '', phone: '' };

export const AddDealerDialog: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string; emailed: boolean; error?: string | null } | null>(null);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('dealer-signup-decision', {
      body: { decision: 'create', manual: form },
    });
    setSaving(false);
    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { msg = (await error.context.json())?.error || msg; } catch { /* keep */ }
      }
      toast({ title: 'Could not add dealer', description: msg, variant: 'destructive' });
      return;
    }
    setResult({ email: data.login_email, password: data.temp_password, emailed: !!data.email_sent, error: data.email_error });
    onCreated();
  };

  const close = (o: boolean) => {
    setOpen(o);
    if (!o) { setForm(empty); setResult(null); }
  };

  const loginUrl = `${window.location.origin}/dealer-portal/login`;
  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(`Login: ${loginUrl}\nEmail: ${result.email}\nPassword: ${result.password}`);
    toast({ title: 'Login details copied' });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Add dealer</Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{result ? 'Dealer added' : 'Add a dealer manually'}</DialogTitle>
          <DialogDescription>
            {result ? 'The dealer account is live and can sign in to the dealer portal.' : 'Creates an approved dealer account with a dealer portal login.'}
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-3 text-sm">
            <p className={result.emailed ? 'text-foreground' : 'text-destructive font-medium'}>
              {result.emailed ? `Login details emailed to ${result.email}.` : `The email could not be sent${result.error ? `: ${result.error}` : ''}. Share these details manually.`}
            </p>
            <div className="rounded-md border p-3 space-y-1 font-mono text-xs break-all">
              <div>Login: {loginUrl}</div>
              <div>Email: {result.email}</div>
              <div>Password: {result.password}</div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-1" />Copy details</Button>
              <Button onClick={() => close(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Dealership name *</Label><Input required value={form.company_name} onChange={set('company_name')} /></div>
            <div><Label>Contact name</Label><Input value={form.contact_name} onChange={set('contact_name')} /></div>
            <div><Label>Email *</Label><Input required type="email" value={form.email} onChange={set('email')} /></div>
            <div><Label>Phone *</Label><Input required type="tel" value={form.phone} onChange={set('phone')} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Add dealer</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
