import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const TIMELINE = ['submitted', 'pre_screen', 'underwriting', 'approved', 'docs_pending', 'payout_pending', 'paid', 'completed'];

const FinanceApplicationDetail: React.FC = () => {
  const { id } = useParams();
  const { dealer, user } = useDealerAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('id');

  const { data: app } = useQuery({
    queryKey: ['fa', id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('finance_applications')
        .select('*, finance_application_vehicle(*), finance_application_finance(*), finance_application_docs(*), finance_application_messages(*), finance_application_events(*)')
        .eq('id', id).single();
      return data;
    },
    enabled: !!id,
  });

  const sendMessage = async () => {
    if (!message.trim()) return;
    const { error } = await (supabase as any).from('finance_application_messages').insert({
      application_id: id, author: user?.id, author_role: 'dealer', body: message.trim(),
    });
    if (error) return toast.error(error.message);
    setMessage('');
    qc.invalidateQueries({ queryKey: ['fa', id] });
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const path = `${id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('finance-documents').upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await (supabase as any).from('finance_application_docs').insert({
        application_id: id, doc_type: docType, file_path: path,
      });
      if (insErr) throw insErr;
      toast.success('Uploaded');
      qc.invalidateQueries({ queryKey: ['fa', id] });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (!app) return <DealerLayout><div className="p-8 text-gray-500">Loading…</div></DealerLayout>;

  const v = app.finance_application_vehicle;
  const f = app.finance_application_finance;
  const isDeclined = app.status === 'declined' || app.status === 'withdrawn';

  return (
    <DealerLayout>
      <div className="space-y-6">
        <Link to="/dealer-portal/applications" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to applications
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{app.reference}</h1>
            <p className="text-sm text-gray-600">{app.customer?.first_name} {app.customer?.last_name}</p>
          </div>
          <span className="inline-block px-3 py-1 rounded bg-orange-100 text-orange-700 text-sm font-semibold">
            {app.status.replace('_', ' ')}
          </span>
        </div>

        {!isDeclined && (
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2">
              {TIMELINE.map((s, i) => {
                const reached = TIMELINE.indexOf(app.status) >= i;
                return (
                  <React.Fragment key={s}>
                    <div className={`flex flex-col items-center text-[10px] ${reached ? 'text-emerald-700' : 'text-gray-400'}`}>
                      <div className={`h-6 w-6 rounded-full border-2 ${reached ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`} />
                      <span className="mt-1 uppercase tracking-wider">{s.replace('_', ' ')}</span>
                    </div>
                    {i < TIMELINE.length - 1 && <div className={`flex-1 h-0.5 ${reached ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-white border rounded-lg p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Vehicle</h2>
            <dl className="text-sm space-y-1 text-gray-700">
              <div className="flex justify-between"><dt>VRM</dt><dd className="font-mono">{v?.vrm || '—'}</dd></div>
              <div className="flex justify-between"><dt>Make / Model</dt><dd>{v?.make} {v?.model}</dd></div>
              <div className="flex justify-between"><dt>Year</dt><dd>{v?.year || '—'}</dd></div>
              <div className="flex justify-between"><dt>Mileage</dt><dd>{v?.mileage?.toLocaleString() || '—'}</dd></div>
              <div className="flex justify-between"><dt>Valuation</dt><dd>£{v?.valuation?.toLocaleString() || '—'}</dd></div>
            </dl>
          </section>

          <section className="bg-white border rounded-lg p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Finance</h2>
            <dl className="text-sm space-y-1 text-gray-700">
              <div className="flex justify-between"><dt>Product</dt><dd>{f?.product || '—'}</dd></div>
              <div className="flex justify-between"><dt>Cash price</dt><dd>£{f?.cash_price?.toLocaleString() || '—'}</dd></div>
              <div className="flex justify-between"><dt>Deposit</dt><dd>£{f?.deposit?.toLocaleString() || '—'}</dd></div>
              <div className="flex justify-between"><dt>Term</dt><dd>{f?.term_months || '—'} months</dd></div>
              <div className="flex justify-between"><dt>APR</dt><dd>{f?.apr || '—'}%</dd></div>
              <div className="flex justify-between"><dt>Monthly</dt><dd>£{f?.monthly || '—'}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Commission</dt><dd>£{f?.commission || '—'}</dd></div>
            </dl>
          </section>

          <section className="bg-white border rounded-lg p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Documents</h2>
              <div className="flex items-center gap-2">
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="border rounded px-2 py-1 text-sm">
                  <option value="id">Proof of ID</option>
                  <option value="address">Proof of address</option>
                  <option value="income">Proof of income</option>
                  <option value="bank">Bank statements</option>
                  <option value="v5c">V5C</option>
                  <option value="invoice">Invoice</option>
                  <option value="other">Other</option>
                </select>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 border rounded cursor-pointer text-sm hover:bg-gray-50">
                  <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload'}
                  <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
                </label>
              </div>
            </div>
            <ul className="text-sm divide-y">
              {(app.finance_application_docs || []).length === 0 && <li className="text-gray-500 py-3">No documents uploaded.</li>}
              {(app.finance_application_docs || []).map((d: any) => (
                <li key={d.id} className="flex justify-between py-2">
                  <span>{d.doc_type} · <span className="font-mono text-xs text-gray-500">{d.file_path.split('/').pop()}</span></span>
                  <span className="text-xs uppercase tracking-wider text-gray-500">{d.status}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white border rounded-lg p-5 lg:col-span-2">
            <h2 className="font-semibold text-gray-900 mb-3">Messages</h2>
            <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
              {(app.finance_application_messages || []).length === 0 && <p className="text-sm text-gray-500">No messages yet.</p>}
              {(app.finance_application_messages || []).map((m: any) => (
                <div key={m.id} className={`p-3 rounded ${m.author_role === 'dealer' ? 'bg-orange-50' : 'bg-gray-50'}`}>
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">{m.author_role} · {format(new Date(m.created_at), 'dd MMM HH:mm')}</div>
                  <div className="text-sm">{m.body}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Send a message to the underwriter…" />
              <Button onClick={sendMessage} className="bg-orange-500 hover:bg-orange-600 text-white"><Send className="h-4 w-4" /></Button>
            </div>
          </section>
        </div>
      </div>
    </DealerLayout>
  );
};

export default FinanceApplicationDetail;
