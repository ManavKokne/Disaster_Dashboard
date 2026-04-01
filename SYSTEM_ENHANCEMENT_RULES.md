# System Enhancement Rules: Alert Handling, Notifications, and SQL Polling

## Purpose
These rules define the required production-like behavior for alert detection, notification delivery, and alert lifecycle management. Any agent implementing changes must follow these requirements exactly.

## 1. Audio Alert Rules
### 1.1 User Permission Prompt
- On successful login and dashboard entry, the UI must show an explicit prompt to enable sound notifications.
- The prompt must require a user interaction (button click) before any audio playback is attempted.
- If permission is granted, a session flag must be stored so future alerts can play audio without re-prompting in the same session.

### 1.2 Alert Audio Playback
- On detection of each new urgent alert, play looping audio from `/public/sounds/alert.mp3`.
- Audio playback must start only when sound permission is enabled.
- Existing toast and email alerts must continue to work.

### 1.3 Mute or Acknowledge Control
- The marker info window must include a `Mute` or `Acknowledge` action in addition to existing `Resolve` and `Close` actions.
- Clicking `Mute` or `Acknowledge` must stop the currently playing loop immediately.
- This control must be available per alert interaction so operators can silence alerts after acknowledging them.

## 2. Notification Channel Rules
### 2.1 Existing Channels
- Keep current toast notification logic.
- Keep current email notification logic.

### 2.2 Twilio Integration
- Add Twilio-based SMS notifications for new urgent alerts.
- Add Twilio automated voice call notifications for new urgent alerts.
- Send SMS and calls only to verified or approved phone numbers.
- Twilio failures must not break dashboard alert rendering.

## 3. Data Source Rules
### 3.1 Primary and Fallback Sources
- SQL must be the primary source of alert data.
- CSV must remain as fallback when SQL is unavailable.
- Fallback behavior must be graceful and should not crash the dashboard.

### 3.2 Required Database
- Database: from `DATABASE_URL` (Supabase default is typically `postgres`)
- Table name: `tweets`

### 3.3 Required Table Fields
| Field | Type | Rule |
| :--- | :--- | :--- |
| `content` | TEXT | Tweet or alert text content |
| `location` | VARCHAR | Location string or coordinates payload |
| `request_type` | VARCHAR | Alert category |
| `urgency` | VARCHAR(20) | Allowed values only: `urgent`, `non-urgent` |
| `is_resolved` | BOOLEAN | Updated by frontend resolve action |
| `is_closed` | BOOLEAN | Default `false`; set `true` on close |
| `timestamp` | TIMESTAMP | Default `CURRENT_TIMESTAMP` |

## 4. Polling and Incremental Fetch Rules
### 4.1 Polling Strategy
- Frontend must poll periodically (recommended every 3 to 5 seconds).
- Fetch only records where `timestamp > lastFetchedTimestamp`.
- Exclude closed records (`is_closed = false` in active fetch).

### 4.2 State Handling
- Append only new rows to current in-memory state.
- Do not reload all rows on each polling cycle.
- Prevent duplicate marker creation for the same alert record.

## 5. Alert Lifecycle Rules
### 5.1 Resolve Behavior
- `Resolve` action must update `is_resolved = true`.

### 5.2 Manual Close Behavior
- `Close` action must update `is_closed = true` immediately.

### 5.3 Auto-Close After Resolve
- Any alert with `is_resolved = true` must be auto-closed after 5 minutes by setting `is_closed = true`.
- Auto-close logic should run on backend (scheduled job, cron, worker, or database event) for consistency.
- Frontend must stop displaying records once they are closed.

## 6. Demo Data and Simulation Rules
- Initial table state should contain multiple `non-urgent` rows.
- Demo new alerts are inserted manually via Supabase SQL Editor (or `psql`) as `urgent` rows.
- Polling flow must detect these new rows and trigger alert handling without page reload.

## 7. Reliability and Safety Rules
- Notification failures (email, SMS, call, audio) must be logged but must not crash the app.
- SQL connection issues must trigger CSV fallback if configured.
- Closed alerts must not reappear in map or active alert list.

## 8. Acceptance Checklist
- Sound permission prompt appears on dashboard entry and works with browser autoplay policy.
- Looping audio plays for new urgent alerts only after permission is granted.
- Marker info window includes `Mute` or `Acknowledge` and stops loop audio.
- Twilio SMS and voice call are triggered for new urgent alerts.
- SQL-first with CSV fallback works.
- Incremental polling fetches only rows newer than last fetched timestamp.
- `Resolve` updates resolved state.
- `Close` updates closed state.
- Resolved alerts auto-close after 5 minutes from backend logic.