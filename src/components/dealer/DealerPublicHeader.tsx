import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Phone, MessageCircle, LogIn } from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'HOME', to: '/dealer-portal/' },
  { label: 'WHY US', to: '/dealer-portal/#why-us' },
  { label: 'RESOURCES', to: '/dealer-portal/#resources' },
  { label: 'CONTACT', to: '/dealer-portal/#contact' },
];

export const DealerPublicHeader: React.FC = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isActive = (to: string) => {
    if (to.includes('#')) return false;
    if (to === '/dealer-portal/') return location.pathname === '/dealer-portal' || location.pathname === '/dealer-portal/';
    return location.pathname.startsWith(to);
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/dealer-portal/" className="flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0">
            <img
              src="/lovable-uploads/53652a24-3961-4346-bf9d-6588ef727aeb.png"
              alt="Buy a Warranty"
              className="h-7 sm:h-8 w-auto brightness-0 invert"
            />
            <span className="text-[10px] font-bold tracking-[0.2em] text-orange-500 border border-orange-500/40 px-1.5 py-0.5 rounded-sm">
              DEALER
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8 xl:gap-10">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative text-sm font-bold tracking-wider transition-colors ${
                    active ? 'text-white' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute -bottom-2 left-0 right-0 h-0.5 bg-orange-500 transition-transform origin-left ${
                      active ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Right CTAs */}
          <div className="hidden lg:flex items-center gap-6">
            <Link
              to="/dealer-portal/signup"
              className="text-sm font-bold tracking-wider text-orange-500 hover:text-orange-400 transition-colors"
            >
              CREATE DEALER ACCOUNT
            </Link>
            <Link to="/dealer-portal/login">
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-gray-900 font-bold tracking-wider rounded-full px-6 h-10"
              >
                LOGIN
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-gray-300 hover:text-white hover:bg-gray-800"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-800 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-bold tracking-wider ${
                  isActive(item.to) ? 'text-white bg-gray-800' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/dealer-portal/signup"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2 text-sm font-bold tracking-wider text-orange-500"
              >
                CREATE DEALER ACCOUNT
              </Link>
              <Link to="/dealer-portal/login" onClick={() => setMobileOpen(false)} className="px-3">
                <Button
                  size="sm"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-gray-900 font-bold tracking-wider rounded-full h-10"
                >
                  LOGIN
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
