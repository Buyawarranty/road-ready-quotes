import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DealerLayout } from '@/components/dealer/DealerLayout';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Plus, Upload } from 'lucide-react';

interface ClaimRow {
  id: string;
  claim_reference: string | null;
  registration_plate: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  customer_name: string | null;
  created_at: string;
  status: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Under review',
  in_review: 'Under review',
  information_required: 'Information required',
  approved: 'Approved',
  declined: 'Closed',
  closed: 'Closed',
};

const statusClasses = (status: string) =>
  status === 'Information required'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : status === 'Approved'
    ? 'bg-green-50 text-green-700 border-green-200'
    : status === 'Closed'
    ? 'bg-gray-100 text-gray-600 border-gray-200'
    : 'bg-sky-50 text-sky-700 border-sky-200';

const DealerClaimsList: React.FC = () => {
  const navigate = useNavigate();
  const { dealer } = useDealerAuth();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealer?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('dealer_admin_claims')
        .select('id, claim_reference, registration_plate, vehicle_make, vehicle_model, customer_name, created_at, status')
        .eq('dealer_id', dealer.id)
        .order('created_at', { ascending: false });
      if (!cancelled) {
        setClaims((data as ClaimRow[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dealer?.id]);

  return (
    <DealerLayout>
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wider text-crm-orange">CLAIMS</p>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Claims</h1>
            <p className="text-sm text-gray-600 mt-1">Warranty claims you have submitted for your customers.</p>
          </div>
          <Button
            onClick={() => navigate('/dealer-portal/claims/new')}
            className="w-full sm:w-auto bg-crm-orange hover:bg-crm-orange/90 text-white"
          >
            <Plus className="h-4 w-4 mr-1" /> Start a claim
          </Button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-crm-orange" />
            </div>
          ) : claims.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm font-semibold text-gray-900">No claims yet</p>
              <p className="text-sm text-gray-500">When you submit a claim it will appear here.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/dealer-portal/claims/new')}
              >
                Start a claim
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Reference</th>
                    <th className="px-4 py-3 text-left font-semibold">Vehicle</th>
                    <th className="px-4 py-3 text-left font-semibold">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {claims.map((c) => {
                    const status = STATUS_LABELS[String(c.status ?? '').toLowerCase()] || 'Under review';
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{c.claim_reference || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {c.registration_plate}
                          {[c.vehicle_make, c.vehicle_model].filter(Boolean).length > 0 && (
                            <span className="text-gray-400"> · {[c.vehicle_make, c.vehicle_model].filter(Boolean).join(' ')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{c.customer_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClasses(status)}`}>
                            {status}
                          </span>
                          {status === 'Information required' && (
                            <Button size="sm" variant="ghost" className="ml-2 text-crm-orange">
                              <Upload className="h-3.5 w-3.5 mr-1" /> Upload requested document
                            </Button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/dealer-portal/claims/${c.id}`)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DealerLayout>
  );
};

export default DealerClaimsList;
