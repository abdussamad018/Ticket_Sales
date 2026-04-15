import { NextResponse } from "next/server";

import { clearSessionCookie, getSession } from "@/app/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", req.url));
}

