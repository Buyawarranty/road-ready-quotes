import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Loader2, LayoutDashboard, ShoppingBag, Users, FileText, BarChart3, LogOut,
  Target, Calculator, Lightbulb, Receipt, Car, Percent, UserPlus, MessageSquare,
  Star, Mail, ShoppingCart, Clock, Megaphone, Eye, Database, Shield, FolderOpen,
  PenTool, Globe, TestTube, CalendarClock, Trophy, Settings, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAdminRole } from '@/lib/adminRoles';
import { DealerAdminPasswordGate } from '@/components/auth/DealerAdminPasswordGate';
import { DealerAdminAuthLogin } from '@/components/auth/DealerAdminAuthLogin';

type NavItem = { to: string; label: string; icon: React.ComponentType<any>; end?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: 'Dashboard',
    items: [
      { to: '/dealer-admin', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/dealer-admin/sign-ups', label: 'Sign-Ups', icon: UserPlus },
      { to: '/dealer-admin/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/dealer-admin/page-analytics', label: 'Page Analytics', icon: Eye },
      { to: '/dealer-admin/marketing-analytics', label: 'Marketing Analytics', icon: Target },
      { to: '/dealer-admin/vehicle-stats', label: 'Vehicle Stats', icon: Car },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/dealer-admin/new-leads', label: 'New Leads', icon: Target },
      { to: '/dealer-admin/quotes-orders', label: 'Quotes & Orders', icon: Calculator },
      { to: '/dealer-admin/sales-script', label: 'Sales Script', icon: Lightbulb },
      { to: '/dealer-admin/sales', label: 'Dealer Sales', icon: ShoppingBag },
      { to: '/dealer-admin/sales-scoreboard', label: 'Sales Scoreboard', icon: Trophy },
      { to: '/dealer-admin/discounts-given', label: 'Discounts Given', icon: Percent },
    ],
  },
  {
    label: 'Customers',
    items: [
      { to: '/dealer-admin/customers', label: 'Customers', icon: Users },
      { to: '/dealer-admin/dealers', label: 'Dealers', icon: Users },
      { to: '/dealer-admin/claims', label: 'Claims', icon: MessageSquare },
      { to: '/dealer-admin/reviews', label: 'Reviews', icon: Star },
      { to: '/dealer-admin/contact', label: 'Contact Submissions', icon: Mail },
      { to: '/dealer-admin/abandoned-carts', label: 'Abandoned Carts', icon: ShoppingCart },
      { to: '/dealer-admin/pending-register', label: 'Pending Register', icon: Clock },
      { to: '/dealer-admin/referrals', label: 'Referrals', icon: UserPlus },
    ],
  },
  {
    label: 'Plans & Pricing',
    items: [
      { to: '/dealer-admin/trader-pricing', label: 'Trader Pricing', icon: Calculator },
      { to: '/dealer-admin/plans', label: 'Standard Plans', icon: FileText },
      { to: '/dealer-admin/bulk-pricing', label: 'Bulk Pricing', icon: Receipt },
      { to: '/dealer-admin/special-plans', label: 'Special Vehicle Plans', icon: Car },
      { to: '/dealer-admin/discount-codes', label: 'Discount Codes', icon: Percent },
      { to: '/dealer-admin/invoices', label: 'Invoices', icon: FileText },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/dealer-admin/finance', label: 'Applications', icon: FileText, end: true },
      { to: '/dealer-admin/finance/lenders', label: 'Lenders', icon: Users },
      { to: '/dealer-admin/finance/rules', label: 'Underwriting rules', icon: Shield },
      { to: '/dealer-admin/finance/payouts', label: 'Payouts', icon: Receipt },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { to: '/dealer-admin/marketing-contacts', label: 'Marketing Contacts', icon: Megaphone },
      { to: '/dealer-admin/email-hub', label: 'Email Hub', icon: Mail },
      { to: '/dealer-admin/blog-writing', label: 'Blog Writing', icon: PenTool },
      { to: '/dealer-admin/landing-pages', label: 'Landing Pages', icon: Globe },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/dealer-admin/lead-backup', label: 'Lead Backup & Recovery', icon: Database },
      { to: '/dealer-admin/document-mapping', label: 'Document Mapping', icon: FolderOpen },
      { to: '/dealer-admin/policy-letters', label: 'Policy Letters', icon: FileText },
      { to: '/dealer-admin/timesheets', label: 'Timesheets', icon: CalendarClock },
      { to: '/dealer-admin/testing', label: 'Testing', icon: TestTube },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/dealer-admin/user-permissions', label: 'User Permissions', icon: Shield },
      { to: '/dealer-admin/account', label: 'Account Settings', icon: Settings },
    ],
  },
];

const DealerAdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [gateUnlocked, setGateUnlocked] = useState<boolean>(
    () => sessionStorage.getItem('dealerAdminUnlocked') === 'true'
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(navGroups.map((g) => [g.label, true]))
  );

  useEffect(() => {
    if (!gateUnlocked) {
      setAllowed(null);
      return;
    }
    const check = async () => {
      if (loading) return;
      if (!user) { setAllowed(false); return; }
      setAllowed(null);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (error) { console.error('Dealer admin role check failed:', error); setAllowed(false); return; }
      const roles = (data || []).map((r) => r.role as string);
      if (!roles.some((role) => isAdminRole(role))) { setAllowed(false); return; }
      setAllowed(true);
    };
    check();
  }, [user, loading, navigate, gateUnlocked]);

  if (!gateUnlocked) {
    return <DealerAdminPasswordGate onUnlock={() => setGateUnlocked(true)} />;
  }

  if (loading || allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return <DealerAdminAuthLogin onAuthenticated={() => setAllowed(true)} />;
  }

  return (
    <div className="min-h-screen flex bg-muted/20 w-full">
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Panda Protect</p>
          <h2 className="text-base font-bold text-foreground">Dealer Admin</h2>
        </div>
        <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
          {navGroups.map((group) => {
            const isOpen = openGroups[group.label];
            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  <span>{group.label}</span>
                  {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                {isOpen && (
                  <div className="space-y-0.5 mt-1">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`
                        }
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/admin-dashboard/')}>
            Retail Admin →
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={async () => { await supabase.auth.signOut(); navigate('/auth/'); }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DealerAdminLayout;
