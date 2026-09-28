import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

export const runtime = "nodejs";

const COOKIE = "mc_session";
const PUBLIC = ["/login", "/api/login", "/api/logout"];

function secretKey() {
  const password = process.env.APP_PASSWORD ?? "changeme";
  return new TextEncoder().encode(password.padEnd(32, "0").slice(0, 32));
}

function roleFromPayload(payload: JWTPayload): "owner" | "guest" {
  return payload.role === "guest" ? "guest" : "owner";
}

function guestMayRead(pathname: string, method: string): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  if (pathname === "/" || pathname.startsWith("/items/")) return true;
  if (pathname === "/api/items") return true;
  if (/^\/api\/items\/\d+$/.test(pathname)) return true;
  if (/^\/api\/items\/\d+\/poster$/.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!process.env.APP_PASSWORD) {
    return NextResponse.next();
  }

  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webp)$/)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secretKey());
      const role = roleFromPayload(payload);
      if (role === "owner") return NextResponse.next();

      if (guestMayRead(pathname, request.method)) {
        return NextResponse.next();
      }

      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Guests can only browse" }, { status: 403 });
      }

      return NextResponse.redirect(new URL("/", request.url));
    } catch {
      // fall through to login
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
