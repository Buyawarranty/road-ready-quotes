import { VehicleWidget } from '@/components/VehicleWidget';
import { SEOHead } from '@/components/SEOHead';

export default function Widget() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <SEOHead 
        title="Trade Warranty Widget | Panda Protect"
        description="Use a trade warranty widget to help dealers present warranty options, capture quotes and support smoother vehicle sales journeys."
        keywords="warranty widget, embed warranty quotes, vehicle warranty, car insurance widget"
      />
      <VehicleWidget 
        redirectUrl={window.location.origin}
        className="bg-white"
      />
    </div>
  );
}