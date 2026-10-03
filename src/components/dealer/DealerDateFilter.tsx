import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, X } from 'lucide-react';
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface DealerDateFilterProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

interface Preset {
  key: string;
  label: string;
  getRange: () => DateRange | undefined;
}

const presets: Preset[] = [
  { key: 'custom', label: 'Custom', getRange: () => undefined },
  { key: 'today', label: 'Today', getRange: () => { const t = new Date(); return { from: t, to: t }; } },
  { key: 'yesterday', label: 'Yesterday', getRange: () => { const y = subDays(new Date(), 1); return { from: y, to: y }; } },
  { key: 'this_week', label: 'This week (Mon – Sun)', getRange: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { key: 'last_7', label: 'Last 7 days', getRange: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { key: 'last_week', label: 'Last week (Mon – Sun)', getRange: () => { const ref = subDays(new Date(), 7); return { from: startOfWeek(ref, { weekStartsOn: 1 }), to: endOfWeek(ref, { weekStartsOn: 1 }) }; } },
  { key: 'last_14', label: 'Last 14 days', getRange: () => ({ from: subDays(new Date(), 13), to: new Date() }) },
  { key: 'this_month', label: 'This month', getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { key: 'last_30', label: 'Last 30 days', getRange: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { key: 'last_month', label: 'Last month', getRange: () => { const ref = subMonths(new Date(), 1); return { from: startOfMonth(ref), to: endOfMonth(ref) }; } },
  { key: 'all_time', label: 'All time', getRange: () => undefined },
];

const sameDay = (a?: Date, b?: Date) =>
  !!a && !!b && format(a, 'yyyy-MM-dd') === format(b, 'yyyy-MM-dd');

function activePresetKey(range: DateRange | undefined): string {
  if (!range?.from) return 'all_time';
  for (const p of presets) {
    if (p.key === 'custom' || p.key === 'all_time') continue;
    const r = p.getRange();
    if (r?.from && r?.to && range.to && sameDay(r.from, range.from) && sameDay(r.to, range.to)) {
      return p.key;
    }
  }
  return 'custom';
}

function displayLabel(range: DateRange | undefined): string {
  if (!range?.from) return 'All time';
  const key = activePresetKey(range);
  const preset = presets.find((p) => p.key === key);
  if (preset && key !== 'custom') return preset.label;
  if (range.to && sameDay(range.from, range.to)) return format(range.from, 'dd/MM/yyyy');
  if (range.to) return `${format(range.from, 'dd/MM/yyyy')} – ${format(range.to, 'dd/MM/yyyy')}`;
  return format(range.from, 'dd/MM/yyyy');
}

export const DealerDateFilter: React.FC<DealerDateFilterProps> = ({ value, onChange, className }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(undefined);

  const activeKey = useMemo(() => activePresetKey(value), [value]);
  const draftKey = useMemo(() => activePresetKey(draft), [draft]);

  const openPopover = (next: boolean) => {
    setOpen(next);
    if (next) setDraft(value);
  };

  const apply = () => {
    onChange(draft?.from ? draft : undefined);
    setOpen(false);
  };

  return (
    <div className={cn('', className)}>
      <Popover open={open} onOpenChange={openPopover}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-11 px-3 min-w-[190px] justify-start text-left font-semibold border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
              !value?.from && 'text-gray-500'
            )}
          >
            <CalendarDays className="mr-2 h-4 w-4 text-orange-500" />
            <span className="truncate text-sm">{displayLabel(value)}</span>
            {value?.from && (
              <X
                className="ml-auto h-3.5 w-3.5 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(undefined);
                }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-auto p-0 z-50 pointer-events-auto overflow-hidden rounded-xl"
        >
          <div className="flex flex-col sm:flex-row">
            {/* Preset rail */}
            <div className="sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-gray-200 bg-white py-2 max-h-64 sm:max-h-none overflow-y-auto">
              {presets.map((p) => {
                const isActive = p.key === 'custom' ? draftKey === 'custom' : draftKey === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setDraft(p.key === 'custom' ? draft : p.getRange())}
                    className={cn(
                      'block w-full text-left px-5 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-800 hover:bg-gray-50'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Calendar panel */}
            <div className="p-5 bg-white">
              <p className="text-xs font-extrabold tracking-widest text-gray-500 mb-2">FILTER APPLIES TO</p>
              <div className="h-11 flex items-center px-3 rounded-md border border-gray-300 text-sm text-gray-800 mb-4 select-none">
                Date created
              </div>

              <div className="flex items-end gap-3 mb-3">
                <div className="flex-1">
                  <p className="text-xs font-extrabold tracking-widest text-gray-500 mb-1.5">START DATE</p>
                  <div className="h-11 flex items-center px-3 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-800">
                    {draft?.from ? format(draft.from, 'dd/MM/yyyy') : '—'}
                  </div>
                </div>
                <span className="pb-3 text-gray-400">—</span>
                <div className="flex-1">
                  <p className="text-xs font-extrabold tracking-widest text-gray-500 mb-1.5">END DATE</p>
                  <div className="h-11 flex items-center px-3 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-800">
                    {draft?.to ? format(draft.to, 'dd/MM/yyyy') : '—'}
                  </div>
                </div>
              </div>

              <Calendar
                mode="range"
                defaultMonth={draft?.from || new Date()}
                selected={draft}
                onSelect={(r) => setDraft(r)}
                numberOfMonths={1}
                className="pointer-events-auto"
                disabled={(date) => date > new Date()}
              />

              <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-gray-200">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="font-bold text-gray-800 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={apply}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
