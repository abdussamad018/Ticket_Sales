import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "ae_session";

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET env var");
  return new TextEncoder().encode(secret);
}

async function readSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const role = payload.role;
    if (role !== "SUPER_ADMIN" && role !== "BATCH_REP") return null;
    return {
      role,
    };
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // public routes
  if (pathname === "/" || pathname.startsWith("/login")) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }
  // Allow public assets (from /public) without auth.
  // Otherwise, requests like /kmlhsaa_logo.jpg get redirected to /login and Next/Image receives null.
  if (
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.json" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const session = await readSession(req);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && session.role !== "SUPER_ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};
