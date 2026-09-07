# Vehicle recognition and last recorded mileage on the trader quote

## What the trader will see

On the "Vehicle details" step, after typing a registration:

1. A **vehicle recognition panel** appears above the fields — make, model, year, fuel, colour and age, so the trader can confirm it is the right car before continuing.
2. A **last recorded mileage** line — the odometer reading from the most recent MOT plus the date it was recorded (e.g. "128,430 miles recorded at MOT on 14 March 2026").
3. The mileage box is pre-filled with that reading, still editable, with a one-tap "Use last recorded mileage" if the trader changes it.
4. Clear states while it works: "Looking up…", "No MOT mileage on record — please enter it", and "We couldn't find that registration" (fields stay editable so a quote is never blocked).

## How it works

- Registration lookup already calls the DVLA service; the vehicle panel is built from that response (make, model, year, fuel, colour, registration date).
- Mileage currently only reads the stored MOT copy, so cars never looked up before show nothing. The step will fall back to the live DVSA MOT service when no stored record exists, then use the newest test with a real odometer value.
- A light mileage sanity check: warn (not block) if the entered figure is lower than the last recorded MOT reading.

## Technical notes

- `src/pages/dealer-portal/journey/Step1Vehicle.tsx`: add a recognition summary card, MOT mileage line with date, "use recorded mileage" action, and the lower-than-MOT warning.
- `src/hooks/useMotMileage.ts`: on a cache miss, invoke the existing `fetch-mot-history` edge function, then re-read; return `motDate` and a `source` ('cache' | 'live' | 'none'). No new edge functions or DB changes.
- Reuse the odometer-selection logic already used by `RegLookupBar` (sort tests by `completedDate`, take the first with `odometerValue > 0`).
- DVLA response fields not currently kept in state (colour, registration date) are stored locally for display only; the journey context shape is unchanged.
