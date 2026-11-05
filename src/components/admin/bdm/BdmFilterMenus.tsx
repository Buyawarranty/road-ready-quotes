import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, Car, Clock, History, MapPin, Phone, SlidersHorizontal, Store, UserCircle } from 'lucide-react';

export type FilterOption = { id: string; label: string; hint?: string; tone?: string; dot?: string };

const Row: React.FC<{ checked: boolean; onToggle: () => void; children: React.ReactNode }> = ({ checked, onToggle, children }) => (
  <label className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-muted/60">
    <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
    <span className="min-w-0 flex-1 text-sm">{children}</span>
  </label>
);

const OptionLabel: React.FC<{ o: FilterOption }> = ({ o }) => (
  <>
    <span className="flex items-center gap-2">
      {o.dot && <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${o.dot}`} />}
      <span className={o.tone ? `rounded px-1.5 py-0.5 font-medium ${o.tone}` : ''}>{o.label}</span>
    </span>
    {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
  </>
);

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

const summary = (value: string[], options: FilterOption[]) =>
  value.length === 0 ? 'All' : value.length === 1 ? options.find(o => o.id === value[0])?.label ?? '1' : `${value.length} selected`;

/** Checkbox drop-down: "All" at the top clears the group; ticking options combines them. */
export const MultiFilter: React.FC<{ label: string; allLabel: string; options: FilterOption[]; value: string[]; onChange: (v: string[]) => void }> = ({ label, allLabel, options, value, onChange }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button type="button" className={`inline-flex h-9 items-center gap-1 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted/50 ${value.length ? 'border-crm-orange bg-crm-orange/5' : ''}`}>
        {label}: {summary(value, options)} <ChevronDown className="h-4 w-4 opacity-70" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-60 max-w-[calc(100vw-1.5rem)] p-1">
      <button type="button" onClick={() => onChange([])} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-muted/60">
        <Check className={`h-4 w-4 text-crm-orange ${value.length ? 'opacity-0' : ''}`} />{allLabel}
      </button>
      <div className="my-1 border-t" />
      {options.map(o => (
        <Row key={o.id} checked={value.includes(o.id)} onToggle={() => onChange(toggle(value, o.id))}><OptionLabel o={o} /></Row>
      ))}
    </PopoverContent>
  </Popover>
);

export type MoreGroup = { key: string; label: string; hint: string; icon: 'calls' | 'attempted' | 'stock' | 'account' | 'bdm' | 'activity'; options: FilterOption[] };
const ICONS = { calls: Phone, attempted: Clock, stock: Car, account: Store, bdm: UserCircle, activity: History };

/** "More filters" panel: each group expands into its own checkboxes; location is a free-text match. */
export const MoreFilters: React.FC<{
  groups: MoreGroup[]; values: Record<string, string[]>; onChange: (key: string, v: string[]) => void;
  location: string; onLocation: (v: string) => void;
}> = ({ groups, values, onChange, location, onLocation }) => {
  const [open, setOpen] = React.useState<string | null>(null);
  const active = groups.reduce((n, g) => n + (values[g.key]?.length ? 1 : 0), 0) + (location ? 1 : 0);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted/50 ${active ? 'border-crm-orange bg-crm-orange/5' : ''}`}>
          <SlidersHorizontal className="h-4 w-4" />More filters{active ? ` (${active})` : ''}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto p-2">
        <p className="px-2 pb-1 text-sm font-semibold">More filters</p>
        {groups.map(g => {
          const Icon = ICONS[g.icon];
          const v = values[g.key] ?? [];
          return (
            <div key={g.key}>
              <button type="button" onClick={() => setOpen(o => (o === g.key ? null : g.key))} className="flex w-full items-start gap-2 rounded px-2 py-2 text-left hover:bg-muted/60">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex-1">
                  <span className="block text-sm font-medium">{g.label}{v.length ? <span className="ml-1 text-crm-orange">({v.length})</span> : null}</span>
                  <span className="block text-xs text-muted-foreground">{g.hint}</span>
                </span>
                <ChevronDown className={`mt-0.5 h-4 w-4 transition-transform ${open === g.key ? 'rotate-180' : ''}`} />
              </button>
              {open === g.key && (
                <div className="mb-1 ml-6 border-l pl-1">
                  {g.options.map(o => <Row key={o.id} checked={v.includes(o.id)} onToggle={() => onChange(g.key, toggle(v, o.id))}><OptionLabel o={o} /></Row>)}
                </div>
              )}
            </div>
          );
        })}
        <div className="px-2 py-2">
          <span className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4" />Location</span>
          <span className="mb-1 ml-6 block text-xs text-muted-foreground">County, town, area or postcode</span>
          <Input value={location} onChange={e => onLocation(e.target.value)} placeholder="e.g. Surrey, Hove or BN3" className="ml-6 h-8 w-[calc(100%-1.5rem)]" />
        </div>
      </PopoverContent>
    </Popover>
  );
};
