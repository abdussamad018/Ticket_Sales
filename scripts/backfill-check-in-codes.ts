import { backfillCheckInCodes } from "../app/lib/backfill-check-in-codes";
import { prisma } from "../app/lib/prisma";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL — skip backfill.");
    process.exit(1);
  }

  const { updated } = await backfillCheckInCodes();
  console.log(
    updated === 0
      ? "Check-in codes: all attendees already have codes."
      : `Check-in codes: backfilled ${updated} attendee(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
