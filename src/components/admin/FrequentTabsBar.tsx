import React, { useMemo, useState } from 'react';
import { Check, Link2, Plus, Search, X, Zap } from 'lucide-react';
import { defaultTabs } from '@/components/admin/AdminSidebar';
import { PANDA_SECTION_ORDER } from '@/lib/pandaAdminSections';
import { useAdminQuickLinks } from '@/hooks/useAdminQuickLinks';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Props {
  userId: string | null | undefined;
  activeTab: string;
  onSelect: (tabId: string) => void;
  allowedTabIds: string[];
  readOnly?: boolean;
}

/**
 * Personalised quick-shortcut bar rendered at the top of the admin dashboard.
 * Explicitly saved, per-user quick links. Navigation permissions remain in
 * the dashboard; links are filtered against its effective permitted sections.
 */
export const FrequentTabsBar: React.FC<Props> = ({
  userId,
  activeTab,
  onSelect,
  allowedTabIds,
  readOnly = false,
}) => {
  const { links, save, error } = useAdminQuickLinks(userId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);
  const sections = useMemo(() => PANDA_SECTION_ORDER
    .filter((section) => allowedTabIds.includes(section.id))
    .map((section) => ({ ...section, icon: defaultTabs.find((tab) => tab.id === section.id)?.icon ?? Link2 })), [allowedTabIds]);
  const items = links.flatMap((id) => {
    const section = sections.find((item) => item.id === id);
    return section ? [section] : [];
  });
  const commit = (ids: string[]) => {
    if (!save(ids)) return false;
    setSaved(true);
    return true;
  };
  const edit = () => {
    setDraft(links);
    setSearch('');
    setSaved(false);
    setOpen(true);
  };

  if (!userId) return null;

  return (
    <div className="border-b border-border bg-muted/40">
      <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0">
          <Zap className="h-4 w-4 text-primary" />
          Your quick links
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {items.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeTab;
            return (
              <div
                key={tab.id}
                className={cn(
                  'inline-flex items-center max-w-full rounded-full border',
                  active
                    ? 'bg-accent text-accent-foreground border-primary/40'
                    : 'bg-background text-foreground border-border'
                )}
              >
                <Button variant="ghost" size="sm" onClick={() => onSelect(tab.id)} title={tab.description}
                  aria-current={active ? 'page' : undefined} className="min-w-0 rounded-full px-3 text-sm">
                  <Icon className="h-4 w-4" /><span className="truncate">{tab.label}</span>
                </Button>
                {!readOnly && <Button variant="ghost" size="icon" className="h-9 w-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                  title={`Remove ${tab.label}`} aria-label={`Remove ${tab.label} quick link`}
                  onClick={() => commit(links.filter((id) => id !== tab.id))}><X /></Button>}
              </div>
            );
          })}
          {!readOnly && <Button variant="outline" size="sm" className="rounded-full border-dashed bg-background" onClick={edit}>
            <Plus />{items.length ? 'Edit quick links' : 'Add quick link'}
          </Button>}
        </div>
        {saved && <span role="status" className="flex items-center gap-1 text-xs text-muted-foreground"><Check className="h-4 w-4" />Saved</span>}
      </div>
      {error && <p role="alert" className="px-4 pb-3 text-sm text-destructive">{error}</p>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[420px] rounded-lg" aria-describedby={undefined}>
          <DialogHeader><DialogTitle className="tracking-normal">Quick links</DialogTitle></DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input autoFocus aria-label="Search dashboard sections" placeholder="Search sections" value={search}
              onChange={(event) => setSearch(event.target.value)} className="pl-9" />
          </div>
          <div className="max-h-[45vh] overflow-y-auto space-y-1">
            {sections.filter((tab) => tab.label.toLowerCase().includes(search.toLowerCase())).map((tab) => {
              const Icon = tab.icon;
              return <label key={tab.id} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted">
                <Checkbox checked={draft.includes(tab.id)} onCheckedChange={(checked) => setDraft((current) => checked === true
                  ? [...current.filter((id) => id !== tab.id), tab.id] : current.filter((id) => id !== tab.id))} />
                <Icon className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{tab.label}</span>
              </label>;
            })}
            {!sections.some((tab) => tab.label.toLowerCase().includes(search.toLowerCase())) &&
              <p className="py-5 text-center text-sm text-muted-foreground">No matching sections</p>}
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (commit(draft)) setOpen(false); }}><Check />Save quick links</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
