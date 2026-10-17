import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { jsonError } from "./http";

export const COOKIE_NAME = "ob_admin";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

function sessionSecret() {
  const pin = process.env.ADMIN_PIN?.trim();
  if (!pin) {
    throw new Error("Falta ADMIN_PIN en .env.local");
  }
  return createHash("sha256").update(pin).digest();
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("hex");
}

export function pinMatches(input: string): boolean {
  const expected = process.env.ADMIN_PIN?.trim() ?? "";
  const a = Buffer.from(input);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export function createSessionValue(nowMs = Date.now()): string {
  const expiresAt = Math.floor(nowMs / 1000) + COOKIE_MAX_AGE_SECONDS;
  const payload = `admin.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionValue(
  value: string | undefined | null,
  nowMs = Date.now(),
): boolean {
  if (!value) {
    return false;
  }

  const parts = value.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [subject, expiresRaw, signature] = parts;
  if (subject !== "admin") {
    return false;
  }

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  if (expiresAt * 1000 <= nowMs) {
    return false;
  }

  const expected = sign(`${subject}.${expiresRaw}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

export async function setAdminCookie(value: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, value, cookieOptions());
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function readAdminCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value;
}

export async function requireAdmin() {
  const value = await readAdminCookie();
  if (!verifySessionValue(value)) {
    return jsonError("UNAUTHORIZED", 401);
  }
  return null;
}
