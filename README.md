# EventSphere

**One QR Code. Every Memory.**

Every event gets its own interactive website — photos, guestbook, votes, feed, slideshow, and more. Guests scan a QR code; hosts run a live dashboard.

## Pitch & investor materials (GitHub Pages)

**https://shafeen-noor.github.io/eventsphere/**

| Material | Link |
|----------|------|
| Hub | [index](https://shafeen-noor.github.io/eventsphere/) |
| MVP | [mvp.html](https://shafeen-noor.github.io/eventsphere/mvp.html) |
| CAC | [cac.html](https://shafeen-noor.github.io/eventsphere/cac.html) |
| LTV | [ltv.html](https://shafeen-noor.github.io/eventsphere/ltv.html) |
| Pitch deck (web) | [pitch-deck.html](https://shafeen-noor.github.io/eventsphere/pitch-deck.html) |
| Pitch deck (PDF) | [EventSphere-Timeless-Moments-Platform.pdf](https://shafeen-noor.github.io/eventsphere/EventSphere-Timeless-Moments-Platform.pdf) |

Source files live in [`/docs`](/docs).

## Quick start (local)

1. Create a free Postgres database at [Neon](https://neon.tech) (or Supabase / local Postgres).
2. Copy the **pooled** connection string.

```bash
cd web
cp .env.example .env
# Edit .env — set DATABASE_URL to your Postgres URL
npm install
npx prisma migrate deploy
npm run db:seed-demo   # optional: /e/demo
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Core flow

1. **Create** an event (no signup) — type, name, date  
2. **Share** the QR / link from the host dashboard  
3. **Guests** join by name and use the event hub  
4. **Upgrade** to Essential ($9) or Premium ($29) when you hit Free limits  

### Plans

| | Free | Essential | Premium | Enterprise |
|---|---|---|---|---|
| Price | $0 | $9/event | $29/event | from $199/mo |
| Guests | 5 | 50 | 200+ | unlimited |
| Uploads | 40 | 500 | unlimited | unlimited |
| Retention | 24h | 7 days | 30 days | custom |

### Environment

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
AWS_REGION="ap-southeast-2"
AWS_S3_BUCKET="your-eventsphere-bucket"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
# Optional AI captions / recap
# OPENAI_API_KEY="..."
```

If `AWS_S3_BUCKET` is not set, uploads fall back to local disk (`.data/uploads`).

## Deploy on Vercel

1. Import the GitHub repo in Vercel.
2. Set **Root Directory:** `web`
3. Add `DATABASE_URL`, AWS vars, and `NEXT_PUBLIC_APP_URL`
4. Deploy. Build runs `prisma migrate deploy` then `next build`.
