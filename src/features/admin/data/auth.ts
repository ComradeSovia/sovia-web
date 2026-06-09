import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "sovia-admin";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getAdminPassword() {
  return process.env.SOVIA_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "";
}

function createToken(password: string) {
  return createHmac("sha256", password)
    .update("sovia-admin-session")
    .digest("hex");
}

function isSameToken(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function hasAdminPassword() {
  return Boolean(getAdminPassword());
}

export async function isAdminAuthenticated() {
  const password = getAdminPassword();
  if (!password) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  return isSameToken(token, createToken(password));
}

export async function createAdminSession(password: string) {
  const adminPassword = getAdminPassword();

  if (!adminPassword || !isSameToken(password, adminPassword)) {
    throw new Error("Invalid admin password.");
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createToken(adminPassword), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAdminSession() {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Admin session required.");
  }
}
