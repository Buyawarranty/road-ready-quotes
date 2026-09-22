import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { OptimizedImage } from '@/components/OptimizedImage';
import pandaProtectLogo from '@/assets/panda-protect-v2.webp';

const DealerPublicFooter: React.FC = () => {
  return (
    <footer className="dealer-public-footer">
      <div className="dealer-footer-shell">
        <div className="dealer-footer-grid">
          <div className="dealer-footer-brand">
            <OptimizedImage src={pandaProtectLogo} alt="Panda Protect trade warranty solutions" width={1226} height={594} />
            <p>Warranty solutions for a stronger tomorrow.</p>
          </div>

          <div>
            <h2>Quick links</h2>
            <ul>
              <li><Link to="/why-choose-us/">Why Choose Us</Link></li>
              <li><Link to="/what-is-covered/">What’s Covered</Link></li>
              <li><Link to="/make-a-claim/">Claims</Link></li>
              <li><Link to="/thewarrantyhub/">Resources</Link></li>
              <li><Link to="/faq/traders/">FAQs</Link></li>
              <li><Link to="/contact-us/">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h2>For dealers</h2>
            <ul>
              <li><Link to="/dealer-portal/login">Dealer Portal</Link></li>
              <li><Link to="/dealer-portal/signup">Register Your Dealership</Link></li>
              <li><Link to="/contact-us/">Dealer Support</Link></li>
              <li><Link to="/what-is-covered/">Warranty Products</Link></li>
              <li><Link to="/why-choose-us/">White Label Solutions</Link></li>
              <li><Link to="/thewarrantyhub/">Trade Warranty Guide</Link></li>
            </ul>
          </div>

          <div>
            <h2>Legal</h2>
            <ul>
              <li><Link to="/terms/">Terms &amp; Conditions</Link></li>
              <li><Link to="/privacy/">Privacy Policy</Link></li>
              <li><Link to="/why-choose-us/">FCA Information</Link></li>
              <li><Link to="/cookies/">Cookie Policy</Link></li>
              <li><Link to="/complaints/">Complaints</Link></li>
            </ul>
          </div>

          <div className="dealer-footer-contact">
            <h2>Get in touch</h2>
            <a href="tel:03309122535"><Phone />0330 912 2535</a>
            <a href="mailto:dealers@pandaprotect.co.uk"><Mail />dealers@pandaprotect.co.uk</a>
            <p><MapPin />Warranty House, 62 Berkhamsted Avenue, Wembley, HA9 6DT</p>
            <strong>Trusted by UK motor dealers</strong>
          </div>
        </div>

        <div className="dealer-footer-bottom">
          <div>© {new Date().getFullYear()} Panda Protect. All rights reserved.</div>
          <div>A trade warranty provider for a stronger tomorrow.</div>
        </div>
      </div>
    </footer>
  );
};

export default DealerPublicFooter;
