<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This is the single runnable service: a Next.js 16 full-stack app in `web/` (UI + `/api/*` routes). Standard commands live in `web/package.json` and `README.md`.

- Database: a local PostgreSQL 16 cluster is available on `127.0.0.1:5432` (user/pass `postgres`/`postgres`, DB `eventsphere`). The update script does NOT start it — start it yourself with `sudo pg_ctlcluster 16 main start` if `psql -h 127.0.0.1 -U postgres -l` fails. `web/.env` is gitignored and already points `DATABASE_URL` at this local DB.
- Migrations are NOT run by the update script or by `npm run dev`. After schema/migration changes (or on a fresh DB) run `npm run db:deploy` (`prisma migrate deploy`) from `web/`. Note `npm run build` also runs `prisma migrate deploy`.
- Storage defaults to local disk (`web/.data/uploads`, gitignored) when no `AWS_S3_BUCKET` is set — no S3 needed for dev. `web/.env` sets `STORAGE_DRIVER="local"` explicitly.
- Auth is demo-mode: email OTP is NOT emailed. The 4-digit code is returned as `demoCode` in the register/resend-otp API responses and logged server-side — use it to verify accounts. Guests join events with just a display name (no account).
- Creating an event via `POST /api/events` defaults to `billingMode:"subscription"` (needs Pro). For a no-payment event pass `billingMode:"free"` with a `hostName`, or use the "Free" plan in the create-event UI.
- Run the dev server with `npm run dev` from `web/` (Turbopack, port 3000). Lint: `npm run lint` (the repo currently has pre-existing lint errors unrelated to setup). Inspect data with `npm run db:studio` (port 5555).
