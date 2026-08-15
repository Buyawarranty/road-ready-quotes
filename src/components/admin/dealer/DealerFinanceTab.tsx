import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DealerAdminFinanceQueue from '@/pages/dealer-admin/finance/DealerAdminFinanceQueue';
import DealerAdminFinanceLenders from '@/pages/dealer-admin/finance/DealerAdminFinanceLenders';
import DealerAdminFinanceRules from '@/pages/dealer-admin/finance/DealerAdminFinanceRules';
import DealerAdminFinancePayouts from '@/pages/dealer-admin/finance/DealerAdminFinancePayouts';
import DealerAdminFinanceDetail from '@/pages/dealer-admin/finance/DealerAdminFinanceDetail';

const SECTIONS = [
  { id: 'queue', label: 'Applications' },
  { id: 'lenders', label: 'Lenders' },
  { id: 'rules', label: 'Underwriting rules' },
  { id: 'payouts', label: 'Payouts' },
] as const;

const DealerFinanceTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const appId = searchParams.get('app');
  const [section, setSection] = useState<string>('queue');

  if (appId) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.delete('app');
            setSearchParams(next);
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to queue
        </button>
        <DealerAdminFinanceDetail applicationId={appId} backTo="/admin-dashboard/?tab=dealer-finance" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              section === s.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {section === 'queue' && <DealerAdminFinanceQueue />}
      {section === 'lenders' && <DealerAdminFinanceLenders />}
      {section === 'rules' && <DealerAdminFinanceRules />}
      {section === 'payouts' && <DealerAdminFinancePayouts />}
    </div>
  );
};

export default DealerFinanceTab;
