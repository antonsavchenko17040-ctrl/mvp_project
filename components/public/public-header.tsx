"use client";

import Image from "next/image";
import Link from "next/link";
import { UserRound, X } from "lucide-react";
import { useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { uk } from "@/lib/i18n/uk";
import { PUBLIC_DASHBOARD_HOME } from "@/lib/reports-section";

export function PublicHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="border-b border-black/20 bg-white">
        <div className="flex h-14 w-full items-center justify-between px-5 xl:px-7">
          <Link
            href={PUBLIC_DASHBOARD_HOME}
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
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/20 bg-[#e8d54f] px-5 text-base font-medium hover:bg-[#dcc842]"
          >
            <UserRound className="size-[1.125rem]" />
            Увійти
          </button>
        </div>
      </header>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
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

