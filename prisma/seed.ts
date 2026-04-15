import { PrismaClient } from "@prisma/client";
import "dotenv/config";

import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Missing DATABASE_URL env var");
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
    { code: "ADULT", name: "Adult", price: 1000 },
    { code: "CHILD", name: "Child", price: 500 },
    { code: "INFANT", name: "Infant", price: 0 },
  ];

  for (const t of tickets) {
    await prisma.ticket.upsert({
      where: { code: t.code },
      update: { name: t.name, price: t.price, isActive: true },
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

