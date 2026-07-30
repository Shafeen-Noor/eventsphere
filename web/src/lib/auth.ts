import { cookies } from "next/headers";
import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "@/lib/db";
import { assertSelectablePlan, type HostType, type PlanId } from "@/lib/plans";

const COOKIE = "es_session";
const SESSION_DAYS = 30;
const OTP_TTL_MS = 15 * 60 * 1000;
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

export function isEmailVerified(user: { emailVerifiedAt: Date | null }) {
  return Boolean(user.emailVerifiedAt);
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

export async function requireVerifiedAccount() {
  const user = await requireAccount();
  if (!isEmailVerified(user)) {
    throw new Response(
      JSON.stringify({
        error: {
          code: "EMAIL_UNVERIFIED",
          message: "Verify your email with the OTP code to continue.",
        },
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
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

function generateOtpCode() {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

export async function issueEmailOtp(userId: string) {
  const code = generateOtpCode();
  const otpHash = hashToken(code);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  await prisma.user.update({
    where: { id: userId },
    data: { otpHash, otpExpiresAt, emailVerifiedAt: null },
  });
  // Email delivery isn't wired yet — callers surface demoCode in the verify UI.
  console.info(`[eventsphere] OTP for user ${userId}: ${code}`);
  return { code, expiresAt: otpExpiresAt };
}

export async function verifyEmailOtp(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.otpHash || !user.otpExpiresAt) {
    throw new Response(
      JSON.stringify({
        error: { code: "OTP_MISSING", message: "Request a new verification code." },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  if (user.otpExpiresAt.getTime() < Date.now()) {
    throw new Response(
      JSON.stringify({
        error: { code: "OTP_EXPIRED", message: "That code expired. Request a new one." },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  const incoming = hashToken(code.trim());
  if (incoming !== user.otpHash) {
    throw new Response(
      JSON.stringify({
        error: { code: "OTP_INVALID", message: "Incorrect code. Try again." },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  return prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifiedAt: new Date(),
      otpHash: null,
      otpExpiresAt: null,
    },
  });
}

export async function registerAccount(input: {
  displayName: string;
  email: string;
  password: string;
  organizationName?: string | null;
  hostType?: HostType | null;
  plan?: PlanId | string;
  skipOtp?: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const organizationName = input.organizationName?.trim() || null;
  const hostType = input.hostType || null;
  const plan = assertSelectablePlan(input.plan || "free");

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
  const profile = {
    displayName,
    email,
    passwordHash,
    organizationName,
    hostType,
    plan,
  };

  let user;
  // Upgrade a guest session into a full account when possible.
  if (current && !current.passwordHash && (!current.email || current.email === email)) {
    user = await prisma.user.update({
      where: { id: current.id },
      data: profile,
    });
  } else if (taken && !taken.passwordHash) {
    user = await prisma.user.update({
      where: { id: taken.id },
      data: profile,
    });
    await clearSession();
    await createSession(user.id);
  } else {
    user = await prisma.user.create({ data: profile });
    await clearSession();
    await createSession(user.id);
  }

  if (input.skipOtp) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), otpHash: null, otpExpiresAt: null },
    });
    return { user, demoCode: null as string | null };
  }

  const { code } = await issueEmailOtp(user.id);
  user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  return { user, demoCode: code };
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
  organizationName?: string | null;
  hostType?: string | null;
  plan?: string | null;
  emailVerifiedAt?: Date | null;
}) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    hasAccount: isAccountUser(user),
    organizationName: user.organizationName ?? null,
    hostType: user.hostType ?? null,
    plan: user.plan || "free",
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}
