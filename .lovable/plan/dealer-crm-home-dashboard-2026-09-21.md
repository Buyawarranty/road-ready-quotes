# Dealer CRM Home dashboard

## Scope
Rebuild only `/dealer-portal/dashboard` first. The remaining CRM pages will follow after the Home screen is reviewed and approved.

## Home screen
- Replace the current horizontal portal navigation with a fixed navy sidebar and compact top header.
- Add the Panda Protect logo, dealer badge, global search, notifications, Help, and the signed-in dealer account menu.
- Build the compact welcome panel and UK registration quote control.
- Add the four KPI cards, six quick actions, attention list, recent quotes, recent activity, performance summary, support, and resources areas using the supplied copy and status colours.
- Keep the mascot secondary, limited to the support/welcome treatment.

## Interactions
- Preserve authentication, dealer approval, sign-out, account settings, quote, warranty, and customer flows.
- Connect available actions to existing dealer pages.
- Use clear temporary destinations for requested sections that do not yet have dedicated portal pages; those pages will be built in the next phase.
- Make search filter/show matching dashboard records and support the keyboard shortcut.
- Keep registration entry normalised and route it into the full quote journey.

## Responsive behaviour
- Desktop keeps the fixed sidebar and full information grid.
- Tablet moves KPI and action cards into two columns.
- Mobile uses a menu drawer, stacked cards, horizontally scrollable compact tables, and keeps New Quote prominent.

## Technical details
- Create CRM-specific semantic colour and shadow tokens in the global design system.
- Refactor the shared dealer layout so future CRM pages inherit the same header and sidebar.
- Keep the Home implementation in focused dashboard components where practical.
- Validate the visible desktop and mobile layouts without changing business data or permissions.
