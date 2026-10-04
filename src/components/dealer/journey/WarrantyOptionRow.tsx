import type { ElementType } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
      <div className="flex items-center gap-1.5"><p className="text-xs font-semibold">{label}</p><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" aria-label={`About ${label}`}><Info className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent className="max-w-64 text-xs">{helper}</TooltipContent></Tooltip></div>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {options.map(option => <Button key={option.value} size="sm" variant="outline" aria-pressed={option.value === value}
        disabled={option.disabled}
        onClick={() => onChange(option.value)} className={`h-auto min-h-10 min-w-[78px] flex-1 gap-1.5 whitespace-normal border-2 px-2 py-2 text-xs ${option.value === value ? 'border-crm-orange bg-crm-orange-soft text-foreground hover:bg-crm-orange-soft hover:text-foreground' : 'border-crm-line bg-muted/40'}`}>
        {option.label}
        {option.value === value && <span className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-crm-green text-primary-foreground"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>}
      </Button>)}
    </div>
  </div>;
}