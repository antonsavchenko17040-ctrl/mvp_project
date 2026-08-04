"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { DeadlineNotificationsBell } from "@/components/layout/deadline-notifications-bell";
import type { DeadlineReminderItem } from "@/lib/deadline-reminder-ui";
import { isPortalDashboardActive, isPortalReportsLibraryActive } from "@/lib/reports-section";

type DeadlineNotificationsBellHostProps = {
  items: DeadlineReminderItem[];
};

function shouldHideDeadlineNotifications(pathname: string): boolean {
  if (pathname.startsWith("/editor")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/analyst")) return true;
  if (isPortalDashboardActive(pathname) || pathname.startsWith("/dashboard")) return true;
  if (isPortalReportsLibraryActive(pathname) || pathname.startsWith("/reports")) return true;
  return false;
}

/** Лише сповіщення поточного робочого простору (при кількох ролях у профілі). */
function itemsForCurrentWorkspace(
  pathname: string,
  items: DeadlineReminderItem[],
): DeadlineReminderItem[] {
  if (pathname.startsWith("/ssp")) {
    return items.filter((item) => item.href.startsWith("/ssp/"));
  }
  if (pathname.startsWith("/manager")) {
    return items.filter((item) => item.href.startsWith("/manager/"));
  }
  return [];
}

/** Дзвіночок у просторах ССП і керівника — лише їхні нагадування. */
export function DeadlineNotificationsBellHost({ items }: DeadlineNotificationsBellHostProps) {
  const pathname = usePathname();
  const scopedItems = useMemo(
    () => itemsForCurrentWorkspace(pathname, items),
    [pathname, items],
  );

  if (scopedItems.length === 0) return null;
  if (shouldHideDeadlineNotifications(pathname)) return null;
  return <DeadlineNotificationsBell items={scopedItems} />;
}
