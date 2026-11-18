export interface DealerVehicleDetails {
  registration_plate?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | number | null;
  vehicle_fuel_type?: string | null;
  vehicle_transmission?: string | null;
}

export interface DealerVehicleLookupResult {
  make?: string | null;
  model?: string | null;
  yearOfManufacture?: string | number | null;
  fuelType?: string | null;
  transmission?: string | null;
}

const clean = (value?: string | number | null) => {
  const text = String(value ?? '').trim();
  return text || null;
};

export function shouldLookupWarrantyVehicle(row: DealerVehicleDetails): boolean {
  return Boolean(clean(row.registration_plate)) && (!clean(row.vehicle_make) || !clean(row.vehicle_model));
}

export function mergeWarrantyVehicleLookup<T extends DealerVehicleDetails>(row: T, lookup: DealerVehicleLookupResult): T {
  return {
    ...row,
    vehicle_make: clean(row.vehicle_make) || clean(lookup.make),
    vehicle_model: clean(row.vehicle_model) || clean(lookup.model),
    vehicle_year: clean(row.vehicle_year) || clean(lookup.yearOfManufacture),
    vehicle_fuel_type: clean(row.vehicle_fuel_type) || clean(lookup.fuelType),
    vehicle_transmission: clean(row.vehicle_transmission) || clean(lookup.transmission),
  };
}

export function dealerVehicleSummary(row: DealerVehicleDetails): string {
  return [row.vehicle_year, row.vehicle_make, row.vehicle_model]
    .map(clean)
    .filter(Boolean)
    .join(' ') || 'Vehicle details unavailable';
}

export function dealerVehicleSpecification(row: DealerVehicleDetails): string {
  return [row.vehicle_fuel_type, row.vehicle_transmission]
    .map(clean)
    .filter(Boolean)
    .join(' · ');
}
