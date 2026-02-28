# Disaster Post Classification Dashboard

## Setup Guide

### Prerequisites
- **Node.js** v18+ installed
- **npm** v9+ (comes with Node.js)
- A **Google Cloud** account (for Maps API)
- A **Firebase** account (for authentication)
- A **Gmail** account or SMTP provider (for email alerts)

---

## Step 1: Clone and Install

```bash
cd Project_Classifier/disaster-dashboard
npm install
```

## Step 2: Configure Environment Variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual values (see sections below).

---

## Step 3: Firebase Setup (Authentication)

### 3.1 Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"**
3. Name it (e.g., `disaster-dashboard`)
4. Disable Google Analytics (optional for this use case)
5. Click **Create Project**

### 3.2 Enable Email/Password Auth
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **Email/Password**
3. Toggle **Enable** on
4. Click **Save**

### 3.3 Create a User Account
1. Go to **Authentication** → **Users** tab
2. Click **Add user**
3. Enter an email and password for the admin user
4. Click **Add user**
   
> **Note:** There is no sign-up page. All user accounts are created by admin via the Firebase Console.

### 3.4 Get Firebase Config
1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to **Your apps** → Click the web icon (`</>`)
3. Register the app (name: `disaster-dashboard`)
4. Copy the config values into `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## Step 4: Google Maps API Setup

### 4.1 Enable Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to **APIs & Services** → **Library**
4. Enable these APIs:
   - **Maps JavaScript API**
   - **Geocoding API** (for locations not in the coordinate cache)

### 4.2 Create an API Key
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. (Recommended) Restrict the key:
   - **Application restrictions**: HTTP referrers → add `http://localhost:3000/*`
   - **API restrictions**: Restrict to Maps JavaScript API & Geocoding API
4. Copy the key to `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

### 4.3 Location Handling Strategy
The app uses a **hybrid approach** for geocoding:
1. **Local coordinate cache** (`india_city_coordinates.csv`) — 47 major Indian cities pre-mapped
2. **Google Maps Geocoder API** — fallback for cities not in the cache
3. **Fuzzy matching** — partial name matching (e.g., "New Delhi" matches "Delhi")

This minimizes API calls and costs while ensuring coverage.

---

## Step 5: Email / SMTP Configuration

### Option A: Gmail (Recommended for Development)
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Go to **App Passwords** ([direct link](https://myaccount.google.com/apppasswords))
4. Select **Mail** and your device
5. Click **Generate** and copy the 16-character password

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
ALERT_RECIPIENT_EMAIL=admin-who-receives-alerts@example.com
```

### Option B: Other SMTP Providers
| Provider | Host | Port |
|----------|------|------|
| Outlook | smtp-mail.outlook.com | 587 |
| SendGrid | smtp.sendgrid.net | 587 |
| Mailgun | smtp.mailgun.org | 587 |

### Email Alerts Are Sent For:
| Trigger | Description |
|---------|-------------|
| `urgent` | When a tweet with urgency "Urgent" is loaded/displayed |
| `resolved` | When an operator clicks "Resolved" on an urgent marker |
| `closed` | When an operator clicks "Close" to remove a marker |

> **Better Alternative Suggestion:** For production, consider using **SendGrid** or **AWS SES** instead of Gmail SMTP. They offer higher daily limits (100/day for Gmail vs 100,000/day for SendGrid free tier), better deliverability, and webhook notifications for delivery tracking.

---

## Step 6: Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` → You'll be redirected to the login page.

---

## Project Structure

