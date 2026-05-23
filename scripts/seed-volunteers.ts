/**
 * Production-safe volunteer accounts only.
 *
 * - Touches ONLY User rows with emails volunteer1@… through volunteer20@kmlhsaa.com
 * - Never deletes or updates participants, attendees, batches, tickets, etc.
 * - Skips emails already used by a non-volunteer (batch rep / admin) — does not overwrite
 * - Does not reset passwords on existing volunteers unless --reset-passwords
 *
 * Usage:
 *   npm run seed:volunteers -- --dry-run
 *   SEED_VOLUNTEERS_CONFIRM=yes npm run seed:volunteers
 *   SEED_VOLUNTEERS_CONFIRM=yes npm run seed:volunteers -- --reset-passwords
 */
import "dotenv/config";

import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

const VOLUNTEER_COUNT = 20;
const EMAIL_DOMAIN = "kmlhsaa.com";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const resetPasswords = args.includes("--reset-passwords");

function volunteerAccounts() {
  const list: { n: number; email: string; password: string; name: string }[] = [];
  for (let n = 1; n <= VOLUNTEER_COUNT; n++) {
    list.push({
      n,
      email: `volunteer${n}@${EMAIL_DOMAIN}`,
      password: `volunteer${n}`,
      name: `Volunteer ${n}`,
    });
  }
  return list;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Missing DATABASE_URL.");
    process.exit(1);
  }

  if (!dryRun && process.env.SEED_VOLUNTEERS_CONFIRM !== "yes") {
    console.error(
      [
        "Refusing to write to the database without confirmation.",
        "This script only adds/updates volunteer users — it does not touch registrations.",
        "",
        "Preview:  npm run seed:volunteers -- --dry-run",
        "Apply:    SEED_VOLUNTEERS_CONFIRM=yes npm run seed:volunteers",
      ].join("\n"),
    );
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const { PrismaClient } = require("@prisma/client") as { PrismaClient: new (args: any) => any };
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });

  const accounts = volunteerAccounts();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  console.log(dryRun ? "[DRY RUN] No changes will be written.\n" : "Seeding volunteer accounts…\n");

  try {
    for (const { n, email, password, name } of accounts) {
      const existing = await prisma.user.findUnique({ where: { email } });

      if (existing && existing.role !== "VOLUNTEER") {
        console.warn(
          `SKIP ${email}: email already used (role=${existing.role}). Not modified.`,
        );
        skipped++;
        continue;
      }

      if (existing && !resetPasswords) {
        if (!existing.isActive) {
          if (dryRun) {
            console.log(`WOULD activate ${email}`);
          } else {
            await prisma.user.update({
              where: { email },
              data: { isActive: true, batchId: null },
            });
            console.log(`Activated ${email}`);
          }
          updated++;
        } else {
          console.log(`OK   ${email} (volunteer already exists, password unchanged)`);
          skipped++;
        }
        continue;
      }

      const passwordHash = await hash(password, 12);
      const data = {
        name,
        role: "VOLUNTEER" as const,
        passwordHash,
        isActive: true,
        batchId: null,
      };

      if (dryRun) {
        console.log(
          existing
            ? `WOULD update ${email} (password${resetPasswords ? " reset" : ""})`
            : `WOULD create ${email} / ${password}`,
        );
        if (existing) updated++;
        else created++;
        continue;
      }

      if (existing) {
        await prisma.user.update({ where: { email }, data });
        console.log(`Updated ${email}${resetPasswords ? " (password reset)" : ""}`);
        updated++;
      } else {
        await prisma.user.create({ data: { email, ...data } });
        console.log(`Created ${email} / ${password}`);
        created++;
      }
    }

    console.log("\n---");
    console.log(
      dryRun
        ? `Dry run: would create ${created}, update ${updated}, skip ${skipped}.`
        : `Done: created ${created}, updated ${updated}, skipped ${skipped}.`,
    );
    if (skipped > 0) {
      console.log("Review SKIP lines above before reusing those emails for volunteers.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
