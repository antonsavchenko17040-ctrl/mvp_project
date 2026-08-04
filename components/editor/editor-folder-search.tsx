"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type EditorFolderSearchProps = {
  className?: string;
};

export function EditorFolderSearch({ className }: EditorFolderSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const qFromUrl = searchParams.get("q") ?? "";
  const [value, setValue] = useState(qFromUrl);

  useEffect(() => {
    setValue(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    const trimmed = value.trim();
    const current = (searchParams.get("q") ?? "").trim();
    if (trimmed === current) return;

    const handle = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    }, 280);

    return () => window.clearTimeout(handle);
  }, [value, pathname, router, searchParams]);

  return (
    <div className={cn("relative min-w-[12rem] flex-1 sm:max-w-xs", className)}>
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
  );
}
