import React from 'react';
import { UserRound } from 'lucide-react';

/** Small tag showing which staff member (BDM) owns a dealership. */
const BdmOwnerTag: React.FC<{ name?: string | null; className?: string }> = ({ name, className = '' }) => (
  <span title={name ? `Owned by ${name}` : 'No BDM owns this yet'}
    className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${name ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground'} ${className}`}>
    <UserRound className="h-3 w-3" />{name ? `BDM: ${name}` : 'Unassigned'}
  </span>
);
export default BdmOwnerTag;
