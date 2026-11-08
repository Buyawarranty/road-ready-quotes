import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Clock3, LogIn, Menu, MessageCircle, Phone, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { OptimizedImage } from '@/components/OptimizedImage';
import RequestCallbackModal from '@/components/modals/RequestCallbackModal';
import { pandaLogoUrl as pandaProtectLogo } from '@/lib/pandaLogo';

const NAV_ITEMS = [
  { label: "What's covered", to: '/what-is-covered/' },
  { label: 'Claims', to: '/make-a-claim/' },
  { label: 'Why Choose Us', to: '/why-choose-us/' },
  { label: 'FAQs', to: '/faq/traders/' },
  { label: 'Contact', to: '/contact-us/' },
] as const;

export const DealerPublicHeader: React.FC = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [callbackOpen, setCallbackOpen] = React.useState(false);
  const [barVisible, setBarVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setBarVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mobile trade CTA bar shows on public pages only — never inside the dealer
  // portal, admin dashboard, auth or checkout.
  const hiddenBarPaths = ['/dealer-portal', '/admin', '/auth', '/checkout', '/customer-quote'];
  const showMobileBar = barVisible && !hiddenBarPaths.some((p) => location.pathname.startsWith(p));

  const openCallback = () => {
    setMobileOpen(false);
    setCallbackOpen(true);
  };

  return (
    <>
      <header className="public-site-header home-reference-header sticky top-0 z-50">
        <div className="home-reference-header-shell">
          <div className="flex items-center justify-between">
            <Link to="/" className="public-header-logo" aria-label="Panda Protect home">
              <OptimizedImage
                src={pandaProtectLogo}
                alt="Panda Protect"
                className="h-11 sm:h-14 w-auto object-contain"
                priority
                  width={1226}
                  height={594}
              />
            </Link>

            <nav className="hidden lg:flex items-center" aria-label="Main navigation">
              {NAV_ITEMS.map((item) => (
                <Link key={item.label} to={item.to} aria-current={location.pathname === item.to ? 'page' : undefined} className={`public-header-nav-link${location.pathname === item.to ? ' is-active' : ''}`}>
                  {item.label}
                </Link>
              ))}

              <div className="hidden xl:block"><Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="public-header-call" aria-label="Open call options">
                    <Phone aria-hidden="true" /> Call Us
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={10} className="public-call-menu">
                  <div className="public-call-hours"><Clock3 aria-hidden="true" /> Mon-Fri 9am to 5:30pm</div>
                  <a href="tel:03309122535" className="public-call-option">
                    <Phone aria-hidden="true" />
                    <span><strong>Get a Quote</strong><small>0330 912 2535</small></span>
                  </a>
                  <a href="tel:03302295045" className="public-call-option">
                    <Phone aria-hidden="true" />
                    <span><strong>Make a Claim</strong><small>0330 229 5045</small></span>
                  </a>
                  <Button type="button" variant="ghost" className="public-callback-option" onClick={() => setCallbackOpen(true)}>
                    <PhoneCall aria-hidden="true" />
                    <span><strong>Request Call-Back</strong><small>We'll call you back</small></span>
                  </Button>
                  <a
                    href="https://wa.me/message/SPQPJ6O3UBF5B1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="public-whatsapp-option"
                  >
                    <MessageCircle aria-hidden="true" />
                    <span><strong>WhatsApp Us</strong><small>Start a chat</small></span>
                  </a>
                </PopoverContent>
              </Popover></div>

              <Link to="/dealer-portal/signup" className="home-header-quote-link">
                Dealer Sign Up <ArrowRight aria-hidden="true" />
              </Link>
              <Link to="/dealer-portal/login" className="home-header-login-link">
                <LogIn aria-hidden="true" /> Login
              </Link>
            </nav>

            <div className="public-mobile-header-actions flex shrink-0 items-center gap-2 lg:hidden">
              <Link to="/dealer-portal/login" className="home-header-login-link !px-3 !py-2 text-sm"><LogIn aria-hidden="true" /> Login</Link>
              <Link to="/dealer-portal/signup" className="home-header-quote-link !px-3 !py-2 text-sm">Sign Up</Link>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden public-header-menu-button" aria-label="Open menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="public-mobile-menu w-[min(92vw,420px)] overflow-y-auto">
                <div className="flex h-full flex-col px-2 pt-6 pb-6">
                  <OptimizedImage src={pandaProtectLogo} alt="Panda Protect" className="h-9 w-auto self-start object-contain" width={1226} height={594} />

                  <nav className="mt-9 flex flex-col gap-6" aria-label="Mobile navigation">
                    {NAV_ITEMS.map((item) => (
                      <Link key={item.label} to={item.to} aria-current={location.pathname === item.to ? 'page' : undefined} onClick={() => setMobileOpen(false)} className={`public-mobile-nav-link${location.pathname === item.to ? ' is-active' : ''}`}>
                        {item.label}
                      </Link>
                    ))}
                    <Link to="/dealer-portal/login" onClick={() => setMobileOpen(false)} className="public-mobile-nav-link public-mobile-login-link">
                      <LogIn aria-hidden="true" /> Login
                    </Link>
                  </nav>

                  <div className="public-mobile-contact">
                    <div className="public-call-hours"><Clock3 aria-hidden="true" /> Mon-Sat 9am to 6pm</div>
                    <a href="tel:03309122535" className="public-call-option"><Phone aria-hidden="true" /><span><strong>Get a Quote</strong><small>0330 912 2535</small></span></a>
                    <a href="tel:03302295045" className="public-call-option"><Phone aria-hidden="true" /><span><strong>Make a Claim</strong><small>0330 229 5045</small></span></a>
                    <Button type="button" variant="ghost" className="public-callback-option" onClick={openCallback}><PhoneCall aria-hidden="true" /><span><strong>Request Call-Back</strong><small>We'll call you back</small></span></Button>
                  </div>

                  <div className="mt-auto pt-6">
                    <Button asChild className="home-header-quote-link w-full !min-h-[52px] text-base">
                      <Link to="/dealer-portal/signup" onClick={() => setMobileOpen(false)}>Dealer Sign Up <ArrowRight aria-hidden="true" /></Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            </div>
          </div>
        </div>
      </header>

      <RequestCallbackModal isOpen={callbackOpen} onClose={() => setCallbackOpen(false)} />

      {/* Mobile sticky trade CTA bar */}
      {showMobileBar && (
        <div className="mobile-trade-cta fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom,10px),10px)] lg:hidden animate-in slide-in-from-bottom-4 duration-300">
          <p className="text-center text-brand-orange font-bold text-sm mb-2">
            Trade Warranties for Your Customers
          </p>
          <div className="flex gap-2">
            <a
              href="tel:03309122535"
              className="min-w-0 flex-1 whitespace-nowrap bg-white border-2 border-crm-green-deep text-crm-green-deep font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              aria-label="Call us"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              Call Us
            </a>
            <Link
              to="/dealer-portal/signup"
              className="min-w-0 flex-1 whitespace-nowrap bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-md transition-colors"
              aria-label="Become a dealer"
            >
              Become a Dealer
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
};