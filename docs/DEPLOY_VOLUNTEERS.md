# Deploy volunteers (production-safe)

This change adds a **VOLUNTEER** role and gate QR check-in. It does **not** modify participants, attendees, tickets, or batch data when you follow these steps.

**Never run** `npm run prisma:seed` on production — that script touches admin, batches, batch reps, and tickets.

---

## Step 1 — Deploy application code

Push to Git / deploy on Vercel as usual. The build runs:

- `prisma migrate deploy` (schema only)
- check-in code backfill (attendees without codes only)
- `next build`

Volunteer users are **not** created during build.

---

## Step 2 — Database migration (VOLUNTEER role)

`prisma migrate deploy` on Vercel should apply:

`prisma/migrations/20260522140000_volunteer_role/migration.sql`

```sql
ALTER TYPE "Role" ADD VALUE 'VOLUNTEER';
```

This only extends the enum. It does not change existing rows.

**Verify** (optional, in DB console):

```sql
SELECT unnest(enum_range(NULL::"Role"));
```

You should see `VOLUNTEER` in the list.

If migrate did not run, run that single SQL line manually once.

---

## Step 3 — Create volunteer accounts (choose one)

### Option A — Recommended: isolated seed script (from your PC)

1. Copy **Production** `DATABASE_URL` from Vercel → Environment Variables (do not commit it).
2. In project root, set it only for this command (PowerShell example):

```powershell
$env:DATABASE_URL = "postgresql://..."
npm run seed:volunteers -- --dry-run
```

3. Review output (no writes in dry-run).
4. Apply:

```powershell
$env:SEED_VOLUNTEERS_CONFIRM = "yes"
npm run seed:volunteers
```

**Accounts created** (only if email is free):

| Email | Password |
|-------|----------|
| volunteer1@kmlhsaa.com | volunteer1 |
| … | … |
| volunteer20@kmlhsaa.com | volunteer20 |

**Safety rules:**

- Only `User` rows for those 20 emails.
- If an email is already a batch rep or admin → **skipped**, not overwritten.
- Existing volunteers → password **unchanged** unless you pass `--reset-passwords`.

Reset passwords only when intended:

```powershell
$env:SEED_VOLUNTEERS_CONFIRM = "yes"
npm run seed:volunteers -- --reset-passwords
```

### Option B — Super admin UI (no CLI)

1. Log in as super admin.
2. **Admin → Volunteers**.
3. Add accounts one by one (same emails/passwords as needed).

---

## Step 4 — Smoke test

1. Log in as `volunteer1@kmlhsaa.com` / `volunteer1`.
2. You should land on **Gate check-in** with QR scanner only.
3. Opening `/dashboard` or `/participants` should redirect back to `/attendance`.
4. Scan a valid attendee QR → **green** success alert.
5. Scan the same QR again → **red** already checked in.

---

## What is NOT affected

| Data | Touched by volunteer deploy? |
|------|------------------------------|
| Participants / attendees | No |
| Batches / tickets | No (unless you run full `prisma:seed`) |
| Check-in records | No (until volunteers scan) |
| Batch rep / admin users | No (seed skips conflicting emails) |

---

## Rollback (if needed)

- Deactivate volunteers: **Admin → Volunteers** → Deactivate, or set `isActive = false` in DB for those users.
- Removing `VOLUNTEER` from PostgreSQL enum after use is difficult; deactivating accounts is enough for access control.
