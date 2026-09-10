"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Building2,
  ChevronDown,
  ClipboardList,
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
  isPortalReportsLibraryActive,
  PORTAL_DASHBOARD_HOME,
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
  {
    href: "/admin/departments",
    label: "Підрозділи",
    icon: Building2 as ComponentType<{ className?: string }>,
  },
  { href: "/admin", label: "Список аудитів", icon: Folders as ComponentType<{ className?: string }> },
  { href: "/admin/audit-log", label: "Журнал змін", icon: History as ComponentType<{ className?: string }> },
] as const;

const navItems = [
  { href: "/dashboard", label: uk.nav.dashboard, icon: LayoutDashboard },
  { href: "/reports", label: uk.nav.reports, icon: ClipboardList },
];

const isActivePath = (pathname: string, href: string) => {
  if (href === "/dashboard") return isPortalDashboardActive(pathname);
  if (href === "/reports") return isPortalReportsLibraryActive(pathname);
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

  useEffect(() => {
    if (pathname.startsWith("/admin")) setAdminOpen(true);
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
          {navItems.map((item) => (
            <Item key={item.href} {...item} pathname={pathname} />
          ))}
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
