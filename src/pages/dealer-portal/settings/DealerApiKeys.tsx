import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const DealerApiKeys: React.FC = () => {
  const { dealer } = useDealerAuth();
  const qc = useQueryClient();
  const [label, setLabel] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: keys = [] } = useQuery({
    queryKey: ['dealer-api-keys', dealer?.id],
    queryFn: async () => {
      if (!dealer?.id) return [];
      const { data } = await (supabase as any).from('dealer_api_keys').select('*').eq('dealer_id', dealer.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!dealer?.id,
  });

  const { data: hooks = [] } = useQuery({
    queryKey: ['dealer-webhooks', dealer?.id],
    queryFn: async () => {
      if (!dealer?.id) return [];
      const { data } = await (supabase as any).from('api_webhook_endpoints').select('*').eq('dealer_id', dealer.id);
      return data || [];
    },
    enabled: !!dealer?.id,
  });

  const create = async () => {
    if (!dealer?.id || !label) return;
    const raw = 'lvf_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const key_hash = await sha256(raw);
    const key_prefix = raw.slice(0, 10);
    const { error } = await (supabase as any).from('dealer_api_keys').insert({ dealer_id: dealer.id, label, key_hash, key_prefix });
    if (error) return toast.error(error.message);
    setNewKey(raw);
    setLabel('');
    qc.invalidateQueries({ queryKey: ['dealer-api-keys'] });
  };

  const revoke = async (id: string) => {
    await (supabase as any).from('dealer_api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['dealer-api-keys'] });
  };

  const addHook = async () => {
    if (!dealer?.id || !webhookUrl) return;
    const secret = 'whsec_' + crypto.randomUUID().replace(/-/g, '');
    const { error } = await (supabase as any).from('api_webhook_endpoints').insert({ dealer_id: dealer.id, url: webhookUrl, secret });
    if (error) return toast.error(error.message);
    setWebhookUrl('');
    qc.invalidateQueries({ queryKey: ['dealer-webhooks'] });
  };

  const removeHook = async (id: string) => {
    await (supabase as any).from('api_webhook_endpoints').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['dealer-webhooks'] });
  };

  return (
    <DealerLayout>
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API & webhooks</h1>
          <p className="text-sm text-gray-600">Integrate your DMS or in-house system with our finance platform.</p>
        </div>

        <section className="bg-white border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">API keys</h2>
          {newKey && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
              <p className="font-semibold text-amber-900 mb-1">Copy this key now — it will not be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="font-mono bg-white border rounded px-2 py-1 flex-1 break-all">{newKey}</code>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Copied'); }}><Copy className="h-3 w-3" /></Button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Input placeholder="Key label (e.g. Production DMS)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Button onClick={create} className="bg-orange-500 hover:bg-orange-600 text-white"><Plus className="h-4 w-4 mr-1" /> Create</Button>
          </div>
          <ul className="divide-y">
            {keys.map((k: any) => (
              <li key={k.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{k.label}</div>
                  <div className="text-xs text-gray-500 font-mono">{k.key_prefix}… · {k.revoked_at ? 'revoked' : 'active'}</div>
                </div>
                {!k.revoked_at && <Button size="sm" variant="ghost" onClick={() => revoke(k.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>}
              </li>
            ))}
            {keys.length === 0 && <li className="py-2 text-sm text-gray-500">No keys yet.</li>}
          </ul>
          <div className="text-xs text-gray-500">
            <p className="font-semibold mb-1">How to authenticate</p>
            <pre className="bg-gray-50 border rounded p-2 overflow-x-auto">{`curl https://api.example.com/v1/applications \\
  -H "Authorization: Bearer YOUR_KEY"`}</pre>
          </div>
        </section>

        <section className="bg-white border rounded-lg p-5 space-y-4">
          <h2 className="font-semibold">Webhook endpoints</h2>
          <div className="flex gap-2">
            <Input placeholder="https://your-site.com/webhooks/finance" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
            <Button onClick={addHook} className="bg-orange-500 hover:bg-orange-600 text-white"><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>
          <ul className="divide-y">
            {hooks.map((h: any) => (
              <li key={h.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium break-all">{h.url}</div>
                  <div className="text-xs text-gray-500">Secret: <span className="font-mono">{h.secret.slice(0, 12)}…</span> · {h.events.join(', ')}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeHook(h.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
              </li>
            ))}
            {hooks.length === 0 && <li className="py-2 text-sm text-gray-500">No webhooks configured.</li>}
          </ul>
        </section>
      </div>
    </DealerLayout>
  );
};

export default DealerApiKeys;
