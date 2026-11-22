import { createHash, timingSafeEqual } from "node:crypto";
import { createCookieSessionStorage, redirect } from "react-router";

// The admin portal (/admin): one shared password from the environment, no
// usernames. It's off unless ADMIN_ENABLED is "true" AND a password AND an
// admin database connection are set; when off, every /admin address answers
// 404, as if it didn't exist. In production the password must be at least 12
// characters; local development accepts any, so a throwaway one works.

const MIN_PASSWORD_LENGTH = process.env.NODE_ENV === "production" ? 12 : 1;
const SESSION_HOURS = 8;

let warned = false;

/** The portal's settings, or null when it's switched off or not fully set up. */
function adminConfig() {
  if (process.env.ADMIN_ENABLED !== "true") return null;
  const password = process.env.ADMIN_PASSWORD ?? "";
  const databaseUrl = process.env.ADMIN_DATABASE_URL ?? "";
  if (password.length < MIN_PASSWORD_LENGTH || !databaseUrl) {
    if (!warned) {
      warned = true;
      console.warn(
        `[admin] ADMIN_ENABLED is true but the portal stays off: set ADMIN_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters) and ADMIN_DATABASE_URL.`,
      );
    }
    return null;
  }
  return { password, databaseUrl };
}

export function adminDatabaseUrl() {
  return adminConfig()?.databaseUrl ?? null;
}

/** Call first in every /admin loader and action: 404 when the portal is off. */
export function requireAdminEnabled() {
  const config = adminConfig();
  if (!config) throw new Response("Not Found", { status: 404, statusText: "Not Found" });
  return config;
}

const sha256 = (text: string) => createHash("sha256").update(text).digest();

// The cookie is signed with a key made from the password, so changing the
// password signs everyone out, and there's no second secret to manage.
function sessions(password: string) {
  return createCookieSessionStorage<{ admin: true }>({
    cookie: {
      name: "resources_admin",
      // Not "/admin": the browser loads page data from addresses like
      // /admin.data, which a cookie limited to /admin isn't sent to.
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_HOURS * 60 * 60,
      secrets: [sha256(`session-cookie:${password}`).toString("hex")],
    },
  });
}

/** For every /admin page except sign-in: 404 when off, to /admin/login when not signed in. */
export async function requireAdmin(request: Request) {
  const { password } = requireAdminEnabled();
  const session = await sessions(password).getSession(request.headers.get("Cookie"));
  if (!session.get("admin")) throw redirect("/admin/login");
}

export async function isSignedIn(request: Request) {
  const { password } = requireAdminEnabled();
  const session = await sessions(password).getSession(request.headers.get("Cookie"));
  return session.get("admin") === true;
}

// Wrong passwords, per visitor address: after 5 in a row, sign-in is closed to
// that address for 15 minutes. Kept in memory, so it resets when the app restarts.
const MAX_TRIES = 5;
const LOCK_MINUTES = 15;
const tries = new Map<string, { count: number; lockedUntil: number }>();

function visitor(request: Request) {
  return (
    request.headers.get("fly-client-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

export type SignInResult = { ok: true; cookie: string } | { ok: false; error: string };

export async function signIn(request: Request, attempt: string): Promise<SignInResult> {
  const { password } = requireAdminEnabled();
  const who = visitor(request);
  const now = Date.now();
  const record = tries.get(who);
  if (record && record.lockedUntil > now) {
    const minutes = Math.ceil((record.lockedUntil - now) / 60_000);
    return { ok: false, error: `Too many wrong tries. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.` };
  }

  // Compared as hashes in constant time, so timing reveals nothing about the password.
  if (!timingSafeEqual(sha256(attempt), sha256(password))) {
    const count = (record && record.lockedUntil <= now && record.count < MAX_TRIES ? record.count : 0) + 1;
    tries.set(who, { count, lockedUntil: count >= MAX_TRIES ? now + LOCK_MINUTES * 60_000 : 0 });
    return { ok: false, error: "That password isn't right." };
  }

  tries.delete(who);
  const storage = sessions(password);
  const session = await storage.getSession();
  session.set("admin", true);
  return { ok: true, cookie: await storage.commitSession(session) };
}

export async function signOutCookie(request: Request) {
  const { password } = requireAdminEnabled();
  const storage = sessions(password);
  return storage.destroySession(await storage.getSession(request.headers.get("Cookie")));
}
