# GIKI Bazaar

A student marketplace PWA for GIKI — buy and sell books, electronics, notes, clothing and more.

## Project Structure

```
giki-bazaar/
├── backend/          ← FastAPI + SQLite
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── uploads/      ← auto-created, stores listing images
└── frontend/         ← React + Vite + Tailwind PWA
    ├── public/
    │   ├── manifest.json
    │   ├── sw.js
    │   └── icons/
    └── src/
        ├── pages/
        ├── components/
        └── context/
```

## Setup

### Backend

```bash
cd backend

# Create virtualenv
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server (port 8000)
uvicorn main:app --reload --port 8000
```

The database `bazaar.db` is created automatically on first run.
The `uploads/` folder is created automatically on startup.

### Frontend

```bash
cd frontend
npm install
npm run dev        # runs on http://localhost:5173
```

## Admin Account

| Field    | Value               |
|----------|---------------------|
| Email    | admin@giki.edu.pk   |
| Password | admin123            |

## Registration

Only `@giki.edu.pk` email addresses can register. Attempts with other domains
are rejected with: "Only GIKI students can register. Use your GIKI email."

## How to Install as PWA on Your Phone

1. Open `http://<your-local-ip>:5173` in Chrome (Android) or Safari (iPhone).
2. **Android (Chrome):** Tap the three-dot menu → "Add to Home screen".
3. **iPhone (Safari):** Tap the Share button → "Add to Home Screen".

> For the PWA to be installable over a network, Vite's dev server needs to be
> accessible. Start it with `npm run dev -- --host` to expose it on your LAN,
> then use your machine's local IP address on the phone.

## API Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | — | Register (GIKI email only) |
| POST | /auth/login | — | Login |
| POST | /auth/logout | token | Logout |
| GET | /listings | — | Browse approved listings |
| GET | /listings/{id} | — | Listing detail |
| POST | /listings | token | Create listing (image upload) |
| DELETE | /listings/{id} | token | Delete (owner or admin) |
| PUT | /listings/{id}/sold | token | Mark as sold |
| POST | /listings/{id}/report | token | Report listing |
| GET | /my-listings | token | Current user's own listings |
| GET | /messages | token | Conversation list |
| GET | /messages/{listing_id} | token | Message thread |
| POST | /messages | token | Send message |
| GET | /admin/stats | admin | Counts |
| GET | /admin/listings | admin | All listings |
| PUT | /admin/listings/{id}/status | admin | Approve/reject/delete |
| GET | /admin/users | admin | All users |
| PUT | /admin/users/{id}/ban | admin | Toggle ban |
| GET | /admin/reports | admin | All reports |
