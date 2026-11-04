import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDealerAuth } from '@/hooks/useDealerAuth';
import { isAdminRole } from '@/lib/adminRoles';
import { useDealerImpersonation } from '@/hooks/useDealerImpersonation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Home,
  FilePlus2,
  FileText,
  Shield,
  BarChart3,
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  UserCog,
  Users,
  Search,
  Bell,
  CircleHelp,
  FolderOpen,
  BookOpen,
  Headphones,
  MoreHorizontal,
  Ban,
} from 'lucide-react';

interface DealerLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPaths?: string[];
  /** Visible to users with the `trader` role (sales + plans/pricing only) */
  trader?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dealer-portal/dashboard', label: 'Home', icon: Home, trader: true },
  {
    to: '/dealer-portal/quote/pricing',
    label: 'New Quote',
    icon: FilePlus2,
    matchPaths: ['/dealer-portal/quote/', '/dealer-portal/quotes/create'],
    trader: true,
  },
  { to: '/dealer-portal/quotes', label: 'Quotes', icon: FileText, trader: true },
  { to: '/dealer-portal/warranties', label: 'Warranties', icon: Shield, trader: true },
  { to: '/dealer-portal/customers', label: 'Customers', icon: Users, trader: true },
  { to: '/dealer-portal/warranties?tab=cancellations', label: 'Cancellations', icon: Ban, trader: true },
  { to: '/dealer-portal/coming-soon?section=documents', label: 'Documents', icon: FolderOpen, trader: true },
  { to: '/dealer-portal/analytics', label: 'Reports', icon: BarChart3 },
  { to: '/dealer-portal/settings/profile', label: 'Settings', icon: Settings, trader: true },
];

