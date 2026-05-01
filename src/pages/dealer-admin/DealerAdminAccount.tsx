import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Lock, LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DealerAdminAccount: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [saving, setSaving] = useState(false);

  const updatePassword = async () => {
    if (pwd.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    if (pwd !== pwd2) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }
    setPwd(''); setPwd2('');
    toast({ title: 'Password updated' });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('dealerAdminUnlocked');
    navigate('/auth/');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account settings</h1>
        <p className="text-sm text-muted-foreground">Manage your dealer admin account and password.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-primary" /> Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled />
          </div>
          <div>
            <Label>User ID</Label>
            <Input value={user?.id || ''} disabled className="font-mono text-xs" />
          </div>
          <div>
            <Label>Last sign in</Label>
            <Input value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Lock className="h-4 w-4 text-primary" /> Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>New password</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Min 8 characters" />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
          </div>
          <Button onClick={updatePassword} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
            Update password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Session</CardTitle></CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out everywhere
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DealerAdminAccount;
