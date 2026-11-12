"use client";

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
  PanelLeftClose,
  PanelLeftOpen,
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

const NAV_COLLAPSED_KEY = "editor-nav-collapsed";

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
        "flex items-center border-b border-black py-2.5 text-base font-medium transition-colors",
        collapsed ? "justify-center px-2" : "gap-2.5 px-6",
        !collapsed && compact && "pl-12 text-sm font-normal",
        active ? "bg-[#eee6a5] text-foreground" : "text-foreground hover:bg-[#f2ecbe]",
      )}
    >
      <Icon className={cn("size-[1.125rem] shrink-0", !collapsed && compact && "size-4")} />
      {collapsed ? null : <span className="truncate">{label}</span>}
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
  const canCollapse = userRoles.includes("editor");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!canCollapse) return;
    setCollapsed(window.localStorage.getItem(NAV_COLLAPSED_KEY) === "1");
  }, [canCollapse]);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem(NAV_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  useEffect(() => {
    if (pathname.startsWith("/admin")) setAdminOpen(true);
  }, [pathname]);

  useEffect(() => {
    if (isPortalReportsLibraryActive(pathname)) setReportsOpen(true);
  }, [pathname]);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col bg-white text-sidebar-foreground transition-[width] duration-200",
        canCollapse && collapsed ? "w-16" : "w-[300px]",
      )}
    >
      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain border-r border-black">
        {canCollapse ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            title={collapsed ? "Розгорнути меню" : "Згорнути меню"}
            className={cn(
              "flex h-11 items-center border-b border-black text-sm font-medium text-[#595959]",
              collapsed ? "justify-center px-2" : "gap-2.5 px-4",
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-5 shrink-0" /> : <PanelLeftClose className="size-5 shrink-0" />}
            {collapsed ? null : <span>Згорнути меню</span>}
          </button>
        ) : null}
        <div>
          <Item
            href="/dashboard"
            label={uk.nav.dashboard}
            icon={LayoutDashboard}
            pathname={pathname}
            collapsed={canCollapse && collapsed}
          />
          <div>
            <button
              type="button"
              onClick={() => setReportsOpen((value) => !value)}
              title={canCollapse && collapsed ? uk.nav.reports : undefined}
              className={cn(
                "flex w-full items-center border-b border-black py-2.5 text-base font-medium text-foreground transition-colors hover:bg-[#f2ecbe]",
                canCollapse && collapsed ? "justify-center px-2" : "gap-2.5 px-6",
              )}
            >
              <ClipboardList className="size-[1.125rem] shrink-0" />
              {canCollapse && collapsed ? null : (
                <span className="min-w-0 flex-1 truncate text-left">{uk.nav.reports}</span>
              )}
              {canCollapse && collapsed ? null : (
                <ChevronDown
                  className={cn("size-[1.125rem] shrink-0 transition-transform", reportsOpen && "rotate-180")}
                />
              )}
            </button>
            {reportsOpen
              ? reportsNavItems.map((item) => (
                  <Item key={item.href} {...item} pathname={pathname} compact collapsed={canCollapse && collapsed} />
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
                title={canCollapse && collapsed ? "Адміністратор" : undefined}
                className={cn(
                  "flex w-full items-center border-b border-black py-2.5 text-base font-medium text-foreground transition-colors hover:bg-[#f2ecbe]",
                  canCollapse && collapsed ? "justify-center px-2" : "gap-2.5 px-6",
                )}
              >
                <Shield className="size-[1.125rem] shrink-0" />
                {canCollapse && collapsed ? null : (
                  <span className="min-w-0 flex-1 truncate text-left">Адміністратор</span>
                )}
                {canCollapse && collapsed ? null : (
                  <ChevronDown
                    className={cn("size-[1.125rem] shrink-0 transition-transform", adminOpen && "rotate-180")}
                  />
                )}
              </button>
              {adminOpen
                ? adminNavItems.map((item) => (
                    <Item key={item.href} {...item} pathname={pathname} compact collapsed={canCollapse && collapsed} />
                  ))
                : null}
            </div>
          ) : null}
          {roleItems.map((item) => (
            <Item key={item.href} {...item} pathname={pathname} collapsed={canCollapse && collapsed} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
