import React from 'react';
import { OptimizedImage } from '@/components/OptimizedImage';

const ICO_WORDMARK = '/assets/ico-wordmark.png';

interface FooterCompanyDetailsProps {
  /** Draws the separating line above the block. Turn off when the host footer already has one. */
  divider?: boolean;
}

/**
 * Legal company details, ICO registration and FCA finance disclosures.
 * Shared by every public footer so the wording stays identical site-wide.
 */
const FooterCompanyDetails: React.FC<FooterCompanyDetailsProps> = ({ divider = true }) => {
  return (
    <div className={`footer-legal-block${divider ? '' : ' footer-legal-block--flat'}`}>
      <div className="footer-legal-col">
        <h3>Company details</h3>
        <p>
          Pandaprotect.co.uk is a trading name of Buy A Warranty Limited. Established 2016. Registered in the
          United Kingdom under Company number: 10314863.
        </p>
        <p>Registered address: Warranty House, 62 Berkhamsted Ave, Wembley, HA9 6DT, England.</p>
        <p>VAT registration number 519 1099 85.</p>
      </div>

      <div className="footer-legal-col">
        <h3>Information Commissioner's Office</h3>
        <OptimizedImage
          src={ICO_WORDMARK}
          alt="Information Commissioner's Office"
          width={654}
          height={309}
          className="footer-legal-ico"
        />
        <p>ICO registered no C1994014</p>
      </div>

      <div className="footer-legal-col">
        <h3>Finance and regulation</h3>
        <p>
          Buy A Warranty Limited (FRN 1062024) is an appointed representative of Carfinanced Limited (FRN 1014460),
          which is authorised and regulated by the Financial Conduct Authority, for credit broking activities.
        </p>
        <p>Buy A Warranty Limited acts as a credit broker, not a lender.</p>
        <p>
          We do not charge customers a fee for arranging finance and do not receive any commission for introducing
          customers to these providers.
        </p>
      </div>
    </div>
  );
};

export default FooterCompanyDetails;
