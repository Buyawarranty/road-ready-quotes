import type { ElementType } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  icon: ElementType;
  label: string;
  helper: string;
  options: { value: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (value: string) => void;
}
export default function WarrantyOptionRow({ icon: Icon, label, helper, options, value, onChange }: Props) {
  return <div className="grid gap-3 border-t border-crm-line py-3 first:border-t-0 lg:grid-cols-[185px_minmax(0,1fr)] lg:items-center">
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div><p className="text-xs font-semibold">{label}</p><p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{helper}</p></div>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {options.map(option => <Button key={option.value} size="sm" variant="outline" aria-pressed={option.value === value}
        disabled={option.disabled}
        onClick={() => onChange(option.value)} className={`h-auto min-h-9 min-w-[70px] flex-1 whitespace-normal px-2 py-2 text-xs ${option.value === value ? 'border-crm-orange bg-crm-orange text-primary-foreground hover:bg-crm-orange/90 hover:text-primary-foreground' : 'border-crm-line'}`}>
        {option.label}
      </Button>)}
    </div>
  </div>;
}