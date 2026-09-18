import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, Clock, LogIn, Menu, X } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { OptimizedImage } from '@/components/OptimizedImage';
import buyawarrantyLogo from '@/assets/buyawarranty-logo.webp';

interface NavItem {
  label: string;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "What's Covered", to: '/what-is-covered/' },
  { label: 'Make a Claim', to: '/make-a-claim/' },
  { label: 'FAQs', to: '/faq/traders/' },
  { label: 'Contact Us', to: '/contact-us/' },
];

export const DealerPublicHeader: React.FC = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isPublicChrome = !location.pathname.startsWith('/dealer-portal/login');
  const isHome = location.pathname === '/';
  const quoteHref = isHome ? '#hero-reg' : '/#hero-reg';

  return (
    <>
    <header className={`${isPublicChrome ? 'public-site-header ' : ''}home-reference-header bg-white shadow-sm py-1 sm:py-2 fixed top-0 left-0 right-0 z-50`}>
      <div className="home-reference-header-shell">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-2"
            >
              <OptimizedImage
                src={buyawarrantyLogo}
                alt="Panda Protect"
                className="h-11 sm:h-14 w-auto object-contain shrink-0"
                priority={true}
                width={340}
                height={80}
              />
            </a>
          </div>


          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2 xl:gap-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="relative whitespace-nowrap text-gray-700 hover:text-gray-900 font-medium text-sm after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-orange-500 after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left"
              >
                {item.label}
              </Link>
            ))}

            {/* Call Us Hover Card */}
            <HoverCard openDelay={0} closeDelay={200}>
              <HoverCardTrigger asChild>
                <button className="whitespace-nowrap text-orange-500 hover:text-orange-600 font-semibold text-sm p-2 h-auto flex items-center gap-1 bg-transparent border-none cursor-pointer">
                  <Phone className="h-4 w-4 text-orange-500" />
                  Call Us
                </button>
              </HoverCardTrigger>
              <HoverCardContent align="end" className="w-72 p-4 bg-white border shadow-lg z-50">
                <div className="space-y-3">
                  <div className="text-left text-base font-medium text-gray-600 mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    Mon-Fri 9am to 5:30pm
                  </div>
                  <a href="tel:03302295045" className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <Phone className="h-5 w-5 mr-3 text-orange-500" />
                    <div>
                      <div className="font-semibold text-base text-black">Dealer Support</div>
                      <div className="text-orange-500 font-semibold text-base">0330 229 5045</div>
                    </div>
                  </a>
                </div>
              </HoverCardContent>
            </HoverCard>

            {/* WhatsApp Us */}
            <a
              href="https://wa.me/message/SPQPJ6O3UBF5B1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 bg-[#25D366] text-white text-sm font-semibold rounded-lg hover:bg-[#20BA5A] transition-colors whitespace-nowrap"
            >
              WhatsApp Us
            </a>

            <a href={quoteHref} className="home-header-quote-link whitespace-nowrap">
              Register
            </a>

            {/* Login - high contrast B2B CTA */}
            <Link
              to="/dealer-portal/login"
              className="home-header-login-link whitespace-nowrap"
              aria-label="Motor Trade Login for dealer partners"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-200 mt-2 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 flex flex-col gap-2 px-3">
              <a
                href="tel:03302295045"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center gap-2 py-2 text-sm font-semibold text-orange-500"
              >
                <Phone className="h-4 w-4" /> Call Us · 0330 229 5045
              </a>
              <a
                href="https://wa.me/message/SPQPJ6O3UBF5B1"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold rounded-lg px-4 h-10 text-sm transition-colors"
              >
                WhatsApp Us
              </a>
              <a
                href={quoteHref}
                onClick={() => setMobileOpen(false)}
                className="home-header-quote-link"
              >
                Register
              </a>
              <Link
                to="/dealer-portal/login"
                onClick={() => setMobileOpen(false)}
                className="home-header-login-link"
              >
                <LogIn className="h-4 w-4" /> Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
    {/* Spacer keeps page content below the fixed header */}
    <div aria-hidden="true" className="h-[60px] sm:h-[76px]" />
    </>
  );
};
