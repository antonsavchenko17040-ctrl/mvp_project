"use server";

import { redirect } from "next/navigation";

import { clearSession } from "@/lib/auth/session";
import { PUBLIC_DASHBOARD_HOME } from "@/lib/reports-section";

export async function signOutFromPublic() {
  await clearSession();
  redirect(PUBLIC_DASHBOARD_HOME);
}
