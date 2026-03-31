# Field Sales App — Setup & Deployment Guide

## Prerequisites
- Node.js 18+
- A Supabase account (free tier works)
- A Google Maps API key
- A Hostinger hosting account

---

## 1. Supabase Setup

### Create a project
1. Go to https://supabase.com and create a new project
2. Note your **Project URL** and **anon/public key** (Settings → API)

### Run the database schema
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase-schema.sql` from this project
3. Click **Run** — this creates all tables with security policies

### Enable Email Auth
1. Go to Authentication → Providers
2. Ensure **Email** is enabled
3. Optionally disable email confirmation for faster testing:
   Authentication → Settings → "Confirm email" → toggle off

---

## 2. Google Maps API Key

1. Go to https://console.cloud.google.com
2. Create a new project or use existing
3. Enable these APIs:
   - **Maps JavaScript API**
   - **Geocoding API** (optional, for address auto-fill)
4. Create credentials → API Key
5. Restrict the key to your domain for production

---

## 3. Local Development

```bash
# Install dependencies
cd field-sales-app
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and fill in your keys:
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGc...
# VITE_GOOGLE_MAPS_API_KEY=AIzaSy...

# Start dev server
npm run dev
```

Open http://localhost:5173 on your phone (same WiFi) or use ngrok for HTTPS (required for GPS on iPhone).

---

## 4. Build for Production

```bash
npm run build
```

This creates a `dist/` folder with all static files.

---

## 5. Deploy to Hostinger

### Option A: File Manager (easiest)
1. Log in to Hostinger hPanel
2. Go to **Files → File Manager**
3. Navigate to `public_html/`
4. Delete any existing files
5. Upload all contents of the `dist/` folder

### Option B: FTP
1. Use FileZilla or similar FTP client
2. Connect using your Hostinger FTP credentials
3. Upload `dist/` contents to `public_html/`

### Fix client-side routing (IMPORTANT)
Create a `.htaccess` file in `public_html/` with this content:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

Without this, refreshing any page other than `/` will show a 404.

---

## 6. Enable HTTPS on Hostinger

GPS only works over HTTPS on iPhone.

1. In hPanel → SSL → Let's Encrypt
2. Click **Install** for your domain
3. Enable **Force HTTPS** redirect

---

## 7. Install as PWA on iPhone

1. Open your site in Safari on iPhone
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Give it a name → **Add**

The app will now open full-screen like a native app.

---

## 8. Add PWA Icons (optional but recommended)

Create or use a tool like https://realfavicongenerator.net to generate:
- `public/pwa-192x192.png`
- `public/pwa-512x512.png`
- `public/apple-touch-icon.png`

---

## Environment Variables Summary

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key |

---

## Folder Structure

```
field-sales-app/
├── public/                  # Static assets (icons)
├── src/
│   ├── components/
│   │   ├── BottomNav.jsx    # Tab navigation
│   │   ├── CustomerCard.jsx # Customer list item
│   │   ├── NearbyCustomerModal.jsx  # Duplicate detection popup
│   │   └── Toast.jsx        # Notification
│   ├── hooks/
│   │   ├── useAuth.jsx      # Auth context
│   │   ├── useCustomers.js  # Customer CRUD
│   │   └── useVisits.js     # Visit logging
│   ├── lib/
│   │   ├── supabase.js      # Supabase client
│   │   └── geo.js           # GPS, distance, route optimizer
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── CustomersPage.jsx
│   │   ├── CustomerDetailPage.jsx
│   │   ├── AddEditCustomerPage.jsx
│   │   ├── MapPage.jsx
│   │   ├── RoutePlannerPage.jsx
│   │   └── VisitLogPage.jsx
│   ├── styles/
│   │   └── global.css
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── package.json
├── supabase-schema.sql      # Run this in Supabase SQL Editor
└── .env.example             # Copy to .env and fill in keys
```

---

## Suggested Future Improvements

1. **Offline support** — use IndexedDB to cache customers locally and sync when back online
2. **Push notifications** — remind you of visits due today using Web Push API
3. **Export to CSV/Excel** — download customer list and visit reports
4. **Voice notes** — record audio notes after a visit using MediaRecorder API
5. **Geofencing** — auto-trigger check-in when you arrive near a customer
6. **Team support** — share customers with a team, assign territories
7. **Arabic RTL** — add `dir="rtl"` and RTL CSS for Arabic support
8. **WhatsApp integration** — one-tap to open WhatsApp chat with customer
9. **Photo attachments** — attach store photos to customer profiles
10. **Dashboard analytics** — charts for revenue trends, visit frequency, top products

---

## Troubleshooting

**GPS not working on iPhone:**
- Must be served over HTTPS
- Safari → Settings → Allow Location Access
- iOS Settings → Privacy → Location Services → Safari → Allow

**Map not showing:**
- Check `VITE_GOOGLE_MAPS_API_KEY` is set in `.env`
- Ensure Maps JavaScript API is enabled in Google Console
- Check browser console for API errors

**Login not working:**
- Verify Supabase URL and anon key are correct
- Check Supabase Auth settings — email confirmation may need to be disabled for testing

**App not installing as PWA on iPhone:**
- Must use Safari (not Chrome) to add to home screen
- Site must be served over HTTPS
