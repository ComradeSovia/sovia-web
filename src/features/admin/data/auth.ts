import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE_NAME = "sovia-admin";
export const ADMIN_GOOGLE_STATE_COOKIE_NAME = "sovia-admin-google-state";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

type EnabledAdminAuthMode = "password" | "google";

export type AdminAuthMode = EnabledAdminAuthMode | "disabled";

export type AdminAuthStatus =
  | { enabled: true; mode: "password" }
  | { email?: string; enabled: true; mode: "google"; subject?: string }
  | { enabled: false; message: string; missing: string[]; mode: "disabled" };

type GoogleAdminConfig =
  | {
      clientId: string;
      clientSecret: string;
      email?: string;
      ok: true;
      sessionSecret: string;
      subject?: string;
    }
  | { missing: string[]; ok: false };

export type GoogleAdminIdentity = {
  email: string;
  subject?: string;
};

type AdminSessionPayload = {
  email?: string;
  issuedAt: number;
  mode: EnabledAdminAuthMode;
  subject?: string;
};

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getAdminPassword() {
  return getOptionalEnv("SOVIA_ADMIN_PASSWORD");
}

export function getGoogleAdminConfig(): GoogleAdminConfig {
  const clientId = getOptionalEnv("SOVIA_ADMIN_GOOGLE_CLIENT_ID");
  const clientSecret = getOptionalEnv("SOVIA_ADMIN_GOOGLE_CLIENT_SECRET");
  const email = getOptionalEnv("SOVIA_ADMIN_GOOGLE_EMAIL")?.toLowerCase();
  const sessionSecret = getOptionalEnv("SOVIA_ADMIN_SESSION_SECRET");
  const subject = getOptionalEnv("SOVIA_ADMIN_GOOGLE_SUB");
  const missing: string[] = [];

  if (!clientId) missing.push("SOVIA_ADMIN_GOOGLE_CLIENT_ID");
  if (!clientSecret) missing.push("SOVIA_ADMIN_GOOGLE_CLIENT_SECRET");
  if (!email && !subject) {
    missing.push("SOVIA_ADMIN_GOOGLE_EMAIL or SOVIA_ADMIN_GOOGLE_SUB");
  }
  if (!sessionSecret) missing.push("SOVIA_ADMIN_SESSION_SECRET");

  if (!clientId || !clientSecret || (!email && !subject) || !sessionSecret) {
    return { missing, ok: false };
  }

  return {
    clientId,
    clientSecret,
    email,
    ok: true,
    sessionSecret,
    subject,
  };
}

export function getAdminAuthStatus(): AdminAuthStatus {
  if (getAdminPassword()) {
    return { enabled: true, mode: "password" };
  }

  const googleConfig = getGoogleAdminConfig();
  if (googleConfig.ok) {
    return {
      email: googleConfig.email,
      enabled: true,
      mode: "google",
      subject: googleConfig.subject,
    };
  }

  return {
    enabled: false,
    message:
      "Set SOVIA_ADMIN_PASSWORD, or leave it empty and complete the Google admin OAuth variables.",
    missing: googleConfig.missing,
    mode: "disabled",
  };
}

function createSignature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function isSameValue(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getSessionSecret(mode: EnabledAdminAuthMode) {
  if (mode === "password") {
    return getAdminPassword();
  }

  const googleConfig = getGoogleAdminConfig();
  return googleConfig.ok ? googleConfig.sessionSecret : undefined;
}

function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function createSessionCookieValue(
  payload: AdminSessionPayload,
  secret: string,
) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = createSignature(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

function isAdminSessionPayload(value: unknown): value is AdminSessionPayload {
  if (!value || typeof value !== "object") return false;

  const payload = value as Record<string, unknown>;
  const validMode = payload.mode === "password" || payload.mode === "google";

  return (
    validMode &&
    typeof payload.issuedAt === "number" &&
    (payload.email === undefined || typeof payload.email === "string") &&
    (payload.subject === undefined || typeof payload.subject === "string")
  );
}

function readSessionCookieValue(value: string, secret: string) {
  const [encodedPayload, signature, extra] = value.split(".");
  if (!encodedPayload || !signature || extra !== undefined) return undefined;

  const expectedSignature = createSignature(encodedPayload, secret);
  if (!isSameValue(signature, expectedSignature)) return undefined;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as unknown;

    if (!isAdminSessionPayload(payload)) return undefined;
    if (getCurrentTimestamp() - payload.issuedAt > SESSION_MAX_AGE_SECONDS) {
      return undefined;
    }

    return payload;
  } catch {
    return undefined;
  }
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function getGoogleOAuthStateCookieOptions() {
  return {
    httpOnly: true,
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function createGoogleOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function isMatchingGoogleOAuthState(
  state: string | undefined,
  cookieState: string | undefined,
) {
  if (!state || !cookieState) return false;
  return isSameValue(state, cookieState);
}

function isGoogleIdentityAllowed(identity: GoogleAdminIdentity) {
  const googleConfig = getGoogleAdminConfig();
  if (!googleConfig.ok) return false;

  const email = identity.email.trim().toLowerCase();
  const emailMatches = googleConfig.email ? email === googleConfig.email : true;
  const subjectMatches = googleConfig.subject
    ? identity.subject === googleConfig.subject
    : true;

  return emailMatches && subjectMatches;
}

export function createGoogleAdminSessionCookieValue(
  identity: GoogleAdminIdentity,
) {
  const googleConfig = getGoogleAdminConfig();

  if (!googleConfig.ok || !isGoogleIdentityAllowed(identity)) {
    throw new Error("Google admin account is not allowed.");
  }

  return createSessionCookieValue(
    {
      email: identity.email.trim().toLowerCase(),
      issuedAt: getCurrentTimestamp(),
      mode: "google",
      subject: identity.subject,
    },
    googleConfig.sessionSecret,
  );
}

export async function isAdminAuthenticated() {
  const authStatus = getAdminAuthStatus();
  if (!authStatus.enabled) return false;

  const secret = getSessionSecret(authStatus.mode);
  if (!secret) return false;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!cookieValue) return false;

  const payload = readSessionCookieValue(cookieValue, secret);
  if (!payload || payload.mode !== authStatus.mode) return false;

  if (payload.mode === "google") {
    return isGoogleIdentityAllowed({
      email: payload.email ?? "",
      subject: payload.subject,
    });
  }

  return true;
}

export async function createPasswordAdminSession(password: string) {
  const adminPassword = getAdminPassword();

  if (!adminPassword || !isSameValue(password, adminPassword)) {
    throw new Error("Invalid admin password.");
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_SESSION_COOKIE_NAME,
    createSessionCookieValue(
      {
        issuedAt: getCurrentTimestamp(),
        mode: "password",
      },
      adminPassword,
    ),
    getAdminSessionCookieOptions(),
  );
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
  cookieStore.delete(ADMIN_GOOGLE_STATE_COOKIE_NAME);
}

export async function requireAdminSession() {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Admin session required.");
  }
}
