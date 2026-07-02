import React from 'react';
import { Link } from 'react-router-dom';

const DealerPublicFooter: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-16">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
          <div className="md:col-span-1">
            <div className="text-white font-black text-xl">Panda Protect</div>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Trusted UK trade warranties for motor dealers.
            </p>
          </div>

          <div>
            <div className="text-white font-bold text-sm uppercase tracking-wide mb-4">For Dealers</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/dealer-portal/signup" className="hover:text-orange-400 transition-colors">Register interest</Link></li>
              <li><Link to="/dealer-portal/login" className="hover:text-orange-400 transition-colors">Dealer login</Link></li>
              <li><Link to="/faq/traders" className="hover:text-orange-400 transition-colors">Dealer FAQs</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-white font-bold text-sm uppercase tracking-wide mb-4">Contact</div>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:hello@pandaprotect.co.uk" className="hover:text-orange-400 transition-colors">hello@pandaprotect.co.uk</a></li>
              <li><a href="tel:03304454446" className="hover:text-orange-400 transition-colors">0330 445 4446</a></li>
            </ul>
          </div>

          <div>
            <div className="text-white font-bold text-sm uppercase tracking-wide mb-4">Legal</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="hover:text-orange-400 transition-colors">Terms</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-orange-400 transition-colors">Privacy</Link></li>
              <li><Link to="/cookie-policy" className="hover:text-orange-400 transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 text-xs text-slate-500 flex flex-col sm:flex-row gap-2 justify-between">
          <div>© {new Date().getFullYear()} Panda Protect. All rights reserved.</div>
          <div>Built for the UK motor trade warranty industry.</div>
        </div>
      </div>
    </footer>
  );
};

export default DealerPublicFooter;
