import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDealerAuth } from '@/hooks/useDealerAuth';
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
  Wrench,
  FolderOpen,
  BookOpen,
  Headphones,
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
    to: '/dealer-portal/quote/vehicle',
    label: 'New Quote',
    icon: FilePlus2,
    matchPaths: ['/dealer-portal/quote/', '/dealer-portal/quotes/create'],
    trader: true,
  },
  { to: '/dealer-portal/quotes', label: 'Quotes', icon: FileText, trader: true },
  { to: '/dealer-portal/warranties', label: 'Warranties', icon: Shield, trader: true },
  { to: '/dealer-portal/coming-soon?section=claims', label: 'Claims', icon: Wrench, trader: true },
  { to: '/dealer-portal/customers', label: 'Customers', icon: Users, trader: true },
  { to: '/dealer-portal/coming-soon?section=documents', label: 'Documents', icon: FolderOpen, trader: true },
  { to: '/dealer-portal/analytics', label: 'Reports', icon: BarChart3 },
  { to: '/faq/traders/', label: 'Resources', icon: BookOpen, trader: true },
  { to: '/dealer-portal/settings/profile', label: 'Settings', icon: Settings, trader: true },
];

export const DealerLayout: React.FC<DealerLayoutProps> = ({ children }) => {
  const { user, dealer, isTrader, loading, signOut } = useDealerAuth();
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
    if (!loading && !user) navigate('/dealer-portal/coming-soon', { replace: true });
  }, [loading, user, navigate]);

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
  if (!user) return null;

  // Gate: dealer must exist AND be approved (status = 'active')
  const dealerStatus = (dealer as any)?.status;
  const isApproved = !!dealer && dealerStatus === 'active';
  if (!isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-[#eb4b00]/10 text-[#eb4b00] mx-auto flex items-center justify-center">
            <UserCog className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Account pending approval</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            {dealer
              ? "Your dealer account is awaiting approval from our team. We'll email you as soon as it's activated."
              : "Your account isn't linked to an approved dealer profile yet. Our team will be in touch shortly."}
          </p>
          <p className="text-xs text-gray-500">
            Questions? Email <a className="text-[#eb4b00] font-semibold" href="mailto:hello@pandaprotect.co.uk">hello@pandaprotect.co.uk</a>
          </p>
          <Button onClick={signOut} variant="outline" className="w-full">Sign out</Button>
        </div>
      </div>
    );
  }


  const isActive = (item: NavItem) => {
    if (location.pathname === item.to) return true;
    if (item.matchPaths?.some((p) => location.pathname.startsWith(p))) return true;
    if (item.to === '/dealer-portal/quotes' && location.pathname === '/dealer-portal/quotes') return true;
    return false;
  };

  const navItems = isTrader ? NAV_ITEMS.filter((i) => i.trader) : NAV_ITEMS;

  const displayName = (dealer?.name || user.email || 'Dealer').toUpperCase();
  const businessName = dealer?.company_name || 'Dealer account';

  const primaryNav = navItems.slice(0, 6);
  const secondaryNav = navItems.slice(6);

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
              : 'text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground'
        }`}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="dealer-crm min-h-screen bg-crm-canvas text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 h-[72px] border-b border-crm-line bg-card">
        <div className="flex h-full items-center gap-4 px-4 lg:px-5">
            <Link to="/dealer-portal/dashboard" className="flex w-auto items-center gap-2 shrink-0 lg:w-[220px]">
              <img
                src="/panda-protect-logo.png"
                alt="Panda Protect"
                className="h-9 w-auto"
              />
              <span className="hidden rounded border border-crm-orange/40 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.16em] text-crm-orange sm:inline">
                DEALER
              </span>
            </Link>

            <div className="relative mx-auto hidden w-full max-w-[520px] md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={searchValue}
                onChange={(event) => { setSearchValue(event.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                placeholder="Search registration, customer, quote, warranty or claim..."
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
              <Button variant="ghost" size="icon" className="relative text-foreground" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-crm-orange px-1 text-[9px] font-bold text-primary-foreground">3</span>
              </Button>
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
                  <DropdownMenuItem className="cursor-pointer text-destructive" onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Logout
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
                      <Button variant="outline" onClick={() => { signOut(); setMobileOpen(false); }} className="w-full gap-2 text-destructive">
                        <LogOut className="h-4 w-4" /> Sign out
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-[72px] z-40 hidden w-[240px] flex-col bg-crm-navy p-3 lg:flex">
        <nav className="space-y-1">
          {primaryNav.map((item) => renderNavItem(item))}
          <div className="my-3 border-t border-primary-foreground/15" />
          {secondaryNav.map((item) => renderNavItem(item))}
        </nav>
        <div className="mt-auto rounded-md bg-crm-navy-soft p-4 text-primary-foreground">
          <div className="mb-2 flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            <p className="text-sm font-bold">Need help?</p>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-primary-foreground/70">Our UK team is here to help.</p>
          <Button variant="outline" size="sm" asChild className="w-full border-crm-orange bg-transparent text-primary-foreground hover:bg-crm-orange hover:text-primary-foreground">
            <a href="mailto:hello@pandaprotect.co.uk">Contact support →</a>
          </Button>
        </div>
      </aside>

      <main className="min-h-screen px-3 pb-5 pt-[84px] sm:px-5 lg:ml-[240px] lg:px-6 lg:pt-[88px]">
        {children}
      </main>
    </div>
  );
};
