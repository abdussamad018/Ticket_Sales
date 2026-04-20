import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";

function isYearBatchCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

/** No auth — anyone with the URL can run this. Remove or lock down after seeding. */
export async function GET() {
  try {
    const batches = await prisma.batch.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });

    const currentYear = new Date().getFullYear();
    const results: Array<{ email: string; name: string | null }> = [];

    for (const batch of batches) {
      if (!isYearBatchCode(batch.code)) continue;

      const year = Number.parseInt(batch.code, 10);
      if (year >= currentYear) continue;

      const plainPassword = (year + 100000).toString().slice(-6);
      const passwordHash = await hash(plainPassword, 12);
      const email = `${batch.code}@kmlhsaa.com`;

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name: `SSC-${batch.code}`,
          role: "BATCH_REP",
          passwordHash,
          isActive: true,
          batchId: batch.id,
        },
        create: {
          name: `SSC-${batch.code}`,
          email,
          passwordHash,
          role: "BATCH_REP",
          isActive: true,
          batchId: batch.id,
        },
      });

      results.push({ email, name: user.name });
    }

    return NextResponse.json({
      ok: true,
      count: results.length,
      users: results,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
