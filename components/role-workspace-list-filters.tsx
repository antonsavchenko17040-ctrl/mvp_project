"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  ROLE_WORKSPACE_DEADLINE_FILTERS,
  ROLE_WORKSPACE_STATUS_FILTERS,
  parseRoleWorkspaceDeadlineFilter,
  parseRoleWorkspaceStatusFilter,
} from "@/lib/role-workspace-list-filters";
import { cn } from "@/lib/utils";

type RoleWorkspaceListFiltersProps = {
  className?: string;
};

export function RoleWorkspaceListFilters({ className }: RoleWorkspaceListFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const searchParamsKey = searchParams.toString();

  const selectedStatus = parseRoleWorkspaceStatusFilter(searchParams.get("status") ?? undefined);
  const selectedDeadline = parseRoleWorkspaceDeadlineFilter(searchParams.get("deadline") ?? undefined);

  const replaceFilters = (next: { status?: string; deadline?: string }) => {
    const params = new URLSearchParams(searchParamsKey);
    const status = next.status ?? selectedStatus;
    const deadline = next.deadline ?? selectedDeadline;

    if (status && status !== "all") params.set("status", status);
    else params.delete("status");

    if (deadline && deadline !== "all") params.set("deadline", deadline);
    else params.delete("deadline");

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const selectClassName = cn(
    "h-9 w-full shrink-0 rounded-3xl border border-input bg-white px-3 text-sm outline-none transition-colors",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-10 sm:w-52",
    isPending && "opacity-80",
  );

  return (
    <div className={cn("flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      <select
        value={selectedStatus}
        onChange={(e) => replaceFilters({ status: e.target.value })}
        aria-label="Статус"
        className={selectClassName}
      >
        {ROLE_WORKSPACE_STATUS_FILTERS.map((item) => (
          <option key={item.key} value={item.key}>
            {item.label}
          </option>
        ))}
      </select>
      <select
        value={selectedDeadline}
        onChange={(e) => replaceFilters({ deadline: e.target.value })}
        aria-label="Термін"
        className={selectClassName}
      >
        {ROLE_WORKSPACE_DEADLINE_FILTERS.map((item) => (
          <option key={item.key} value={item.key}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
