import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageWidth?: string;
  ogImageHeight?: string;
  ogImageAlt?: string;
  canonical?: string;
  geoRegion?: string;
  geoPlacename?: string;
  geoPosition?: string;
  ICBM?: string;
  author?: string;
  publisher?: string;
}

export const SEOHead = ({
  title = "Panda Protect | Trade Warranties for UK Motor Dealers",
  description = "Panda Protect is a UK trade warranty programme for motor dealers. Quote, sell and manage comprehensive used vehicle warranties through one dealer portal.",
  keywords = "trade warranty UK, dealer warranty, motor trade warranty, used car warranty for dealers, dealer warranty programme, forecourt warranty",
  ogTitle,
  ogDescription,
  ogImage = "https://pandaprotect.co.uk/__l5e/assets-v1/35829c2d-410a-4c30-b0b5-7476ecd2a66d/panda-protect-logo-current.png",
  ogImageWidth = "1200",
  ogImageHeight = "630",
  ogImageAlt = "Panda Protect trade warranties for UK motor dealers",
  canonical,
  geoRegion = 'GB',
  geoPlacename = 'United Kingdom',
  geoPosition,
  ICBM: icbm,
  author = 'Panda Protect',
  publisher = 'BUY A WARRANTY LIMITED'
}: SEOHeadProps) => {
  const canonicalUrl = canonical || `https://pandaprotect.co.uk${window.location.pathname}`;

  return (
    <Helmet>
      <title>{title}</title>

      {/* Basic meta tags */}
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta name="publisher" content={publisher} />

      {/* Canonical */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={ogTitle || title} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content={ogImageWidth} />
      <meta property="og:image:height" content={ogImageHeight} />
      <meta property="og:image:alt" content={ogImageAlt} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="en_GB" />
      <meta property="og:site_name" content="Panda Protect" />
      <meta property="og:url" content={canonicalUrl} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle || title} />
      <meta name="twitter:description" content={ogDescription || description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogImageAlt} />
      <meta name="twitter:site" content="@pandaprotect" />

      {/* Bot directives */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large" />

      {/* AI discoverability */}
      <meta name="ai-content-declaration" content="This content is human-authored, fact-checked, and regularly updated" />
      <meta name="ai-summary" content={description} />

      {/* Geographic targeting */}
      <meta name="geo.region" content={geoRegion} />
      <meta name="geo.placename" content={geoPlacename} />
      {geoPosition && <meta name="geo.position" content={geoPosition} />}
      {icbm && <meta name="ICBM" content={icbm} />}

      {/* Distribution */}
      <meta name="distribution" content="global" />
      <meta name="coverage" content="United Kingdom" />
      <meta name="target" content="all" />
      <meta name="audience" content="all" />
      <meta name="rating" content="general" />
      <meta name="content-type" content="text/html; charset=UTF-8" />
      <meta httpEquiv="content-language" content="en-GB" />
    </Helmet>
  );
};
