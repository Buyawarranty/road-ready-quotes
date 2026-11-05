import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Bell, CalendarDays, CalendarRange, Sparkles, Sun, Sunrise } from 'lucide-react';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const at = (d: Date, h: number, m = 0) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };

/** Parses phrases like "next tuesday 9pm", "tomorrow 10am", "in 3 days", "friday 2:30pm". */
export function parseReminder(text: string, now = new Date()): Date | null {
  const t = text.toLowerCase().trim();
  if (!t) return null;
  let h = 9, m = 0;
  const tm = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  const hasTime = tm && (tm[3] || tm[2]);
  if (hasTime && tm) { h = tm[3] ? (+tm[1] % 12) + (tm[3] === 'pm' ? 12 : 0) : +tm[1]; m = tm[2] ? +tm[2] : 0; }
  if (h > 23 || m > 59) return null;
  let d: Date | null = null;
  const inN = t.match(/in\s+(\d+)\s*(hour|hr|day|week)s?/);
  if (inN) { const n = +inN[1]; const x = new Date(now);
    if (inN[2].startsWith('h')) { x.setHours(x.getHours() + n); return x; }
    x.setDate(x.getDate() + n * (inN[2] === 'week' ? 7 : 1)); d = x; }
  else if (/\btoday\b|\btonight\b/.test(t)) d = new Date(now);
  else if (/\btomorrow\b/.test(t)) { d = new Date(now); d.setDate(d.getDate() + 1); }
  else if (/\bnext week\b/.test(t)) { d = new Date(now); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); }
  else { const idx = DAYS.findIndex(n => t.includes(n) || t.includes(n.slice(0, 3)));
    if (idx >= 0) { d = new Date(now); let diff = (idx - d.getDay() + 7) % 7; if (diff === 0 || t.includes('next')) diff = diff || 7; d.setDate(d.getDate() + diff); }
    else if (hasTime) d = new Date(now); }
  if (!d) return null;
  if (/\btonight\b/.test(t) && !hasTime) h = 19;
  const r = at(d, h, m);
  if (r <= now && !inN) r.setDate(r.getDate() + 1);
  return r;
}

const fmt = (d: Date) => d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

interface Props { dealershipId: string; name: string; trigger?: React.ReactNode; onSaved: () => void }

const BdmReminderPopover: React.FC<Props> = ({ dealershipId, name, onSaved }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [custom, setCustom] = useState('');
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const now = new Date();
  const later = now.getHours() < 17 ? at(now, 17) : at(new Date(now.getTime() + 3600e3), new Date(now.getTime() + 3600e3).getHours());
  const tomorrow = at(new Date(now.getTime() + 864e5), 9);
  const nextWeek = parseReminder('next monday 9am', now)!;
  const parsed = parseReminder(text, now);

  const save = async (when: Date) => {
    setSaving(true);
    const { error } = await (supabase as any).from('bdm_dealerships')
      .update({ next_follow_up_at: when.toISOString(), next_action: note.trim().slice(0, 200) || 'Reminder' })
      .eq('id', dealershipId);
    setSaving(false);
    if (error) { toast({ title: 'Could not set reminder', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Reminder set', description: `${name} · ${fmt(when)}` });
    setOpen(false); setText(''); setNote(''); setCustom(''); setPicking(false); onSaved();
  };

  const Opt = ({ icon, label, when, right }: { icon: React.ReactNode; label: string; when?: Date; right?: string }) => (
    <button type="button" disabled={saving} onClick={() => when && save(when)}
      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm font-medium hover:bg-accent">
      {icon}<span className="flex-1">{label}</span><span className="text-xs text-muted-foreground">{right}</span>
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Set a reminder for ${name}`} title="Set a reminder">
          <Bell className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(320px,calc(100vw-1.5rem))] space-y-3">
        <p className="text-sm font-semibold">Remind me</p>
        <div className="relative">
          <Sparkles className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-crm-orange" />
          <Input autoFocus value={text} onChange={e => setText(e.target.value)} maxLength={60}
            onKeyDown={e => { if (e.key === 'Enter' && parsed) save(parsed); }}
            placeholder='Try "next tuesday 9pm"' className="pl-8" />
        </div>
        {text && (parsed
          ? <Button size="sm" className="w-full" disabled={saving} onClick={() => save(parsed)}>Remind me {fmt(parsed)}</Button>
          : <p className="text-xs text-muted-foreground">Try "tomorrow 10am", "friday 2pm" or "in 3 days".</p>)}
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or choose<span className="h-px flex-1 bg-border" /></div>
        <Input value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="Add a note (optional)" />
        <div>
          <Opt icon={<Sun className="h-4 w-4 text-crm-orange" />} label="Later today" when={later} right={later.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })} />
          <Opt icon={<Sunrise className="h-4 w-4 text-crm-orange" />} label="Tomorrow" when={tomorrow} right="9:00 am" />
          <Opt icon={<CalendarRange className="h-4 w-4 text-primary" />} label="Next week" when={nextWeek} right="Mon 9:00 am" />
          <button type="button" onClick={() => setPicking(p => !p)} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm font-medium hover:bg-accent">
            <CalendarDays className="h-4 w-4 text-primary" />Pick date & time
          </button>
          {picking && (
            <div className="flex gap-2 px-2 pt-1">
              <Input type="datetime-local" value={custom} onChange={e => setCustom(e.target.value)} />
              <Button size="sm" disabled={!custom || saving} onClick={() => save(new Date(custom))}>Set</Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default BdmReminderPopover;
