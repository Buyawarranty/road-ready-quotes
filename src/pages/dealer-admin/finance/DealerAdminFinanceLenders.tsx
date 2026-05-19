import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useState } from 'react';

const DealerAdminFinanceLenders: React.FC = () => {
  const qc = useQueryClient();
  const [name, setName] = useState('');

  const { data: lenders = [] } = useQuery({
    queryKey: ['finance-lenders'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('finance_lenders').select('*').order('name');
      return data || [];
    },
  });

  const add = async () => {
    if (!name) return;
    const { error } = await (supabase as any).from('finance_lenders').insert({ name });
    if (error) return toast.error(error.message);
    setName('');
    qc.invalidateQueries({ queryKey: ['finance-lenders'] });
  };

  const toggle = async (id: string, active: boolean) => {
    await (supabase as any).from('finance_lenders').update({ active: !active }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['finance-lenders'] });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Lenders & products</h1>
        <p className="text-sm text-muted-foreground">Manage the lender panel and rate cards.</p>
      </div>
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lender name" />
        <Button onClick={add}>Add lender</Button>
      </div>
      <ul className="bg-card border rounded-lg divide-y">
        {lenders.map((l: any) => (
          <li key={l.id} className="p-3 flex items-center justify-between text-sm">
            <span>{l.name}</span>
            <Button size="sm" variant="outline" onClick={() => toggle(l.id, l.active)}>{l.active ? 'Deactivate' : 'Activate'}</Button>
          </li>
        ))}
        {lenders.length === 0 && <li className="p-3 text-muted-foreground text-sm">No lenders yet.</li>}
      </ul>
      <p className="text-xs text-muted-foreground">Products and rate cards per lender — coming next phase.</p>
    </div>
  );
};
export default DealerAdminFinanceLenders;
