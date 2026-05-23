import { prisma } from "../app/lib/prisma";
import { generateUniqueCheckInCode } from "../app/lib/check-in-code";

async function main() {
  const missing = await prisma.attendee.findMany({
    where: { checkInCode: null },
    select: { id: true },
  });

  for (const row of missing) {
    const code = await generateUniqueCheckInCode(async (c) => {
      const hit = await prisma.attendee.findUnique({ where: { checkInCode: c }, select: { id: true } });
      return !!hit;
    });
    await prisma.attendee.update({ where: { id: row.id }, data: { checkInCode: code } });
  }

  console.log(`Backfilled checkInCode for ${missing.length} attendee(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
