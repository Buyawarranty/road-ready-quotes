import React from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error: string | null;
  /** Show the error/tick only once the field has been touched or a submit was attempted. */
  show: boolean;
  hasValue: boolean;
  /** Optional icon shown inside the field on the left. */
  icon?: React.ComponentType<{ className?: string }>;
};

/** Text field with a green tick once valid and a pink error message when not. */
export const ValidatedField = React.forwardRef<HTMLInputElement, Props>(({ label, error, show, hasValue, icon: Icon, id, className, ...rest }, ref) => {
  const fieldId = id || React.useId();
  const valid = hasValue && !error;
  const invalid = show && !!error;
  return (
    <div>
      <Label htmlFor={fieldId} className="text-sm font-bold text-foreground">{label}</Label>
      <div className="relative mt-1.5">
        {Icon && <Icon aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />}
        <Input ref={ref} id={fieldId} aria-invalid={invalid} aria-describedby={invalid ? `${fieldId}-err` : undefined}
          className={cn('h-12 rounded-xl border-2 border-input bg-muted/60 pr-10 text-base font-semibold placeholder:font-semibold placeholder:text-muted-foreground', Icon && 'pl-12', invalid && 'border-2 border-crm-pink focus-visible:ring-crm-pink', valid && 'border-success', className)} {...rest} />
        {valid && <Check aria-label="Valid" className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-success" strokeWidth={3} />}
      </div>
      {invalid && <p id={`${fieldId}-err`} role="alert" className="mt-1 text-xs font-semibold !text-crm-pink">{error}</p>}
    </div>
  );
});
ValidatedField.displayName = 'ValidatedField';
