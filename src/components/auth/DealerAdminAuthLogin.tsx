import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isAdminRole } from '@/lib/adminRoles';

interface DealerAdminAuthLoginProps {
  onAuthenticated: () => void;
}

export const DealerAdminAuthLogin = ({ onAuthenticated }: DealerAdminAuthLoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const userId = data.session?.user?.id;
      if (!userId) throw new Error('Please sign in again.');

      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError) throw roleError;

      const hasDealerAdminAccess = (roles || []).some((role) => isAdminRole(role.role as string));
      if (!hasDealerAdminAccess) {
        await supabase.auth.signOut();
        toast({
          title: 'Admin account required',
          description: 'Please use the dealer admin account for this dashboard.',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'Signed in', description: 'Welcome to dealer admin.' });
      onAuthenticated();
    } catch (error: any) {
      toast({
        title: 'Sign in failed',
        description: error.message || 'Please check the details and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl md:text-2xl">Dealer admin login</CardTitle>
          <CardDescription>Sign in with the dealer admin account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dealer-admin-email">Email</Label>
              <Input
                id="dealer-admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dealer-admin-password">Password</Label>
              <Input
                id="dealer-admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};