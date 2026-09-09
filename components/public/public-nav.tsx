"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isPublicDashboardActive, isPublicReportsLibraryActive } from "@/lib/reports-section";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/public/dashboard", label: "Дашборд" },
  { href: "/public/reports", label: "Бібліотека звітів" },
];

function isPublicNavActive(pathname: string, href: string) {
  if (href === "/public/dashboard") return isPublicDashboardActive(pathname);
  if (href === "/public/reports") return isPublicReportsLibraryActive(pathname);
  return pathname.startsWith(href);
}

export function PublicNav() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col">
      {nav.map((item) => {
        const active = isPublicNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block border-b border-black/20 px-6 py-2.5 text-base font-medium transition-colors",
              active ? "bg-[#eee6a5] text-foreground" : "text-foreground hover:bg-[#f2ecbe]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
