import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateBoundaries,
  MAX_VEHICLE_AGE_YEARS,
  MAX_VEHICLE_MILEAGE,
} from '../pricing/eligibilityBoundaries';
import { validateVehicleEligibility } from '../vehicleValidation';

// Cover limits: vehicles up to 15 years old and 150,000 miles.
// 15 years / 150,000 miles exactly is still eligible; one day or one mile over is not.

const NOW = new Date('2026-11-06T00:00:00Z');

function yearsAgo(years: number, extraDays = 0): string {
  const d = new Date(NOW);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() - extraDays);
  return d.toISOString();
}

describe('Eligibility limits: 15 years / 150,000 miles', () => {
  it('exports the 15-year and 150,000-mile limits', () => {
    assert.equal(MAX_VEHICLE_AGE_YEARS, 15);
    assert.equal(MAX_VEHICLE_MILEAGE, 150000);
  });

  it('just under 15 years old is eligible', () => {
    const r = evaluateBoundaries({ registrationDate: yearsAgo(15, -1), mileage: 50000, asOf: NOW });
    assert.equal(r.outcome, 'eligible');
  });

  it('15 years and 1 day old is declined', () => {
    const r = evaluateBoundaries({ registrationDate: yearsAgo(15, 1), mileage: 50000, asOf: NOW });
    assert.equal(r.outcome, 'declined');
    assert.match(r.message ?? '', /150,000 miles and less than 15 years/);
  });

  it('exactly 150,000 miles is eligible', () => {
    const r = evaluateBoundaries({ registrationDate: yearsAgo(5), mileage: 150000, asOf: NOW });
    assert.equal(r.outcome, 'eligible');
  });

  it('150,001 miles is declined', () => {
    const r = evaluateBoundaries({ registrationDate: yearsAgo(5), mileage: 150001, asOf: NOW });
    assert.equal(r.outcome, 'declined');
    assert.match(r.message ?? '', /150,000 miles and less than 15 years/);
  });

  it('a 13-year-old at 130,000 miles is now eligible', () => {
    const r = evaluateBoundaries({ registrationDate: yearsAgo(13), mileage: 130000, asOf: NOW });
    assert.equal(r.outcome, 'eligible');
  });

  it('live validation blocks a 16-year-old vehicle', () => {
    const r = validateVehicleEligibility({ regNumber: 'AB12CDE', year: String(NOW.getUTCFullYear() - 16), mileage: '50000' });
    assert.equal(r.isValid, false);
    assert.match(r.errorMessage ?? '', /150,000 miles and less than 15 years/);
  });

  it('live validation blocks mileage over 150,000', () => {
    const r = validateVehicleEligibility({ regNumber: 'AB12CDE', year: String(NOW.getUTCFullYear() - 5), mileage: '150001' });
    assert.equal(r.isValid, false);
  });

  it('live validation allows a 15-year-old vehicle at 150,000 miles', () => {
    const r = validateVehicleEligibility({ regNumber: 'AB12CDE', year: String(NOW.getUTCFullYear() - 15), mileage: '150000' });
    assert.equal(r.isValid, true);
  });
});
