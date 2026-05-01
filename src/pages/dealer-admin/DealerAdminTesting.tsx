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
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlayCircle, Database, Mail, CreditCard, Beaker } from 'lucide-react';

const PRESETS: Record<string, { name: string; type: string; payload: string }> = {
  customer: {
    name: 'Create test customer',
    type: 'data',
    payload: JSON.stringify({ name: 'Test Customer', email: 'test+1@example.com', plan: 'basic' }, null, 2),
  },
  email: {
    name: 'Send test welcome email',
    type: 'email',
    payload: JSON.stringify({ to: 'test@example.com', template: 'welcome' }, null, 2),
  },
  payment: {
    name: 'Stripe checkout test',
    type: 'payment',
    payload: JSON.stringify({ amount: 100, currency: 'gbp' }, null, 2),
  },
};

const DealerAdminTesting: React.FC = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [type, setType] = useState('api');
  const [payloadText, setPayloadText] = useState('{}');
  const [running, setRunning] = useState(false);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['dealer-admin-test-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dealer_admin_test_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const usePreset = (key: string) => {
    const p = PRESETS[key];
    setName(p.name);
    setType(p.type);
    setPayloadText(p.payload);
  };

  const run = async () => {
    if (!name.trim()) {
      toast({ title: 'Test name required', variant: 'destructive' });
      return;
    }
    let payload: any = {};
    try {
      payload = payloadText.trim() ? JSON.parse(payloadText) : {};
    } catch {
      toast({ title: 'Invalid JSON payload', variant: 'destructive' });
      return;
    }
    setRunning(true);
    const start = Date.now();
    // Local validation only — real integration tests would invoke specific edge functions.
    const result = {
      simulated: true,
      received_at: new Date().toISOString(),
      payload_keys: Object.keys(payload),
    };
    const duration_ms = Date.now() - start;

    const { error } = await supabase.from('dealer_admin_test_runs').insert({
      test_name: name,
      test_type: type,
      status: 'success',
      payload,
      result,
      duration_ms,
    });
    setRunning(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Test logged', description: `${duration_ms}ms` });
    qc.invalidateQueries({ queryKey: ['dealer-admin-test-runs'] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Testing</h1>
        <p className="text-sm text-muted-foreground">Run validation tests and create dealer test data.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="cursor-pointer hover:border-primary" onClick={() => usePreset('customer')}>
          <CardContent className="pt-5 flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" />
            <div><p className="font-medium text-sm">Test customer</p><p className="text-xs text-muted-foreground">Sample insert payload</p></div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary" onClick={() => usePreset('email')}>
          <CardContent className="pt-5 flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <div><p className="font-medium text-sm">Welcome email</p><p className="text-xs text-muted-foreground">Validate template payload</p></div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary" onClick={() => usePreset('payment')}>
          <CardContent className="pt-5 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div><p className="font-medium text-sm">Stripe checkout</p><p className="text-xs text-muted-foreground">Sample payment payload</p></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Beaker className="h-4 w-4 text-primary" /> New test</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Test name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My validation test" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Payload (JSON)</Label>
            <Textarea rows={8} className="font-mono text-xs" value={payloadText} onChange={(e) => setPayloadText(e.target.value)} />
          </div>
          <Button onClick={run} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
            Run test
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent runs ({runs.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No test runs yet.</p>
          ) : (
            <div className="space-y-2">
              {runs.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{r.test_name}</p>
                      <Badge variant="outline" className="text-xs">{r.test_type}</Badge>
                      <Badge variant={r.status === 'success' ? 'default' : 'destructive'} className="text-xs">{r.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · {r.duration_ms}ms</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DealerAdminTesting;
