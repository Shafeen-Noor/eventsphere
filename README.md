# EventSphere

**One digital home for every event.**

Web MVP: create events, share a QR/link, RSVP, upload photos to **Amazon S3**, browse a shared gallery. Hosts use email/password accounts; guests join with a name.

## Quick start (local)

1. Create a free Postgres database at [Neon](https://neon.tech) (or Supabase / local Postgres).
2. Copy the **pooled** connection string.

```bash
cd web
cp .env.example .env
# Edit .env — set DATABASE_URL to your Postgres URL
npm install
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
AWS_REGION="ap-southeast-2"
AWS_S3_BUCKET="your-eventsphere-bucket"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

If `AWS_S3_BUCKET` is not set, uploads fall back to local disk (`.data/uploads`).

## Deploy on Vercel

1. Import the GitHub repo in Vercel.
2. Set:
   - **Framework Preset:** Next.js  
   - **Root Directory:** `web`
3. Add environment variables (Production + Preview):
   - `DATABASE_URL` — Neon/Supabase **pooled** Postgres URL  
   - `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`  
   - `NEXT_PUBLIC_APP_URL` — your Vercel URL (e.g. `https://eventsphere.vercel.app`)
4. Deploy. The build runs `prisma migrate deploy` then `next build`.
5. Add your Vercel domain to the S3 bucket CORS `AllowedOrigins`.

## Project layout

```
docs/EventSphere-PRD.pdf   Full product requirements
web/                       Next.js MVP app
```

## Scripts

```bash
cd web
npm run dev            # local server
npm run db:deploy      # apply migrations
npm run db:migrate     # create a new migration (dev)
npx prisma studio      # inspect data
```

## PRD

See [docs/EventSphere-PRD.pdf](./docs/EventSphere-PRD.pdf).
