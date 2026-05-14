import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HomepageAlt from '@/components/HomepageAlt';

import { DealerPublicHeader } from '@/components/dealer/DealerPublicHeader';
interface VehicleData {
  registration: string;
  make: string;
  model: string;
  year: string;
  fuel: string;
  color: string;
  mileage: string;
}

const UsedCarWarrantyUK = () => {
  const navigate = useNavigate();
  const [, setVehicleData] = useState<VehicleData | null>(null);

  const handleRegistrationSubmit = (data: VehicleData) => {
    setVehicleData(data);
    sessionStorage.setItem('vehicleData', JSON.stringify(data));
    navigate('/warranty-plan/');
  };

  return (
    <div>
      <DealerPublicHeader />
      <HomepageAlt onRegistrationSubmit={handleRegistrationSubmit} />
    </div>
  );
};

export default UsedCarWarrantyUK;
