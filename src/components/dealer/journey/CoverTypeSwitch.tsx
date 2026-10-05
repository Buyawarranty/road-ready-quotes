import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CoverType = 'manage-my-claims' | 'comprehensive';

interface CoverTypeSwitchProps {
  active: CoverType;
  onChange?: (type: CoverType) => void;
}

const options: { key: CoverType; title: string; subtitle: string; target: string }[] = [
  {
    key: 'manage-my-claims',
    title: 'Manage My Claim',
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

const CoverTypeSwitch: React.FC<CoverTypeSwitchProps> = ({ active, onChange }) => {
  const navigate = useNavigate();
  return (
    <section className="rounded-lg border border-crm-line bg-card p-3" aria-label="Cover type">
      <div className="grid grid-cols-2 gap-1 rounded-md border border-crm-line bg-muted p-1">
        {[options[1], options[0]].map((option) => {
          const isActive = option.key === active;
          return (
            <Button
              variant="ghost"
              key={option.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => !isActive && (onChange ? onChange(option.key) : navigate(option.target))}
              className={`h-auto min-h-10 gap-2 whitespace-normal rounded-md px-2 py-2 text-xs sm:text-sm ${
                isActive
                  ? 'bg-crm-orange text-primary-foreground hover:bg-crm-orange hover:text-primary-foreground'
                  : 'text-foreground hover:bg-card'
              }`}
            >
              {option.key === 'comprehensive' ? <Shield className="h-4 w-4 shrink-0" /> : <Wrench className="h-4 w-4 shrink-0" />}
              {option.title}
            </Button>
          );
        })}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{active === 'comprehensive' ? 'Panda Protect provides comprehensive mechanical & electrical warranty cover and manages eligible claims.' : 'You provide and fund the warranty. Panda Protect manages the claims process for you.'}</p>
      {active === 'manage-my-claims' && <p className="mt-1 text-xs font-semibold">Your dealership funds approved repairs.</p>}
    </section>
  );
};

export default CoverTypeSwitch;