```
disaster-dashboard/
├── .env.example              # Template for environment variables
├── .env.local                # Your actual credentials (git-ignored)
├── src/
│   ├── app/
│   │   ├── layout.js         # Root layout with AuthProvider
│   │   ├── page.js           # Root redirect (→ /login or /home)
│   │   ├── globals.css       # Global styles + animations
│   │   ├── login/
│   │   │   └── page.js       # Firebase email/password login
│   │   ├── home/
│   │   │   └── page.js       # Main dashboard (protected)
│   │   └── api/
│   │       ├── tweets/
│   │       │   └── route.js  # GET /api/tweets — CSV data endpoint
│   │       └── send-alert/
│   │           └── route.js  # POST /api/send-alert — Email alerts
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── Navbar.jsx        # Top navigation bar
│   │   │   ├── MapContainer.jsx  # Google Maps with custom markers
│   │   │   ├── AnalyticsChart.jsx# Chart.js bar chart
│   │   │   ├── DataListTable.jsx # Filterable/searchable data table
│   │   │   └── MapFilters.jsx    # Legend + map filters panel
│   │   └── ui/
│   │       ├── badge.jsx
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── input.jsx
│   │       ├── select.jsx
│   │       └── table.jsx
│   ├── context/
│   │   └── AuthContext.js    # Firebase auth state management
│   └── lib/
│       ├── firebase.js       # Firebase client initialization
│       ├── mailer.js         # Nodemailer SMTP transport
│       ├── geocode.js        # Geocoding utility with caching
│       ├── data-fetcher.js   # Abstracted data layer (CSV → DB swap)
│       └── utils.js          # cn() utility for Tailwind
└── ../CSV_Data/
    ├── dummy_tweets_10000.csv        # 10,000 classified tweets
    └── india_city_coordinates.csv    # 47 Indian city coordinates
```

---

## Database Migration Recommendation

### Current: CSV Files (MVP)
- **Pros:** Zero infrastructure, instant setup, no costs
- **Cons:** No concurrent writes, no real-time updates, limited scale

### Recommended: PostgreSQL (via Supabase or Neon)
| Factor | PostgreSQL | BigQuery |
|--------|-----------|----------|
| **Latency** | < 10ms | 500ms - 2s |
| **Cost** | Free tier available | Pay per query |
| **Real-time** | ✅ via subscriptions | ❌ Not designed for it |
| **CRUD** | ✅ Full support | ⚠️ Read-heavy only |
| **Best for** | Dashboards, CRUD apps | Analytics, ML pipelines |

**Verdict: PostgreSQL** is the best choice for this dashboard because:
1. Needs low-latency reads for smooth UI rendering
2. Requires write operations (resolve/close status updates)
3. Supabase/Neon offer free tiers with real-time subscriptions
4. Easy migration — the `data-fetcher.js` abstraction layer makes the swap straightforward

### To Migrate:
1. Replace the implementation in `src/lib/data-fetcher.js`
2. Keep the same function signatures (`fetchTweets()`, `fetchCityCoordinates()`)
3. No changes needed in any other files

---

## Additional Suggestions

### Alternative to SMTP: Webhooks + Slack/Teams
For faster internal alerts, consider:
- **Slack Incoming Webhooks** — instant team notifications
- **Microsoft Teams Webhooks** — if using Teams
- **Discord Webhooks** — for smaller teams
These can supplement or replace email for intra-team alerts.

### Performance Tips
- The app uses **SWR** for data fetching with deduplication and caching
- Google Maps uses **OverlayView** for custom markers (better performance than DOM-heavy InfoWindows)
- The coordinate cache avoids unnecessary Geocoder API calls
- Table pagination limits DOM nodes to 10 rows at a time

### Security Notes
- Firebase Authentication secures all dashboard routes
- API routes are server-side only (SMTP credentials never reach the browser)
- `.env.local` is git-ignored by default
- Consider adding Firebase App Check for production API protection

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Map not loading | Check `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` |
| Login fails | Verify Firebase config + check user exists in Firebase Console |
| Emails not sending | Check SMTP credentials; for Gmail, use App Passwords |
| CSV not found | Ensure `CSV_Data/` folder is in `Project_Classifier/` (one level up from `disaster-dashboard/`) |
| Build errors | Run `npm install` again; check Node.js version ≥ 18 |