export const DealerLayout: React.FC<DealerLayoutProps> = ({ children }) => {
  const { user, dealer, roles, isTrader, loading, signOut } = useDealerAuth();
  const { isImpersonating, impersonatedDealer, stopImpersonation } = useDealerImpersonation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/dealer-portal/coming-soon', { replace: true });
      return;
    }
    if (!dealer) {
      // Staff account not using "view as dealer", or a non-dealer user
      if (roles.some((role) => isAdminRole(role))) {
        navigate('/admin-dashboard/', { replace: true });
      } else {
        navigate('/dealer-portal/login', { replace: true });
      }
    }
  }, [loading, user, dealer, roles, navigate]);

  // Traders are limited to sales (quotes) and plans/pricing sections
  useEffect(() => {
    if (loading || !isTrader) return;
    const blocked = ['/dealer-portal/applications', '/dealer-portal/analytics'];
    if (blocked.some((p) => location.pathname.startsWith(p))) {
      navigate('/dealer-portal/quotes', { replace: true });
    }
  }, [loading, isTrader, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }
  if (!user || !dealer) return null;

  // Gate: dealer must exist AND be approved (status = 'active')
  const dealerStatus = dealer?.status;
  const isApproved = !!dealer && dealerStatus === 'active';
  if (!isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-crm-orange-soft text-crm-orange">
            <UserCog className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Account pending approval</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            {dealer
              ? "Your dealer account is awaiting approval from our team. We'll email you as soon as it's activated."
              : "Your account isn't linked to an approved dealer profile yet. Our team will be in touch shortly."}
          </p>
          <p className="text-xs text-gray-500">
            Questions? Email <a className="font-semibold text-crm-orange" href="mailto:hello@pandaprotect.co.uk">hello@pandaprotect.co.uk</a>
          </p>
          <Button onClick={signOut} variant="outline" className="w-full">Sign out</Button>
        </div>
      </div>
    );
  }


  const isActive = (item: NavItem) => {
    if (item.to.startsWith('/dealer-portal/warranties')) {
      const cancellations = new URLSearchParams(location.search).get('tab') === 'cancellations';
      return location.pathname.replace(/\/$/, '') === '/dealer-portal/warranties' &&
        (item.label === 'Cancellations' ? cancellations : !cancellations);
    }
    if (location.pathname.replace(/\/$/, '') === item.to.replace(/\/$/, '')) return true;
    if (item.matchPaths?.some((p) => location.pathname.startsWith(p))) return true;
    if (item.to === '/dealer-portal/quotes' && location.pathname === '/dealer-portal/quotes') return true;
    return false;
  };

  const navItems = isTrader ? NAV_ITEMS.filter((i) => i.trader) : NAV_ITEMS;

  const displayName = (dealer?.name || user.email || 'Dealer').toUpperCase();
  const businessName = dealer?.company_name || 'Dealer account';

  const primaryNav = navItems.slice(0, 6);
  const secondaryNav = navItems.slice(6);
  const topNav = primaryNav;

  const renderNavItem = (item: NavItem, mobile = false) => {
    const active = isActive(item);
    const Icon = item.icon;
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => mobile && setMobileOpen(false)}
        className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
          active
            ? 'bg-crm-orange text-primary-foreground shadow-sm'
            : mobile
              ? 'text-foreground hover:bg-muted'
              : 'text-crm-navy hover:bg-background hover:text-crm-navy'
        }`}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="dealer-crm min-h-screen bg-crm-canvas text-foreground">
      {isImpersonating && impersonatedDealer && (
        <div className="fixed inset-x-0 top-0 z-[60] flex h-10 items-center justify-center gap-3 bg-amber-400 px-4 text-xs font-semibold text-amber-950 sm:text-sm">
          <span className="truncate">
            Viewing the dealer portal as {impersonatedDealer.dealerName} ({impersonatedDealer.dealerEmail}) — your admin login is still active
          </span>
          <button
            type="button"
            onClick={() => {
              stopImpersonation();
              navigate('/admin-dashboard/?tab=dealer-signups');
            }}
            className="shrink-0 rounded-full bg-amber-950 px-3 py-1 text-[11px] font-bold text-white hover:bg-amber-900"
          >
            Exit
          </button>
        </div>
      )}
      <header className={`fixed inset-x-0 ${isImpersonating ? 'top-10' : 'top-0'} z-50 h-[72px] border-b border-crm-line bg-card`}>
        <div className="flex h-full items-center gap-4 px-4 lg:px-5">
            <Link to="/dealer-portal/dashboard" className="flex w-auto items-center gap-2 shrink-0 lg:w-[230px]">
              <img
                src="/panda-protect-logo.png"
                alt="Panda Protect"
                className="h-9 w-auto"
              />
              <span className="hidden leading-tight sm:block">
                <span className="block text-[8px] font-bold tracking-[0.18em] text-muted-foreground">TRADE WARRANTY SOLUTIONS</span>
                <span className="mt-1 inline-flex rounded border border-crm-orange/40 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.16em] text-crm-orange">
                  DEALER
                </span>
              </span>
            </Link>


            <div className="relative mx-auto hidden w-full max-w-[420px] md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={searchValue}
                onChange={(event) => { setSearchValue(event.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                placeholder="Search by name, reg, email or phone..."
                className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-14 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-crm-line bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘ K</kbd>
              {searchOpen && searchValue.trim() && (
                <div className="absolute left-0 right-0 top-12 rounded-md border border-crm-line bg-card p-2 shadow-lg">
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Search dealer records</p>
                  <Button variant="ghost" className="h-auto w-full justify-start px-2 py-2 text-sm" onClick={() => navigate(`/dealer-portal/quotes?search=${encodeURIComponent(searchValue.trim())}`)}>
                    <Search className="mr-2 h-4 w-4 text-crm-blue" /> Search quotes for “{searchValue.trim()}”
                  </Button>
                </div>
              )}
            </div>

            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-foreground" aria-label="Notifications"><Bell className="h-5 w-5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/dealer-portal/warranties')}>Review warranties and outstanding invoices</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" className="gap-2 text-foreground" asChild>
                <a href="mailto:hello@pandaprotect.co.uk"><CircleHelp className="h-4 w-4" /> Help</a>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-11 min-w-[205px] justify-start gap-2 px-3">
                    <User className="h-4 w-4" />
                    <span className="min-w-0 flex-1 text-left leading-tight">
                      <span className="block truncate text-[11px] font-bold">{displayName}</span>
                      <span className="block truncate text-[9px] font-medium opacity-80">{businessName}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/dealer-portal/dashboard')}>
                    <UserCog className="h-4 w-4 mr-2" /> Manage Account
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/dealer-portal/settings/profile')}>
                    <Settings className="h-4 w-4 mr-2" /> Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive"
                    onClick={() => {
                      if (isImpersonating) {
                        stopImpersonation();
                        navigate('/admin-dashboard/?tab=dealer-signups');
                      } else {
                        signOut();
                      }
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" /> {isImpersonating ? 'Exit dealer view' : 'Logout'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="ml-auto lg:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open dealer menu">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] border-crm-line bg-card p-0">
                  <div className="flex flex-col h-full">
                    <div className="border-b border-crm-line p-5">
                      <img
                        src="/panda-protect-logo.png"
                        alt="Panda Protect"
                        className="h-9 w-auto"
                      />
                    </div>
                    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
                      {navItems.map((item) => renderNavItem(item, true))}
                    </nav>
                    <div className="border-t border-crm-line p-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setMobileOpen(false);
                          if (isImpersonating) {
                            stopImpersonation();
                            navigate('/admin-dashboard/?tab=dealer-signups');
                          } else {
                            signOut();
                          }
                        }}
                        className="w-full gap-2 text-destructive"
                      >
                        <LogOut className="h-4 w-4" /> {isImpersonating ? 'Exit dealer view' : 'Sign out'}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
        </div>
      </header>

      <aside className={`fixed bottom-0 left-0 ${isImpersonating ? 'top-[112px]' : 'top-[72px]'} z-40 hidden w-[240px] flex-col border-r border-crm-line bg-muted p-3 lg:flex`}>
        <nav className="space-y-1">
          {primaryNav.map((item) => renderNavItem(item))}
          <div className="my-3 border-t border-crm-line" />
          {secondaryNav.map((item) => renderNavItem(item))}
        </nav>
        <div className="mt-auto rounded-md border border-crm-line bg-background p-4 text-crm-navy">
          <div className="mb-2 flex items-center gap-2">
            <Headphones className="h-5 w-5 text-crm-navy" />
            <p className="text-sm font-bold text-crm-navy">Need help?</p>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">Our UK team is here to help.</p>
          <div className="mb-2 space-y-1">
            <Link
              to="/faq/traders/"
              className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-crm-navy transition-colors hover:bg-muted"
            >
              <BookOpen className="h-[18px] w-[18px] shrink-0" /> Resources
            </Link>
          </div>
          <Button variant="outline" size="sm" asChild className="w-full border-crm-orange bg-background font-bold !text-crm-navy hover:bg-crm-orange hover:!text-primary-foreground">
            <a href="mailto:hello@pandaprotect.co.uk" >Contact support →</a>
          </Button>
        </div>
      </aside>

      <main className={`min-h-screen px-3 pb-5 sm:px-5 lg:ml-[240px] lg:px-6 ${isImpersonating ? 'pt-[124px] lg:pt-[128px]' : 'pt-[84px] lg:pt-[88px]'}`}>
        {location.pathname.replace(/\/$/, '') !== '/dealer-portal/dashboard' && !location.pathname.startsWith('/dealer-portal/quote/') && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => {
                const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
                if (window.history.length > 1 && idx > 0) navigate(-1);
                else navigate('/dealer-portal/dashboard');
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-muted px-5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};
