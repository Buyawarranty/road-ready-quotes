import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Linkedin, Youtube } from 'lucide-react';
import { OptimizedImage } from '@/components/OptimizedImage';
import buyawarrantyLogo from '@/assets/buyawarranty-logo.webp';

const footerLinks = {
  quick: [
    { label: 'Home', to: '/' },
    { label: 'Trade Login', to: '/dealer-portal/login' },
    { label: 'Make a Claim', to: '/make-a-claim' },
    { label: 'Contact Us', to: '/contact-us' },
  ],
  warranty: [
    { label: 'Car Warranty', to: '/buy-a-used-car-warranty-reliable-warranties' },
    { label: 'Van Warranty', to: '/van-warranty' },
    { label: 'EV Warranty', to: '/ev-warranty' },
    { label: 'Motorbike Warranty', to: '/motorcycle-warranty' },
  ],
  support: [
    { label: 'FAQs', to: '/faq/traders' },
    { label: 'Dealer Resources', to: '/dealer-portal/resources' },
    { label: 'Claims Hotline', to: 'tel:03302295045' },
    { label: 'Email Support', to: 'mailto:support@pandaprotect.co.uk' },
  ],
  company: [
    { label: 'About Us', to: '/about' },
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms & Conditions', to: '/terms' },
    { label: 'Cookie Policy', to: '/cookies' },
  ],
};

const DealerPublicFooter: React.FC = () => {
  return (
    <footer className="bg-[#0f1b3d] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          {/* Link columns */}
              <div className="col-span-1">
            <h3 className="text-sm font-bold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2.5">
              {footerLinks.quick.map((l) => (
                <li key={l.label}>
                  {l.to.startsWith('http') || l.to.startsWith('tel') || l.to.startsWith('mailto') ? (
                    <a href={l.to} className="text-sm text-white/70 hover:text-white transition-colors">{l.label}</a>
                  ) : (
                    <Link to={l.to} className="text-sm text-white/70 hover:text-white transition-colors">{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-1">
            <h3 className="text-sm font-bold text-white mb-4">Warranty</h3>
            <ul className="space-y-2.5">
              {footerLinks.warranty.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-white/70 hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-1">
            <h3 className="text-sm font-bold text-white mb-4">Support</h3>
            <ul className="space-y-2.5">
              {footerLinks.support.map((l) => (
                <li key={l.label}>
                  {l.to.startsWith('http') || l.to.startsWith('tel') || l.to.startsWith('mailto') ? (
                    <a href={l.to} className="text-sm text-white/70 hover:text-white transition-colors">{l.label}</a>
                  ) : (
                    <Link to={l.to} className="text-sm text-white/70 hover:text-white transition-colors">{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-1">
            <h3 className="text-sm font-bold text-white mb-4">Company</h3>
            <ul className="space-y-2.5">
              {footerLinks.company.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-white/70 hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Logo + social */}
          <div className="col-span-2 flex flex-col items-start md:items-end">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <OptimizedImage
                src={buyawarrantyLogo}
                alt="Panda Protect Trade Warranty"
                className="h-12 w-auto object-contain"
                width={180}
                height={48}
              />
            </Link>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://www.facebook.com/pandaprotectwarranty"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/pandaprotectwarranty"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://www.youtube.com/@pandaprotectwarranty"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-center text-xs text-white/60 leading-relaxed">
          <p className="max-w-4xl mx-auto">
            Panda Protect is a trading name of B4U Warranty Limited. Registered in the United Kingdom under company number 10314683. Registered address: Warranty House, 62 Berkshire Ave, Wembley, HA9 0QT, England.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default DealerPublicFooter;
