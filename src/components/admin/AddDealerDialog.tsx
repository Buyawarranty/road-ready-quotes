import React, { useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ValidatedField } from '@/components/ui/validated-field';
import { ukPhoneError, emailError, personNameError, companyNameError, normaliseUkPhone } from '@/lib/contactValidation';

const empty = { company_name: '', contact_name: '', email: '', phone: '' };

export const AddDealerDialog: React.FC<{ onCreated: () => void; label?: string; size?: 'sm' | 'default' }> = ({ onCreated, label = 'Add dealer', size = 'default' }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const errors = {
    company_name: companyNameError(form.company_name),
    contact_name: personNameError(form.contact_name, false),
    email: emailError(form.email),
    phone: ukPhoneError(form.phone),
  };
  const shown = (k: keyof typeof empty) => tried || !!touched[k];
  const blur = (k: keyof typeof empty) => () => setTouched(t => ({ ...t, [k]: true }));
  const [result, setResult] = useState<{ email: string; password: string | null; emailed: boolean; error?: string | null } | null>(null);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    const firstBad = (Object.keys(errors) as (keyof typeof empty)[]).find(k => errors[k]);
    if (firstBad) { (document.getElementById(`add-dealer-${firstBad}`) as HTMLInputElement | null)?.focus(); return; }
    setSaving(true);
    const clean = { company_name: form.company_name.trim(), contact_name: form.contact_name.trim(), email: form.email.trim().toLowerCase(), phone: normaliseUkPhone(form.phone) };
    const { data, error } = await supabase.functions.invoke('dealer-signup-decision', {
      body: { decision: 'create', manual: clean },
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
    if (!o) { setForm(empty); setResult(null); setTouched({}); setTried(false); }
  };

  const loginUrl = `${window.location.origin}/dealer-portal/login`;
  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(`Login: ${loginUrl}\nEmail: ${result.email}\nPassword: ${result.password ?? 'their existing dealer password'}`);
    toast({ title: 'Login details copied' });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <Button size={size} onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />{label}</Button>
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
              <div>Password: {result.password ?? 'unchanged — this dealer already has a login and keeps their existing password'}</div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-1" />Copy details</Button>
              <Button onClick={() => close(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-3">
            <ValidatedField id="add-dealer-company_name" label="Dealership name *" placeholder="e.g. Smith Motors Ltd" value={form.company_name} onChange={set('company_name')} onBlur={blur('company_name')} error={errors.company_name} show={shown('company_name')} hasValue={!!form.company_name.trim()} maxLength={200} />
            <ValidatedField id="add-dealer-contact_name" label="Contact name" placeholder="e.g. John Smith" autoComplete="name" value={form.contact_name} onChange={set('contact_name')} onBlur={blur('contact_name')} error={errors.contact_name} show={shown('contact_name')} hasValue={!!form.contact_name.trim()} maxLength={100} />
            <ValidatedField id="add-dealer-email" label="Email *" type="email" placeholder="e.g. john@smithmotors.co.uk" autoComplete="email" value={form.email} onChange={set('email')} onBlur={blur('email')} error={errors.email} show={shown('email')} hasValue={!!form.email.trim()} maxLength={255} />
            <ValidatedField id="add-dealer-phone" label="Phone *" type="tel" inputMode="tel" placeholder="e.g. 07700 900123" autoComplete="tel" value={form.phone} onChange={set('phone')} onBlur={blur('phone')} error={errors.phone} show={shown('phone')} hasValue={!!form.phone.trim()} maxLength={20} />
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
