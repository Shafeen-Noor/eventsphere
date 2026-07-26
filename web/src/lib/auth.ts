import { cookies } from "next/headers";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "@/lib/db";

const COOKIE = "es_session";
const SESSION_DAYS = 30;
const scryptAsync = promisify(scrypt);

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function isAccountUser(user: { email: string | null; passwordHash: string | null }) {
  return Boolean(user.email && user.passwordHash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(
      JSON.stringify({
        error: { code: "AUTH_REQUIRED", message: "Sign in to continue." },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  return user;
}

/** Hosts must have an email/password account. */
export async function requireAccount() {
  const user = await requireUser();
  if (!isAccountUser(user)) {
    throw new Response(
      JSON.stringify({
        error: {
          code: "ACCOUNT_REQUIRED",
          message: "Create an account to manage events across devices.",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  return user;
}

/**
 * Guest identity: cookie + display name only (no password).
 * Used when joining via invite link/QR.
 */
export async function ensureUser(displayName: string, email?: string | null) {
  const existing = await getCurrentUser();
  if (existing) {
    if (existing.displayName !== displayName.trim()) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { displayName: displayName.trim() },
      });
    }
    return existing;
  }

  const user = await prisma.user.create({
    data: {
      displayName: displayName.trim(),
      email: email?.trim() || null,
    },
  });
  await createSession(user.id);
  return user;
}

export async function registerAccount(input: {
  displayName: string;
  email: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();

  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken?.passwordHash) {
    throw new Response(
      JSON.stringify({
        error: {
          code: "EMAIL_TAKEN",
          message: "An account with this email already exists. Sign in instead.",
        },
      }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );
  }

  const passwordHash = await hashPassword(input.password);
  const current = await getCurrentUser();

  // Upgrade a guest session into a full account when possible.
  if (current && !current.passwordHash && (!current.email || current.email === email)) {
    const user = await prisma.user.update({
      where: { id: current.id },
      data: { displayName, email, passwordHash },
    });
    return user;
  }

  if (taken && !taken.passwordHash) {
    // Rare: email reserved on a guest stub — claim it.
    const user = await prisma.user.update({
      where: { id: taken.id },
      data: { displayName, passwordHash },
    });
    await clearSession();
    await createSession(user.id);
    return user;
  }

  const user = await prisma.user.create({
    data: { displayName, email, passwordHash },
  });
  await clearSession();
  await createSession(user.id);
  return user;
}

export async function loginAccount(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    throw new Response(
      JSON.stringify({
        error: {
          code: "AUTH_INVALID",
          message: "Incorrect email or password.",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw new Response(
      JSON.stringify({
        error: {
          code: "AUTH_INVALID",
          message: "Incorrect email or password.",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  await clearSession();
  await createSession(user.id);
  return user;
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await prisma.session
      .delete({ where: { tokenHash: hashToken(token) } })
      .catch(() => {});
  }
  jar.delete(COOKIE);
}

export function publicUserDto(user: {
  id: string;
  displayName: string;
  email: string | null;
  passwordHash: string | null;
}) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    hasAccount: isAccountUser(user),
  };
}
