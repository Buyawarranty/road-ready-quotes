import { describe, expect, it } from 'vitest';
import { dealerVehicleSummary, mergeWarrantyVehicleLookup, shouldLookupWarrantyVehicle } from '../dealerWarrantyVehicle';

describe('dealer warranty vehicle details', () => {
  it('requests an API lookup when a saved registration has no vehicle make or model', () => {
    expect(shouldLookupWarrantyVehicle({ registration_plate: 'TH56XXX', vehicle_make: null, vehicle_model: null })).toBe(true);
  });

  it('does not request another lookup when the saved vehicle is complete', () => {
    expect(shouldLookupWarrantyVehicle({ registration_plate: 'AB12CDE', vehicle_make: 'Vauxhall', vehicle_model: 'Astra' })).toBe(false);
  });

  it('fills blank warranty fields from the vehicle API without replacing saved details', () => {
    const merged = mergeWarrantyVehicleLookup({
      registration_plate: 'AB12CDE',
      vehicle_make: 'Vauxhall',
      vehicle_model: null,
      vehicle_year: null,
      vehicle_fuel_type: null,
    }, {
      make: 'DVLA make should not replace this',
      model: 'Astra',
      yearOfManufacture: 2020,
      fuelType: 'Petrol',
    });

    expect(merged.vehicle_make).toBe('Vauxhall');
    expect(merged.vehicle_model).toBe('Astra');
    expect(merged.vehicle_year).toBe('2020');
    expect(merged.vehicle_fuel_type).toBe('Petrol');
    expect(dealerVehicleSummary(merged)).toBe('2020 Vauxhall Astra');
  });
});
