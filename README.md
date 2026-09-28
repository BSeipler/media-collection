# Yard Sale Stack

Phone-first VHS/DVD collection catalog + asking-price estimates from eBay Browse.

**Expected cost: $0/month** (Vercel Hobby + Turso Free + free TMDB/eBay APIs).

## Features

- Scan barcodes on your phone (ZXing; works on iOS)
- Cover-photo OCR fallback for worn VHS
- TMDB posters + title matching
- eBay Browse **asking-price** estimates (median / p25–p75), cached ~24h
- Sold-search deep links + manual override for confirmed sold prices
- Collection totals vs your lot cost (default **$41**)

## Setup

### 1. Env vars

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where |
|---|---|
| `TURSO_DATABASE_URL` | Already set for the `media-collection` Turso DB |
| `TURSO_AUTH_TOKEN` | `turso auth login` then `turso db tokens create media-collection` |
| `APP_PASSWORD` | Any shared password |
| `TMDB_API_KEY` | [TMDB API settings](https://www.themoviedb.org/settings/api) |
| `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` | [eBay Developers](https://developer.ebay.com/) — create a keyset, use client credentials |

UPCitemdb free trial (100/day) needs no key. Prefer eBay GTIN first.

### 2. Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000 — camera needs HTTPS, so for phone scanning use the Vercel deploy URL.

### 3. Deploy (Vercel Hobby)

```bash
npx vercel login
npx vercel
```

Add the same env vars in the Vercel project settings (Settings → Environment Variables). Deploy provides HTTPS so iPhone camera works.

A claimable preview was also published during setup — claim it to your Hobby account if you want to keep it:

https://vercel.com/claim-deployment?code=dde48382-bf5c-4c81-a6c6-3545d78fb9ac

Then set env vars on that project and redeploy.

## Valuation honesty

eBay’s sold-listings API is closed to new developers. Estimates are **current asking prices**, labeled as such — not guaranteed sold prices. Use “Open eBay sold search” + override when you care.

## Cost traps avoided

- No UPCitemdb paid ($99/mo)
- No Vercel Image Optimization (posters load from TMDB CDN)
- Stale refresh capped at 10 titles per run
- Turso Free (blocks on quota; do not enable paid overages)

## Stack

Next.js App Router · Tailwind · Turso Cloud (libSQL) · `@tursodatabase/serverless` · ZXing · Tesseract.js · jose
