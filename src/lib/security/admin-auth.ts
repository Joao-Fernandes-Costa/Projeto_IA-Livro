import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "estudaia_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12 horas

interface SessionPayload {
  v: number;
  exp: number;
  nonce: string;
}

// Rate Limiter simples em memória para proteção contra força bruta
interface RateLimitEntry {
  attempts: number;
  lockedUntil?: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutos de bloqueio

function getClientIp(req?: NextRequest): string {
  if (!req) return "local";
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (entry.lockedUntil && entry.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  // Se o tempo de bloqueio já expirou, reseta o histórico
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    rateLimitMap.delete(ip);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  return {
    allowed: entry.attempts < MAX_ATTEMPTS,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - entry.attempts),
  };
}

export function recordFailedAttempt(ip: string): {
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { attempts: 0 };
  entry.attempts += 1;

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    rateLimitMap.set(ip, entry);
    return { remainingAttempts: 0, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) };
  }

  rateLimitMap.set(ip, entry);
  return { remainingAttempts: MAX_ATTEMPTS - entry.attempts };
}

export function resetRateLimit(ip: string): void {
  rateLimitMap.delete(ip);
}

function getSigningKey(): string {
  const pwd = process.env.AI_ADMIN_PASSWORD || "";
  const encKey = process.env.AI_SETTINGS_ENCRYPTION_KEY || "";
  return crypto
    .createHash("sha256")
    .update(`estudaia-admin-auth-${pwd}-${encKey}`)
    .digest("hex");
}

/**
 * Cria um token assinado com HMAC-SHA256 para o cookie de sessão.
 */
export function createSessionToken(): string {
  const payload: SessionPayload = {
    v: 1,
    exp: Date.now() + SESSION_DURATION_SECONDS * 1000,
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSigningKey())
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Valida o token do cookie da sessão.
 */
export function verifySessionToken(token?: string | null): boolean {
  if (!token) return false;

  const adminPassword = process.env.AI_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.trim().length === 0) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, signature] = parts;

  // Verifica assinatura timing-safe
  const expectedSignature = crypto
    .createHmac("sha256", getSigningKey())
    .update(payloadB64)
    .digest("base64url");

  try {
    const isSigValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    if (!isSigValid) return false;

    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload: SessionPayload = JSON.parse(payloadJson);

    if (Date.now() > payload.exp) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Compara a senha informada com AI_ADMIN_PASSWORD de forma timing-safe.
 */
export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.AI_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.trim().length === 0) {
    return false;
  }

  const hashActual = crypto.createHash("sha256").update(adminPassword.trim()).digest();
  const hashProvided = crypto.createHash("sha256").update(password.trim()).digest();

  return crypto.timingSafeEqual(hashActual, hashProvided);
}

/**
 * Helper para verificar autenticação nas rotas de API administrativas.
 */
export async function requireAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);
  return verifySessionToken(sessionCookie?.value);
}

/**
 * Configuração dos cookies de sessão
 */
export function getAdminCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}

export { getClientIp };
