import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

type CoverType = 'manage-my-claims' | 'comprehensive';

interface CoverTypeSwitchProps {
  active: CoverType;
}

const options: { key: CoverType; title: string; subtitle: string; target: string }[] = [
  {
    key: 'manage-my-claims',
    title: 'Manage My Claims',
    subtitle: 'Only £1 a month · We handle the claim, you pay the repair bill',
    target: '/dealer-portal/quote/claim-handling',
  },
  {
    key: 'comprehensive',
    title: 'Comprehensive Warranty',
    subtitle: 'From £69 · Fully insured mechanical & electrical cover',
    target: '/dealer-portal/quote/pricing',
  },
];

const CoverTypeSwitch: React.FC<CoverTypeSwitchProps> = ({ active }) => {
  const navigate = useNavigate();
  return (
    <div className="rounded-lg border border-crm-line bg-card p-3">
      <p className="text-xs font-semibold text-foreground">
        Cover type{' '}
        <span className="ml-1 font-normal text-muted-foreground">Switch type — your vehicle selection stays the same</span>
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isActive = option.key === active;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => !isActive && navigate(option.target)}
              className={`flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
                isActive
                  ? 'border-crm-navy bg-crm-navy text-primary-foreground'
                  : 'border-crm-line bg-card text-foreground hover:border-crm-orange/50 hover:bg-muted'
              }`}
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold">{option.title}</span>
                <span className={`block text-xs leading-snug ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {option.subtitle}
                </span>
              </span>
              {isActive && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CoverTypeSwitch;
