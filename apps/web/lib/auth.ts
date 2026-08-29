/**
 * CarbonLoop — Server-side authentication utilities.
 *
 * Uses Node.js `crypto.scrypt` for password hashing and HTTP-only cookies
 * for session tokens. All auth logic runs server-side only.
 */
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  createSession as dbCreateSession,
  getSessionUserId,
  destroySession as dbDestroySession,
  findUserById,
  type User,
} from "@/lib/db";

const SESSION_COOKIE = "carbonloop_session";
const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scryptAsync(password, salt);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [saltHex, keyHex] = hash.split(":");
  if (!saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(keyHex, "hex");
  const derivedKey = await scryptAsync(password, salt);
  return timingSafeEqual(storedKey, derivedKey);
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export async function createSessionCookie(userId: string): Promise<void> {
  const sessionId = dbCreateSession(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    dbDestroySession(sessionId);
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const userId = getSessionUserId(sessionId);
  if (!userId) return null;
  return findUserById(userId) ?? null;
}

/**
 * Require authentication for an API route. Returns the authenticated user
 * or a JSON error response.
 */
export async function requireAuth(): Promise<
  { ok: true; user: User } | { ok: false; response: Response }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      response: Response.json(
        { code: "UNAUTHORIZED", message: "You must be logged in." },
        { status: 401 },
      ),
    };
  }
  return { ok: true, user };
}
