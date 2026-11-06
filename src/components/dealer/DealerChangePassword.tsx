import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DealerFieldError from '@/components/dealer/DealerFieldError';

/** Lets a signed-in dealer replace their temporary password. */
const DealerChangePassword: React.FC = () => {
  const { toast } = useToast();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setError('Use at least 8 characters.');
    if (pw !== confirm) return setError('The two passwords do not match.');
    setError(null);
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw, data: { must_change_password: false } });
    setSaving(false);
    if (err) return setError(err.message);
    setPw(''); setConfirm('');
    toast({ title: 'Password changed', description: 'Use your new password next time you sign in.' });
  };

  return (
    <form id="change-password" onSubmit={submit} className="rounded-2xl border bg-card p-5 space-y-4 scroll-mt-28">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Change password</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="new-pw">New password</Label><Input id="new-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <div><Label htmlFor="confirm-pw">Confirm new password</Label><Input id="confirm-pw" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
      </div>
      {error && <DealerFieldError>{error}</DealerFieldError>}
      <Button type="submit" disabled={saving || !pw} className="rounded-full">
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Update password
      </Button>
    </form>
  );
};

export default DealerChangePassword;
