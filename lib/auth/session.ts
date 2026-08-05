import { cache } from "react";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { hasAnyRole } from "@/lib/auth/roles";
import type { Profile, UserRole } from "@/lib/types";

const SESSION_COOKIE = "session_token";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(profileId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.session.create({
    data: {
      tokenHash,
      profileId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { profile: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.session.delete({ where: { id: session.id } });
    }
    // Do not cookieStore.delete here: getSession runs in RSC (layouts).
    // Cookie clears in clearSession / is overwritten on createSession.
    return null;
  }

  const p = session.profile;
  const roleRows = await db.profileRole.findMany({
    where: { profileId: p.id },
    select: { role: true },
  });

  return {
    ...p,
    roles: roleRows.map((r) => r.role as UserRole),
  } as Profile;
});

export async function getCurrentProfile() {
  const profile = await getSession();
  return (profile as Profile | null) ?? null;
}

export async function requireAuth() {
  const profile = await getSession();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

export async function requireRole(roles: UserRole[]) {
  const profile = await requireAuth();

  if (!profile || !profile.isActive) {
    redirect("/dashboard");
  }

  const allowed = hasAnyRole(profile.roles, roles);
  if (!allowed) {
    redirect("/dashboard");
  }

  return profile;
}
