# EventSphere

**One digital home for every event.**

Web MVP: create a Friends gallery, share a QR/link, upload photos/videos to **Amazon S3**, browse a shared gallery with likes and downloads. Galleries expire after 48 hours.

## Quick start

```bash
cd web
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Storage

By default, if `AWS_S3_BUCKET` is not configured, the app uses **local disk** (`.data/uploads`) so you can develop offline.

For AWS S3, set in `web/.env`:

```env
STORAGE_DRIVER=s3
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-eventsphere-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Recommended S3 bucket settings for MVP:

- Block all public access: **ON**
- Use presigned URLs only (already implemented)
- CORS allow `PUT`/`GET` from your app origin

Example CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

IAM user needs at least: `s3:PutObject`, `s3:GetObject`, `s3:HeadObject`, `s3:DeleteObject` on the bucket.

## Current web MVP scope

| Included | Not yet |
|---|---|
| Friends + Celebrations event types | Face matching / Photos of you |
| Join via link + optional passcode | Live photo wall / kiosk |
| QR share panel | Professional certs / face search |
| Multi-file upload → S3 (+ camera capture) | Native mobile apps |
| Captions, likes, comments, reports | Highlight reels |
| Gallery filters + sort + live refresh | OAuth (Apple/Google) |
| Members list + remove guest | AI albums (people/places/moments) |
| RSVP (Celebrations) | |
| Organizer settings (extend, theme, end) | |

## Project layout

```
docs/EventSphere-PRD.pdf   Full product requirements
web/                       Next.js MVP app
```

## Scripts

```bash
cd web
npm run dev          # local server
npx prisma db push   # sync schema
npx prisma studio    # inspect data
```

## PRD

See [docs/EventSphere-PRD.pdf](./docs/EventSphere-PRD.pdf).
