"use client";

import Image from "next/image";
import Link from "next/link";
import { UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { signOutFromPublic } from "@/components/public/sign-out-action";
import { DismissibleDetails } from "@/components/ui/dismissible-details";
import { formatRolesList } from "@/lib/auth/roles";
import { uk } from "@/lib/i18n/uk";
import { PORTAL_DASHBOARD_HOME, PUBLIC_DASHBOARD_HOME } from "@/lib/reports-section";
import type { UserRole } from "@/lib/types";

type PublicHeaderUser = {
  fullName: string | null;
  roles: UserRole[];
};

type PublicHeaderProps = {
  user?: PublicHeaderUser | null;
};

export function PublicHeader({ user = null }: PublicHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <header className="border-b border-black/20 bg-white">
        <div className="flex h-14 w-full items-center justify-between px-5 xl:px-7">
          <Link
            href={user ? PORTAL_DASHBOARD_HOME : PUBLIC_DASHBOARD_HOME}
            className="flex items-center gap-2.5 text-base font-semibold hover:opacity-90"
          >
            <Image
              src="/logo-nazk-source.png"
              alt="Логотип порталу"
              width={18}
              height={24}
              className="h-7 w-auto object-contain"
            />
            {uk.appName}
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href={PORTAL_DASHBOARD_HOME}
                className="inline-flex h-9 items-center rounded-full border border-black/20 bg-white px-4 text-sm font-medium hover:bg-muted"
              >
                Робочий простір
              </Link>
              <DismissibleDetails className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
                  <span className="inline-flex size-8 items-center justify-center rounded-full border border-black/40 bg-[#e8d773] text-sm font-semibold text-black">
                    {(user.fullName?.[0] ?? "К").toUpperCase()}
                  </span>
                  <div className="min-w-0 max-w-[10rem]">
                    <p className="truncate text-sm font-medium">{user.fullName ?? "Користувач"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {user.roles.length ? formatRolesList(user.roles) : "невідома роль"}
                    </p>
                  </div>
                </summary>
                <div className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-44 rounded-md border bg-white p-1.5 shadow-md">
                  <form action={signOutFromPublic}>
                    <button
                      type="submit"
                      className="w-full rounded-sm px-3 py-2.5 text-left text-sm hover:bg-muted"
                    >
                      {uk.auth.signOut}
                    </button>
                  </form>
                </div>
              </DismissibleDetails>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/20 bg-[#e8d54f] px-5 text-base font-medium hover:bg-[#dcc842]"
            >
              <UserRound className="size-[1.125rem]" />
              Увійти
            </button>
          )}
        </div>
      </header>

      {!user && isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Вхід"
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 rounded-full border p-1 text-muted-foreground hover:bg-muted"
              aria-label="Закрити"
            >
              <X className="size-4" />
            </button>
            <div className="mb-6 flex items-center gap-2">
              <Image
                src="/logo-nazk-source.png"
                alt="Логотип порталу"
                width={22}
                height={28}
                className="h-7 w-auto object-contain"
              />
              <p className="text-3xl font-semibold">{uk.appName}</p>
            </div>
            <h2 className="mb-5 text-center text-2xl font-semibold">Вхід</h2>
            <LoginForm compact />
          </div>
        </div>
      ) : null}
    </>
  );
}
