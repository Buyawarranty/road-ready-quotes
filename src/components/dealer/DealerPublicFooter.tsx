import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { OptimizedImage } from '@/components/OptimizedImage';
import pandaProtectLogo from '@/assets/panda-protect-v2.webp';

const CLAIMS_PHONE = '0330 229 5045';
const SUPPORT_EMAIL = 'support@pandaprotect.co.uk';

const DealerPublicFooter: React.FC = () => {
  return (
    <footer className="dealer-public-footer">
      <div className="dealer-footer-shell">
        {/* Contact strip */}
        <div className="dealer-footer-contact-strip">
          <h2>Need advice? Have any questions?</h2>
          <div className="dealer-footer-strip-actions">
            <a href="tel:03302295045" className="dealer-footer-strip-action">
              <Phone /> Call us: {CLAIMS_PHONE}
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="dealer-footer-strip-action">
              <Mail /> {SUPPORT_EMAIL}
            </a>
            <a
              href="https://wa.me/443302295045"
              target="_blank"
              rel="noopener noreferrer"
              className="dealer-footer-strip-action"
            >
              <MessageCircle /> WhatsApp Us
            </a>
          </div>
        </div>

        <div className="dealer-footer-grid">
          <div className="dealer-footer-brand">
            <OptimizedImage src={pandaProtectLogo} alt="Panda Protect trade warranty solutions" width={1226} height={594} />
            <p>Get fast, affordable cover tailored to your needs.</p>
            <p className="dealer-footer-blurb">
              Panda Protect – Get fast, affordable cover tailored to your car, van, SUV or motorbike. 'Panda Protect'
              vehicle warranty plans are designed to suit your driving needs – with simple online quotes, flexible
              options, and reliable protection. If your vehicle is under 15 years old and has fewer than 150,000 miles,
              you're eligible for comprehensive warranty cover with Panda Protect today.
            </p>
            <div className="dealer-footer-contact">
              <p><Phone /> <span>Sales Enquiries: {CLAIMS_PHONE}</span></p>
              <p><Phone /> <span>Claims Hotline: {CLAIMS_PHONE}</span></p>
              <a href={`mailto:${SUPPORT_EMAIL}`}><Mail />Email Support: {SUPPORT_EMAIL}</a>
            </div>
          </div>

          <div>
            <h2>Quick Links</h2>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/dealer-portal/login">Trade Login</Link></li>
              <li><Link to="/make-a-claim/">Make a Claim</Link></li>
              <li><Link to="/contact-us/">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h2>Warranty Types</h2>
            <ul>
              <li><Link to="/warranty-types/">Car Warranty</Link></li>
              <li><Link to="/van-warranty/">Van Warranty</Link></li>
              <li><Link to="/ev-warranty/">EV Warranty</Link></li>
              <li><Link to="/motorcycle-warranty/">Motorbike Warranty</Link></li>
              <li><Link to="/car-extended-warranty/">Extended Warranty</Link></li>
            </ul>
          </div>

          <div>
            <h2>Legal</h2>
            <ul>
              <li><Link to="/privacy/">Privacy Policy</Link></li>
              <li><Link to="/terms/">Terms & Conditions</Link></li>
              <li><Link to="/cookies/">Cookie Policy</Link></li>
              <li><Link to="/complaints/">Complaints Procedure</Link></li>
              <li><Link to="/cancel-warranty">Cancel a warranty</Link></li>
            </ul>
          </div>

          <div>
            <h2>Warranty Hub</h2>
            <ul>
              <li><Link to="/used-car-warranty-uk/">Used Car Warranty UK</Link></li>
              <li><Link to="/thewarrantyhub/">Content Hub</Link></li>
            </ul>
          </div>

          <div>
            <h2>Help</h2>
            <ul>
              <li><Link to="/faq/traders/">FAQs</Link></li>
              <li><Link to="/faq/">FAQs for Customers</Link></li>
              <li><Link to="/faq/traders/">FAQs for Trade Dealers</Link></li>
            </ul>
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
