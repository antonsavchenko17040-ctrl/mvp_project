"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import {
  isPublicDashboardActive,
  isPublicReportsActiveListActive,
  isPublicReportsCompletedListActive,
  isPublicReportsLibraryActive,
  PUBLIC_REPORTS_ACTIVE_HOME,
  PUBLIC_REPORTS_COMPLETED_HOME,
} from "@/lib/reports-section";
import { cn } from "@/lib/utils";

const reportsSubNav = [
  { href: PUBLIC_REPORTS_ACTIVE_HOME, label: "Активні звіти" },
  { href: PUBLIC_REPORTS_COMPLETED_HOME, label: "Завершені звіти" },
];

function isReportsSubActive(pathname: string, href: string) {
  if (href === PUBLIC_REPORTS_ACTIVE_HOME) return isPublicReportsActiveListActive(pathname);
  if (href === PUBLIC_REPORTS_COMPLETED_HOME) return isPublicReportsCompletedListActive(pathname);
  return pathname === href;
}

export function PublicNav() {
  const pathname = usePathname();
  const [reportsOpen, setReportsOpen] = useState(true);

  useEffect(() => {
    if (isPublicReportsLibraryActive(pathname)) setReportsOpen(true);
  }, [pathname]);

  return (
    <nav className="flex h-full flex-col">
      <Link
        href="/public/dashboard"
        className={cn(
          "block border-b border-black/20 px-6 py-2.5 text-base font-medium transition-colors",
          isPublicDashboardActive(pathname)
            ? "bg-[#eee6a5] text-foreground"
            : "text-foreground hover:bg-[#f2ecbe]",
        )}
      >
        Головна сторінка
      </Link>

      <button
        type="button"
        onClick={() => setReportsOpen((value) => !value)}
        className="flex w-full items-center gap-2 border-b border-black/20 px-6 py-2.5 text-left text-base font-medium text-foreground transition-colors hover:bg-[#f2ecbe]"
      >
        <span className="min-w-0 flex-1 truncate">Бібліотека звітів</span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform", reportsOpen && "rotate-180")}
        />
      </button>
      {reportsOpen
        ? reportsSubNav.map((item) => {
            const active = isReportsSubActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block border-b border-black/20 px-6 py-2.5 pl-12 text-sm font-normal transition-colors",
                  active ? "bg-[#eee6a5] text-foreground" : "text-foreground hover:bg-[#f2ecbe]",
                )}
              >
                {item.label}
              </Link>
            );
          })
        : null}
    </nav>
  );
}
