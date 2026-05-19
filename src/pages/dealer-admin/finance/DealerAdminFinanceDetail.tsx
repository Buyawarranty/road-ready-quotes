import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DealerAdminFinanceDetail: React.FC = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const { data: app } = useQuery({
    queryKey: ['admin-fa', id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('finance_applications')
        .select('*, finance_application_vehicle(*), finance_application_finance(*), finance_application_docs(*), finance_application_messages(*), finance_application_events(*), dealers:dealer_id(company_name, name, email)')
        .eq('id', id).single();
      return data;
    },
    enabled: !!id,
  });

  const transition = async (to: string) => {
    const { error } = await (supabase as any).from('finance_applications').update({
      status: to, decision: { reason, by: 'admin' }, decided_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return toast.error(error.message);
    await (supabase as any).from('finance_application_events').insert({
      application_id: id, event_type: 'decision', from_status: app?.status, to_status: to, payload: { reason },
    });
    toast.success(`Marked ${to}`);
    setReason('');
    qc.invalidateQueries({ queryKey: ['admin-fa', id] });
  };

  const reviewDoc = async (docId: string, status: 'approved' | 'rejected') => {
    await (supabase as any).from('finance_application_docs').update({ status, reviewed_at: new Date().toISOString() }).eq('id', docId);
    qc.invalidateQueries({ queryKey: ['admin-fa', id] });
  };

  const reply = async () => {
    if (!message.trim()) return;
    await (supabase as any).from('finance_application_messages').insert({
      application_id: id, author_role: 'underwriter', body: message.trim(),
    });
    setMessage('');
    qc.invalidateQueries({ queryKey: ['admin-fa', id] });
  };

  if (!app) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const v = app.finance_application_vehicle;
  const f = app.finance_application_finance;

  return (
    <div className="space-y-6">
      <Link to="/dealer-admin/finance" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to queue
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{app.reference}</h1>
          <p className="text-sm text-muted-foreground">{app.dealers?.company_name} · {app.customer?.first_name} {app.customer?.last_name}</p>
        </div>
        <span className="inline-block px-3 py-1 rounded bg-orange-100 text-orange-700 text-sm font-semibold">{app.status.replace('_', ' ')}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-3">Vehicle</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">VRM:</span> {v?.vrm || '—'}</div>
              <div><span className="text-muted-foreground">Make/Model:</span> {v?.make} {v?.model}</div>
              <div><span className="text-muted-foreground">Year:</span> {v?.year || '—'}</div>
              <div><span className="text-muted-foreground">Mileage:</span> {v?.mileage?.toLocaleString() || '—'}</div>
              <div><span className="text-muted-foreground">Valuation:</span> £{v?.valuation?.toLocaleString() || '—'}</div>
            </div>
          </section>

          <section className="bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-3">Customer & finance</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {app.customer?.email || '—'}</div>
              <div><span className="text-muted-foreground">Phone:</span> {app.customer?.phone || '—'}</div>
              <div><span className="text-muted-foreground">DOB:</span> {app.customer?.dob || '—'}</div>
              <div><span className="text-muted-foreground">Postcode:</span> {app.customer?.postcode || '—'}</div>
              <div><span className="text-muted-foreground">Employment:</span> {app.customer?.employment_status || '—'}</div>
              <div><span className="text-muted-foreground">Income:</span> £{app.customer?.annual_income || '—'}</div>
              <hr className="col-span-2 my-2"/>
              <div><span className="text-muted-foreground">Product:</span> {f?.product}</div>
              <div><span className="text-muted-foreground">Cash:</span> £{f?.cash_price}</div>
              <div><span className="text-muted-foreground">Deposit:</span> £{f?.deposit}</div>
              <div><span className="text-muted-foreground">Term:</span> {f?.term_months} mo</div>
              <div><span className="text-muted-foreground">APR:</span> {f?.apr}%</div>
              <div><span className="text-muted-foreground">Monthly:</span> £{f?.monthly}</div>
            </div>
          </section>

          <section className="bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-3">Documents</h2>
            <ul className="text-sm divide-y">
              {(app.finance_application_docs || []).length === 0 && <li className="text-muted-foreground py-2">None.</li>}
              {(app.finance_application_docs || []).map((d: any) => (
                <li key={d.id} className="py-2 flex items-center justify-between">
                  <span>{d.doc_type} · <span className="font-mono text-xs">{d.file_path.split('/').pop()}</span></span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase">{d.status}</span>
                    <Button size="sm" variant="outline" onClick={() => reviewDoc(d.id, 'approved')}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => reviewDoc(d.id, 'rejected')}>Reject</Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-3">Messages</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
              {(app.finance_application_messages || []).map((m: any) => (
                <div key={m.id} className={`p-2 rounded text-sm ${m.author_role === 'dealer' ? 'bg-orange-50' : 'bg-muted/40'}`}>
                  <div className="text-[11px] uppercase text-muted-foreground">{m.author_role} · {format(new Date(m.created_at), 'dd MMM HH:mm')}</div>
                  {m.body}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
              <Button onClick={reply}>Reply</Button>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="bg-card border rounded-lg p-5 space-y-3">
            <h2 className="font-semibold">Decision</h2>
            <Textarea placeholder="Reason / conditions…" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="grid grid-cols-1 gap-2">
              <Button onClick={() => transition('approved')} className="bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</Button>
              <Button onClick={() => transition('referred')} variant="outline"><AlertTriangle className="h-4 w-4 mr-1" /> Refer</Button>
              <Button onClick={() => transition('declined')} variant="destructive"><XCircle className="h-4 w-4 mr-1" /> Decline</Button>
              <hr/>
              <Button size="sm" variant="outline" onClick={() => transition('pre_screen')}>→ Pre-screen</Button>
              <Button size="sm" variant="outline" onClick={() => transition('underwriting')}>→ Underwriting</Button>
              <Button size="sm" variant="outline" onClick={() => transition('docs_pending')}>→ Docs pending</Button>
              <Button size="sm" variant="outline" onClick={() => transition('payout_pending')}>→ Payout pending</Button>
              <Button size="sm" variant="outline" onClick={() => transition('paid')}>→ Paid</Button>
              <Button size="sm" variant="outline" onClick={() => transition('completed')}>→ Completed</Button>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-5">
            <h2 className="font-semibold mb-2">Audit log</h2>
            <ul className="text-xs space-y-1 max-h-64 overflow-y-auto">
              {(app.finance_application_events || []).map((e: any) => (
                <li key={e.id} className="text-muted-foreground">
                  {format(new Date(e.created_at), 'dd MMM HH:mm')} · {e.event_type} {e.from_status && `: ${e.from_status} → ${e.to_status}`}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DealerAdminFinanceDetail;
