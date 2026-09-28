import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

const COOKIE = "mc_session";

export type SessionRole = "owner" | "guest";

function secretKey() {
  const password = process.env.APP_PASSWORD ?? "changeme";
  return new TextEncoder().encode(password.padEnd(32, "0").slice(0, 32));
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export function roleFromPayload(payload: JWTPayload): SessionRole {
  return payload.role === "guest" ? "guest" : "owner";
}

export async function createSessionToken(
  role: SessionRole = "owner",
): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

export async function getSessionRole(): Promise<SessionRole | null> {
  if (!process.env.APP_PASSWORD) return "owner";
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return roleFromPayload(payload);
  } catch {
    return null;
  }
}

export async function checkPassword(password: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return true;
  return password === expected;
}

export async function hasValidSession(): Promise<boolean> {
  if (!process.env.APP_PASSWORD) return true;
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export { COOKIE as SESSION_COOKIE };
