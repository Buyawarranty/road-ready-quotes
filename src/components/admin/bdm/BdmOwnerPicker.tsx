import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronDown } from 'lucide-react';
import BdmOwnerTag from './BdmOwnerTag';

interface Props {
  dealershipId: string; ownerId?: string | null; staff: { user_id: string; name: string }[];
  onChanged: () => void; className?: string;
  table?: 'bdm_dealerships' | 'bdm_portfolio'; allowNone?: boolean;
}

/** Clickable owner tag: pick which BDM owns the dealership (or take it yourself). Access is enforced server-side. */
const BdmOwnerPicker: React.FC<Props> = ({ dealershipId, ownerId, staff, onChanged, className, table = 'bdm_dealerships', allowNone = true }) => {
  const { toast } = useToast();
  const [me, setMe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);
  const name = ownerId ? staff.find((s) => s.user_id === ownerId)?.name ?? 'Unknown' : null;

  const assign = async (uid: string | null) => {
    if (busy || uid === (ownerId ?? null)) return;
    setBusy(true);
    const { data, error } = await (supabase as any).from(table).update(table === 'bdm_portfolio' ? { bdm_user_id: uid } : { assigned_bdm: uid }).eq('id', dealershipId).select('id');
    setBusy(false);
    if (error || !data?.length) { toast({ title: 'Could not change owner', description: error?.message || 'You do not have access to this dealership.', variant: 'destructive' }); return; }
    toast({ title: uid ? `Owner set to ${staff.find((s) => s.user_id === uid)?.name ?? 'you'}` : 'Owner removed' });
    onChanged();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button type="button" className={`inline-flex items-center gap-0.5 ${className ?? ''}`} aria-label="Change BDM owner" title="Click to change the owner" disabled={busy}>
          <BdmOwnerTag name={name} /><ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {me && me !== ownerId && <><DropdownMenuItem onSelect={() => assign(me)} className="font-semibold">Make me the owner</DropdownMenuItem><DropdownMenuSeparator /></>}
        <DropdownMenuLabel className="text-xs text-muted-foreground">Assign to</DropdownMenuLabel>
        {staff.map((s) => (
          <DropdownMenuItem key={s.user_id} onSelect={() => assign(s.user_id)}>
            <span className="flex-1">{s.name}</span>{s.user_id === ownerId && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        {ownerId && allowNone && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => assign(null)} className="text-muted-foreground">Remove owner</DropdownMenuItem></>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
export default BdmOwnerPicker;
