import "dotenv/config";

import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Missing DATABASE_URL env var");
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { PrismaClient } = require("@prisma/client") as { PrismaClient: new (args: any) => any };

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in env");
  }

  const passwordHash = await hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "SUPER_ADMIN",
      passwordHash,
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  const tickets = [
    { code: "ALUMNI", name: "Per Alumni", price: 500, attendeeType: "ADULT" as const, hasTshirt: true },
    { code: "GUEST", name: "Spouse/Guest/Parents", price: 500, attendeeType: "ADULT" as const, hasTshirt: true },
    { code: "KID_05_12", name: "Kids (05 years- 12 years)", price: 300, attendeeType: "CHILD" as const, hasTshirt: false },
    { code: "KID_00_05", name: "Kids (0-05 years)", price: 0, attendeeType: "INFANT" as const, hasTshirt: false },
  ];

  for (const t of tickets) {
    await prisma.ticket.upsert({
      where: { code: t.code },
      update: { name: t.name, price: t.price, attendeeType: t.attendeeType, hasTshirt: t.hasTshirt, isActive: true },
      create: { ...t, isActive: true },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

