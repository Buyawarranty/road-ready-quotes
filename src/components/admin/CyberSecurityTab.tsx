import { ShieldCheck, Lock, EyeOff, Download, AlertTriangle, Users, FileCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Cyber security requirements panel. Everything here is a plan only — nothing
// on this page changes any access rule. Activation happens later, one group at
// a time, so staff are not locked out of work they need.

type Requirement = {
  icon: typeof Lock;
  title: string;
  points: string[];
};

const REQUIREMENT_GROUPS: Requirement[] = [
  {
    icon: AlertTriangle,
    title: '1. Close the 23 open security warnings',
    points: [
      'Tighten the older access rules left over from the copied Buy A Warranty data.',
      'Covers customer documents, abandoned carts and email consents, where today anyone signed in can read some records.',
      'Biggest gap right now — do this first.',
    ],
  },
  {
    icon: Lock,
    title: '2. Lock the data itself, not just the menu',
    points: [
      'Each set of records (customers, customer details, sales, refunds, analytics figures) gets a rule saying who can read it.',
      'A logged-in sales agent asking for something they are not allowed gets nothing back, however they ask — so scraping is not possible.',
      'The tick-box permissions in User permissions follow the same rules, so the screen and the data always agree.',
    ],
  },
  {
    icon: Users,
    title: '3. Match the rules to each job',
    points: [
      'Sales agents see only their own customers and leads.',
      'Accounts see payments and refunds.',
      'Admin and Super Admin see everything.',
    ],
  },
  {
    icon: FileCheck,
    title: '4. Share only the totals for Sales analytics',
    points: [
      'Figures are worked out behind the scenes and only the totals are sent back.',
      'Only Admin, Super Admin and Accounts receive them — no one else can pull the raw sales list.',
    ],
  },
  {
    icon: EyeOff,
    title: '5. Hide sensitive details unless the job needs them',
    points: [
      'Phone numbers, emails and dates of birth are partly hidden unless the role needs them.',
    ],
  },
  {
    icon: Download,
    title: '6. Limit and log bulk downloads',
    points: [
      'Exports stay with the roles you choose, and large downloads are capped.',
      'Every export is recorded with who did it and when.',
    ],
  },
];

const CyberSecurityTab = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Cyber security
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The planned protections for the portal, listed as requirements. Nothing on this page is
            active yet — no access rules have changed, and everyone can keep working exactly as
            they do today.
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
          Not active yet — requirements only
        </Badge>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How activation will work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          When you are ready, each group below is switched on one at a time and tested before moving
          to the next, so staff are never suddenly locked out of work they need. Some screens may
          show less for some roles after each step — that is intended, and you confirm each role's
          access before it goes live.
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {REQUIREMENT_GROUPS.map((group) => (
          <Card key={group.title}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <group.icon className="h-4 w-4 shrink-0 text-primary" />
                  {group.title}
                </CardTitle>
                <Badge variant="secondary" className="shrink-0">
                  Planned
                </Badge>
              </div>
              <CardDescription className="sr-only">{group.title}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {group.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CyberSecurityTab;
