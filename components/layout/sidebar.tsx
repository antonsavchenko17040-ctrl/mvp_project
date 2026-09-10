"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ComponentType } from "react";
import {
  Building2,
  ChevronDown,
  ClipboardList,
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

const roleWorkspaceMap: Record<UserRole, { href: string; label: string; icon: ComponentType<{ className?: string }> }> =
  {
    editor: { href: "/editor", label: "Редактор", icon: UserPen },
    ssp: { href: "/ssp", label: "Відповідальний", icon: Users },
    manager: { href: "/manager", label: "Керівник", icon: UserCog },
    analyst: { href: "/analyst", label: "Аналітик", icon: UserCheck },
    admin: { href: "/admin", label: "Адміністратор", icon: Shield },
  };

const navItems = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/reports", label: uk.nav.reports, icon: ClipboardList },
];

const isActivePath = (pathname: string, href: string) => {
  if (href === "/dashboard") return isPortalDashboardActive(pathname);
  if (href === "/reports") return isPortalReportsLibraryActive(pathname);
  return pathname.startsWith(href);
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

const workspaceOrder: UserRole[] = ["admin", "editor", "ssp", "manager", "analyst"];

export function Sidebar({ userRoles }: { userRoles: UserRole[] }) {
  const pathname = usePathname();
  const workspaceItems = useMemo(() => {
    const items: Array<{ href: string; label: string; icon: ComponentType<{ className?: string }> }> = [];
    for (const role of workspaceOrder) {
      if (!userRoles.includes(role)) continue;
      if (role === "admin") {
        items.push(
          roleWorkspaceMap.admin,
          { href: "/admin/users", label: "Користувачі", icon: Users as ComponentType<{ className?: string }> },
          {
            href: "/admin/departments",
            label: "Підрозділи",
            icon: Building2 as ComponentType<{ className?: string }>,
          },
          { href: "/admin/audit-log", label: "Журнал змін", icon: History as ComponentType<{ className?: string }> },
        );
      } else {
        items.push(roleWorkspaceMap[role]);
      }
    }
    return items;
  }, [userRoles]);
  const [workspaceOpen, setWorkspaceOpen] = useState(true);

  return (
    <aside className="flex w-[300px] shrink-0 flex-col bg-white text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-black/20 px-3">
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

      <div className="flex flex-1 flex-col border-r border-black/20">
        <div>
          <button
            type="button"
            onClick={() => setWorkspaceOpen((value) => !value)}
            className="flex w-full items-center justify-between border-b border-black/20 px-6 py-2.5 text-sm font-semibold uppercase text-muted-foreground hover:bg-muted/40"
          >
            Робочий простір
            <ChevronDown className={cn("size-[1.125rem] transition-transform", workspaceOpen && "rotate-180")} />
          </button>
          {workspaceOpen
            ? workspaceItems.map((item) => (
                <Item
                  key={item.href}
                  {...item}
                  pathname={pathname}
                  compact={
                    item.href === "/admin/users" ||
                    item.href === "/admin/departments" ||
                    item.href === "/admin/audit-log"
                  }
                />
              ))
            : null}
        </div>

        <div>
          {navItems.map((item) => (
            <Item key={item.href} {...item} pathname={pathname} />
          ))}
        </div>

        <div className="flex-1" />
      </div>
    </aside>
  );
}
