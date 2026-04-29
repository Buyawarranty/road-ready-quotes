import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, LayoutDashboard, ShoppingBag, Users, FileText, BarChart3, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAdminRole } from '@/lib/adminRoles';
import { DealerAdminPasswordGate } from '@/components/auth/DealerAdminPasswordGate';

const navItems = [
  { to: '/dealer-admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dealer-admin/sales', label: 'Dealer Sales', icon: ShoppingBag },
  { to: '/dealer-admin/dealers', label: 'Dealers', icon: Users },
  { to: '/dealer-admin/invoices', label: 'Invoices', icon: FileText },
  { to: '/dealer-admin/analytics', label: 'Analytics', icon: BarChart3 },
];

const DealerAdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [gateUnlocked, setGateUnlocked] = useState<boolean>(
    () => sessionStorage.getItem('dealerAdminUnlocked') === 'true'
  );

  if (!gateUnlocked) {
    return <DealerAdminPasswordGate onUnlock={() => setGateUnlocked(true)} />;
  }

  useEffect(() => {
    const check = async () => {
      if (loading) return;
      if (!user) {
        navigate('/auth/?redirect=/dealer-admin');
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const roles = (data || []).map((r) => r.role as string);
      setAllowed(roles.some((role) => isAdminRole(role)));
    };
    check();
  }, [user, loading, navigate]);

  if (loading || allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access denied</h1>
          <p className="text-muted-foreground mb-6">Only authorised admin users can access the dealer admin dashboard.</p>
          <Button onClick={() => navigate('/admin-dashboard/')}>Back to retail admin</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-muted/20 w-full">
      {/* Sidebar */}
      <aside className="w-60 bg-card border-r border-border flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Buy A Warranty</p>
          <h2 className="text-base font-bold text-foreground">Dealer Admin</h2>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
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
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/admin-dashboard/')}>
            Retail Admin →
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/auth/');
            }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DealerAdminLayout;
