import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, LogIn, Menu, MessageCircle, Phone, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { OptimizedImage } from '@/components/OptimizedImage';
import RequestCallbackModal from '@/components/modals/RequestCallbackModal';
import buyawarrantyLogo from '@/assets/buyawarranty-logo.webp';

const NAV_ITEMS = [
  { label: "What's covered", to: '/what-is-covered/' },
  { label: 'Why Choose Us', to: '/#why-choose-us' },
  { label: 'Make a Claim', to: '/make-a-claim/' },
  { label: 'FAQs', to: '/faq/traders/' },
  { label: 'Contact', to: '/contact-us/' },
] as const;

export const DealerPublicHeader: React.FC = () => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [callbackOpen, setCallbackOpen] = React.useState(false);

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
                src={buyawarrantyLogo}
                alt="Panda Protect"
                className="h-11 sm:h-14 w-auto object-contain"
                priority
                width={340}
                height={80}
              />
            </Link>

            <nav className="hidden xl:flex items-center" aria-label="Main navigation">
              {NAV_ITEMS.map((item) => (
                <a key={item.label} href={item.to} className="public-header-nav-link">
                  {item.label}
                </a>
              ))}

              <Popover>
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
              </Popover>

              <Link to="/dealer-portal/signup" className="home-header-quote-link">
                Dealer Sign Up <ArrowRight aria-hidden="true" />
              </Link>
              <Link to="/dealer-portal/login" className="home-header-login-link">
                <LogIn aria-hidden="true" /> Login
              </Link>
            </nav>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="xl:hidden public-header-menu-button" aria-label="Open menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="public-mobile-menu w-[min(90vw,380px)] overflow-y-auto">
                <div className="flex h-full flex-col pt-8">
                  <OptimizedImage src={buyawarrantyLogo} alt="Panda Protect" className="h-10 w-auto self-start object-contain" width={240} height={56} />
                  <nav className="mt-7 flex flex-col" aria-label="Mobile navigation">
                    {NAV_ITEMS.map((item) => (
                      <a key={item.label} href={item.to} onClick={() => setMobileOpen(false)} className="public-mobile-nav-link">
                        {item.label}<ArrowRight aria-hidden="true" />
                      </a>
                    ))}
                  </nav>

                  <div className="public-mobile-contact">
                    <div className="public-call-hours"><Clock3 aria-hidden="true" /> Mon-Fri 9am to 5:30pm</div>
                    <a href="tel:03309122535" className="public-call-option"><Phone aria-hidden="true" /><span><strong>Get a Quote</strong><small>0330 912 2535</small></span></a>
                    <a href="tel:03302295045" className="public-call-option"><Phone aria-hidden="true" /><span><strong>Make a Claim</strong><small>0330 229 5045</small></span></a>
                    <Button type="button" variant="ghost" className="public-callback-option" onClick={openCallback}><PhoneCall aria-hidden="true" /><span><strong>Request Call-Back</strong><small>We'll call you back</small></span></Button>
                    <a href="https://wa.me/message/SPQPJ6O3UBF5B1" target="_blank" rel="noopener noreferrer" className="public-whatsapp-option"><MessageCircle aria-hidden="true" /><span><strong>WhatsApp Us</strong><small>Start a chat</small></span></a>
                  </div>

                  <div className="mt-auto grid gap-3 pt-6">
                    <Button asChild className="home-header-quote-link"><Link to="/dealer-portal/signup" onClick={() => setMobileOpen(false)}>Dealer Sign Up <ArrowRight /></Link></Button>
                    <Button asChild variant="outline" className="home-header-login-link"><Link to="/dealer-portal/login" onClick={() => setMobileOpen(false)}><LogIn /> Login</Link></Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <RequestCallbackModal isOpen={callbackOpen} onClose={() => setCallbackOpen(false)} />
    </>
  );
};