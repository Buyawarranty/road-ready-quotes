# Architecture rules

- Customer quote links must use the nested field allowlist in customerQuoteSharing; URLs are readable and must never contain trade prices, margins or customer contact data.
- Full warranty configuration and approved versus proposed add-ons live in fullWarrantyConfiguration; unapproved commercial recommendations cannot enter the charging calculation.
- Adjustable customer quotes carry a nested-allowlisted selling-price matrix and customer option labels only; never send dealer pricing rules or margin percentages to the customer page.
- Dealer margin calculations use VAT-inclusive cost divided by one minus the margin fraction; keep selling-price calculations separate from warranty charging.
