"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ReportsLibraryFiltersProps = {
  years: number[];
  className?: string;
};

export function ReportsLibraryFilters({ years, className }: ReportsLibraryFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const qFromUrl = searchParams.get("q") ?? "";
  const yearFromUrl = searchParams.get("year") ?? "";
  const [value, setValue] = useState(qFromUrl);
  const searchParamsKey = searchParams.toString();
  const yearOptions = new Set(years.map(String));
  const selectedYear = yearOptions.has(yearFromUrl) ? yearFromUrl : "";

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
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    }, 280);

    return () => window.clearTimeout(handle);
  }, [value, pathname, router, searchParamsKey]);

  const onYearChange = (nextYear: string) => {
    const params = new URLSearchParams(searchParamsKey);
    const trimmed = value.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    if (nextYear) params.set("year", nextYear);
    else params.delete("year");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border border-black/10 bg-[#f8f8f8] p-3 sm:flex-row sm:items-center sm:p-3.5",
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
          placeholder="Пошук за назвою папки…"
          aria-label="Пошук за назвою папки"
          className={cn("h-9 rounded-3xl bg-white pl-8 sm:h-10", isPending && "opacity-80")}
        />
      </div>
      <select
        value={selectedYear}
        onChange={(e) => onYearChange(e.target.value)}
        aria-label="Рік"
        className={cn(
          "h-9 w-full shrink-0 rounded-3xl border border-input bg-white px-3 text-sm outline-none transition-colors",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-10 sm:w-40",
          isPending && "opacity-80",
        )}
      >
        <option value="">Рік</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}
