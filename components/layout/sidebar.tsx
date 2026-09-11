"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Archive,
  ChevronDown,
  ClipboardList,
  FolderOpen,
  Folders,
  History,
  LayoutDashboard,
  Shield,
  UserCheck,
  UserCog,
  UserPen,
  Users,
} from "lucide-react";

import { uk } from "@/lib/i18n/uk";
import {
  isPortalDashboardActive,
  isPortalReportsActiveListActive,
  isPortalReportsCompletedListActive,
  isPortalReportsLibraryActive,
  PORTAL_DASHBOARD_HOME,
  PORTAL_REPORTS_ACTIVE_HOME,
  PORTAL_REPORTS_COMPLETED_HOME,
} from "@/lib/reports-section";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const roleWorkspaceMap: Record<
  Exclude<UserRole, "admin">,
  { href: string; label: string; icon: ComponentType<{ className?: string }> }
> = {
  editor: { href: "/editor", label: "Редактор", icon: UserPen },
  ssp: { href: "/ssp", label: "Відповідальний", icon: Users },
  manager: { href: "/manager", label: "Керівник", icon: UserCog },
  analyst: { href: "/analyst", label: "Аналітик", icon: UserCheck },
};

const adminNavItems = [
  { href: "/admin/users", label: "Користувачі", icon: Users as ComponentType<{ className?: string }> },
  { href: "/admin", label: "Список аудитів", icon: Folders as ComponentType<{ className?: string }> },
  { href: "/admin/audit-log", label: "Журнал змін", icon: History as ComponentType<{ className?: string }> },
] as const;

const reportsNavItems = [
  {
    href: PORTAL_REPORTS_ACTIVE_HOME,
    label: "Активні звіти",
    icon: FolderOpen as ComponentType<{ className?: string }>,
  },
  {
    href: PORTAL_REPORTS_COMPLETED_HOME,
    label: "Завершені звіти",
    icon: Archive as ComponentType<{ className?: string }>,
  },
] as const;

const isActivePath = (pathname: string, href: string) => {
  if (href === "/dashboard") return isPortalDashboardActive(pathname);
  if (href === PORTAL_REPORTS_ACTIVE_HOME) return isPortalReportsActiveListActive(pathname);
  if (href === PORTAL_REPORTS_COMPLETED_HOME) return isPortalReportsCompletedListActive(pathname);
  if (href === "/admin") {
    return (
      pathname === "/admin" ||
      pathname.startsWith("/admin/folders/") ||
      pathname.startsWith("/admin/recommendations/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

const Item = ({
  href,
  label,
  icon: Icon,
  pathname,
  compact = false,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  pathname: string;
  compact?: boolean;
}) => {
  const active = isActivePath(pathname, href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 border-b border-black/20 px-6 py-2.5 text-base font-medium transition-colors",
        compact && "pl-12 text-sm font-normal",
        active ? "bg-[#eee6a5] text-foreground" : "text-foreground hover:bg-[#f2ecbe]",
      )}
    >
      <Icon className={cn("size-[1.125rem] shrink-0", compact && "size-4")} />
      <span className="truncate">{label}</span>
    </Link>
  );
};

const roleOrder: Array<Exclude<UserRole, "admin">> = ["editor", "ssp", "manager", "analyst"];

export function Sidebar({ userRoles }: { userRoles: UserRole[] }) {
  const pathname = usePathname();
  const hasAdmin = userRoles.includes("admin");
  const roleItems = useMemo(() => {
    return roleOrder.filter((role) => userRoles.includes(role)).map((role) => roleWorkspaceMap[role]);
  }, [userRoles]);
  const [adminOpen, setAdminOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(true);

  useEffect(() => {
    if (pathname.startsWith("/admin")) setAdminOpen(true);
  }, [pathname]);

  useEffect(() => {
    if (isPortalReportsLibraryActive(pathname)) setReportsOpen(true);
  }, [pathname]);

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col bg-white text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center border-b border-black/20 px-3">
        <Link
          href={PORTAL_DASHBOARD_HOME}
          className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold leading-none hover:opacity-90"
        >
          <Image
            src="/logo-nazk-source.png"
            alt="Логотип порталу"
            width={22}
            height={28}
            className="h-7 w-auto shrink-0"
          />
          <span className="min-w-0 whitespace-nowrap">{uk.appName}</span>
        </Link>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain border-r border-black/20">
        <div>
          <Item href="/dashboard" label={uk.nav.dashboard} icon={LayoutDashboard} pathname={pathname} />
          <div>
            <button
              type="button"
              onClick={() => setReportsOpen((value) => !value)}
              className="flex w-full items-center gap-2.5 border-b border-black/20 px-6 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-[#f2ecbe]"
            >
              <ClipboardList className="size-[1.125rem] shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left">{uk.nav.reports}</span>
              <ChevronDown
                className={cn("size-[1.125rem] shrink-0 transition-transform", reportsOpen && "rotate-180")}
              />
            </button>
            {reportsOpen
              ? reportsNavItems.map((item) => (
                  <Item key={item.href} {...item} pathname={pathname} compact />
                ))
              : null}
          </div>
        </div>

        <div>
          {hasAdmin ? (
            <div>
              <button
                type="button"
                onClick={() => setAdminOpen((value) => !value)}
                className="flex w-full items-center gap-2.5 border-b border-black/20 px-6 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-[#f2ecbe]"
              >
                <Shield className="size-[1.125rem] shrink-0" />
                <span className="min-w-0 flex-1 truncate text-left">Адміністратор</span>
                <ChevronDown
                  className={cn("size-[1.125rem] shrink-0 transition-transform", adminOpen && "rotate-180")}
                />
              </button>
              {adminOpen
                ? adminNavItems.map((item) => (
                    <Item key={item.href} {...item} pathname={pathname} compact />
                  ))
                : null}
            </div>
          ) : null}
          {roleItems.map((item) => (
            <Item key={item.href} {...item} pathname={pathname} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
