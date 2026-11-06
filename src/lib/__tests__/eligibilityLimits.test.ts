import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateBoundaries,
  MAX_VEHICLE_AGE_YEARS,
  MAX_VEHICLE_MILEAGE,
} from '../pricing/eligibilityBoundaries';
import { validateVehicleEligibility } from '../vehicleValidation';

// Cover limits: vehicles up to 12 years old and 120,000 miles.
// 12 years / 120,000 miles exactly is still eligible; one day or one mile over is not.

const NOW = new Date('2026-11-06T00:00:00Z');

function yearsAgo(years: number, extraDays = 0): string {
  const d = new Date(NOW);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() - extraDays);
  return d.toISOString();
}

describe('Eligibility limits: 12 years / 120,000 miles', () => {
  it('exports the 12-year and 120,000-mile limits', () => {
    assert.equal(MAX_VEHICLE_AGE_YEARS, 12);
    assert.equal(MAX_VEHICLE_MILEAGE, 120000);
  });

  it('exactly 12 years old is eligible', () => {
    const r = evaluateBoundaries({ registrationDate: yearsAgo(12), mileage: 50000, asOf: NOW });
    assert.equal(r.outcome, 'eligible');
  });

  it('12 years and 1 day old is declined', () => {
    const r = evaluateBoundaries({ registrationDate: yearsAgo(12, 1), mileage: 50000, asOf: NOW });
    assert.equal(r.outcome, 'declined');
    assert.match(r.message ?? '', /120,000 miles and less than 12 years/);
  });

  it('exactly 120,000 miles is eligible', () => {
    const r = evaluateBoundaries({ registrationDate: yearsAgo(5), mileage: 120000, asOf: NOW });
    assert.equal(r.outcome, 'eligible');
  });

  it('120,001 miles is declined', () => {
    const r = evaluateBoundaries({ registrationDate: yearsAgo(5), mileage: 120001, asOf: NOW });
    assert.equal(r.outcome, 'declined');
    assert.match(r.message ?? '', /120,000 miles and less than 12 years/);
  });

  it('live validation blocks a 13-year-old vehicle', () => {
    const r = validateVehicleEligibility({ regNumber: 'AB12CDE', year: String(NOW.getUTCFullYear() - 13), mileage: '50000' });
    assert.equal(r.isValid, false);
    assert.match(r.errorMessage ?? '', /120,000 miles and less than 12 years/);
  });

  it('live validation blocks mileage over 120,000', () => {
    const r = validateVehicleEligibility({ regNumber: 'AB12CDE', year: String(NOW.getUTCFullYear() - 5), mileage: '120001' });
    assert.equal(r.isValid, false);
  });

  it('live validation allows a 12-year-old vehicle at 120,000 miles', () => {
    const r = validateVehicleEligibility({ regNumber: 'AB12CDE', year: String(NOW.getUTCFullYear() - 12), mileage: '120000' });
    assert.equal(r.isValid, true);
  });
});
