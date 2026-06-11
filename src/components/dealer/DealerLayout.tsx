import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';

interface DealerLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPaths?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'HOME', icon: Home },
  {
    to: '/dealer-portal/quote/pricing',
    label: 'NEW QUOTE',
    icon: FilePlus2,
    matchPaths: ['/dealer-portal/quote/', '/dealer-portal/quotes/create'],
  },
  { to: '/dealer-portal/quotes', label: 'QUOTES', icon: FileText },
  { to: '/dealer-portal/applications', label: 'FINANCE', icon: FilePlus2, matchPaths: ['/dealer-portal/applications'] },
  { to: '/dealer-portal/warranties', label: 'DEALER PLANS', icon: Shield },
  { to: '/dealer-portal/analytics', label: 'ANALYTICS', icon: BarChart3 },
];

export const DealerLayout: React.FC<DealerLayoutProps> = ({ children }) => {
  const { user, dealer, loading, signOut } = useDealerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/dealer-portal/coming-soon', { replace: true });
  }, [loading, user, navigate]);

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

  const displayName = (dealer?.name || user.email || 'DEALER').toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20 gap-4">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity">
              <img
                src="/lovable-uploads/53652a24-3961-4346-bf9d-6588ef727aeb.png"
                alt="Buyawarranty"
                className="h-7 sm:h-8 w-auto "
              />
              <span className="text-[10px] font-bold tracking-[0.2em] text-orange-500 border border-orange-500/40 px-1.5 py-0.5 rounded-sm">
                DEALER
              </span>
            </a>


            {/* Desktop nav (icon + label) */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`group relative flex flex-col items-center px-4 py-2 transition-colors ${
                      active ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-[11px] font-bold tracking-wider">{item.label}</span>
                    <span
                      className={`absolute -bottom-[1px] left-2 right-2 h-0.5 bg-orange-500 transition-transform origin-center ${
                        active ? 'scale-x-100' : 'scale-x-0'
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

            {/* Right: user dropdown */}
            <div className="hidden lg:flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-gray-900 font-bold tracking-wider rounded-md px-4 h-11 transition-colors">
                    <User className="h-4 w-4" />
                    <span className="text-xs">{displayName}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border-gray-200 text-gray-800">
                  <DropdownMenuItem className="focus:bg-gray-100 focus:text-gray-900 cursor-pointer" onClick={() => navigate('/dealer-portal/dashboard')}>
                    <UserCog className="h-4 w-4 mr-2" /> Manage Account
                  </DropdownMenuItem>
                  <DropdownMenuItem className="focus:bg-gray-100 focus:text-gray-900 cursor-pointer" onClick={() => navigate('/dealer-portal/dashboard')}>
                    <Settings className="h-4 w-4 mr-2" /> Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem
                    className="focus:bg-red-50 focus:text-red-700 cursor-pointer text-red-600"
                    onClick={signOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile */}
            <div className="lg:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2 text-gray-700 hover:bg-gray-100">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] bg-white border-gray-200">
                  <div className="flex flex-col h-full">
                    <div className="pb-6">
                      <img
                        src="/lovable-uploads/53652a24-3961-4346-bf9d-6588ef727aeb.png"
                        alt="Panda Protect"
                        className="h-8 w-auto "
                      />
                    </div>
                    <nav className="flex flex-col gap-1 flex-1">
                      {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item);
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-bold tracking-wider ${
                              active ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </nav>
                    <div className="pt-6 mt-auto">
                      <button
                        onClick={() => { signOut(); setMobileOpen(false); }}
                        className="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
};
