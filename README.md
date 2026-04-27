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

The included `netlify.toml` already sets these values.

## Paste Snapshots

Go to the Snapshots tab and paste tab-separated rows into Snapshot 1 and Snapshot 2.

```text
1	18:57	1	unveil	369700
1	18:57	2	glory	344200
1	18:57	5	Phantom Troupe	302100
```

Points can be plain numbers or shorthand like `213.1K`. Snapshot 1 is the older leaderboard. Snapshot 2 is the newer leaderboard. If only Snapshot 1 exists, gain values show `—`.

## Member Tracker

Go to the Members tab, paste one Roblox username per line, then use the queue controls to copy usernames, move through the queue, mark members checked, or skip them. Contribution status is based on the Settings daily requirement:

- Active: contribution is at least the requirement
- Low: contribution is above 0 but below the requirement
- Inactive: contribution is 0

All data is stored in browser `localStorage` for v1. Use Settings to export or import JSON backups.
