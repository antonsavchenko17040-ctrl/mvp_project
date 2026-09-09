"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import {
  reportsFolderStatusFilters,
  type ReportsFolderStatusFilterKey,
} from "@/lib/reports-folder-filters";
import { cn } from "@/lib/utils";

type ReportsFolderFiltersProps = {
  sspUnits: string[];
  className?: string;
};

export function ReportsFolderFilters({ sspUnits, className }: ReportsFolderFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const qFromUrl = searchParams.get("q") ?? "";
  const sspFromUrl = searchParams.get("ssp") ?? "";
  const statusFromUrl = searchParams.get("status") ?? "";
  const [value, setValue] = useState(qFromUrl);
  const searchParamsKey = searchParams.toString();

  const sspOptions = new Set(sspUnits);
  const selectedSsp = sspOptions.has(sspFromUrl) ? sspFromUrl : "";
  const statusKeys = new Set(reportsFolderStatusFilters.map((item) => item.key));
  const selectedStatus = statusKeys.has(statusFromUrl as ReportsFolderStatusFilterKey)
    ? statusFromUrl
    : "";

  useEffect(() => {
    setValue(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    const trimmed = value.trim();
    const params = new URLSearchParams(searchParamsKey);
    const currentQ = (params.get("q") ?? "").trim();
    if (trimmed === currentQ) return;

    const handle = window.setTimeout(() => {
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      // Chips «execution» з дашборду не потрібні в бібліотеці.
      params.delete("execution");
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    }, 280);

    return () => window.clearTimeout(handle);
  }, [value, pathname, router, searchParamsKey]);

  const replaceFilters = (next: { ssp?: string; status?: string }) => {
    const params = new URLSearchParams(searchParamsKey);
    const trimmed = value.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");

    const ssp = next.ssp ?? selectedSsp;
    const status = next.status ?? selectedStatus;
    if (ssp) params.set("ssp", ssp);
    else params.delete("ssp");
    if (status) params.set("status", status);
    else params.delete("status");
    params.delete("execution");

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border border-black/10 bg-[#f8f8f8] p-3 lg:flex-row lg:items-center lg:p-3.5",
        className,
      )}
    >
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Пошук за назвою…"
          aria-label="Пошук за назвою"
          className={cn("h-9 rounded-3xl bg-white pl-8 sm:h-10", isPending && "opacity-80")}
        />
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
        <select
          value={selectedSsp}
          onChange={(e) => replaceFilters({ ssp: e.target.value })}
          aria-label="ССП"
          className={cn(
            "h-9 w-full shrink-0 rounded-3xl border border-input bg-white px-3 text-sm outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-10 sm:min-w-[12rem] lg:w-52",
            isPending && "opacity-80",
          )}
        >
          <option value="">ССП</option>
          {sspUnits.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => replaceFilters({ status: e.target.value })}
          aria-label="Стан"
          className={cn(
            "h-9 w-full shrink-0 rounded-3xl border border-input bg-white px-3 text-sm outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-10 sm:min-w-[14rem] lg:w-56",
            isPending && "opacity-80",
          )}
        >
          <option value="">Стан</option>
          {reportsFolderStatusFilters.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
