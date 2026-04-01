# Worker Service

Standalone background worker for geocoding tweet locations directly in PostgreSQL.

This module is intentionally isolated so the entire folder can be copied into a new repository with minimal changes.

## Folder Structure

worker-service/
 - src/
   - db.js
   - geocode.js
   - worker.js
   - utils/
     - env.js
     - logger.js
     - sleep.js
 - package.json
 - .env
 - .env.example
 - README.md

## How It Works

1. The worker loads environment values from worker-service/.env.
2. It opens a direct PostgreSQL connection using DATABASE_URL and pg Pool.
3. On each cycle, it fetches rows from tweets where latitude is null and geocoding is pending/retry-eligible.
4. It calls Google Geocoding API for each selected location.
5. It updates the same rows in PostgreSQL with:
   - latitude and longitude on success
   - geocode_status as done or failed_N
   - optional attempt/timestamp/error metadata if those columns exist
6. It sleeps for WORKER_POLL_INTERVAL_MS between cycles to avoid tight looping.
7. On failures, it waits WORKER_ERROR_DELAY_MS and retries in the next cycle.

## Database Expectations

Minimum expected tweets columns:
- id
- location
- latitude
- geocode_status

Optional columns automatically used when available:
- geocode_attempts
- geocode_last_attempt_at
- geocoded_at
- geocode_error
- updated_at

## Local Setup In Current Repository

1. Open a terminal in worker-service.
2. Install dependencies:
   npm install
3. Copy .env.example to .env and fill secrets:
   - DATABASE_URL
   - GOOGLE_MAPS_GEOCODING_API_KEY
4. Run continuously:
   npm run start
5. Run a single batch (useful for smoke tests):
   npm run start:once

## Environment Variables

Required:
- DATABASE_URL
- GOOGLE_MAPS_GEOCODING_API_KEY

Common optional:
- WORKER_POLL_INTERVAL_MS (default 5000)
- WORKER_ERROR_DELAY_MS (default 10000)
- WORKER_BATCH_SIZE (default 10)
- WORKER_MAX_ATTEMPTS (default 3)
- WORKER_RETRY_FAILED (default true)
- WORKER_DB_POOL_MAX (default 10)
- WORKER_DB_SSL_MODE (default auto)
- WORKER_DB_SSL_REJECT_UNAUTHORIZED (default false)
- GEOCODE_REGION (default in)
- GEOCODE_REQUEST_TIMEOUT_MS (default 10000)

## Move To A New Repository (Copy/Paste Friendly)

1. Copy the full worker-service folder into the new repository root.
2. Keep the folder name as worker-service (recommended).
3. In the new repo, run:
   - cd worker-service
   - npm install
4. Configure worker-service/.env.
5. Start the worker:
   npm run start

No imports reference Next.js files, API routes, or parent project code.

## Deploy On Render (Background Worker)

1. Push your repository to GitHub/GitLab.
2. In Render dashboard, click New + then Background Worker.
3. Select your repository.
4. Set Root Directory to worker-service.
5. Set Build Command:
   npm install
6. Set Start Command:
   npm run start
7. Add environment variables in Render:
   - DATABASE_URL
   - GOOGLE_MAPS_GEOCODING_API_KEY
   - optional worker tuning vars
8. Deploy.

Recommended Render settings:
- Auto deploy on commit: enabled
- Health checks: not required for background workers
- Restart policy: default (always)

Render SSL note:
- If your runtime reports self-signed certificate chain errors, keep WORKER_DB_SSL_REJECT_UNAUTHORIZED=false.
- The worker strips sslmode from DATABASE_URL and applies SSL behavior from worker settings.

## Operational Notes

- The worker never calls Next.js API routes.
- It talks directly to PostgreSQL.
- Retry behavior is controlled by WORKER_RETRY_FAILED and WORKER_MAX_ATTEMPTS.
- To reduce geocoding API pressure, lower WORKER_BATCH_SIZE or increase WORKER_POLL_INTERVAL_MS.
