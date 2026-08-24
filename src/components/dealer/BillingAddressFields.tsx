import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BillingAddress, COUNTRY_OPTIONS } from '@/lib/dealerBilling';

interface Props {
  value: BillingAddress;
  onChange: (next: BillingAddress) => void;
  errors?: Partial<Record<keyof BillingAddress, string>>;
  disabled?: boolean;
}

const Field: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required, error, children }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold text-gray-700">
      {label} {required && <span className="text-orange-600">*</span>}
    </Label>
    {children}
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);

const inputCls = 'h-10 bg-gray-100 border-gray-300 text-gray-900';

export const BillingAddressFields: React.FC<Props> = ({ value, onChange, errors = {}, disabled }) => {
  const set = (key: keyof BillingAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: e.target.value });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="First name">
        <Input className={inputCls} value={value.first_name} onChange={set('first_name')} disabled={disabled} />
      </Field>
      <Field label="Last name">
        <Input className={inputCls} value={value.last_name} onChange={set('last_name')} disabled={disabled} />
      </Field>

      <div className="sm:col-span-2">
        <Field label="Address line 1" required error={errors.address1}>
          <Input className={inputCls} value={value.address1} onChange={set('address1')} disabled={disabled} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Address line 2">
          <Input className={inputCls} value={value.address2} onChange={set('address2')} disabled={disabled} />
        </Field>
      </div>

      <Field label="Town / city" required error={errors.city}>
        <Input className={inputCls} value={value.city} onChange={set('city')} disabled={disabled} />
      </Field>
      <Field label="County">
        <Input className={inputCls} value={value.county} onChange={set('county')} disabled={disabled} />
      </Field>

      <Field label="Postcode" required error={errors.postal_code}>
        <Input
          className={`${inputCls} uppercase`}
          value={value.postal_code}
          onChange={set('postal_code')}
          disabled={disabled}
        />
      </Field>
      <Field label="Country" required error={errors.country_code}>
        <select
          value={value.country_code}
          onChange={(e) => onChange({ ...value, country_code: e.target.value })}
          disabled={disabled}
          className="h-10 w-full rounded-md border border-gray-300 bg-gray-100 px-3 text-sm text-gray-900"
        >
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </Field>
    </div>
  );
};

export default BillingAddressFields;
