import React from 'react';
import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
import Index from '@/pages/Index';

/**
 * Dealer home (/) — renders the retail homepage sections below the dealer header.
 * The retail Index page handles the registration flow, pricing, checkout, etc.
 */
const DealerHome = () => {
  return (
    <div className="min-h-screen bg-white">
      <DealerPublicHeader />
      <Index />
    </div>
  );
};

export default DealerHome;
