## Alumni Event — Participant Entry & Reporting

Tech stack: **Next.js (App Router)**, **Prisma**, **PostgreSQL**, **Tailwind**.

### Roles

- **Super Admin**
  - Participant data entry for **all** batches
  - Create/manage **batches**, **tickets**, and **batch representatives** (multiple reps per batch)
  - Reports: batch-wise participant count, batch-wise T-shirt size, overall T-shirt size
- **Batch Representative**
  - Participant data entry for **own** batch only
  - Reports limited to **own** batch

### Setup

1) Create `.env` from `.env.example` and set:

- `DATABASE_URL`
- `AUTH_SECRET`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`

2) Install dependencies:

```bash
npm install
```

3) Create DB tables:

```bash
npx prisma migrate dev
```

4) Seed initial data (creates Super Admin user + default ticket types: Adult/Child/Infant):

```bash
npm run prisma:seed
```

5) Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

### Main URLs

- `/login`
- `/dashboard`
- `/participants/new`
- `/reports`
- `/admin` (Super Admin only)
