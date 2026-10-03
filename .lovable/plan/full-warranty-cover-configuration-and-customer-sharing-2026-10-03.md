# Full Warranty Cover: configuration and customer sharing

## Page changes
- Match the large reference’s compact layout: one registration/vehicle strip, **Full Warranty Cover** heading, included-cover band, configuration rows on the left and a quote summary on the right. Keep the existing Panda Protect colours and registration plate; do not add a vehicle photograph or mascot.
- Provide warranty term, excess, maximum labour rate, parts contribution and claim-limit controls. Use clear month labels rather than promotional “12 + 12” labels; retain existing supported durations unless their pricing is confirmed separately.
- Show two clear parts choices: **Age & mileage contribution** and **100% full cover**. Explain the contribution without promising protection beyond the policy terms.
- Display the ten optional protections from the larger reference with checkboxes, short descriptions and monthly prices.
- Bring across the small reference’s recommended/customer price selector, customer view, Continue and Save draft actions. Keep named saved-plan reuse available.
- Show the dealer cost, VAT information and customer selling price distinctly. Do not substitute the example £299/£499 figures from the mock-up for existing prices.

## Pricing recommendation — confirmation required before charges change
**Keep current base prices and multipliers.** The existing parts calculation already makes age-and-mileage contribution approximately **13% cheaper than no contribution**, because the factors are 1.00 versus 1.15. At the current default configuration that is £118 versus £135.70 per month before VAT. I recommend retaining that difference rather than applying another discount.

Proposed **dealer add-on prices per month, excluding VAT**:

| Add-on | Proposed monthly price |
|---|---:|
| Wear & tear extension | £20 |
| Emissions system cover | £15 |
| Air suspension / adaptive suspension | £25 |
| Wet belt / timing belt cover | £12 |
| Vehicle rental / courtesy car | £10 |
| Air conditioning / climate control | £8 |
| Infotainment / multimedia | £8 |
| ADAS / driver assistance | £12 |
| Hybrid / EV battery cover | £25 |
| Enhanced suspension / steering | £10 |

These are starting recommendations matching the reference, not validated underwriting rates. Final prices and cover eligibility need approval against repair costs, claim limits and the warranty wording. Avoid charging an add-on for protection already included in the selected base warranty. Diagnostics should not be both “included as standard” and a paid extra.

The current page calculates totals over 12 months irrespective of the selected term. Correcting that will change non-12-month quote totals, so confirm the term pricing before changing that calculation. Do not silently replace the existing engine with the separate trader pricing engine.

## Printing and sharing
- Customer opens in a separate tab containing only the selected selling price, vehicle, cover options and selected add-ons — no dealer cost, recommended-versus-custom comparison or margin.
- Add **Print**, **Email** and **WhatsApp** actions. Print a clean customer quote, not the dealer dashboard; browser printing also allows Save as PDF.
- Email opens the dealer’s email application with a customer-safe summary and link. WhatsApp opens WhatsApp with the same summary and link, letting the dealer choose the recipient. No WhatsApp Business connection is required for this sharing flow.
- Clearly label the document a quote, not an issued warranty. Exclude private customer contact/address data from the shared link.

## Technical details
- Update the active pricing screen and reuse the existing customer-quote route with an explicit customer-safe payload allowlist.
- Isolate configuration and quote-summary/share logic into focused modules; retain existing dealer authentication and draft-save behaviour.
- Add focused tests for customer-safe sharing and any approved pricing/term changes. Verify customer printing and sharing publicly; authenticated dealer checks remain unavailable with the current external Supabase connection.

## Approval
Approve the layout and customer sharing. Confirm whether to adopt the proposed add-on rates and correct term totals before those prices are applied.