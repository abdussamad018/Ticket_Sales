import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";

import { prisma } from "@/app/lib/prisma";

export type Session = {
  userId: string;
  role: "SUPER_ADMIN" | "BATCH_REP";
  batchId: string | null;
};

const COOKIE_NAME = "ae_session";

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET env var");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string) {
  const saltRounds = 12;
  return bcrypt.hash(plain, saltRounds);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSessionCookie(session: Session) {
  const secret = getAuthSecret();
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const secret = getAuthSecret();
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.userId !== "string" ||
      (payload.role !== "SUPER_ADMIN" && payload.role !== "BATCH_REP")
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      role: payload.role,
      batchId: typeof payload.batchId === "string" ? payload.batchId : null,
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");
  return session;
}

export async function signIn(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;

  await createSessionCookie({
    userId: user.id,
    role: user.role,
    batchId: user.batchId ?? null,
  });

  return { id: user.id, role: user.role };
}

