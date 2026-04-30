# Phantom Troupe Guild Tracker

A Netlify-ready manual dashboard for tracking a Roblox Sailor Piece guild. This app is intentionally local and manual only: no Roblox API, no scraping, no clicking automation, no keyboard automation, no botting, and no game control.

## Run Locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in your terminal.

## Build

```bash
npm run build
```

The production output is created in `dist`.

## Deploy To Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Live dashboard: https://phantomtroupesdb.netlify.app

The included `netlify.toml` already sets these values.

## Supabase Env Setup

Supabase powers live shared data when `VITE_DATA_BACKEND=supabase`. Leave the Supabase values blank to run with local browser test data.

Create `.env.local` from `.env.example` when you are ready to test configuration detection:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DATA_BACKEND=supabase
VITE_AUTH_REDIRECT_URL=
```

If the Supabase URL or anon key is missing or blank, the client exports `supabase = null` and the app continues to run with local test data.
Leave `VITE_AUTH_REDIRECT_URL` blank for local development. In production it should point to the live dashboard URL.

## Paste Snapshots

Go to the Snapshots tab and paste tab-separated rows into Snapshot 1 and Snapshot 2.

Required columns:

```text
Snapshot	Timestamp	Rank	Guild	Points
```

Points can be plain numbers or shorthand like `213.1K`. Snapshot 1 is the older leaderboard. Snapshot 2 is the newer leaderboard. If only Snapshot 1 exists, gain values stay blank until a newer snapshot is saved.

## Member Tracker

Go to the Members tab, paste one Roblox username per line, then use the queue controls to copy usernames, move through the queue, mark members checked, or skip them. Contribution status is based on the Settings daily requirement:

- Active: contribution is at least the requirement
- Low: contribution is above 0 but below the requirement
- Inactive: contribution is 0

## Member Import

The Members tab can import macro output whenever you run a check. Checks do not need to happen on a fixed schedule; the app uses each row timestamp to calculate elapsed time and gain per hour.

Required columns:

```text
Timestamp	Roblox	Contribution
```

Optional columns:

```text
Discord	Playtime	Notes
```

Recommended timestamp format:

```text
YYYY-MM-DD HH:mm
```

Paste TSV/CSV text into Member Import or upload a `.csv` / `.tsv` file. The app previews valid rows, skipped rows, and duplicate member/timestamp rows before saving.

In local test mode, data is stored in browser `localStorage`. In live mode, officers can save shared data to Supabase. Use Settings to export or import JSON backups.
