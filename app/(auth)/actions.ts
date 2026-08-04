"use server";

import { redirect } from "next/navigation";

import { loginRedirectPath } from "@/lib/auth/roles";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { UserRole } from "@/lib/types";

export interface LoginActionState {
  error?: string;
}

const roleWorkspacePath: Record<UserRole, string> = {
  editor: "/editor",
  ssp: "/ssp",
  manager: "/manager",
  analyst: "/analyst",
  admin: "/admin",
};

export async function signInAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const profile = await db.profile.findUnique({
    where: { email },
  });
  if (!profile || !profile.isActive) {
    return { error: "Невірна електронна пошта або пароль." };
  }

  const isValid = await verifyPassword(password, profile.passwordHash);
  if (!isValid) {
    return { error: "Невірна електронна пошта або пароль." };
  }

  const roleRows = await db.profileRole.findMany({
    where: { profileId: profile.id },
    select: { role: true },
  });
  const roles = roleRows.map((r) => r.role as UserRole);

  await createSession(profile.id);
  redirect(loginRedirectPath(roleWorkspacePath, roles));
}

