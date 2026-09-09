"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type EditorFolderSearchFieldOption = {
  value: string;
  label: string;
};

type EditorFolderSearchProps = {
  className?: string;
  /** When set, shows a field selector on the right and filters via `qf` URL param. */
  fields?: EditorFolderSearchFieldOption[];
};

export function EditorFolderSearch({ className, fields }: EditorFolderSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const qFromUrl = searchParams.get("q") ?? "";
  const qfFromUrl = searchParams.get("qf") ?? "";
  const [value, setValue] = useState(qFromUrl);
  const hasFields = Boolean(fields?.length);
  const searchParamsKey = searchParams.toString();

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

  const allowedFieldValues = new Set((fields ?? []).map((item) => item.value));
  const selectValue = allowedFieldValues.has(qfFromUrl) ? qfFromUrl : "";

  const onFieldChange = (nextQf: string) => {
    const params = new URLSearchParams(searchParamsKey);
    const trimmed = value.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    if (nextQf) params.set("qf", nextQf);
    else params.delete("qf");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  return (
    <div
      className={cn(
        hasFields
          ? "flex w-full flex-col gap-2 sm:flex-row sm:items-center"
          : "relative min-w-[12rem] flex-1 sm:max-w-xs",
        className,
      )}
    >
      <div className={cn("relative min-w-0", hasFields ? "flex-1" : "w-full")}>
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Пошук…"
          aria-label="Пошук рекомендацій"
          className={cn("h-9 rounded-3xl bg-white pl-8 sm:h-10", isPending && "opacity-80")}
        />
      </div>
      {hasFields ? (
        <select
          value={selectValue}
          onChange={(e) => onFieldChange(e.target.value)}
          aria-label="За чим шукати"
          className={cn(
            "h-9 w-full shrink-0 rounded-3xl border border-input bg-white px-3 text-sm outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-10 sm:w-64",
            isPending && "opacity-80",
          )}
        >
          <option value="">Не обрано</option>
          {fields!.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
