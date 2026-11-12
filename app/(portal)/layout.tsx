import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DeadlineNotificationsBellHost } from "@/components/layout/deadline-notifications-bell-host";
import { PortalMain } from "@/components/layout/portal-main";
import { Sidebar } from "@/components/layout/sidebar";
import { DismissibleDetails } from "@/components/ui/dismissible-details";
import { formatRolesList } from "@/lib/auth/roles";
import { clearSession, getCurrentProfile, requireAuth } from "@/lib/auth/session";
import { getDeadlineRemindersForProfile } from "@/lib/deadline-reminders";
import { uk } from "@/lib/i18n/uk";
import { PORTAL_DASHBOARD_HOME } from "@/lib/reports-section";

async function signOut() {
  "use server";
  await clearSession();
  redirect("/public/dashboard");
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const profile = await getCurrentProfile();

  if (profile?.mustChangePassword) {
    redirect("/change-password");
  }

  const roles = profile?.roles ?? [];
  const canReceiveDeadlineReminders = roles.includes("ssp") || roles.includes("manager");
  const deadlineReminders = canReceiveDeadlineReminders
    ? await getDeadlineRemindersForProfile({
        profileId: profile!.id,
        roles,
      })
    : [];

  return (
    <div className="workspace-ui flex h-dvh w-full max-w-[100vw] flex-col overflow-hidden bg-[#f5f5f5]">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-black bg-white px-6 lg:px-10">
        <Link
          href={PORTAL_DASHBOARD_HOME}
          className="flex min-w-0 items-center gap-3 text-lg font-medium leading-none hover:opacity-90"
        >
          <Image
            src="/logo-nazk-source.png"
            alt="Логотип порталу"
            width={22}
            height={28}
            className="h-8 w-auto shrink-0"
          />
          <span className="truncate">{uk.appName}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <DeadlineNotificationsBellHost items={deadlineReminders} />
          <DismissibleDetails className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-md px-2 py-1 hover:bg-muted">
              <span className="inline-flex size-9 items-center justify-center rounded-full border border-black/40 bg-[#e8d773] text-sm font-semibold text-black">
                {(profile?.fullName?.[0] ?? "К").toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-medium">{profile?.fullName ?? "Користувач"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {roles.length ? formatRolesList(roles) : "невідома роль"}
                </p>
              </div>
            </summary>
            <div className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-44 rounded-md border bg-white p-1.5 shadow-md">
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full rounded-sm px-3 py-2.5 text-left text-base hover:bg-muted"
                >
                  Вийти
                </button>
              </form>
            </div>
          </DismissibleDetails>
        </div>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <Sidebar userRoles={roles} />
        <PortalMain>{children}</PortalMain>
      </div>
    </div>
  );
}
