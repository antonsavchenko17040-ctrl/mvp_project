"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardList,
  History,
  LayoutDashboard,
  Settings,
  Shield,
  UserCheck,
  UserCog,
  UserPen,
  Users,
} from "lucide-react";

import { uk } from "@/lib/i18n/uk";
import { isPortalDashboardActive, isPortalReportsLibraryActive } from "@/lib/reports-section";
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
  { href: "/statistics", label: uk.nav.statistics, icon: BarChart3 },
];

const footerItems = [
  { href: "/settings", label: uk.nav.settings, icon: Settings },
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
  collapsed = false,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  pathname: string;
  compact?: boolean;
  collapsed?: boolean;
}) => {
  const active = isActivePath(pathname, href);
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center border-b border-black/20 py-2.5 font-medium transition-colors",
        collapsed ? "justify-center px-2" : "gap-2.5 px-6 text-base",
        compact && !collapsed && "pl-12 text-sm font-normal",
        active ? "bg-[#eee6a5] text-foreground" : "text-foreground hover:bg-[#f2ecbe]",
      )}
    >
      <Icon className={cn("size-[1.125rem] shrink-0", compact && !collapsed && "size-4")} />
      {!collapsed ? <span className="truncate">{label}</span> : null}
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("portal-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("portal-sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col bg-white text-sidebar-foreground transition-[width] duration-200 ease-in-out",
        collapsed ? "w-14" : "w-[280px]",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-black/20",
          collapsed ? "cursor-pointer px-1" : "gap-1 px-4",
        )}
        onClick={collapsed ? toggleCollapsed : undefined}
        title={collapsed ? "Розгорнути меню" : undefined}
      >
        {!collapsed ? (
          <h2 className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold leading-none">
            <Image
              src="/logo-nazk-source.png"
              alt="Логотип порталу"
              width={22}
              height={28}
              className="h-7 w-auto shrink-0"
            />
            <span className="whitespace-nowrap">{uk.appName}</span>
          </h2>
        ) : null}
        {!collapsed ? (
          <div
            className="h-full w-3 shrink-0 cursor-pointer self-stretch"
            onClick={toggleCollapsed}
            title="Згорнути меню"
            aria-label="Згорнути бокове меню"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col border-r border-black/20">
        {!collapsed ? (
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
                    collapsed={collapsed}
                  />
                ))
              : null}
          </div>
        ) : (
          <div className="border-b border-black/20 py-1">
            {workspaceItems.map((item) => (
              <Item key={item.href} {...item} pathname={pathname} collapsed={collapsed} />
            ))}
          </div>
        )}

        <div>
          {navItems.map((item) => (
            <Item key={item.href} {...item} pathname={pathname} collapsed={collapsed} />
          ))}
        </div>

        <div
          className={cn("flex-1", collapsed ? "cursor-pointer" : "cursor-pointer hover:bg-[#f8f3cf]")}
          onClick={toggleCollapsed}
          title={collapsed ? "Розгорнути меню" : "Згорнути меню"}
          aria-label={collapsed ? "Розгорнути бокове меню" : "Згорнути бокове меню"}
        />
      </div>

      <div className="mt-auto border-t border-black/20">
        {footerItems.map((item) => {
          const Icon = item.icon;
          return collapsed ? (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className="flex justify-center border-b border-black/20 px-2 py-2.5 text-muted-foreground hover:bg-[#f2ecbe] last:border-b-0"
            >
              <Icon className="size-[1.125rem]" />
            </Link>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className="block px-6 py-2.5 text-sm text-muted-foreground hover:bg-[#f2ecbe]"
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
