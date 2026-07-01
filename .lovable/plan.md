
# CallRail Integration for Admin Panel

Bring CallRail calls into the admin so sales agents see a big incoming-call banner in real time and a persistent missed-call alert they must acknowledge — routed to the agent CallRail assigned the tracking number to.

## 1. Data model (Supabase)

New tables in `public`:

- `callrail_tracking_numbers`
  - `id uuid pk`, `callrail_tracker_id text unique`, `phone_e164 text`, `label text`
  - `assigned_admin_user_id uuid` → maps tracking number → sales agent
  - `active boolean default true`, timestamps
- `callrail_calls`
  - `id uuid pk`, `callrail_call_id text unique`
  - `direction text` (`inbound`/`outbound`), `status text` (`ringing` | `in_progress` | `completed` | `missed` | `voicemail`)
  - `caller_number text`, `caller_name text`, `caller_city text`, `tracker_id text`, `tracked_number text`
  - `assigned_admin_user_id uuid` (resolved from tracking number → agent)
  - `matched_lead_id uuid null`, `matched_customer_id uuid null` (phone-number match against `sales_leads` / `customers`)
  - `started_at timestamptz`, `answered_at timestamptz`, `ended_at timestamptz`
  - `duration_seconds int`, `recording_url text`, `raw jsonb`
  - `acknowledged_at timestamptz null`, `acknowledged_by uuid null` (for missed-call dismissal)
  - `callback_lead_id uuid null` (link if callback lead created)
- Enable Realtime on `callrail_calls`; RLS: sales agents see calls where `assigned_admin_user_id = auth.uid()` OR unassigned; admins see all.
- GRANTs per project rules; `service_role` full access for the edge function.

## 2. CallRail webhook edge function

New public edge function `callrail-webhook` (verify_jwt = false, HMAC-verified via `CALLRAIL_WEBHOOK_SECRET`):

- Handles CallRail's Pre-Call (ringing), Post-Call (completed/missed), and Call-Modified events.
- Upserts one row per `callrail_call_id`, updating status transitions.
- Looks up tracking number → `assigned_admin_user_id`.
- Attempts phone-match against `sales_leads.mobile` / `customers.phone` to populate `matched_lead_id` / `matched_customer_id`.
- On `missed` / `no-answer` / `voicemail`, ensures `status='missed'` and leaves `acknowledged_at` null.
- On completed answered call, writes to existing `lead_call_logs` if a lead match exists.
- Requires two secrets: `CALLRAIL_WEBHOOK_SECRET` and `CALLRAIL_API_KEY` (for fetching call detail / recordings when needed).

Setup step for the user: in CallRail, add company-level webhooks for Pre-Call, Post-Call, and Call-Modified pointing to the deployed function URL.

## 3. Admin realtime hook + UI

New `src/hooks/useCallRailPresence.ts`:
- Subscribes via Supabase Realtime to `callrail_calls` scoped to `assigned_admin_user_id = currentAdminId` (plus unassigned).
- Exposes: `activeIncomingCall` (status `ringing`/`in_progress`, unended), `missedCalls` (status `missed` AND `acknowledged_at is null`).

New components under `src/components/admin/calls/`:
- `IncomingCallBanner.tsx` — full-width fixed banner at top of the admin layout, orange/blue high-contrast. Shows caller number, matched lead/customer name + link, tracking number label, ring animation. Plays ringtone (`/sounds/ringtone.mp3`) and fires a `Notification` if permission granted. Buttons: “Open lead”, “Answered”, “Mark missed”.
- `MissedCallBanner.tsx` — sticky red bar below the incoming banner. Lists up to 3 recent unacknowledged missed calls with “Call back” (tel: link + creates callback reminder in `lead_reminders`) and “Dismiss” (sets `acknowledged_at`). A counter chip in `NotificationBell` shows total missed.
- Both mounted from the admin layout so they're visible on every admin route.

Integration:
- Mount banners in the admin shell (same layer as `MaintenanceBanner`).
- Extend `NotificationBell` to include a “Missed calls” tab.
- Request `Notification.requestPermission()` on first admin load.

## 4. Admin management screen

New route `Dealer Admin → Call Tracking` (`src/pages/dealer-admin/DealerAdminCallTracking.tsx`):
- Table of `callrail_tracking_numbers` with inline assign-to-agent dropdown (from `admin_users`).
- Recent calls table (filterable by agent, status, date) sourced from `callrail_calls`, with recording playback, matched lead link, and manual re-assign.
- One-time “Sync from CallRail” button that calls a `callrail-sync-numbers` edge function to pull the tracker list via CallRail API.

## 5. Secrets required

Requested via `add_secret` once the plan is approved:
- `CALLRAIL_API_KEY` (Account API token)
- `CALLRAIL_ACCOUNT_ID`
- `CALLRAIL_WEBHOOK_SECRET` (shared signing secret you enter in CallRail webhook settings)

## Technical notes

- Realtime channel filter: `postgres_changes` on `public.callrail_calls` filtered by `assigned_admin_user_id=eq.{adminId}` inside `useEffect` with `removeChannel` cleanup, per project realtime rules.
- Ringtone asset added to `public/sounds/ringtone.mp3`.
- Missed-call visibility persists across page reloads because state lives in `callrail_calls.acknowledged_at`, not local state.
- No changes to existing lead-distribution logic; CallRail only decorates leads and creates callback reminders.
- Follows project memory: no negative wording, high-contrast banner styling per `high-contrast-visual-standards`, uses existing `lead_reminders` for callbacks.

## Out of scope (can add later)

- Click-to-dial through CallRail (currently uses `tel:` + existing Zoiper flow).
- Whisper/coaching messages, SMS.
- Automated agent status → CallRail routing (agents are static-mapped per tracker for v1).
